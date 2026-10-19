import React from 'react';
import { X, Check, AlertCircle, Info, ShieldAlert, Sparkles, ExternalLink } from 'lucide-react';
import {
  COURIERS,
  COURIER_CAPABILITY_TABLE,
  INTENT_META,
  type CourierId,
  type IntentType,
} from '../utils/ndr-rules';

interface CapabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeCourier: CourierId;
  onSelectCourier: (c: CourierId) => void;
}

export const CapabilityModal: React.FC<CapabilityModalProps> = ({
  isOpen,
  onClose,
  activeCourier,
  onSelectCourier,
}) => {
  if (!isOpen) return null;

  const couriers: CourierId[] = ['delhivery', 'bluedart', 'ecom_express'];
  const intentKeys = Object.keys(INTENT_META) as IntentType[];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              3PL
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Courier NDR Capability Matrix
                </h3>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  Illustrative data
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Cross-carrier operational rules for Indian e-commerce failed delivery resolutions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            aria-label="Close capability matrix"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 text-sm">
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-blue-900">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">How intent evaluation works: </span>
              When Gemini extracts intents from the customer's text, it verifies each against this
              matrix. High-priority intents (such as address changes or cancellations) trigger{' '}
              <strong className="font-semibold text-rose-800">Needs human</strong> escalation if
              unsupported by the selected courier.
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-sm">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
                  <th className="py-3 px-4 w-44">Customer Intent</th>
                  {couriers.map((cid) => (
                    <th
                      key={cid}
                      className={`py-3 px-4 w-64 ${
                        activeCourier === cid ? 'bg-indigo-50/70 border-x border-indigo-200' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{COURIERS[cid].name}</span>
                        {activeCourier === cid && (
                          <span className="text-[10px] bg-indigo-600 text-white font-medium px-1.5 py-0.5 rounded">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-normal text-slate-500 truncate">
                        {COURIERS[cid].tagline}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {intentKeys.map((intentKey) => {
                  const meta = INTENT_META[intentKey];
                  return (
                    <tr key={intentKey} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 align-top font-medium text-slate-900 bg-slate-50/50">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                          {meta.label}
                        </div>
                        <div className="text-[11px] text-slate-500 font-normal">
                          {meta.description}
                        </div>
                        {meta.highPriority && (
                          <span className="inline-block mt-1 text-[10px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded">
                            High Priority
                          </span>
                        )}
                      </td>

                      {couriers.map((cid) => {
                        const cap = COURIER_CAPABILITY_TABLE[cid][intentKey];
                        const isSupported = cap.supported;
                        const isSelected = activeCourier === cid;

                        return (
                          <td
                            key={cid}
                            className={`py-3 px-4 align-top ${
                              isSelected ? 'bg-indigo-50/20 border-x border-indigo-100' : ''
                            }`}
                          >
                            <div className="flex items-center gap-1.5 mb-1">
                              {isSupported ? (
                                <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-xs">
                                  <Check className="w-3 h-3 stroke-[3]" />
                                  Supported
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-rose-700 font-semibold bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full text-xs">
                                  <X className="w-3 h-3 stroke-[3]" />
                                  Not Supported
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-600 leading-snug">{cap.notes}</p>
                            <div className="mt-1 text-[11px] text-slate-400 font-mono">
                              SLA: {cap.sla}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Quick select courier:</span>
            {couriers.map((cid) => (
              <button
                key={cid}
                onClick={() => {
                  onSelectCourier(cid);
                  onClose();
                }}
                className={`px-2.5 py-1 rounded font-medium border transition-colors cursor-pointer ${
                  activeCourier === cid
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                {COURIERS[cid].name}
              </button>
            ))}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 text-white font-medium rounded-lg hover:bg-slate-900 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
