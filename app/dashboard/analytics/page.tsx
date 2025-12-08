'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, AlertCircle, Lightbulb, Target, Calendar, Cloud, CloudRain, Sun, Snowflake } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';

export default function AnalyticsPage() {
    const [analytics, setAnalytics] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('12');
    const [weatherFilter, setWeatherFilter] = useState('all');

    useEffect(() => {
        fetchAnalytics();
    }, [timeRange]);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/analytics?months=${timeRange}`);
            const data = await res.json();
            if (data.success) {
                setAnalytics(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch analytics', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <div className="text-center">
                    <div className="mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-600">Generating AI-powered insights with weather analysis...</p>
                </div>
            </div>
        );
    }

    if (!analytics) {
        return <div className="p-8 text-center text-red-600">Failed to load analytics</div>;
    }

    const { monthlyData, metrics, insights, weatherImpact } = analytics as any;

    // Filter data based on weather selection
    const filteredData = weatherFilter === 'all' ? monthlyData : monthlyData.filter((m: any) => {
        if (!m.weather) return true;
        if (weatherFilter === 'rainy' && m.weather.rainyDays > 10) return true;
        if (weatherFilter === 'hot' && m.weather.hotDays > 5) return true;
        if (weatherFilter === 'cold' && m.weather.coldDays > 5) return true;
        if (weatherFilter === 'normal' && m.weather.rainyDays <= 10 && m.weather.hotDays <= 5 && m.weather.coldDays <= 5) return true;
        return false;
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-100">Business Analytics</h1>
                    <p className="mt-1 text-sm text-slate-400">AI-powered insights with weather analysis for Sodepur, West Bengal</p>
                </div>
                <div className="flex space-x-3">
                    <select
                        value={weatherFilter}
                        onChange={(e) => setWeatherFilter(e.target.value)}
                        className="rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-4 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    >
                        <option value="all">All Weather</option>
                        <option value="rainy">Rainy Periods</option>
                        <option value="hot">Hot Periods</option>
                        <option value="cold">Cold Periods</option>
                        <option value="normal">Normal Weather</option>
                    </select>
                    <select
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value)}
                        className="rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-4 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    >
                        <option value="3">Last 3 Months</option>
                        <option value="6">Last 6 Months</option>
                        <option value="12">Last 12 Months</option>
                    </select>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                    title="Total Revenue"
                    value={`₹${metrics.totalIncome.toLocaleString()}`}
                    icon={DollarSign}
                    color="green"
                />
                <MetricCard
                    title="Total Expenses"
                    value={`₹${metrics.totalExpense.toLocaleString()}`}
                    icon={TrendingDown}
                    color="red"
                />
                <MetricCard
                    title="Net Profit"
                    value={`₹${metrics.netProfit.toLocaleString()}`}
                    icon={TrendingUp}
                    color={metrics.netProfit >= 0 ? 'green' : 'red'}
                />
                <MetricCard
                    title="Profit Margin"
                    value={`${metrics.profitMargin}%`}
                    icon={Target}
                    color="blue"
                />
            </div>

            {/* Weather Impact Summary */}
            {weatherImpact && (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    <WeatherMetricCard
                        title="Rainy Days"
                        days={weatherImpact.rainyDays.totalDays}
                        avgRevenue={weatherImpact.rainyDays.avgDailyRevenue}
                        icon={CloudRain}
                        color="blue"
                    />
                    <WeatherMetricCard
                        title="Hot Days (>35°C)"
                        days={weatherImpact.hotDays.totalDays}
                        avgRevenue={weatherImpact.hotDays.avgDailyRevenue}
                        icon={Sun}
                        color="orange"
                    />
                    <WeatherMetricCard
                        title="Cold Days (<15°C)"
                        days={weatherImpact.coldDays.totalDays}
                        avgRevenue={weatherImpact.coldDays.avgDailyRevenue}
                        icon={Snowflake}
                        color="cyan"
                    />
                    <WeatherMetricCard
                        title="Normal Days"
                        days={weatherImpact.normalDays.totalDays}
                        avgRevenue={weatherImpact.normalDays.avgDailyRevenue}
                        icon={Cloud}
                        color="gray"
                    />
                </div>
            )}

            {/* Revenue Trends Chart */}
            <div className="rounded-lg bg-slate-800 p-6 shadow border border-slate-700">
                <h2 className="mb-4 text-lg font-semibold text-slate-100">Revenue Trends</h2>
                <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={filteredData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="month" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
                            formatter={(value) => `₹${value.toLocaleString()}`}
                        />
                        <Legend />
                        <Area type="monotone" dataKey="income" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} name="Income" />
                        <Area type="monotone" dataKey="expense" stackId="2" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} name="Expense" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Income vs Expense Comparison */}
            <div className="rounded-lg bg-slate-800 p-6 shadow border border-slate-700">
                <h2 className="mb-4 text-lg font-semibold text-slate-100">Monthly Comparison</h2>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={filteredData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="month" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
                            formatter={(value) => `₹${value.toLocaleString()}`}
                        />
                        <Legend />
                        <Bar dataKey="income" fill="#10b981" name="Income" />
                        <Bar dataKey="expense" fill="#ef4444" name="Expense" />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Revenue Projection Chart */}
            <div className="rounded-lg bg-slate-800 p-6 shadow border border-slate-700">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-100">Revenue Projection</h2>
                    <span className="text-xs text-slate-400">Historical + AI Forecast</span>
                </div>
                <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={[
                        ...monthlyData.slice(-6).map((m: any) => ({
                            month: m.month,
                            actual: m.income,
                            type: 'historical'
                        })),
                        {
                            month: 'Next Month',
                            projected: insights.forecast.nextMonth.income,
                            type: 'forecast'
                        }
                    ]}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="month" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
                            formatter={(value) => `₹${value.toLocaleString()}`}
                        />
                        <Legend />
                        <Line
                            type="monotone"
                            dataKey="actual"
                            stroke="#3b82f6"
                            strokeWidth={3}
                            dot={{ fill: '#3b82f6', r: 5 }}
                            name="Actual Revenue"
                        />
                        <Line
                            type="monotone"
                            dataKey="projected"
                            stroke="#8b5cf6"
                            strokeWidth={3}
                            strokeDasharray="5 5"
                            dot={{ fill: '#8b5cf6', r: 6 }}
                            name="Projected Revenue"
                        />
                    </LineChart>
                </ResponsiveContainer>
                <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="rounded-lg bg-purple-900/20 p-4 border border-purple-800/50">
                        <p className="text-sm font-medium text-purple-300">Next Month Forecast</p>
                        <p className="mt-1 text-2xl font-bold text-purple-400">₹{insights.forecast.nextMonth.income.toLocaleString()}</p>
                        <p className="mt-1 text-xs text-purple-400">
                            Confidence: <span className="font-semibold">{insights.forecast.nextMonth.confidence.toUpperCase()}</span>
                        </p>
                    </div>
                    <div className="rounded-lg bg-blue-900/20 p-4 border border-blue-800/50">
                        <p className="text-sm font-medium text-blue-300">3-Month Projection</p>
                        <p className="mt-1 text-2xl font-bold text-blue-400">₹{insights.forecast.next3Months.income.toLocaleString()}</p>
                        <p className="mt-1 text-xs text-blue-400">
                            Avg/Month: <span className="font-semibold">₹{Math.round(insights.forecast.next3Months.income / 3).toLocaleString()}</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* AI Insights Grid */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Trends Analysis */}
                <InsightCard
                    title="Trends Analysis"
                    icon={TrendingUp}
                    color="blue"
                    items={[
                        { label: 'Revenue', value: insights.trends.revenue },
                        { label: 'Seasonal', value: insights.trends.seasonal },
                        { label: 'Growth', value: insights.trends.growth }
                    ]}
                />

                {/* Forecast */}
                <div className="rounded-lg bg-slate-800 p-6 shadow border border-slate-700">
                    <div className="mb-4 flex items-center">
                        <Calendar className="mr-2 h-5 w-5 text-purple-400" />
                        <h3 className="text-lg font-semibold text-slate-100">Revenue Forecast</h3>
                    </div>
                    <div className="space-y-3">
                        <ForecastItem
                            period="Next Month"
                            income={insights.forecast.nextMonth.income}
                            expense={insights.forecast.nextMonth.expense}
                            confidence={insights.forecast.nextMonth.confidence}
                        />
                        <ForecastItem
                            period="Next 3 Months"
                            income={insights.forecast.next3Months.income}
                            expense={insights.forecast.next3Months.expense}
                            confidence={insights.forecast.next3Months.confidence}
                        />
                    </div>
                </div>
            </div>

            {/* Recommendations & Insights */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <ListCard
                    title="Key Insights"
                    icon={Lightbulb}
                    color="yellow"
                    items={insights.insights}
                />
                <ListCard
                    title="Recommendations"
                    icon={Target}
                    color="green"
                    items={insights.recommendations}
                />
            </div>

            {/* Risks & Opportunities */}
            {(insights.risks?.length > 0 || insights.opportunities?.length > 0) && (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {insights.risks?.length > 0 && (
                        <ListCard
                            title="Potential Risks"
                            icon={AlertCircle}
                            color="red"
                            items={insights.risks}
                        />
                    )}
                    {insights.opportunities?.length > 0 && (
                        <ListCard
                            title="Growth Opportunities"
                            icon={TrendingUp}
                            color="blue"
                            items={insights.opportunities}
                        />
                    )}
                </div>
            )}
        </div>
    );
}

function MetricCard({ title, value, icon: Icon, color }: any) {
    const colors: any = {
        green: 'text-green-400 bg-green-900/20 border border-green-800/50',
        red: 'text-red-400 bg-red-900/20 border border-red-800/50',
        blue: 'text-blue-400 bg-blue-900/20 border border-blue-800/50'
    };

    return (
        <div className="overflow-hidden rounded-lg bg-slate-800 px-4 py-5 shadow sm:p-6 border border-slate-700">
            <div className="flex items-center">
                <div className={`rounded-md p-3 ${colors[color]}`}>
                    <Icon className="h-6 w-6" />
                </div>
                <div className="ml-4">
                    <dt className="truncate text-sm font-medium text-slate-400">{title}</dt>
                    <dd className="mt-1 text-2xl font-semibold text-slate-100">{value}</dd>
                </div>
            </div>
        </div>
    );
}

function WeatherMetricCard({ title, days, avgRevenue, icon: Icon, color }: any) {
    const colors: any = {
        blue: 'text-blue-400 bg-blue-900/20 border border-blue-800/50',
        orange: 'text-orange-400 bg-orange-900/20 border border-orange-800/50',
        cyan: 'text-cyan-400 bg-cyan-900/20 border border-cyan-800/50',
        gray: 'text-slate-400 bg-slate-700/50 border border-slate-600'
    };

    return (
        <div className="overflow-hidden rounded-lg bg-slate-800 px-4 py-5 shadow sm:p-6 border border-slate-700">
            <div className="flex items-center">
                <div className={`rounded-md p-3 ${colors[color]}`}>
                    <Icon className="h-6 w-6" />
                </div>
                <div className="ml-4 flex-1">
                    <dt className="truncate text-sm font-medium text-slate-400">{title}</dt>
                    <dd className="mt-1 text-lg font-semibold text-slate-100">{days} days</dd>
                    <dd className="text-xs text-slate-500">Avg: ₹{avgRevenue.toLocaleString()}/day</dd>
                </div>
            </div>
        </div>
    );
}

function InsightCard({ title, icon: Icon, color, items }: any) {
    const colors: any = {
        blue: 'text-blue-400',
        green: 'text-green-400',
        yellow: 'text-yellow-400'
    };

    return (
        <div className="rounded-lg bg-slate-800 p-6 shadow border border-slate-700">
            <div className="mb-4 flex items-center">
                <Icon className={`mr-2 h-5 w-5 ${colors[color]}`} />
                <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
            </div>
            <div className="space-y-3">
                {items.map((item: any, idx: number) => (
                    <div key={idx} className="border-l-4 border-slate-700 pl-4">
                        <p className="text-sm font-medium text-slate-300">{item.label}</p>
                        <p className="mt-1 text-sm text-slate-400">{item.value}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

function ListCard({ title, icon: Icon, color, items }: any) {
    const colors: any = {
        yellow: 'text-yellow-400',
        green: 'text-green-400',
        red: 'text-red-400',
        blue: 'text-blue-400'
    };

    return (
        <div className="rounded-lg bg-slate-800 p-6 shadow border border-slate-700">
            <div className="mb-4 flex items-center">
                <Icon className={`mr-2 h-5 w-5 ${colors[color]}`} />
                <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
            </div>
            <ul className="space-y-2">
                {items.map((item: any, idx: number) => (
                    <li key={idx} className="flex items-start">
                        <span className="mr-2 mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-slate-500"></span>
                        <span className="text-sm text-slate-300">{item}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function ForecastItem({ period, income, expense, confidence }: any) {
    const net = income - expense;
    const confidenceColors: any = {
        high: 'bg-green-900/30 text-green-400 border border-green-800/50',
        medium: 'bg-yellow-900/30 text-yellow-400 border border-yellow-800/50',
        low: 'bg-red-900/30 text-red-400 border border-red-800/50'
    };

    return (
        <div className="rounded-lg border border-slate-700 p-4">
            <div className="mb-2 flex items-center justify-between">
                <span className="font-medium text-slate-100">{period}</span>
                <span className={`rounded-full px-2 py-1 text-xs font-medium ${confidenceColors[confidence]}`}>
                    {confidence.toUpperCase()}
                </span>
            </div>
            <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                    <span className="text-slate-400">Income:</span>
                    <span className="font-medium text-green-400">₹{income.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-slate-400">Expense:</span>
                    <span className="font-medium text-red-400">₹{expense.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t border-slate-700 pt-1">
                    <span className="font-medium text-slate-300">Net:</span>
                    <span className={`font-semibold ${net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        ₹{net.toLocaleString()}
                    </span>
                </div>
            </div>
        </div>
    );
}
