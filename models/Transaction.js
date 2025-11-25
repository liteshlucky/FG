const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
    title: { type: String, required: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ['income', 'expense'], required: true },
    category: { type: String, default: 'General' }, // e.g., 'Rent', 'Equipment', 'Sales'
    paymentMode: { type: String, enum: ['cash', 'card', 'upi', 'bank_transfer', 'cheque'], default: 'cash' },
    date: { type: Date, default: Date.now },
    notes: { type: String },
}, { timestamps: true });

module.exports = mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);
