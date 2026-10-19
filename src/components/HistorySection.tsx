import React from 'react';
import { History, Clock, ArrowRight, Trash2, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';
import type { HistoryItem } from '../utils/history';
import { COURIERS } from '../utils/ndr-rules';

interface HistorySectionProps {
  history: HistoryItem[];
  onSelectHistoryItem: (item: HistoryItem) => void;
  onClearHistory: () => void;
  activeHistoryId: string | null;
}

export const HistorySection: React.FC<HistorySectionProps> = ({
  history,
  onSelectHistoryItem,
  onClearHistory,
  activeHistoryId,
}) => {
  if (history.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-5 mb-6">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
              Recent Analyses History
              <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                {history.length} / 5 saved
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Click any past analysis to instantly restore its intents, courier action plan & message
            </p>
          </div>
        </div>

        <button
          onClick={onClearHistory}
          className="text-[11px] text-slate-400 hover:text-rose-600 flex items-center gap-1 transition-colors cursor-pointer"
          title="Clear local storage history"
        >
          <Trash2 className="w-3 h-3" />
          <span>Clear History</span>
        </button>
      </div>

      {/* Grid of history cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
        {history.map((item) => {
          const isActive = activeHistoryId === item.id;
          const courier = COURIERS[item.courier];
          const isAutoResolve = item.escalationFlag === 'Auto-resolve';

          return (
            <button
              key={item.id}
              onClick={() => onSelectHistoryItem(item)}
              className={`text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                isActive
                  ? 'bg-indigo-50/80 border-indigo-500 shadow-xs ring-1 ring-indigo-400'
                  : 'bg-slate-50/60 hover:bg-slate-100/80 border-slate-200 text-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${courier.badgeColor}`}
                  >
                    {courier.name}
                  </span>

                  <span
                    className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded flex items-center gap-0.5 ${
                      isAutoResolve
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {isAutoResolve ? (
                      <CheckCircle2 className="w-2.5 h-2.5" />
                    ) : (
                      <AlertTriangle className="w-2.5 h-2.5" />
                    )}
                    {item.escalationFlag}
                  </span>
                </div>

                <p className="text-xs font-medium text-slate-800 line-clamp-2 leading-snug mb-2">
                  "{item.replyText}"
                </p>
              </div>

              <div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {item.intentsSummary.slice(0, 2).map((intentLabel) => (
                    <span
                      key={intentLabel}
                      className="text-[9px] font-medium bg-white text-slate-600 border border-slate-200 px-1 py-0.2 rounded"
                    >
                      {intentLabel}
                    </span>
                  ))}
                  {item.intentsSummary.length > 2 && (
                    <span className="text-[9px] text-slate-400">
                      +{item.intentsSummary.length - 2}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-slate-200/60">
                  <span className="flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {item.timestamp}
                  </span>
                  <span className="text-indigo-600 font-semibold flex items-center gap-0.5">
                    Restore <ArrowRight className="w-2.5 h-2.5" />
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
