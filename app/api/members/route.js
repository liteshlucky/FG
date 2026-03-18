import dbConnect from '@/lib/db';
import Member from '@/models/Member';
import MemberListView from '@/models/MemberListView';
import Plan from '@/models/Plan';
import PTplan from '@/models/PTplan';
import Discount from '@/models/Discount';
import Settings from '@/models/Settings';
import Notification from '@/models/Notification';
import { sendEmailAlert } from '@/lib/email';
import { NextResponse } from 'next/server';

export async function GET(request) {
    await dbConnect();
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const skip = (page - 1) * limit;
        const search = searchParams.get('search') || '';
        const status = searchParams.get('status') || 'all';
        const paymentStatus = searchParams.get('paymentStatus') || 'all';
        const typeFilter = searchParams.get('type') || 'all';
        const sortBy = searchParams.get('sortBy') || 'memberId';
        const sortOrder = searchParams.get('sortOrder') || 'desc';

        // Build query conditions
        const query = {};

        // Search filter
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search } },
                { memberId: { $regex: search, $options: 'i' } }
            ];
        }

        // Status filter
        if (status !== 'all') {
            if (status === 'Expiring Soon') {
                const now = new Date();
                const tenDaysFromNow = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);
                query.membershipEndDate = { $gte: now, $lte: tenDaysFromNow };
                query.status = 'Active';
            } else if (status.startsWith('expiring_')) {
                const [_, year, month] = status.split('_');
                const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
                const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
                if (!query.membershipEndDate) query.membershipEndDate = {};
                query.membershipEndDate.$gte = startDate;
                query.membershipEndDate.$lte = endDate;
            } else {
                query.status = status;
            }
        }

        const expiryStart = searchParams.get('expiryStart');
        const expiryEnd = searchParams.get('expiryEnd');
        
        if (expiryStart || expiryEnd) {
            if (!query.membershipEndDate) query.membershipEndDate = {};
            if (expiryStart) {
                query.membershipEndDate.$gte = new Date(expiryStart);
            }
            if (expiryEnd) {
                const endD = new Date(expiryEnd);
                endD.setHours(23, 59, 59, 999);
                query.membershipEndDate.$lte = endD;
            }
        }

        // Payment status filter
        if (paymentStatus !== 'all') {
            query.paymentStatus = paymentStatus;
        }

        // Type filter (PT/Non-PT)
        if (typeFilter === 'pt') {
            query.ptPlanId = { $exists: true, $ne: null };
        } else if (typeFilter === 'non-pt') {
            query.ptPlanId = { $exists: false };
        }

        // Build sort object
        let sortPipeline = [];

        // For memberId, we need numeric sorting (convert string to int)
        if (sortBy === 'memberId') {
            sortPipeline = [
                {
                    $addFields: {
                        memberIdNumeric: { $toInt: '$memberId' }
                    }
                },
                {
                    $sort: { memberIdNumeric: sortOrder === 'asc' ? 1 : -1 }
                },
                {
                    $project: { memberIdNumeric: 0 } // Remove temporary field
                }
            ];
        } else {
            // Regular sorting for other fields
            const sort = {};
            sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
            sortPipeline = [{ $sort: sort }];
        }

        // Build aggregation pipeline
        const pipeline = [
            { $match: query },
            ...sortPipeline,
            { $skip: skip },
            { $limit: limit }
        ];

        // Query MemberListView with aggregation for numeric sorting
        const members = await MemberListView.aggregate(pipeline);

        // Apply runtime logic for missing dates (in-memory only)
        const processedMembers = members.map(member => {
            if (member.planDuration) {
                // Default start date to join date if missing
                if (!member.membershipStartDate) {
                    member.membershipStartDate = member.joinDate;
                }

                // Calculate end date if missing
                if (!member.membershipEndDate && member.membershipStartDate) {
                    const startDate = new Date(member.membershipStartDate);
                    const endDate = new Date(startDate);
                    endDate.setMonth(endDate.getMonth() + member.planDuration);
                    member.membershipEndDate = endDate;
                }
            }
            return member;
        });

        // Get total count for pagination
        const total = await MemberListView.countDocuments(query);

        return NextResponse.json({
            success: true,
            data: processedMembers,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error in GET /api/members:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}

import Counter from '@/models/Counter';

// ... imports

export async function POST(request) {
    await dbConnect();
    try {
        const body = await request.json();

        // Convert empty strings to null for optional reference fields
        if (body.discountId === '') body.discountId = null;
        if (body.ptPlanId === '') body.ptPlanId = null;
        if (body.planId === '') body.planId = null;
        if (body.trainerId === '') body.trainerId = null;

        // Auto-generate memberId
        const counter = await Counter.findByIdAndUpdate(
            { _id: 'memberId' },
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );
        body.memberId = String(counter.seq);

        const member = await Member.create(body);

        // Trigger Notification if enabled
        try {
            const settings = await Settings.findOne({ singletonKey: 'GLOBAL_SETTINGS' });
            if (settings?.preferences?.newMember) {
                const title = 'New Member Registered';
                const message = `${member.name} has joined as a new member (${member.memberId}).`;
                
                // 1. Create In-App Notification
                await Notification.create({
                    title,
                    message,
                    type: 'info',
                    link: `/dashboard/members/${member._id}`
                });

                // 2. Send Email Alert in real-time if recipients are configured
                if (settings.notificationEmails && settings.notificationEmails.length > 0) {
                    const htmlContent = `
                        <h2>New Member Joined</h2>
                        <p><strong>Name:</strong> ${member.name}</p>
                        <p><strong>Member ID:</strong> ${member.memberId}</p>
                        <p><strong>Phone:</strong> ${member.phone}</p>
                        <p><strong>Email:</strong> ${member.email}</p>
                        <br/>
                        <p><a href="${process.env.NEXTAUTH_URL}/dashboard/members/${member._id}">View Profile</a></p>
                    `;
                    await sendEmailAlert(settings.notificationEmails, `🆕 ${member.name} joined Fitness Garage`, htmlContent);
                }
            }
        } catch (notifErr) {
            console.error('Failed to trigger new member notification:', notifErr);
        }

        return NextResponse.json({ success: true, data: member }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}
