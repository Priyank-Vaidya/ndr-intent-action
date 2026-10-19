import React from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  PhoneCall,
  ShieldCheck,
  PhoneForwarded,
  XCircle,
  HelpCircle,
  Layers,
  Sparkles,
} from 'lucide-react';
import type { DetectedIntent, IntentType } from '../utils/ndr-rules';

interface DetectedIntentsCardProps {
  intents: DetectedIntent[];
}

const INTENT_ICONS: Record<IntentType, React.ReactNode> = {
  reschedule_date: <Calendar className="w-4 h-4 text-sky-600" />,
  time_slot: <Clock className="w-4 h-4 text-amber-600" />,
  address_change: <MapPin className="w-4 h-4 text-violet-600" />,
  alt_phone: <PhoneCall className="w-4 h-4 text-emerald-600" />,
  safe_drop: <ShieldCheck className="w-4 h-4 text-teal-600" />,
  call_before_arrival: <PhoneForwarded className="w-4 h-4 text-indigo-600" />,
  cancel_refuse: <XCircle className="w-4 h-4 text-rose-600" />,
  unclear: <HelpCircle className="w-4 h-4 text-slate-600" />,
};

export const DetectedIntentsCard: React.FC<DetectedIntentsCardProps> = ({ intents }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm flex flex-col h-full overflow-hidden">
      {/* Card Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              1. Detected Intents
            </h3>
            <p className="text-[11px] text-slate-500">
              Extracted via Gemini 3.8 Flash NLP
            </p>
          </div>
        </div>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
          {intents.length} {intents.length === 1 ? 'Intent' : 'Intents'}
        </span>
      </div>

      {/* Intents List */}
      <div className="p-4 sm:p-5 space-y-3.5 flex-1 overflow-y-auto">
        {intents.map((item, idx) => {
          const confidencePct = Math.round(item.confidence * 100);
          const icon = INTENT_ICONS[item.intent] || <HelpCircle className="w-4 h-4" />;

          return (
            <div
              key={`${item.intent}-${idx}`}
              className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/40 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-white border border-slate-200 shadow-xs">
                    {icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs sm:text-sm font-bold text-slate-900">
                        {item.label}
                      </span>
                      {item.isHighPriority && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200">
                          Critical
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Confidence Pill */}
                <div className="text-right shrink-0">
                  <div className="text-xs font-bold text-slate-800">
                    {confidencePct}%
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">
                    confidence
                  </span>
                </div>
              </div>

              {/* Confidence Progress Bar */}
              <div className="w-full bg-slate-200/70 h-1.5 rounded-full overflow-hidden mb-2.5">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    confidencePct >= 85
                      ? 'bg-emerald-500'
                      : confidencePct >= 70
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${confidencePct}%` }}
                />
              </div>

              {/* Extracted Entity / Value */}
              {item.extractedValue && (
                <div className="mb-2 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200/90 flex items-center gap-2 text-xs">
                  <span className="text-slate-400 font-medium">Extracted Value:</span>
                  <strong className="text-slate-900 font-semibold font-mono">
                    "{item.extractedValue}"
                  </strong>
                </div>
              )}

              {/* Rationale */}
              <p className="text-[11px] text-slate-500 leading-relaxed italic">
                Reason: {item.reasoning}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
