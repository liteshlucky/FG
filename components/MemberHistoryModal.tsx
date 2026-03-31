import React from 'react';
import { X, Calendar as CalendarIcon } from 'lucide-react';
import AttendanceCalendar from './AttendanceCalendar';

interface MemberHistoryModalProps {
    member: any;
    onClose: () => void;
}

export default function MemberHistoryModal({ member, onClose }: MemberHistoryModalProps) {
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
                
                {/* Independent Calendar Component handles fetching and rendering dates */}
                <div className="flex-1 overflow-hidden h-[600px] flex flex-col">
                    <AttendanceCalendar 
                        userId={member._id || member.memberId} 
                        userType="Member" 
                    />
                </div>
            </div>
        </div>
    );
}
