import dbConnect from '@/lib/db';
import LinkedProfile from '@/models/LinkedProfile';
import Member from '@/models/Member';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Auto-link threshold: how many bulk check-ins before auto-link becomes active
const AUTO_LINK_THRESHOLD = 3;
// Max auto-linked profiles per member
const MAX_AUTO_LINKS = 10;

/**
 * GET /api/linked-profiles?memberId=xxx
 * Fetch active linked profiles for a member.
 * Returns minimal data: memberId, name, status, relationship.
 */
export async function GET(request) {
    await dbConnect();

    try {
        const { searchParams } = new URL(request.url);
        const memberId = searchParams.get('memberId'); // human-readable memberId e.g. "M311"

        if (!memberId) {
            return NextResponse.json(
                { success: false, error: 'memberId is required' },
                { status: 400 }
            );
        }

        // Resolve human-readable memberId to ObjectId
        const member = await Member.findOne({ memberId }).select('_id').lean();
        if (!member) {
            return NextResponse.json(
                { success: false, error: 'Member not found' },
                { status: 404 }
            );
        }

        // Find all active links where this member is on either side
        const links = await LinkedProfile.find({
            $or: [
                { memberA: member._id, active: true },
                { memberB: member._id, active: true }
            ]
        })
            .populate('memberA', 'name memberId status membershipEndDate')
            .populate('memberB', 'name memberId status membershipEndDate')
            .lean();

        // Map to return the OTHER member's info, deduplicating by memberId
        // (since both A→B and B→A exist, the same person can appear twice)
        const seen = new Set();
        const linkedProfiles = [];

        for (const link of links) {
            const isA = link.memberA._id.toString() === member._id.toString();
            const otherMember = isA ? link.memberB : link.memberA;
            const otherKey = otherMember._id.toString();

            // Skip if we've already seen this member (deduplicate)
            if (seen.has(otherKey)) continue;
            seen.add(otherKey);

            linkedProfiles.push({
                linkId: link._id,
                memberId: otherMember.memberId,
                name: otherMember.name,
                status: otherMember.status,
                membershipEndDate: otherMember.membershipEndDate,
                relationship: link.relationship,
                source: link.source,
                bulkCheckinCount: link.bulkCheckinCount
            });
        }

        return NextResponse.json({
            success: true,
            data: linkedProfiles
        });

    } catch (error) {
        console.error('LinkedProfiles GET Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

/**
 * POST /api/linked-profiles
 * Admin creates or updates a manual link between two members.
 * Body: { memberAId, memberBId, relationship? }
 * memberAId and memberBId are human-readable memberIds (e.g. "M311", "M220")
 */
export async function POST(request) {
    await dbConnect();

    try {
        const body = await request.json();
        const { memberAId, memberBId, relationship = 'buddy' } = body;

        if (!memberAId || !memberBId) {
            return NextResponse.json(
                { success: false, error: 'memberAId and memberBId are required' },
                { status: 400 }
            );
        }

        if (memberAId === memberBId) {
            return NextResponse.json(
                { success: false, error: 'Cannot link a member to themselves' },
                { status: 400 }
            );
        }

        // Validate relationship value
        const validRelationships = ['buddy', 'spouse', 'family', 'friend', 'other'];
        if (!validRelationships.includes(relationship)) {
            return NextResponse.json(
                { success: false, error: `Invalid relationship. Must be one of: ${validRelationships.join(', ')}` },
                { status: 400 }
            );
        }

        // Resolve both memberIds to ObjectIds
        const [memberA, memberB] = await Promise.all([
            Member.findOne({ memberId: memberAId }).select('_id name memberId').lean(),
            Member.findOne({ memberId: memberBId }).select('_id name memberId').lean()
        ]);

        if (!memberA) {
            return NextResponse.json(
                { success: false, error: `Member ${memberAId} not found` },
                { status: 404 }
            );
        }
        if (!memberB) {
            return NextResponse.json(
                { success: false, error: `Member ${memberBId} not found` },
                { status: 404 }
            );
        }

        // Upsert: if link already exists, update it to admin + active
        const link = await LinkedProfile.findOneAndUpdate(
            { memberA: memberA._id, memberB: memberB._id },
            {
                $set: {
                    source: 'admin',
                    active: true,
                    relationship
                }
            },
            { upsert: true, new: true }
        );

        // Also create the reverse direction if it doesn't exist
        await LinkedProfile.findOneAndUpdate(
            { memberA: memberB._id, memberB: memberA._id },
            {
                $set: {
                    source: 'admin',
                    active: true,
                    relationship
                }
            },
            { upsert: true, new: true }
        );

        return NextResponse.json({
            success: true,
            message: `Linked ${memberA.name} (${memberAId}) ↔ ${memberB.name} (${memberBId}) as ${relationship}`,
            data: link
        });

    } catch (error) {
        console.error('LinkedProfiles POST Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

/**
 * DELETE /api/linked-profiles
 * Admin removes a link (soft-deactivate).
 * Body: { linkId } or { memberAId, memberBId }
 */
export async function DELETE(request) {
    await dbConnect();

    try {
        const body = await request.json();
        const { linkId, memberAId, memberBId } = body;

        if (linkId) {
            // Deactivate by linkId
            const link = await LinkedProfile.findByIdAndUpdate(
                linkId,
                { $set: { active: false } },
                { new: true }
            );

            if (!link) {
                return NextResponse.json(
                    { success: false, error: 'Link not found' },
                    { status: 404 }
                );
            }

            // Also deactivate reverse direction
            await LinkedProfile.findOneAndUpdate(
                { memberA: link.memberB, memberB: link.memberA },
                { $set: { active: false } }
            );

            return NextResponse.json({
                success: true,
                message: 'Link deactivated'
            });

        } else if (memberAId && memberBId) {
            // Deactivate by memberIds
            const [memberA, memberB] = await Promise.all([
                Member.findOne({ memberId: memberAId }).select('_id').lean(),
                Member.findOne({ memberId: memberBId }).select('_id').lean()
            ]);

            if (!memberA || !memberB) {
                return NextResponse.json(
                    { success: false, error: 'One or both members not found' },
                    { status: 404 }
                );
            }

            // Deactivate both directions
            await LinkedProfile.updateMany(
                {
                    $or: [
                        { memberA: memberA._id, memberB: memberB._id },
                        { memberA: memberB._id, memberB: memberA._id }
                    ]
                },
                { $set: { active: false } }
            );

            return NextResponse.json({
                success: true,
                message: `Link between ${memberAId} and ${memberBId} deactivated`
            });

        } else {
            return NextResponse.json(
                { success: false, error: 'linkId or (memberAId + memberBId) required' },
                { status: 400 }
            );
        }

    } catch (error) {
        console.error('LinkedProfiles DELETE Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

/**
 * PATCH /api/linked-profiles
 * Update relationship type for an existing link.
 * Body: { linkId, relationship }
 */
export async function PATCH(request) {
    await dbConnect();

    try {
        const body = await request.json();
        const { linkId, relationship } = body;

        if (!linkId || !relationship) {
            return NextResponse.json(
                { success: false, error: 'linkId and relationship are required' },
                { status: 400 }
            );
        }

        const validRelationships = ['buddy', 'spouse', 'family', 'friend', 'other'];
        if (!validRelationships.includes(relationship)) {
            return NextResponse.json(
                { success: false, error: `Invalid relationship. Must be one of: ${validRelationships.join(', ')}` },
                { status: 400 }
            );
        }

        const link = await LinkedProfile.findByIdAndUpdate(
            linkId,
            { $set: { relationship } },
            { new: true }
        );

        if (!link) {
            return NextResponse.json(
                { success: false, error: 'Link not found' },
                { status: 404 }
            );
        }

        // Update reverse direction too
        await LinkedProfile.findOneAndUpdate(
            { memberA: link.memberB, memberB: link.memberA },
            { $set: { relationship } }
        );

        return NextResponse.json({
            success: true,
            message: `Relationship updated to ${relationship}`,
            data: link
        });

    } catch (error) {
        console.error('LinkedProfiles PATCH Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
