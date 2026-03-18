'use client';

import { useState } from 'react';
import { Sparkles, Printer, RefreshCw, UtensilsCrossed, Dumbbell } from 'lucide-react';

interface AIAnalysisProps {
    memberId: string;
    initialData?: any;
    memberInfo?: any;   // full member object for print header
    onGenerate?: () => void;
}

// Strip leading "Day N: " prefix that AI sometimes includes in meal text
const cleanMealText = (text: string) => text?.replace(/^Day\s*\d+:\s*/i, '') || '-';

// ─── Print Helpers ────────────────────────────────────────────────────────────
// We open a NEW window with clean white HTML instead of using window.print()
// on the dark-themed page. This avoids:
//   - Dark background colors printing as solid black
//   - Having to fight Tailwind print: variants
//   - The active-tab problem (only one section is in the DOM at a time)

// Builds the gym logo + member details header block used in both print templates
function buildMemberHeader(member?: any): string {
    if (!member) return '';
    const bmi = member.bodyMeasurements?.height && member.bodyMeasurements?.weight
        ? (member.bodyMeasurements.weight / Math.pow(member.bodyMeasurements.height / 100, 2)).toFixed(1)
        : null;
    // Logo is served from /logo.png (public folder). Use absolute URL so the popup window can load it.
    const logoUrl = typeof window !== 'undefined' ? `${window.location.origin}/logo.png` : '/logo.png';
    return `
    <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #e5e7eb;padding-bottom:16px;margin-bottom:20px">
        <img src="${logoUrl}" alt="Logo" style="height:56px;object-fit:contain" onerror="this.style.display='none'"/>
        <div style="text-align:right;font-size:12px;color:#374151">
            <div style="font-size:18px;font-weight:700;color:#111;margin-bottom:4px">${member.name || ''}</div>
            ${member.memberId ? `<div>Member ID: <strong>${member.memberId}</strong></div>` : ''}
            ${member.phone ? `<div>Phone: ${member.phone}</div>` : ''}
            ${member.age || member.gender ? `<div>${[member.age ? `Age: ${member.age}` : '', member.gender ? `Gender: ${member.gender}` : ''].filter(Boolean).join(' &nbsp;|&nbsp; ')}</div>` : ''}
            ${bmi ? `<div>BMI: <strong>${bmi}</strong></div>` : ''}
            ${member.goals ? `<div style="max-width:260px;text-align:right">Goal: ${member.goals}</div>` : ''}
        </div>
    </div>`;
}

function buildDietPrintHTML(dietPlan: any, member?: any): string {
    const days = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];
    const rows = days.map((day, idx) => `
        <tr style="background:${idx % 2 === 0 ? '#fff' : '#f9fafb'}">
            <td style="padding:8px 12px;font-weight:600;border:1px solid #e5e7eb;white-space:nowrap">${day}</td>
            <td style="padding:8px 12px;border:1px solid #e5e7eb">${cleanMealText(dietPlan.breakfast?.[idx])}</td>
            <td style="padding:8px 12px;border:1px solid #e5e7eb">${cleanMealText(dietPlan.midMorningSnack?.[idx])}</td>
            <td style="padding:8px 12px;border:1px solid #e5e7eb">${cleanMealText(dietPlan.lunch?.[idx])}</td>
            <td style="padding:8px 12px;border:1px solid #e5e7eb">${cleanMealText(dietPlan.eveningSnack?.[idx])}</td>
            <td style="padding:8px 12px;border:1px solid #e5e7eb">${cleanMealText(dietPlan.dinner?.[idx])}</td>
        </tr>`).join('');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Diet Plan${member?.name ? ' – ' + member.name : ''}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #111; background: #fff; padding: 24px; }
    h1 { font-size: 20px; margin-bottom: 4px; }
    .sub { color: #555; font-size: 12px; margin-bottom: 20px; }
    .macros { display: flex; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
    .macro-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 20px; min-width: 110px; text-align: center; }
    .macro-label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: .5px; }
    .macro-value { font-size: 24px; font-weight: 700; }
    .cal { color: #1d4ed8; } .prot { color: #15803d; } .carb { color: #b45309; } .fat { color: #b91c1c; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th { background: #f3f4f6; padding: 8px 12px; text-align: left; border: 1px solid #e5e7eb; font-size: 11px; text-transform: uppercase; color: #374151; }
    .notes { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 12px 16px; margin-top: 12px; }
    .notes strong { color: #92400e; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  ${buildMemberHeader(member)}
  <h1>🥗 Diet Plan</h1>
  <p class="sub">Generated on ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>

  <div class="macros">
    <div class="macro-card"><div class="macro-label">Daily Calories</div><div class="macro-value cal">${dietPlan.calories || 'N/A'}</div></div>
    <div class="macro-card"><div class="macro-label">Protein</div><div class="macro-value prot">${dietPlan.macros?.protein ?? 'N/A'}g</div></div>
    <div class="macro-card"><div class="macro-label">Carbs</div><div class="macro-value carb">${dietPlan.macros?.carbs ?? 'N/A'}g</div></div>
    <div class="macro-card"><div class="macro-label">Fats</div><div class="macro-value fat">${dietPlan.macros?.fats ?? 'N/A'}g</div></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Day</th><th>Breakfast</th><th>Mid-Morning</th><th>Lunch</th><th>Evening Snack</th><th>Dinner</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  ${dietPlan.notes ? `<div class="notes"><strong>Notes: </strong>${dietPlan.notes}</div>` : ''}

  <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); }</script>
