import React, { useState } from 'react';
import {
  Workflow,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  Code2,
  ChevronDown,
  ChevronUp,
  Truck,
} from 'lucide-react';
import {
  COURIERS,
  type CourierActionItem,
  type CourierId,
} from '../utils/ndr-rules';

interface CourierActionPlanCardProps {
  actionPlan: CourierActionItem[];
  courierId: CourierId;
}

export const CourierActionPlanCard: React.FC<CourierActionPlanCardProps> = ({
  actionPlan,
  courierId,
}) => {
  const [showPayload, setShowPayload] = useState<number | null>(null);
  const courier = COURIERS[courierId];

  const togglePayload = (idx: number) => {
    setShowPayload(showPayload === idx ? null : idx);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm flex flex-col h-full overflow-hidden">
      {/* Card Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Workflow className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              2. Courier Action Plan
            </h3>
            <p className="text-[11px] text-slate-500">
              Assigned to <span className="font-semibold text-slate-800">{courier.name}</span>
            </p>
          </div>
        </div>

        {/* Courier Badge */}
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${courier.badgeColor}`}>
          {courier.name}
        </span>
      </div>

      {/* Plan Items List */}
      <div className="p-4 sm:p-5 space-y-3.5 flex-1 overflow-y-auto">
        {actionPlan.map((action, idx) => {
          let statusBadge = (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
              <CheckCircle2 className="w-3 h-3 text-emerald-600 stroke-[2.5]" />
              Supported
            </span>
          );

          let borderColor = 'border-emerald-200/90 bg-emerald-50/20';
          if (action.status === 'partial') {
            statusBadge = (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                <AlertCircle className="w-3 h-3 text-amber-600 stroke-[2.5]" />
                Partial / Note
              </span>
            );
            borderColor = 'border-amber-200/90 bg-amber-50/20';
          } else if (action.status === 'unsupported') {
            statusBadge = (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
                <XCircle className="w-3 h-3 text-rose-600 stroke-[2.5]" />
                Not Supported
              </span>
            );
            borderColor = 'border-rose-200/90 bg-rose-50/20';
          }

          const isPayloadOpen = showPayload === idx;

          return (
            <div
              key={`${action.intent}-${idx}`}
              className={`p-3.5 rounded-xl border transition-all ${borderColor}`}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {action.intentLabel}
                </div>
                {statusBadge}
              </div>

              <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                {action.actionTitle}
              </h4>

              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                {action.description}
              </p>

              {/* SLA & Action Code footer */}
              <div className="mt-2.5 pt-2 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <div className="flex items-center gap-1 text-slate-500">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>{action.sla}</span>
                </div>

                {action.technicalPayloadSnippet && (
                  <button
                    onClick={() => togglePayload(idx)}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-800 cursor-pointer"
                  >
                    <Code2 className="w-3 h-3" />
                    <span>{isPayloadOpen ? 'Hide Payload' : 'API Payload'}</span>
                    {isPayloadOpen ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </button>
                )}
              </div>

              {/* Collapsible API Dispatch Payload */}
              {isPayloadOpen && action.technicalPayloadSnippet && (
                <div className="mt-2.5 p-2.5 rounded-lg bg-slate-900 text-slate-200 font-mono text-[10px] overflow-x-auto shadow-inner">
                  <div className="text-slate-400 mb-1 text-[9px] uppercase tracking-wider font-sans">
                    Webhook Dispatch Snippet:
                  </div>
                  <pre>{JSON.stringify(action.technicalPayloadSnippet, null, 2)}</pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
