
/**
 * Calculate payment status based on plan price, total paid, and admission fee
 * @param {number} totalPlanPrice - The total price of the plan
 * @param {number} totalPaid - The total amount paid so far
 * @param {number} admissionFee - The admission fee amount (default 0)
 * @returns {string} - 'paid', 'partial', or 'unpaid'
 */
export function calculatePaymentStatus(totalPlanPrice, totalPaid, admissionFee = 0) {
    const totalDue = totalPlanPrice + admissionFee;

    // Handle edge case where totalDue is 0 (e.g. free plan)
    if (totalDue === 0) return 'paid';

    if (!totalPaid || totalPaid === 0) return 'unpaid';
    if (totalPaid >= totalDue) return 'paid';
    return 'partial';
}

/**
 * Calculate current balance dynamically
 * @param {number} totalPlanPrice 
 * @param {number} totalPaid 
 * @param {number} admissionFee 
 * @returns {number} - The remaining balance (non-negative)
 */
export function calculateBalance(totalPlanPrice, totalPaid, admissionFee = 0) {
    const totalDue = totalPlanPrice + admissionFee;
    return Math.max(0, totalDue - (totalPaid || 0));
}

/**
 * Generate a unique receipt number
 * Format: RCP-YYYYMMDD-XXXXX
 * @returns {string}
 */
export function generateReceiptNumber() {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    // Generate 5 random digits
    const random = Math.floor(Math.random() * 90000) + 10000;
    return `RCP-${dateStr}-${random}`;
}

/**
 * Calculate membership end date based on start date and duration
 * @param {Date|string} startDate 
 * @param {number} durationMonths 
 * @returns {Date}
 */
export function calculateMembershipEndDate(startDate, durationMonths) {
    const start = new Date(startDate);
    // Clone date to avoid mutating original
    const end = new Date(start);
    end.setMonth(end.getMonth() + durationMonths);
    return end;
}

/**
 * Determine membership status based on end date
 * @param {Date|string} endDate 
 * @returns {string} - 'Active', 'Expired', or 'Expiring Soon'
 */
export function getMembershipStatus(endDate) {
    if (!endDate) return 'Pending';

    const now = new Date();
    const end = new Date(endDate);

    // Reset time parts for accurate day comparison
    const todayNoTime = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endDateNoTime = new Date(end.getFullYear(), end.getMonth(), end.getDate());

    const diffTime = endDateNoTime - todayNoTime;
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (daysRemaining < 0) return 'Expired';
    if (daysRemaining <= 7) return 'Expiring Soon'; // This is a UI status, DB stores 'Active' usually
    return 'Active';
}

/**
 * Update a member's payment totals and status (to be called after payment changes)
 * @param {string} memberId 
 * @param {object} MemberModel 
 * @param {object} PaymentModel 
 */
export async function updateMemberPaymentStatus(memberId, MemberModel, PaymentModel) {
    try {
        // 1. Calculate total paid from all payments
        const payments = await PaymentModel.find({ memberId, paymentStatus: 'completed' }); // only count completed ones
        const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

        // 2. Get member to access plan price
        const member = await MemberModel.findById(memberId);
        if (!member) throw new Error('Member not found');

        // 3. Update member fields
        member.totalPaid = totalPaid;

        // Find the latest payment for lastPayment fields
        if (payments.length > 0) {
            // Sort by date descending
            payments.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));
            const lastPayment = payments[0];
            member.lastPaymentDate = lastPayment.paymentDate;
            member.lastPaymentAmount = lastPayment.amount;
        }

        // 4. Update status
        member.paymentStatus = calculatePaymentStatus(
            member.totalPlanPrice || 0,
            totalPaid,
            member.admissionFeeAmount || 0
        );

        await member.save();
        return member;
    } catch (error) {
        console.error('Error updating member payment status:', error);
        throw error;
    }
}
