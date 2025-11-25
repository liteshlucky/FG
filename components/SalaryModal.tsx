'use client';

import { useState, useEffect } from 'react';
import { X, Calculator, CheckCircle } from 'lucide-react';

interface SalaryModalProps {
    isOpen: boolean;
    onClose: () => void;
    trainerId: string;
    onPaymentSuccess: () => void;
}

export default function SalaryModal({ isOpen, onClose, trainerId, onPaymentSuccess }: SalaryModalProps) {
    const [loading, setLoading] = useState(false);
    const [calculating, setCalculating] = useState(true);
    const [salaryData, setSalaryData] = useState<any>(null);
    const [paymentMode, setPaymentMode] = useState('bank_transfer');
    const [notes, setNotes] = useState('');
    const [month, setMonth] = useState(new Date().toLocaleString('default', { month: 'long' }));
    const [year, setYear] = useState(new Date().getFullYear());

    useEffect(() => {
        if (isOpen) {
            calculateSalary();
        }
    }, [isOpen]);

    const calculateSalary = async () => {
        setCalculating(true);
        try {
            const res = await fetch(`/api/trainers/${trainerId}/salary`);
            const data = await res.json();
            if (data.success) {
                setSalaryData(data.data);
            }
        } catch (error) {
            console.error('Failed to calculate salary', error);
        } finally {
            setCalculating(false);
        }
    };

    const handlePayment = async () => {
        if (!salaryData) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/trainers/${trainerId}/payments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: salaryData.totalSalary,
                    baseSalary: salaryData.baseSalary,
                    commissionAmount: salaryData.commissionAmount,
                    month,
                    year,
                    paymentMode,
                    notes,
                    status: 'paid'
                }),
            });
            const data = await res.json();
            if (data.success) {
                onPaymentSuccess();
                onClose();
            } else {
                alert('Failed to record payment');
            }
        } catch (error) {
            console.error('Payment failed', error);
            alert('Payment failed');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                    <h3 className="text-lg font-medium text-gray-900">Generate & Pay Salary</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-6">
                    {calculating ? (
                        <div className="text-center py-8">
                            <Calculator className="mx-auto h-12 w-12 text-gray-400 animate-pulse" />
                            <p className="mt-2 text-sm text-gray-500">Calculating salary...</p>
                        </div>
                    ) : salaryData ? (
                        <div className="space-y-6">
                            {/* Salary Breakdown */}
                            <div className="rounded-md bg-gray-50 p-4">
                                <div className="flex justify-between mb-2">
                                    <span className="text-sm text-gray-500">Base Salary</span>
                                    <span className="font-medium">₹ {salaryData.baseSalary}</span>
                                </div>
                                <div className="flex justify-between mb-2">
                                    <span className="text-sm text-gray-500">Commission ({salaryData.activeMembersCount} active members)</span>
                                    <span className="font-medium text-green-600">+ ₹ {salaryData.commissionAmount}</span>
                                </div>
                                <div className="border-t border-gray-200 pt-2 flex justify-between">
                                    <span className="font-bold text-gray-900">Total Payable</span>
                                    <span className="font-bold text-indigo-600 text-lg">₹ {salaryData.totalSalary}</span>
                                </div>
                            </div>

                            {/* Payment Details Form */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Month</label>
                                    <select
                                        value={month}
                                        onChange={(e) => setMonth(e.target.value)}
                                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                                    >
                                        {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Year</label>
                                    <input
                                        type="number"
                                        value={year}
                                        onChange={(e) => setYear(parseInt(e.target.value))}
                                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Payment Mode</label>
                                <select
                                    value={paymentMode}
                                    onChange={(e) => setPaymentMode(e.target.value)}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                                >
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="cash">Cash</option>
                                    <option value="cheque">Cheque</option>
                                    <option value="upi">UPI</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Notes</label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows={2}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                                    placeholder="Transaction ID, remarks, etc."
                                />
                            </div>

                            <button
                                onClick={handlePayment}
                                disabled={loading}
                                className="w-full flex justify-center items-center rounded-md bg-green-600 px-4 py-3 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                            >
                                {loading ? 'Processing...' : (
                                    <>
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        Pay Salary
                                    </>
                                )}
                            </button>
                        </div>
                    ) : (
                        <div className="text-center text-red-500">Failed to load salary data.</div>
                    )}
                </div>
            </div>
        </div>
    );
}
