import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';

interface AttendanceCalendarProps {
    userId: string;
    userType: 'Member' | 'Trainer';
}

export default function AttendanceCalendar({ userId, userType }: AttendanceCalendarProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [attendanceData, setAttendanceData] = useState<any[]>([]);
    const [leaves, setLeaves] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [trainerData, setTrainerData] = useState<any>(null);

    useEffect(() => {
        fetchHistory();
    }, [currentDate, userId, userType]);

    const fetchHistory = async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();

            // Incentive Cycle: 21st of previous month to 20th of current month
            const cycleStart = new Date(year, month - 1, 21);
            const cycleEnd = new Date(year, month, 20, 23, 59, 59, 999);

            // Format as YYYY-MM-DD for the history API
            // We still fetch history for the whole calendar month to populate the visual grid
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            const startDate = firstDay.toLocaleDateString('en-CA');
            const endDate = lastDay.toLocaleDateString('en-CA');

            const res = await fetch(`/api/attendance/history?userId=${userId}&userType=${userType}&startDate=${startDate}&endDate=${endDate}&limit=100`);
            const data = await res.json();
            
            if (data.success) {
                setAttendanceData(data.data);
            } else {
                setAttendanceData([]);
            }

            if (userType === 'Trainer') {
                const trainerRes = await fetch(`/api/trainers/${userId}`);
                const tData = await trainerRes.json();
                if (tData.success) {
                    setTrainerData(tData.data);
                    setLeaves(tData.data.leaves?.map((l: any) => new Date(l).toLocaleDateString('en-CA')) || []);
                }
            }
        } catch (error) {
            console.error('Failed to fetch attendance history', error);
            setAttendanceData([]);
        } finally {
            setLoading(false);
        }
    };

    const toggleLeave = async (day: number) => {
        if (userType !== 'Trainer' || !userId || !day) return;
        
        const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toLocaleDateString('en-CA');
        const isLeave = leaves.includes(dateStr);
        
        try {
            setLoading(true);
            const res = await fetch(`/api/trainers/${userId}/leaves`, {
                method: isLeave ? 'DELETE' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: dateStr })
            });
            const data = await res.json();
            if (data.success) {
                setLeaves(data.data.map((l: any) => new Date(l).toLocaleDateString('en-CA')));
            }
        } catch (error) {
            console.error('Failed to toggle leave', error);
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

    // Check if the user attended on a specific day and get their check-in time
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
        <div className="flex flex-col h-full bg-slate-900 rounded-xl overflow-hidden border border-slate-700">
            {/* Calendar Body */}
            <div className="p-4 sm:p-6 overflow-y-auto w-full max-w-4xl mx-auto">
                {/* Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    {/* Left side: Present Count & Stats */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Incentive Cycle</span>
                            <span className="text-xs text-slate-300">
                                {new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 21).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })} to {new Date(currentDate.getFullYear(), currentDate.getMonth(), 20).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-300 bg-emerald-500/10 px-3 py-2 rounded-lg border border-emerald-500/20">
                            <span className="font-medium">Present:</span>
                            <span className="text-emerald-400 font-bold text-lg leading-none">
                                {attendanceData.filter(r => {
                                    const d = new Date(r.checkInTime);
                                    const cycleStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 21);
                                    const cycleEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), 20, 23, 59, 59, 999);
                                    return d >= cycleStart && d <= cycleEnd;
                                }).length}
                            </span>
                        </div>
                        {userType === 'Trainer' && (
                            <div className="flex items-center gap-2 text-sm text-slate-300 bg-amber-500/10 px-3 py-2 rounded-lg border border-amber-500/20">
                                <span className="font-medium">Leaves:</span>
                                <span className="text-amber-400 font-bold text-lg leading-none">
                                    {leaves.filter(l => {
                                        const d = new Date(l);
                                        const cycleStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 21);
                                        const cycleEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), 20, 23, 59, 59, 999);
                                        return d >= cycleStart && d <= cycleEnd;
                                    }).length}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Right side: Selectors & Navigation */}
                    <div className="flex items-center gap-2">
                        <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700">
                            <select 
                                value={currentDate.getMonth()}
                                onChange={(e) => {
                                    const newDate = new Date(currentDate);
                                    newDate.setDate(1); // prevent overflow
                                    newDate.setMonth(parseInt(e.target.value));
                                    setCurrentDate(newDate);
                                }}
                                className="bg-transparent text-white text-sm font-semibold focus:outline-none cursor-pointer px-2 py-1 appearance-none sm:appearance-auto"
                            >
                                {Array.from({ length: 12 }, (_, i) => {
                                    const d = new Date(2000, i, 1);
                                    return <option key={i} value={i} className="bg-slate-800 text-white">{d.toLocaleString('default', { month: 'short' })}</option>;
                                })}
                            </select>
                            <span className="text-slate-600">/</span>
                            <select 
                                value={currentDate.getFullYear()}
                                onChange={(e) => {
                                    const newDate = new Date(currentDate);
                                    newDate.setFullYear(parseInt(e.target.value));
                                    setCurrentDate(newDate);
                                }}
                                className="bg-transparent text-white text-sm font-semibold focus:outline-none cursor-pointer px-2 py-1 appearance-none sm:appearance-auto"
                            >
                                {Array.from({ length: 11 }, (_, i) => {
                                    const year = new Date().getFullYear() - 5 + i;
                                    return <option key={year} value={year} className="bg-slate-800 text-white">{year}</option>;
                                })}
                            </select>
                        </div>
                        <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1 border border-slate-700">
                            <button 
                                onClick={prevMonth}
                                className="p-1 rounded hover:bg-slate-700 text-slate-300 transition-colors"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                            <button 
                                onClick={nextMonth}
                                className="p-1 rounded hover:bg-slate-700 text-slate-300 transition-colors"
                            >
                                <ChevronRight className="h-5 w-5" />
                            </button>
                        </div>
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
                        const dateStr = day ? new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toLocaleDateString('en-CA') : '';
                        const isLeave = day && leaves.includes(dateStr);
                        const dayName = day ? new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toLocaleDateString('en-US', { weekday: 'long' }) : '';
                        const isDayOff = day && trainerData?.dayOff === dayName;

                        return (
                            <div 
                                key={index} 
                                onClick={() => day && toggleLeave(day)}
                                className={`
                                    aspect-[4/3] sm:aspect-square flex flex-col items-center justify-center rounded-xl border relative p-1
                                    ${!day ? 'bg-transparent border-transparent' : 'bg-slate-800/30 border-slate-800 cursor-pointer hover:bg-slate-800/50'}
                                    ${todayMarker ? 'ring-2 ring-blue-500/50 bg-blue-900/10' : ''}
                                    ${record ? 'border-emerald-500/30 bg-emerald-900/10' : ''}
                                    ${isLeave ? 'border-amber-500/30 bg-amber-900/20' : ''}
                                    ${isDayOff ? 'border-slate-600 bg-slate-700/20' : ''}
                                    transition-all duration-200
                                `}
                            >
                                {day && (
                                    <>
                                        <span className={`text-sm font-medium 
                                            ${record ? 'text-emerald-400' : 
                                              isLeave ? 'text-amber-400' :
                                              isDayOff ? 'text-slate-500' :
                                              todayMarker ? 'text-blue-400' : 'text-slate-300'}`}>
                                            {day}
                                        </span>
                                        
                                        {record ? (
                                            <div className="mt-1 flex flex-col items-center">
                                                <div className="bg-emerald-500/20 text-emerald-400 text-[10px] sm:text-xs font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                                    <Clock className="h-3 w-3 hidden sm:block" />
                                                    {formatTime(record.checkInTime)}
                                                </div>
                                            </div>
                                        ) : isLeave ? (
                                            <div className="mt-1">
                                                <div className="bg-amber-500/20 text-amber-400 text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-md">
                                                    LEAVE
                                                </div>
                                            </div>
                                        ) : isDayOff ? (
                                            <div className="mt-1">
                                                <div className="text-[10px] text-slate-500 font-bold tracking-tight">
                                                    OFF DAY
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="h-5 sm:h-6"></div>
                                        )}
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Footer Summary */}
            {today.getMonth() !== currentDate.getMonth() || today.getFullYear() !== currentDate.getFullYear() ? (
                <div className="p-4 bg-slate-800/50 border-t border-slate-700 flex justify-end items-center text-sm mt-auto">
                    <button 
                        onClick={() => setCurrentDate(new Date())}
                        className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                    >
                        Go to Today
                    </button>
                </div>
            ) : null}
        </div>
    );
}
