import dbConnect from '@/lib/db';
import Attendance from '@/models/Attendance';
import Member from '@/models/Member';
import LinkedProfile from '@/models/LinkedProfile';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Auto-link activates after this many bulk check-ins from A → B
const AUTO_LINK_THRESHOLD = 3;
// Max auto-linked profiles per member
const MAX_AUTO_LINKS = 10;

/**
 * POST /api/attendance/bulk-checkin
 *
 * Bulk check-in multiple members at once.
 * Also handles auto-linking when the same initiator repeatedly checks in the same targets.
 *
 * Body: {
 *   initiatorId: "M311",                    // human-readable memberId of who's doing the check-in (optional, null for admin)
 *   memberIds: ["M220", "M115", "311"],     // human-readable memberIds to check in
 *   lat: 19.123,                            // GPS from initiator's device (optional)
 *   lng: 72.456
 * }
 */
export async function POST(request) {
    await dbConnect();

    try {
        const body = await request.json();
        const { initiatorId, memberIds, lat, lng } = body;

        if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
            return NextResponse.json(
                { success: false, error: 'memberIds array is required and must not be empty' },
                { status: 400 }
            );
        }

        // Cap at 20 bulk check-ins to prevent abuse
        if (memberIds.length > 20) {
            return NextResponse.json(
                { success: false, error: 'Maximum 20 members can be checked in at once' },
                { status: 400 }
            );
        }

        // Normalize: trim whitespace, remove empty strings
        const cleanIds = memberIds
            .map(id => id.toString().trim())
            .filter(id => id.length > 0);

        if (cleanIds.length === 0) {
            return NextResponse.json(
                { success: false, error: 'No valid member IDs provided' },
                { status: 400 }
            );
        }

        // ============================================
        // STEP 1: Resolve all member IDs to Members
        // ============================================

        // Build a query that matches by memberId (exact or numeric-only)
        const orConditions = cleanIds.map(id => {
            const numericOnly = /^\d+$/.test(id);
            if (numericOnly) {
                return { memberId: id };
            }
            // For non-numeric, try exact match (e.g. "M311")
            return { memberId: id };
        });

        const members = await Member.find({ $or: orConditions })
            .select('_id name memberId status membershipEndDate')
            .lean();

        // Create a lookup map: memberId -> member doc
        const memberMap = {};
        members.forEach(m => {
            memberMap[m.memberId] = m;
        });

        // ============================================
        // STEP 2: Check which members are already checked in today
        // ============================================
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const memberObjectIds = members.map(m => m._id);

        const todayAttendance = await Attendance.find({
            userId: { $in: memberObjectIds },
            date: { $gte: today, $lt: tomorrow }
        }).select('userId').lean();

        const alreadyCheckedInSet = new Set(
            todayAttendance.map(a => a.userId.toString())
        );

        // ============================================
        // STEP 3: Process each member
        // ============================================
        const results = [];
        const successfulIds = []; // ObjectIds of successfully checked-in members

        for (const id of cleanIds) {
            const member = memberMap[id];

            if (!member) {
                results.push({
                    memberId: id,
                    name: null,
                    success: false,
                    error: 'Member not found'
                });
                continue;
            }

            // Check if membership expired
            if (member.status === 'Expired') {
                results.push({
                    memberId: member.memberId,
                    name: member.name,
                    success: false,
                    error: 'Membership expired'
                });
                continue;
            }

            // Check if already checked in today
            if (alreadyCheckedInSet.has(member._id.toString())) {
                results.push({
                    memberId: member.memberId,
                    name: member.name,
                    success: false,
                    error: 'Already checked in today'
                });
                continue;
            }

            // Create attendance record
            try {
                await Attendance.create({
                    userId: member._id,
                    userType: 'Member',
                    checkInTime: new Date(),
                    status: 'checked-in',
                    // Apply initiator's GPS location to all bulk check-ins
                    ...(lat != null && lng != null ? {
                        checkInLocation: { lat: parseFloat(lat), lng: parseFloat(lng) }
                    } : {})
                });

                results.push({
                    memberId: member.memberId,
                    name: member.name,
                    success: true
                });

                successfulIds.push(member._id);

            } catch (err) {
                console.error(`Bulk check-in failed for ${member.memberId}:`, err);
                results.push({
                    memberId: member.memberId,
                    name: member.name,
                    success: false,
                    error: 'Check-in failed'
                });
            }
        }

        // ============================================
        // STEP 4: Auto-linking (only if initiator provided)
        // ============================================
        if (initiatorId && successfulIds.length > 0) {
            try {
                await processAutoLinks(initiatorId, successfulIds);
            } catch (err) {
                // Auto-link errors should not fail the check-in
                console.error('Auto-link processing failed:', err);
            }
        }

        // ============================================
        // RESPONSE
        // ============================================
        const succeeded = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;

        return NextResponse.json({
            success: true,
            summary: {
                total: results.length,
                succeeded,
                failed
            },
            results
        });

    } catch (error) {
        console.error('Bulk Check-in Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

/**
 * Process auto-linking between the initiator and successfully checked-in members.
 *
 * For each target: find or create a LinkedProfile (A→B), increment bulkCheckinCount.
 * If count reaches threshold, set active: true.
 */
async function processAutoLinks(initiatorMemberId, targetObjectIds) {
    // Resolve initiator's human-readable memberId to ObjectId
    const initiator = await Member.findOne({ memberId: initiatorMemberId })
        .select('_id')
        .lean();

    if (!initiator) return;

    // Check how many active auto-links the initiator already has
    const currentAutoLinkCount = await LinkedProfile.countDocuments({
        memberA: initiator._id,
        source: 'auto',
        active: true
    });

    for (const targetId of targetObjectIds) {
        // Skip if initiator is checking in themselves
        if (initiator._id.toString() === targetId.toString()) continue;

        // Find or create the link A→B
        const link = await LinkedProfile.findOneAndUpdate(
            { memberA: initiator._id, memberB: targetId },
            {
                $inc: { bulkCheckinCount: 1 },
                $setOnInsert: {
                    source: 'auto',
                    relationship: 'buddy',
                    active: false
                }
            },
            { upsert: true, new: true }
        );

        // Check if threshold reached and link is not yet active
        if (!link.active && link.bulkCheckinCount >= AUTO_LINK_THRESHOLD) {
            // Check max auto-links cap
            if (currentAutoLinkCount < MAX_AUTO_LINKS) {
                link.active = true;
                await link.save();

                // Also create/activate the reverse link B→A
                await LinkedProfile.findOneAndUpdate(
                    { memberA: targetId, memberB: initiator._id },
                    {
                        $set: {
                            active: true,
                            source: 'auto',
                            relationship: 'buddy'
                        },
                        $setOnInsert: {
                            bulkCheckinCount: 0
                        }
                    },
                    { upsert: true }
                );

                console.log(`✓ Auto-linked: ${initiatorMemberId} ↔ target ${targetId} (count: ${link.bulkCheckinCount})`);
            }
        }
    }
}