</body>
</html>`;
}

function buildWorkoutPrintHTML(workoutPlan: any, member?: any): string {
    const dayBlocks = (workoutPlan.weeklySchedule || []).map((day: any) => {
        const exerciseRows = (day.exercises || []).map((ex: any, i: number) => `
            <tr style="background:${i % 2 === 0 ? '#fff' : '#f9fafb'}">
                <td style="padding:7px 10px;border:1px solid #e5e7eb;font-weight:500">${ex.name}</td>
                <td style="padding:7px 10px;border:1px solid #e5e7eb;text-align:center">${ex.sets} × ${ex.reps}</td>
                <td style="padding:7px 10px;border:1px solid #e5e7eb;text-align:center">${ex.rest || '-'}</td>
                <td style="padding:7px 10px;border:1px solid #e5e7eb;color:#6b7280">${ex.notes || '-'}</td>
            </tr>`).join('');

        return `
        <div style="margin-bottom:24px;page-break-inside:avoid;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
            <div style="background:#f3f4f6;padding:12px 16px;display:flex;justify-content:space-between;align-items:center">
                <div>
                    <div style="font-size:16px;font-weight:700">${day.day}</div>
                    <div style="font-size:12px;color:#6b7280">${day.focus || ''}</div>
                </div>
                <div style="text-align:right">
                    <div style="font-size:11px;color:#9ca3af;text-transform:uppercase">Duration</div>
                    <div style="font-size:16px;font-weight:600">${day.duration || '—'} min</div>
                </div>
            </div>
            <div style="padding:12px 16px">
                ${day.warmup ? `<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:8px 12px;margin-bottom:10px;font-size:12px"><strong style="color:#1e40af">Warmup:</strong> ${day.warmup}</div>` : ''}
                <table style="width:100%;border-collapse:collapse;margin-bottom:10px">
                    <thead>
                        <tr>
                            <th style="padding:7px 10px;text-align:left;background:#f9fafb;border:1px solid #e5e7eb;font-size:11px;text-transform:uppercase;color:#374151">Exercise</th>
                            <th style="padding:7px 10px;text-align:center;background:#f9fafb;border:1px solid #e5e7eb;font-size:11px;text-transform:uppercase;color:#374151">Sets × Reps</th>
                            <th style="padding:7px 10px;text-align:center;background:#f9fafb;border:1px solid #e5e7eb;font-size:11px;text-transform:uppercase;color:#374151">Rest</th>
                            <th style="padding:7px 10px;text-align:left;background:#f9fafb;border:1px solid #e5e7eb;font-size:11px;text-transform:uppercase;color:#374151">Notes</th>
                        </tr>
                    </thead>
                    <tbody>${exerciseRows}</tbody>
                </table>
                ${day.cooldown ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:8px 12px;font-size:12px"><strong style="color:#166534">Cooldown:</strong> ${day.cooldown}</div>` : ''}
            </div>
        </div>`;
    }).join('');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Workout Plan${member?.name ? ' – ' + member.name : ''}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #111; background: #fff; padding: 24px; }
    h1 { font-size: 20px; margin-bottom: 4px; }
    .sub { color: #555; font-size: 12px; margin-bottom: 20px; }
    .notes { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 12px 16px; margin-top: 12px; }
    .notes strong { color: #92400e; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  ${buildMemberHeader(member)}
  <h1>🏋️ Workout Plan</h1>
  <p class="sub">Generated on ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>

  ${dayBlocks}

  ${workoutPlan.notes ? `<div class="notes"><strong>Important Notes: </strong>${workoutPlan.notes}</div>` : ''}

  <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); }</script>
</body>
</html>`;
}

