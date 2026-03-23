'use client';

import { useState, useEffect } from 'react';
const Card = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <div className={`rounded-xl border shadow-sm ${className || ''}`}>
        {children}
    </div>
);
import { Activity, Clock, Users, AlertTriangle, Trophy, Calendar } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import Image from 'next/image';

export default function AttendanceReportingDashboard() {
    const [rangeType, setRangeType] = useState('month');
    const [exactValue, setExactValue] = useState('');
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        // Reset exact value when switching types to let it default to the rolling range first
        setExactValue('');
    }, [rangeType]);

    useEffect(() => {
        fetchData(rangeType, exactValue);
    }, [rangeType, exactValue]);

    const fetchData = async (type: string, value: string) => {
        setLoading(true);
        try {
            let url = `/api/reporting/attendance?range=${type}`;
            if (value) {
                if (type === 'day') url += `&date=${value}`;
                if (type === 'month') url += `&month=${value}`;
                if (type === 'week') url += `&week=${value}`;
            }
            const res = await fetch(url);
            const json = await res.json();
            if (json.success) {
                setData(json.data);
            }
        } catch (error) {
            console.error('Failed to fetch attendance report:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading && !data) {
        return <div className="p-8 flex items-center justify-center min-h-[50vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div></div>;
    }

    if (!data) return null;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 pb-20">
            {/* Header and Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Attendance Analytics</h1>
                    <p className="text-zinc-400">Track member gym usage, peak hours, and at-risk members.</p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex bg-zinc-900 border border-zinc-800 p-1 rounded-lg shadow-sm">
                        {['day', 'week', 'month', 'year', 'all'].map((r) => (
                            <button
                                key={r}
                                onClick={() => setRangeType(r)}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                                    rangeType === r 
                                    ? 'bg-emerald-600 text-white shadow-sm' 
                                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                                }`}
                            >
                                {r.charAt(0).toUpperCase() + r.slice(1)}
                            </button>
                        ))}
                    </div>

                    {rangeType === 'day' && (
                        <input 
                            type="date" 
                            value={exactValue} 
                            onChange={e => setExactValue(e.target.value)} 
                            className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500" 
                        />
                    )}
                    {rangeType === 'week' && (
                        <input 
                            type="week" 
                            value={exactValue} 
                            onChange={e => setExactValue(e.target.value)} 
                            className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500" 
                        />
                    )}
                    {rangeType === 'month' && (
                        <input 
                            type="month" 
                            value={exactValue} 
                            onChange={e => setExactValue(e.target.value)} 
                            className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500" 
                        />
                    )}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-zinc-900 border-zinc-800 p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-500/10 rounded-xl">
                            <Activity className="h-6 w-6 text-emerald-500" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-zinc-400">Total Visits</p>
                            <h3 className="text-2xl font-bold text-white mt-1">{data.summary.totalPresent} 
                                <span className="text-xs text-zinc-500 font-normal ml-2">in selected period</span>
                            </h3>
                        </div>
                    </div>
                </Card>
                
                <Card className="bg-zinc-900 border-zinc-800 p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500/10 rounded-xl">
                            <Clock className="h-6 w-6 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-zinc-400">Average Duration</p>
                            <h3 className="text-2xl font-bold text-white mt-1">
                                {data.summary.avgDuration > 0 ? `${Math.floor(data.summary.avgDuration / 60)}h ${data.summary.avgDuration % 60}m` : 'N/A'}
                            </h3>
                        </div>
                    </div>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800 p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-rose-500/10 rounded-xl">
                            <AlertTriangle className="h-6 w-6 text-rose-500" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-zinc-400">At-Risk Members</p>
                            <h3 className="text-2xl font-bold text-rose-500 mt-1">{data.absenteeMembers.length} 
                                <span className="text-xs text-zinc-500 font-normal ml-2">Absent &gt;14 days</span>
                            </h3>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Peak Hours Heatmap / Bar */}
                <Card className="bg-zinc-900 border-zinc-800 p-6">
                    <div className="flex items-center gap-2 mb-6">
                        <Activity className="h-5 w-5 text-emerald-500" />
                        <h3 className="text-lg font-semibold text-white">Peak Hours Heatmap</h3>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.peakHours} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                <XAxis 
                                    dataKey="label" 
                                    stroke="#71717a" 
                                    fontSize={12} 
                                    tickLine={false} 
                                    axisLine={false} 
                                    interval={3}
                                />
                                <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip 
                                    cursor={{fill: '#27272a'}}
                                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', color: '#fff' }}
                                    formatter={(value: any) => [`${value} members`, 'Footfall']}
                                    labelStyle={{ color: '#a1a1aa', marginBottom: '4px' }}
                                />
                                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Busiest Days */}
                <Card className="bg-zinc-900 border-zinc-800 p-6">
                    <div className="flex items-center gap-2 mb-6">
                        <Calendar className="h-5 w-5 text-blue-500" />
                        <h3 className="text-lg font-semibold text-white">Footfall Trend</h3>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data.busiestDays} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                <XAxis 
                                    dataKey="dateString" 
                                    stroke="#71717a" 
                                    fontSize={12} 
                                    tickLine={false} 
                                    axisLine={false} 
                                />
                                <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', color: '#fff' }}
                                    formatter={(value: any) => [`${value} visits`, 'Total']}
                                    labelStyle={{ color: '#a1a1aa', marginBottom: '4px' }}
                                />
                                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

            </div>

            {/* Tables Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Top Attendees */}
                <Card className="bg-zinc-900 border-zinc-800 p-0 overflow-hidden">
                    <div className="p-6 border-b border-zinc-800 flex items-center gap-2 bg-zinc-900/50">
                        <Trophy className="h-5 w-5 text-yellow-500" />
                        <h3 className="text-lg font-semibold text-white">Top Attendees</h3>
                    </div>
                    <div className="divide-y divide-zinc-800">
                        {data.topAttendees.map((attendee: any, index: number) => (
                            <div key={attendee._id} className="p-4 flex items-center justify-between hover:bg-zinc-800/50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${index === 0 ? 'bg-yellow-500/20 text-yellow-500' : index === 1 ? 'bg-zinc-300/20 text-zinc-300' : index === 2 ? 'bg-amber-600/20 text-amber-600' : 'bg-zinc-800 text-zinc-500'}`}>
                                        #{index + 1}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 bg-zinc-800 rounded-full overflow-hidden relative">
                                            {attendee.profilePicture ? (
                                                <Image src={attendee.profilePicture} alt={attendee.name} fill className="object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-zinc-500 font-medium">
                                                    {attendee.name.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-medium text-white">{attendee.name}</p>
                                            <p className="text-xs text-zinc-500">ID: {attendee.memberId}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full text-sm font-medium">
                                        {attendee.visits} visits
                                    </div>
                                </div>
                            </div>
                        ))}
                        {data.topAttendees.length === 0 && (
                            <div className="p-8 text-center text-zinc-500">No attendance records found for this period.</div>
                        )}
                    </div>
                </Card>

                {/* Absentee / At-Risk */}
                <Card className="bg-zinc-900 border-zinc-800 p-0 overflow-hidden">
                    <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-rose-500" />
                            <h3 className="text-lg font-semibold text-white">At-Risk Members</h3>
                        </div>
                        <span className="text-xs font-medium bg-zinc-800 text-zinc-400 px-2 py-1 rounded">Absent &gt;14 days</span>
                    </div>
                    <div className="divide-y divide-zinc-800 max-h-[450px] overflow-y-auto">
                        {data.absenteeMembers.map((member: any) => (
                            <div key={member._id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-zinc-800/50 transition-colors">
                                <div>
                                    <p className="font-medium text-white">{member.name}</p>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                                        <span>ID: {member.memberId}</span>
                                        <span>•</span>
                                        <span>{member.phone}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col sm:items-end gap-1">
                                    <span className="text-rose-500 font-bold text-sm bg-rose-500/10 px-2 py-0.5 rounded">
                                        {member.daysAbsent} days absent
                                    </span>
                                    <span className="text-xs text-zinc-500">
                                        Last visit: {member.lastVisit ? new Date(member.lastVisit).toLocaleDateString() : 'Never'}
                                    </span>
                                </div>
                            </div>
                        ))}
                        {data.absenteeMembers.length === 0 && (
                            <div className="p-8 text-center text-zinc-500">Great job! No members have been absent for over 14 days.</div>
                        )}
                    </div>
                </Card>

            </div>
        </div>
    );
}
