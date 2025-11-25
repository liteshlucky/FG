'use client';

import { useState } from 'react';
import { Sparkles, Printer, RefreshCw, UtensilsCrossed, Dumbbell } from 'lucide-react';

interface AIAnalysisProps {
    memberId: string;
    initialData?: any;
    onGenerate?: () => void;
}

export default function AIAnalysis({ memberId, initialData, onGenerate }: AIAnalysisProps) {
    const [loading, setLoading] = useState(false);
    const [aiData, setAiData] = useState(initialData);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'diet' | 'workout'>('diet');

    const generatePlan = async (type: 'diet' | 'workout') => {
        setLoading(true);
        setError('');

        try {
            const res = await fetch(`/api/members/${memberId}/ai-analysis`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type }),
            });

            const data = await res.json();

            if (data.success) {
                // Merge new data with existing data
                setAiData((prev: any) => ({
                    ...prev,
                    dietPlan: type === 'diet' ? data.data.dietPlan : prev?.dietPlan,
                    workoutPlan: type === 'workout' ? data.data.workoutPlan : prev?.workoutPlan,
                }));
                if (onGenerate) onGenerate();
            } else {
                setError(data.error || 'Failed to generate plan');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to generate plan');
        } finally {
            setLoading(false);
        }
    };

    // ... print handlers ...

    const handlePrintDiet = () => {
        // Temporarily hide workout section and all other page elements
        const style = document.createElement('style');
        style.id = 'print-diet-only';
        style.textContent = `
            @media print {
                /* Hide all page elements except AI analysis */
                body * { visibility: hidden; }
                .ai-analysis-container, .ai-analysis-container * { visibility: visible; }
                .ai-analysis-container { position: absolute; left: 0; top: 0; width: 100%; }
                
                /* Hide workout section and UI elements */
                .workout-section, .workout-section * { visibility: hidden !important; }
                .print\\:hidden, .print\\:hidden * { visibility: hidden !important; }
                
                /* Page settings */
                @page { margin: 1cm; }
                body { background: white; }
            }
        `;
        document.head.appendChild(style);
        window.print();
        setTimeout(() => {
            document.getElementById('print-diet-only')?.remove();
        }, 100);
    };

    const handlePrintWorkout = () => {
        // Temporarily hide diet section and all other page elements
        const style = document.createElement('style');
        style.id = 'print-workout-only';
        style.textContent = `
            @media print {
                /* Hide all page elements except AI analysis */
                body * { visibility: hidden; }
                .ai-analysis-container, .ai-analysis-container * { visibility: visible; }
                .ai-analysis-container { position: absolute; left: 0; top: 0; width: 100%; }
                
                /* Hide diet section and UI elements */
                .diet-section, .diet-section * { visibility: hidden !important; }
                .print\\:hidden, .print\\:hidden * { visibility: hidden !important; }
                
                /* Page settings */
                @page { margin: 1cm; }
                body { background: white; }
            }
        `;
        document.head.appendChild(style);
        window.print();
        setTimeout(() => {
            document.getElementById('print-workout-only')?.remove();
        }, 100);
    };

    // Parse day-wise data from arrays
    const getDayWiseDiet = () => {
        if (!aiData?.dietPlan) return [];
        const days = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];
        return days.map((day, idx) => ({
            day,
            breakfast: aiData.dietPlan.breakfast?.[idx] || '-',
            midMorningSnack: aiData.dietPlan.midMorningSnack?.[idx] || '-',
            lunch: aiData.dietPlan.lunch?.[idx] || '-',
            eveningSnack: aiData.dietPlan.eveningSnack?.[idx] || '-',
            dinner: aiData.dietPlan.dinner?.[idx] || '-',
        }));
    };

    if (!aiData && !loading) {
        return (
            <div className="rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 p-8 text-center">
                <Sparkles className="mx-auto h-12 w-12 text-indigo-600" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">AI-Powered Personalized Plan</h3>
                <p className="mt-2 text-sm text-gray-600">
                    Generate a customized diet and workout plan based on this member's profile, goals, and body measurements.
                </p>
                <div className="mt-6 flex justify-center gap-4">
                    <button
                        onClick={() => generatePlan('diet')}
                        disabled={loading}
                        className="inline-flex items-center rounded-md bg-indigo-600 px-6 py-3 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                        <UtensilsCrossed className="mr-2 h-4 w-4" />
                        Generate Diet Plan
                    </button>
                    <button
                        onClick={() => generatePlan('workout')}
                        disabled={loading}
                        className="inline-flex items-center rounded-md bg-purple-600 px-6 py-3 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                    >
                        <Dumbbell className="mr-2 h-4 w-4" />
                        Generate Workout Plan
                    </button>
                </div>
                {error && (
                    <p className="mt-4 text-sm text-red-600">{error}</p>
                )}
            </div>
        );
    }

    if (loading) {
        return (
            <div className="rounded-lg bg-white p-8 text-center shadow">
                <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
                <p className="mt-4 text-sm text-gray-600">Generating your personalized plan...</p>
                <p className="mt-2 text-xs text-gray-500">This may take 10-20 seconds</p>
            </div>
        );
    }

    const dayWiseDiet = getDayWiseDiet();

    return (
        <div className="ai-analysis-container space-y-6">
            {/* Header with Actions */}
            <div className="flex items-center justify-between rounded-lg bg-white p-4 shadow print:hidden">
                <div>
                    <h3 className="text-lg font-medium text-gray-900">AI-Generated Plan</h3>
                    {activeTab === 'diet' && aiData?.dietPlan?.generatedAt && (
                        <p className="text-sm text-gray-500">
                            Diet generated on {new Date(aiData.dietPlan.generatedAt).toLocaleDateString()}
                        </p>
                    )}
                    {activeTab === 'workout' && aiData?.workoutPlan?.generatedAt && (
                        <p className="text-sm text-gray-500">
                            Workout generated on {new Date(aiData.workoutPlan.generatedAt).toLocaleDateString()}
                        </p>
                    )}
                </div>
                <div className="flex gap-2">
                    {activeTab === 'diet' ? (
                        <>
                            <button
                                onClick={handlePrintDiet}
                                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                <Printer className="mr-2 h-4 w-4" />
                                Print Diet
                            </button>
                            <button
                                onClick={() => generatePlan('diet')}
                                disabled={loading}
                                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Regenerate Diet
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={handlePrintWorkout}
                                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                <Printer className="mr-2 h-4 w-4" />
                                Print Workout
                            </button>
                            <button
                                onClick={() => generatePlan('workout')}
                                disabled={loading}
                                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Regenerate Workout
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 print:hidden">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('diet')}
                        className={`flex items-center border-b-2 px-1 py-4 text-sm font-medium ${activeTab === 'diet'
                            ? 'border-indigo-500 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                            }`}
                    >
                        <UtensilsCrossed className="mr-2 h-5 w-5" />
                        Diet Plan
                    </button>
                    <button
                        onClick={() => setActiveTab('workout')}
                        className={`flex items-center border-b-2 px-1 py-4 text-sm font-medium ${activeTab === 'workout'
                            ? 'border-indigo-500 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                            }`}
                    >
                        <Dumbbell className="mr-2 h-5 w-5" />
                        Workout Plan
                    </button>
                </nav>
            </div>

            {/* Diet Plan Tab - Empty State */}
            {activeTab === 'diet' && !aiData?.dietPlan && (
                <div className="py-12 text-center rounded-lg bg-gray-50 border-2 border-dashed border-gray-300">
                    <UtensilsCrossed className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No Diet Plan Generated</h3>
                    <p className="mt-1 text-sm text-gray-500">Generate a personalized diet plan for this member.</p>
                    <button
                        onClick={() => generatePlan('diet')}
                        disabled={loading}
                        className="mt-6 inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {loading ? 'Generating...' : 'Generate Diet Plan'}
                    </button>
                </div>
            )}

            {/* Workout Plan Tab - Empty State */}
            {activeTab === 'workout' && !aiData?.workoutPlan && (
                <div className="py-12 text-center rounded-lg bg-gray-50 border-2 border-dashed border-gray-300">
                    <Dumbbell className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No Workout Plan Generated</h3>
                    <p className="mt-1 text-sm text-gray-500">Generate a personalized workout plan for this member.</p>
                    <button
                        onClick={() => generatePlan('workout')}
                        disabled={loading}
                        className="mt-6 inline-flex items-center rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                    >
                        {loading ? 'Generating...' : 'Generate Workout Plan'}
                    </button>
                </div>
            )}

            {/* Diet Plan Tab */}
            {(activeTab === 'diet' || window.matchMedia('print').matches) && aiData?.dietPlan && (
                <div className="diet-section space-y-6 print:block">
                    <h2 className="hidden text-2xl font-bold print:block">Diet Plan</h2>

                    {/* Macros Summary */}
                    <div className="grid grid-cols-4 gap-4 print:mb-6">
                        <div className="rounded-lg bg-blue-50 p-4 print:border print:border-blue-200">
                            <p className="text-sm text-blue-600">Daily Calories</p>
                            <p className="text-2xl font-bold text-blue-900">{aiData.dietPlan.calories || 'N/A'}</p>
                        </div>
                        <div className="rounded-lg bg-green-50 p-4 print:border print:border-green-200">
                            <p className="text-sm text-green-600">Protein</p>
                            <p className="text-2xl font-bold text-green-900">{aiData.dietPlan.macros?.protein || 'N/A'}g</p>
                        </div>
                        <div className="rounded-lg bg-yellow-50 p-4 print:border print:border-yellow-200">
                            <p className="text-sm text-yellow-600">Carbs</p>
                            <p className="text-2xl font-bold text-yellow-900">{aiData.dietPlan.macros?.carbs || 'N/A'}g</p>
                        </div>
                        <div className="rounded-lg bg-red-50 p-4 print:border print:border-red-200">
                            <p className="text-sm text-red-600">Fats</p>
                            <p className="text-2xl font-bold text-red-900">{aiData.dietPlan.macros?.fats || 'N/A'}g</p>
                        </div>
                    </div>

                    {/* Day-wise Meal Table */}
                    <div className="rounded-lg bg-white shadow print:shadow-none">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Day</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Breakfast</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Mid-Morning</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Lunch</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Evening</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Dinner</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {dayWiseDiet.map((dayData, idx) => (
                                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                            <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">{dayData.day}</td>
                                            <td className="px-4 py-3 text-sm text-gray-700">{dayData.breakfast.replace(/^Day \d+:\s*/, '')}</td>
                                            <td className="px-4 py-3 text-sm text-gray-700">{dayData.midMorningSnack.replace(/^Day \d+:\s*/, '')}</td>
                                            <td className="px-4 py-3 text-sm text-gray-700">{dayData.lunch.replace(/^Day \d+:\s*/, '')}</td>
                                            <td className="px-4 py-3 text-sm text-gray-700">{dayData.eveningSnack.replace(/^Day \d+:\s*/, '')}</td>
                                            <td className="px-4 py-3 text-sm text-gray-700">{dayData.dinner.replace(/^Day \d+:\s*/, '')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {aiData.dietPlan.notes && (
                            <div className="border-t border-gray-200 bg-amber-50 p-4">
                                <p className="text-sm font-medium text-amber-900">Notes:</p>
                                <p className="mt-1 text-sm text-amber-700">{aiData.dietPlan.notes}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Workout Plan Tab */}
            {(activeTab === 'workout' || window.matchMedia('print').matches) && aiData?.workoutPlan && (
                <div className="workout-section space-y-6 print:block print:page-break-before">
                    <h2 className="hidden text-2xl font-bold print:block">Workout Plan</h2>

                    {aiData.workoutPlan.weeklySchedule?.map((day: any, idx: number) => (
                        <div key={idx} className="rounded-lg bg-white shadow print:mb-4 print:shadow-none print:border print:border-gray-200">
                            <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="text-lg font-medium text-gray-900">{day.day}</h4>
                                        <p className="text-sm text-gray-600">{day.focus}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-gray-500">Duration</p>
                                        <p className="text-lg font-medium text-gray-900">{day.duration} min</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6">
                                {day.warmup && (
                                    <div className="mb-4 rounded-lg bg-blue-50 p-3 print:border print:border-blue-200">
                                        <p className="text-xs font-medium text-blue-900">Warmup:</p>
                                        <p className="text-sm text-blue-700">{day.warmup}</p>
                                    </div>
                                )}

                                <table className="min-w-full">
                                    <thead>
                                        <tr className="border-b border-gray-200">
                                            <th className="pb-2 text-left text-xs font-medium uppercase text-gray-500">Exercise</th>
                                            <th className="pb-2 text-center text-xs font-medium uppercase text-gray-500">Sets × Reps</th>
                                            <th className="pb-2 text-center text-xs font-medium uppercase text-gray-500">Rest</th>
                                            <th className="pb-2 text-left text-xs font-medium uppercase text-gray-500">Notes</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {day.exercises?.map((exercise: any, exIdx: number) => (
                                            <tr key={exIdx} className="border-b border-gray-100">
                                                <td className="py-3 pr-4 text-sm font-medium text-gray-900">{exercise.name}</td>
                                                <td className="py-3 text-center text-sm text-gray-700">{exercise.sets} × {exercise.reps}</td>
                                                <td className="py-3 text-center text-sm text-gray-600">{exercise.rest}</td>
                                                <td className="py-3 text-sm text-gray-600">{exercise.notes || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {day.cooldown && (
                                    <div className="mt-4 rounded-lg bg-green-50 p-3 print:border print:border-green-200">
                                        <p className="text-xs font-medium text-green-900">Cooldown:</p>
                                        <p className="text-sm text-green-700">{day.cooldown}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {aiData.workoutPlan.notes && (
                        <div className="rounded-lg bg-amber-50 p-4 print:border print:border-amber-200">
                            <p className="text-sm font-medium text-amber-900">Important Notes:</p>
                            <p className="mt-1 text-sm text-amber-700">{aiData.workoutPlan.notes}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
