import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  BarChart3,
  PieChart as PieIcon,
  Trash2,
  Lightbulb,
  CheckCircle2,
  AlertTriangle,
  Ban,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import {
  type HistoryItem,
  ALL_INTENT_CATEGORIES,
  INTENT_COLORS,
  OUTCOME_COLORS,
  generateHistoryInsight,
} from '../utils/history';
import { COURIERS } from '../utils/ndr-rules';

interface IntentDistributionSectionProps {
  history: HistoryItem[];
  isDemoData: boolean;
  onClearHistory: () => void;
}

type ChartView = 'stacked_bar' | 'donut';

export const IntentDistributionSection: React.FC<IntentDistributionSectionProps> = ({
  history,
  isDemoData,
  onClearHistory,
}) => {
  const [activeView, setActiveView] = useState<ChartView>('stacked_bar');

  // Chronological order for the bar chart (#1 oldest → #5 latest)
  const chronologicalItems = useMemo(() => {
    return [...history].reverse();
  }, [history]);

  // Total counts across all items in history
  const { totalIntents, categoryCounts, outcomeCounts } = useMemo(() => {
    let total = 0;
    const catMap: Record<string, number> = {};
    const outMap = { Supported: 0, Blocked: 0, Escalated: 0 };

    ALL_INTENT_CATEGORIES.forEach((cat) => {
      catMap[cat] = 0;
    });

    history.forEach((item) => {
      (item.intents || []).forEach((intent) => {
        total++;
        catMap[intent.type] = (catMap[intent.type] || 0) + 1;
        if (intent.outcome === 'Blocked') outMap.Blocked++;
        else if (intent.outcome === 'Escalated') outMap.Escalated++;
        else outMap.Supported++;
      });
    });

    return { totalIntents: total, categoryCounts: catMap, outcomeCounts: outMap };
  }, [history]);

  // Stacked Bar Data
  const stackedBarData = useMemo(() => {
    return chronologicalItems.map((item, idx) => {
      let label = `#${idx + 1}`;
      if (chronologicalItems.length > 1) {
        if (idx === 0) label = '#1 (oldest)';
        else if (idx === chronologicalItems.length - 1) {
          label = `#${chronologicalItems.length} (latest)`;
        }
      }

      const row: Record<string, any> = {
        label,
        courierName: COURIERS[item.courier]?.name || item.courier,
        timestamp: item.timestamp,
        replyPreview: item.replyPreview || item.replyText.slice(0, 40),
      };

      ALL_INTENT_CATEGORIES.forEach((cat) => {
        row[cat] = 0;
      });

      (item.intents || []).forEach((intent) => {
        row[intent.type] = (row[intent.type] || 0) + 1;
      });

      return row;
    });
  }, [chronologicalItems]);

  // Donut Chart Data
  const donutData = useMemo(() => {
    return ALL_INTENT_CATEGORIES.map((cat) => ({
      name: cat,
      count: categoryCounts[cat] || 0,
      percentage: totalIntents > 0 ? Math.round(((categoryCounts[cat] || 0) / totalIntents) * 100) : 0,
    })).filter((d) => d.count > 0);
  }, [categoryCounts, totalIntents]);

  // Horizontal Outcomes Data
  const horizontalOutcomeData = useMemo(() => {
    return [
      {
        name: 'Outcomes',
        Supported: outcomeCounts.Supported,
        Blocked: outcomeCounts.Blocked,
        Escalated: outcomeCounts.Escalated,
      },
    ];
  }, [outcomeCounts]);

  // Insight line
  const insightSentence = useMemo(() => {
    return generateHistoryInsight(history);
  }, [history]);

  const hasData = history.length > 0 && totalIntents > 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden p-5 sm:p-6 transition-all duration-200">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200/60 flex items-center justify-center text-indigo-600">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Intent Distribution (Last 5 Analyses)
              </h2>
              {isDemoData && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-amber-50 text-amber-700 border border-amber-200">
                  <Sparkles className="w-2.5 h-2.5" />
                  Demo data
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Aggregated intent breakdown across up to 5 consecutive customer reply analyses
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Segmented View Switcher */}
          <div className="inline-flex p-1 bg-slate-100/90 rounded-xl border border-slate-200/80">
            <button
              onClick={() => setActiveView('stacked_bar')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeView === 'stacked_bar'
                  ? 'bg-white text-indigo-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="View stacked bar chart"
              aria-label="Stacked bar chart view"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Stacked Bar</span>
            </button>
            <button
              onClick={() => setActiveView('donut')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeView === 'donut'
                  ? 'bg-white text-indigo-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="View donut share chart"
              aria-label="Donut chart view"
            >
              <PieIcon className="w-3.5 h-3.5" />
              <span>Donut Share</span>
            </button>
          </div>

          {/* Clear History Button */}
          {history.length > 0 && (
            <button
              onClick={onClearHistory}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-all cursor-pointer"
              title="Clear all stored analyses"
              aria-label="Clear analysis history"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear history</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {!hasData ? (
        <div className="py-14 px-4 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mb-3">
            <BarChart3 className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-700">Run an analysis to see trends</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            Analyze customer NDR replies or pick a scenario preset above to track intent distributions over time.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          {/* Chart View */}
          <div className="min-h-[290px] w-full">
            {activeView === 'stacked_bar' ? (
              <div className="w-full h-[290px]" aria-label="Stacked bar chart of intents per analysis">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stackedBarData}
                    margin={{ top: 15, right: 15, left: -10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                      axisLine={{ stroke: '#cbd5e1' }}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      axisLine={{ stroke: '#cbd5e1' }}
                      tickLine={false}
                      label={{
                        value: 'Intent Count',
                        angle: -90,
                        position: 'insideLeft',
                        offset: 15,
                        style: { fill: '#94a3b8', fontSize: 10, fontWeight: 600 },
                      }}
                    />
                    <Tooltip content={<CustomStackedTooltip />} />
                    {ALL_INTENT_CATEGORIES.map((cat) => (
                      <Bar
                        key={cat}
                        dataKey={cat}
                        stackId="analysis-stack"
                        fill={INTENT_COLORS[cat]}
                        radius={[0, 0, 0, 0]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="relative w-full h-[290px] flex items-center justify-center" aria-label="Donut chart showing combined share of intent types">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={105}
                      paddingAngle={2}
                    >
                      {donutData.map((entry) => (
                        <Cell key={`cell-${entry.name}`} fill={INTENT_COLORS[entry.name as keyof typeof INTENT_COLORS]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomDonutTooltip />} />
                  </PieChart>
                </ResponsiveContainer>

                {/* Donut center stat */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-3xl font-extrabold text-slate-800 tracking-tight leading-none">
                    {totalIntents}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Total Intents
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Accessible Legend with Counts & Percentages */}
          <div className="pt-2 border-t border-slate-100">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Intent Categories &amp; Frequency
            </p>
            <div className="flex flex-wrap items-center gap-2" role="list">
              {ALL_INTENT_CATEGORIES.map((cat) => {
                const count = categoryCounts[cat] || 0;
                const pct = totalIntents > 0 ? Math.round((count / totalIntents) * 100) : 0;
                const isPresent = count > 0;

                return (
                  <div
                    key={cat}
                    role="listitem"
                    aria-label={`${cat}: ${count} occurrences (${pct}% of total intents)`}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all ${
                      isPresent
                        ? 'bg-slate-50 border border-slate-200 text-slate-800 font-medium'
                        : 'bg-slate-50/50 border border-slate-100 text-slate-400 opacity-60'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ backgroundColor: INTENT_COLORS[cat] }}
                    />
                    <span className="font-semibold text-slate-900">{cat}</span>
                    <span className="text-slate-500 font-mono text-[11px]">
                      {count} ({pct}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Second small chart row: Horizontal Outcomes Breakdown (Supported / Blocked / Escalated) */}
          <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-xs font-bold text-slate-700 tracking-tight flex items-center gap-1.5">
                Outcome Resolution Breakdown (Green / Red / Amber)
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                Evaluated against courier capability matrix &amp; 3-layer rules engine
              </span>
            </div>

            {/* Horizontal Stacked Bar in Recharts */}
            <div className="w-full h-8" aria-label="Horizontal bar chart of Supported, Blocked, and Escalated intents">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={horizontalOutcomeData}
                  margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                >
                  <XAxis type="number" hide domain={[0, totalIntents]} />
                  <YAxis type="category" dataKey="name" hide />
                  <Tooltip content={<CustomOutcomeTooltip totalIntents={totalIntents} />} />
                  <Bar
                    dataKey="Supported"
                    stackId="outcomes"
                    fill={OUTCOME_COLORS.Supported}
                    radius={[4, 0, 0, 4]}
                  />
                  <Bar
                    dataKey="Blocked"
                    stackId="outcomes"
                    fill={OUTCOME_COLORS.Blocked}
                  />
                  <Bar
                    dataKey="Escalated"
                    stackId="outcomes"
                    fill={OUTCOME_COLORS.Escalated}
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Accessible labels beneath the horizontal bar */}
            <div className="flex flex-wrap items-center gap-3 pt-0.5">
              <div
                aria-label={`Supported intents: ${outcomeCounts.Supported}`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Supported:</span>
                <span className="font-mono font-bold text-emerald-800">
                  {outcomeCounts.Supported} (
                  {totalIntents > 0 ? Math.round((outcomeCounts.Supported / totalIntents) * 100) : 0}%)
                </span>
              </div>

              <div
                aria-label={`Blocked intents: ${outcomeCounts.Blocked}`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700"
              >
                <Ban className="w-3.5 h-3.5 text-rose-600" />
                <span>Blocked:</span>
                <span className="font-mono font-bold text-rose-800">
                  {outcomeCounts.Blocked} (
                  {totalIntents > 0 ? Math.round((outcomeCounts.Blocked / totalIntents) * 100) : 0}%)
                </span>
              </div>

              <div
                aria-label={`Escalated intents: ${outcomeCounts.Escalated}`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Escalated:</span>
                <span className="font-mono font-bold text-amber-800">
                  {outcomeCounts.Escalated} (
                  {totalIntents > 0 ? Math.round((outcomeCounts.Escalated / totalIntents) * 100) : 0}%)
                </span>
              </div>
            </div>
          </div>

          {/* Auto-generated Insight Line (No LLM call needed) */}
          <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-3.5 flex items-start gap-2.5">
            <Lightbulb className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <p className="text-xs text-indigo-950 font-medium leading-relaxed">
              <span className="font-bold text-indigo-900 mr-1.5">Distribution Insight:</span>
              {insightSentence}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// Custom Tooltip for Stacked Bar Chart
const CustomStackedTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  const activeEntries = payload.filter((p: any) => p.value > 0);

  return (
    <div className="bg-white/95 backdrop-blur-xs p-3 rounded-xl border border-slate-200 shadow-lg text-xs space-y-1.5 max-w-xs z-50">
      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
        <span className="font-bold text-slate-900">{label}</span>
        <span className="font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded text-[10px]">
          {data.courierName}
        </span>
      </div>
      <p className="text-[11px] text-slate-500 italic line-clamp-2">
        "{data.replyPreview}..."
      </p>
      <div className="pt-1 space-y-1">
        {activeEntries.length === 0 ? (
          <span className="text-slate-400 text-[10px]">No intents</span>
        ) : (
          activeEntries.map((entry: any) => (
            <div key={entry.name} className="flex items-center justify-between gap-3 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-xs"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-slate-700 font-medium">{entry.name}</span>
              </div>
              <span className="font-mono font-bold text-slate-900">{entry.value}</span>
            </div>
          ))
        )}
      </div>
      <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100 flex justify-between">
        <span>Logged at:</span>
        <span>{data.timestamp}</span>
      </div>
    </div>
  );
};

// Custom Tooltip for Donut Chart
const CustomDonutTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;

  return (
    <div className="bg-white/95 backdrop-blur-xs p-2.5 rounded-xl border border-slate-200 shadow-lg text-xs space-y-1 z-50">
      <div className="flex items-center gap-1.5">
        <span
          className="w-2.5 h-2.5 rounded-xs"
          style={{ backgroundColor: INTENT_COLORS[data.name as keyof typeof INTENT_COLORS] }}
        />
        <span className="font-bold text-slate-900">{data.name}</span>
      </div>
      <div className="flex items-center justify-between gap-4 text-slate-600 pt-0.5">
        <span>Frequency:</span>
        <span className="font-bold font-mono text-slate-900">
          {data.count} ({data.percentage}%)
        </span>
      </div>
    </div>
  );
};

// Custom Tooltip for Horizontal Outcome Bar
const CustomOutcomeTooltip = ({ active, payload, totalIntents }: any) => {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0].payload;

  const supPct = totalIntents > 0 ? Math.round((item.Supported / totalIntents) * 100) : 0;
  const blkPct = totalIntents > 0 ? Math.round((item.Blocked / totalIntents) * 100) : 0;
  const escPct = totalIntents > 0 ? Math.round((item.Escalated / totalIntents) * 100) : 0;

  return (
    <div className="bg-white/95 backdrop-blur-xs p-2.5 rounded-xl border border-slate-200 shadow-lg text-xs space-y-1.5 z-50">
      <span className="font-bold text-slate-900 block border-b border-slate-100 pb-1">
        Outcome Distribution ({totalIntents} total)
      </span>
      <div className="flex items-center justify-between gap-3 text-emerald-700">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          Supported:
        </span>
        <span className="font-mono font-bold">{item.Supported} ({supPct}%)</span>
      </div>
      <div className="flex items-center justify-between gap-3 text-rose-700">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-rose-500" />
          Blocked:
        </span>
        <span className="font-mono font-bold">{item.Blocked} ({blkPct}%)</span>
      </div>
      <div className="flex items-center justify-between gap-3 text-amber-700">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          Escalated:
        </span>
        <span className="font-mono font-bold">{item.Escalated} ({escPct}%)</span>
      </div>
    </div>
  );
};
