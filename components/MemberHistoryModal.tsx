import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from 'lucide-react';

interface MemberHistoryModalProps {
    member: any;
    onClose: () => void;
}

export default function MemberHistoryModal({ member, onClose }: MemberHistoryModalProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [attendanceData, setAttendanceData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchHistory();
    }, [currentDate]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();

            // First and last day of the viewed month
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);

            // Format as YYYY-MM-DD for the API
            const startDate = firstDay.toLocaleDateString('en-CA'); // 'en-CA' gives YYYY-MM-DD
            const endDate = lastDay.toLocaleDateString('en-CA');

            const res = await fetch(`/api/attendance/history?userId=${member._id || member.memberId}&userType=Member&startDate=${startDate}&endDate=${endDate}&limit=100`);
            const data = await res.json();
            
            if (data.success) {
                setAttendanceData(data.data);
            } else {
                setAttendanceData([]);
            }
        } catch (error) {
            console.error('Failed to fetch attendance history', error);
            setAttendanceData([]);
        } finally {
            setLoading(false);
        }
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    // Calendar grid generation
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay(); // 0 (Sun) to 6 (Sat)
    
    const days = [];
    
    // Empty slots before the 1st of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
        days.push(null);
    }
    
    // Real days
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(i);
    }

    // Today's date for highlighting
    const today = new Date();
    const isToday = (day: number) => {
        return day === today.getDate() && 
               currentDate.getMonth() === today.getMonth() && 
               currentDate.getFullYear() === today.getFullYear();
    };

    // Check if the member attended on a specific day and get their check-in time
    const getAttendanceRecord = (day: number) => {
        if (!day) return null;
        
        // Target date string for comparison (YYYY-MM-DD local logic)
        const targetDateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toLocaleDateString('en-CA');
        
        // Find the first matching check-in for the day
        return attendanceData.find(record => {
            if (!record.checkInTime) return false;
            // Handle UTC/Local Date discrepancy correctly
            const recordDate = new Date(record.checkInTime);
            const recordDateStr = recordDate.toLocaleDateString('en-CA', { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone });
            return recordDateStr === targetDateStr;
        });
    };

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm sm:p-6" onClick={onClose}>
            <div 
                className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-800 bg-slate-800/50">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-500/20 p-2 rounded-lg">
                            <CalendarIcon className="h-6 w-6 text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Attendance History</h2>
                            <p className="text-sm text-slate-400">{member.name} • {member.memberId || 'N/A'}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Calendar Body */}
                <div className="p-4 sm:p-6 overflow-y-auto">
                    {/* Controls */}
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-white">
                            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </h3>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={prevMonth}
                                className="p-2 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 transition-colors"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button 
                                onClick={nextMonth}
                                className="p-2 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 transition-colors"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} className="text-center text-xs font-semibold text-slate-400 py-2">
                                {day}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1 sm:gap-2 relative min-h-[300px]">
                        {loading && (
                            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                            </div>
                        )}

                        {days.map((day, index) => {
                            const record = getAttendanceRecord(day || 0);
                            const todayMarker = day && isToday(day);

                            return (
                                <div 
                                    key={index} 
                                    className={`
                                        aspect-square flex flex-col items-center justify-center rounded-xl border relative p-1
                                        ${!day ? 'bg-transparent border-transparent' : 'bg-slate-800/30 border-slate-800'}
                                        ${todayMarker ? 'ring-2 ring-blue-500/50 bg-blue-900/10' : ''}
                                        ${record ? 'border-emerald-500/30 bg-emerald-900/10' : ''}
                                        transition-all duration-200
                                    `}
                                >
                                    {day && (
                                        <>
                                            <span className={`text-sm font-medium ${record ? 'text-emerald-400' : todayMarker ? 'text-blue-400' : 'text-slate-300'}`}>
                                                {day}
                                            </span>
                                            
                                            {record ? (
                                                <div className="mt-1 flex flex-col items-center">
                                                    <div className="bg-emerald-500/20 text-emerald-400 text-[10px] sm:text-xs font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                                        <Clock className="h-3 w-3 hidden sm:block" />
                                                        {formatTime(record.checkInTime)}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="h-5 sm:h-6"></div> // Spacer to keep height consistent
                                            )}
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer Summary */}
                <div className="p-4 bg-slate-800/50 border-t border-slate-700 flex justify-between items-center text-sm">
                    <div className="text-slate-400">
                        Total visits this month: <span className="text-white font-semibold">{attendanceData.length}</span>
                    </div>
                    {today.getMonth() !== currentDate.getMonth() || today.getFullYear() !== currentDate.getFullYear() ? (
                        <button 
                            onClick={() => setCurrentDate(new Date())}
                            className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                        >
                            Go to Today
                        </button>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