function openPrintWindow(html: string) {
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) {
        alert('Pop-up blocked. Please allow pop-ups for this site to print.');
        return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AIAnalysis({ memberId, initialData, memberInfo, onGenerate }: AIAnalysisProps) {
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

    const handlePrintDiet = () => {
        if (!aiData?.dietPlan) return;
        openPrintWindow(buildDietPrintHTML(aiData.dietPlan, memberInfo));
    };

    const handlePrintWorkout = () => {
        if (!aiData?.workoutPlan) return;
        openPrintWindow(buildWorkoutPrintHTML(aiData.workoutPlan, memberInfo));
    };

    // Build day-wise rows for the diet table UI
    const getDayWiseDiet = () => {
        if (!aiData?.dietPlan) return [];
        return ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'].map((day, idx) => ({
            day,
            breakfast: cleanMealText(aiData.dietPlan.breakfast?.[idx]),
            midMorningSnack: cleanMealText(aiData.dietPlan.midMorningSnack?.[idx]),
            lunch: cleanMealText(aiData.dietPlan.lunch?.[idx]),
            eveningSnack: cleanMealText(aiData.dietPlan.eveningSnack?.[idx]),
            dinner: cleanMealText(aiData.dietPlan.dinner?.[idx]),
        }));
    };

    // ── Empty state ──
    if (!aiData && !loading) {
        return (
            <div className="rounded-lg bg-slate-800 p-8 text-center border border-slate-700">
                <Sparkles className="mx-auto h-12 w-12 text-indigo-400" />
                <h3 className="mt-4 text-lg font-medium text-slate-100">AI-Powered Personalized Plan</h3>
                <p className="mt-2 text-sm text-slate-400">
                    Generate a customized diet and workout plan based on this member's profile, goals, and body measurements.
                </p>
                <div className="mt-6 flex justify-center gap-4">
                    <button onClick={() => generatePlan('diet')} disabled={loading}
                        className="inline-flex items-center rounded-md bg-indigo-600 px-6 py-3 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                        <UtensilsCrossed className="mr-2 h-4 w-4" />
                        Generate Diet Plan
                    </button>
                    <button onClick={() => generatePlan('workout')} disabled={loading}
                        className="inline-flex items-center rounded-md bg-purple-600 px-6 py-3 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50">
                        <Dumbbell className="mr-2 h-4 w-4" />
                        Generate Workout Plan
                    </button>
                </div>
                {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
            </div>
        );
    }

    // ── Loading state ──
    if (loading) {
        return (
            <div className="rounded-lg bg-slate-800 p-8 text-center shadow border border-slate-700">
                <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
                <p className="mt-4 text-sm text-slate-300">Generating your personalized plan...</p>
                <p className="mt-2 text-xs text-slate-400">This may take 10–20 seconds</p>
            </div>
        );
    }

    const dayWiseDiet = getDayWiseDiet();

    return (
        <div className="ai-analysis-container space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between rounded-lg bg-slate-800 p-4 shadow border border-slate-700">
                <div>
                    <h3 className="text-lg font-medium text-slate-100">AI-Generated Plan</h3>
                    {activeTab === 'diet' && aiData?.dietPlan?.generatedAt && (
                        <p className="text-sm text-slate-400">
                            Diet generated on {new Date(aiData.dietPlan.generatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </p>
                    )}
                    {activeTab === 'workout' && aiData?.workoutPlan?.generatedAt && (
                        <p className="text-sm text-slate-400">
                            Workout generated on {new Date(aiData.workoutPlan.generatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </p>
                    )}
                </div>
                <div className="flex gap-2">
                    {activeTab === 'diet' ? (
                        <>
                            <button onClick={handlePrintDiet} disabled={!aiData?.dietPlan}
                                className="inline-flex items-center rounded-md border border-slate-600 bg-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-600 disabled:opacity-40">
                                <Printer className="mr-2 h-4 w-4" />
                                Print Diet
                            </button>
                            <button onClick={() => generatePlan('diet')} disabled={loading}
                                className="inline-flex items-center rounded-md border border-slate-600 bg-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-600 disabled:opacity-50">
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Regenerate
                            </button>
                        </>
                    ) : (
                        <>
                            <button onClick={handlePrintWorkout} disabled={!aiData?.workoutPlan}
                                className="inline-flex items-center rounded-md border border-slate-600 bg-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-600 disabled:opacity-40">
                                <Printer className="mr-2 h-4 w-4" />
                                Print Workout
                            </button>
                            <button onClick={() => generatePlan('workout')} disabled={loading}
                                className="inline-flex items-center rounded-md border border-slate-600 bg-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-600 disabled:opacity-50">
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Regenerate
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-700">
                <nav className="-mb-px flex space-x-8">
                    <button onClick={() => setActiveTab('diet')}
                        className={`flex items-center border-b-2 px-1 py-4 text-sm font-medium ${activeTab === 'diet'
                            ? 'border-indigo-500 text-indigo-400'
                            : 'border-transparent text-slate-400 hover:border-slate-600 hover:text-slate-300'}`}>
                        <UtensilsCrossed className="mr-2 h-5 w-5" />
                        Diet Plan
                    </button>
                    <button onClick={() => setActiveTab('workout')}
                        className={`flex items-center border-b-2 px-1 py-4 text-sm font-medium ${activeTab === 'workout'
                            ? 'border-indigo-500 text-indigo-400'
                            : 'border-transparent text-slate-400 hover:border-slate-600 hover:text-slate-300'}`}>
                        <Dumbbell className="mr-2 h-5 w-5" />
                        Workout Plan
                    </button>
                </nav>
            </div>

            {/* ── DIET TAB ── */}
            {activeTab === 'diet' && (
                <>
                    {!aiData?.dietPlan ? (
                        <div className="py-12 text-center rounded-lg bg-slate-800 border-2 border-dashed border-slate-700">
                            <UtensilsCrossed className="mx-auto h-12 w-12 text-slate-500" />
                            <h3 className="mt-2 text-sm font-medium text-slate-100">No Diet Plan Generated</h3>
                            <p className="mt-1 text-sm text-slate-400">Generate a personalized diet plan for this member.</p>
                            <button onClick={() => generatePlan('diet')} disabled={loading}
                                className="mt-6 inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                                {loading ? 'Generating...' : 'Generate Diet Plan'}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Macros */}
                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                                <div className="rounded-lg bg-blue-900/20 p-4 border border-blue-900/30">
                                    <p className="text-sm text-blue-400">Daily Calories</p>
                                    <p className="text-2xl font-bold text-blue-200">{aiData.dietPlan.calories || 'N/A'}</p>
                                </div>
                                <div className="rounded-lg bg-green-900/20 p-4 border border-green-900/30">
                                    <p className="text-sm text-green-400">Protein</p>
                                    <p className="text-2xl font-bold text-green-200">{aiData.dietPlan.macros?.protein ?? 'N/A'}g</p>
                                </div>
                                <div className="rounded-lg bg-yellow-900/20 p-4 border border-yellow-900/30">
                                    <p className="text-sm text-yellow-400">Carbs</p>
                                    <p className="text-2xl font-bold text-yellow-200">{aiData.dietPlan.macros?.carbs ?? 'N/A'}g</p>
                                </div>
                                <div className="rounded-lg bg-red-900/20 p-4 border border-red-900/30">
                                    <p className="text-sm text-red-400">Fats</p>
                                    <p className="text-2xl font-bold text-red-200">{aiData.dietPlan.macros?.fats ?? 'N/A'}g</p>
                                </div>
                            </div>

                            {/* Meal Table */}
                            <div className="rounded-lg bg-slate-800 shadow border border-slate-700">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-slate-700">
                                        <thead className="bg-slate-900">
                                            <tr>
                                                {['Day', 'Breakfast', 'Mid-Morning', 'Lunch', 'Evening', 'Dinner'].map(h => (
                                                    <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-700 bg-slate-800">
                                            {dayWiseDiet.map((row, idx) => (
                                                <tr key={idx} className={idx % 2 === 0 ? 'bg-slate-800' : 'bg-slate-900/50'}>
                                                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-200">{row.day}</td>
                                                    <td className="px-4 py-3 text-sm text-slate-300">{row.breakfast}</td>
                                                    <td className="px-4 py-3 text-sm text-slate-300">{row.midMorningSnack}</td>
                                                    <td className="px-4 py-3 text-sm text-slate-300">{row.lunch}</td>
                                                    <td className="px-4 py-3 text-sm text-slate-300">{row.eveningSnack}</td>
                                                    <td className="px-4 py-3 text-sm text-slate-300">{row.dinner}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {aiData.dietPlan.notes && (
                                    <div className="border-t border-slate-700 bg-amber-900/20 p-4">
                                        <p className="text-sm font-medium text-amber-200">Notes:</p>
                                        <p className="mt-1 text-sm text-amber-300">{aiData.dietPlan.notes}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* ── WORKOUT TAB ── */}
            {activeTab === 'workout' && (
                <>
                    {!aiData?.workoutPlan ? (
                        <div className="py-12 text-center rounded-lg bg-slate-800 border-2 border-dashed border-slate-700">
                            <Dumbbell className="mx-auto h-12 w-12 text-slate-500" />
                            <h3 className="mt-2 text-sm font-medium text-slate-100">No Workout Plan Generated</h3>
                            <p className="mt-1 text-sm text-slate-400">Generate a personalized workout plan for this member.</p>
                            <button onClick={() => generatePlan('workout')} disabled={loading}
                                className="mt-6 inline-flex items-center rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50">
                                {loading ? 'Generating...' : 'Generate Workout Plan'}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {aiData.workoutPlan.weeklySchedule?.map((day: any, idx: number) => (
                                <div key={idx} className="rounded-lg bg-slate-800 shadow border border-slate-700">
                                    <div className="border-b border-slate-700 bg-slate-900 px-6 py-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="text-lg font-medium text-slate-100">{day.day}</h4>
                                                <p className="text-sm text-slate-400">{day.focus}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm text-slate-500">Duration</p>
                                                <p className="text-lg font-medium text-slate-100">{day.duration} min</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-6">
                                        {day.warmup && (
                                            <div className="mb-4 rounded-lg bg-blue-900/20 p-3 border border-blue-900/30">
                                                <p className="text-xs font-medium text-blue-200">Warmup:</p>
                                                <p className="text-sm text-blue-300">{day.warmup}</p>
                                            </div>
                                        )}
                                        <table className="min-w-full">
                                            <thead>
                                                <tr className="border-b border-slate-700">
                                                    <th className="pb-2 text-left text-xs font-medium uppercase text-slate-400">Exercise</th>
                                                    <th className="pb-2 text-center text-xs font-medium uppercase text-slate-400">Sets × Reps</th>
                                                    <th className="pb-2 text-center text-xs font-medium uppercase text-slate-400">Rest</th>
                                                    <th className="pb-2 text-left text-xs font-medium uppercase text-slate-400">Notes</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {day.exercises?.map((ex: any, exIdx: number) => (
                                                    <tr key={exIdx} className="border-b border-slate-700/50">
                                                        <td className="py-3 pr-4 text-sm font-medium text-slate-200">{ex.name}</td>
                                                        <td className="py-3 text-center text-sm text-slate-300">{ex.sets} × {ex.reps}</td>
                                                        <td className="py-3 text-center text-sm text-slate-400">{ex.rest}</td>
                                                        <td className="py-3 text-sm text-slate-400">{ex.notes || '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {day.cooldown && (
                                            <div className="mt-4 rounded-lg bg-green-900/20 p-3 border border-green-900/30">
                                                <p className="text-xs font-medium text-green-200">Cooldown:</p>
                                                <p className="text-sm text-green-300">{day.cooldown}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {aiData.workoutPlan.notes && (
                                <div className="rounded-lg bg-amber-900/20 p-4 border border-amber-900/30">
                                    <p className="text-sm font-medium text-amber-200">Important Notes:</p>
                                    <p className="mt-1 text-sm text-amber-300">{aiData.workoutPlan.notes}</p>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
