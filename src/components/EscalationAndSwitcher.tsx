import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Ban,
  UserCheck,
  UserX,
  ArrowRightLeft,
  Globe2,
  Gauge,
  Sparkles,
} from 'lucide-react';
import {
  COURIERS,
  type CourierId,
  type EscalationStatus,
} from '../utils/ndr-rules';

interface EscalationAndSwitcherProps {
  escalation: EscalationStatus;
  detectedLanguage: string;
  overallConfidence: number;
  activeCourier: CourierId;
  onSwitchCourier: (c: CourierId) => void;
  isSwitching?: boolean;
}

export const EscalationAndSwitcher: React.FC<EscalationAndSwitcherProps> = ({
  escalation,
  detectedLanguage,
  overallConfidence,
  activeCourier,
  onSwitchCourier,
  isSwitching,
}) => {
  const isAutoResolve = escalation.flag === 'Auto-resolve';
  const isBlocked = escalation.flag === 'Blocked';
  const couriers: CourierId[] = ['delhivery', 'bluedart', 'ecom_express'];

  return (
    <div className="space-y-4 mb-6">
      {/* Escalation Banner */}
      <div
        className={`rounded-2xl border p-4 sm:p-5 transition-all ${
          isBlocked
            ? 'bg-rose-50/90 border-rose-300 text-rose-950 shadow-xs'
            : isAutoResolve
            ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950 shadow-xs'
            : 'bg-amber-50/90 border-amber-300 text-amber-950 shadow-xs'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3.5">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                isBlocked
                  ? 'bg-rose-600 text-white'
                  : isAutoResolve
                  ? 'bg-emerald-600 text-white'
                  : 'bg-amber-500 text-white'
              }`}
            >
              {isBlocked ? (
                <Ban className="w-6 h-6 stroke-[2.5]" />
              ) : isAutoResolve ? (
                <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
              ) : (
                <AlertTriangle className="w-6 h-6 stroke-[2.5]" />
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-black tracking-wide uppercase ${
                    isBlocked
                      ? 'bg-rose-200/90 text-rose-900 border border-rose-300'
                      : isAutoResolve
                      ? 'bg-emerald-200/80 text-emerald-900 border border-emerald-300'
                      : 'bg-amber-200/90 text-amber-950 border border-amber-300'
                  }`}
                >
                  {escalation.flag}
                </span>

                <span className="text-xs font-semibold text-slate-500">
                  Deterministic Decision Engine
                </span>
              </div>

              <p className="mt-1 text-sm sm:text-base font-semibold leading-snug">
                {escalation.reason}
              </p>
            </div>
          </div>

          {/* Metadata badges */}
          <div className="flex sm:flex-col items-end gap-1.5 shrink-0 text-xs">
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/80 border border-slate-200 text-slate-700 font-medium">
              <Globe2 className="w-3.5 h-3.5 text-indigo-500" />
              <span>Language:</span>
              <strong className="text-slate-900 font-bold">{detectedLanguage}</strong>
            </div>

            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/80 border border-slate-200 text-slate-700 font-medium">
              <Gauge className="w-3.5 h-3.5 text-violet-500" />
              <span>Confidence:</span>
              <strong className="text-slate-900 font-bold">
                {Math.round(overallConfidence * 100)}%
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Courier Quick Switcher Toggle */}
      <div className="bg-slate-900 text-white rounded-2xl p-3 sm:p-4 shadow-md flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs sm:text-sm">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold">
            <ArrowRightLeft className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <span className="font-bold text-white block">Instant Courier Toggle:</span>
            <span className="text-slate-400 text-xs">
              Switch couriers below to instantly recalculate action plan & honest message for this reply
            </span>
          </div>
        </div>

        {/* Courier Toggle Segmented Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-800/90 rounded-xl border border-slate-700 w-full md:w-auto">
          {couriers.map((cid) => {
            const isSelected = activeCourier === cid;
            return (
              <button
                key={cid}
                onClick={() => onSwitchCourier(cid)}
                disabled={isSwitching}
                className={`flex-1 md:flex-none px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  isSelected
                    ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-sm ring-1 ring-white/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                <span>{COURIERS[cid].name}</span>
                {isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
