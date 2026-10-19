import React, { useState } from 'react';
import {
  GitCommit,
  CheckCircle2,
  Ban,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  Sliders,
  Filter,
  ArrowRight,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type {
  RuleTraceItem,
  RuleLayer,
  ShipmentStatus,
  ShipmentContext,
} from '../utils/rules-engine';
import { COURIERS, type CourierId } from '../utils/ndr-rules';

interface RuleTracePanelProps {
  traces: RuleTraceItem[];
  context: ShipmentContext;
  onContextChange: (ctx: ShipmentContext) => void;
  selectedCourier: CourierId;
  onSwitchCourier: (c: CourierId) => void;
  onOpenRulesEditor: () => void;
}

export const RuleTracePanel: React.FC<RuleTracePanelProps> = ({
  traces,
  context,
  onContextChange,
  selectedCourier,
  onSwitchCourier,
  onOpenRulesEditor,
}) => {
  const [selectedLayer, setSelectedLayer] = useState<'All' | RuleLayer>('All');
  const [isWhatIfOpen, setIsWhatIfOpen] = useState(false);

  const filteredTraces = traces.filter((trace) => {
    if (selectedLayer === 'All') return true;
    return trace.layer === selectedLayer;
  });

  const shipmentStatuses: ShipmentStatus[] = [
    'Dispatched',
    'In transit',
    'Out for delivery',
    'NDR raised',
    'RTO initiated',
  ];

  const couriers: CourierId[] = ['delhivery', 'bluedart', 'ecom_express'];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden mb-6">
      {/* Trace Header */}
      <div className="p-4 sm:p-5 bg-slate-50/70 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
            <GitCommit className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                Deterministic Rule Execution Trace
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                {traces.length} Rules Fired
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Evaluated strictly in code: Platform &gt; Courier &gt; Brand hierarchy
            </p>
          </div>
        </div>

        {/* Action Buttons: "What If?" Sandbox & Rules Config */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsWhatIfOpen(!isWhatIfOpen)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              isWhatIfOpen
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>"What If?" Sandbox</span>
            {isWhatIfOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          <button
            onClick={onOpenRulesEditor}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-bold px-2.5 py-1.5 rounded-lg border border-indigo-200 hover:bg-indigo-50 transition-colors cursor-pointer"
          >
            View / Edit Rules
          </button>
        </div>
      </div>

      {/* "What If?" Sandbox Drawer */}
      {isWhatIfOpen && (
        <div className="p-4 bg-indigo-50/50 border-b border-indigo-100 animate-in fade-in duration-150 text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-indigo-950 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-indigo-600" />
              Live "What If?" Simulator
            </span>
            <span className="text-[11px] text-indigo-700">
              Change status or courier to see instant rule trace & plan re-execution
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Quick Change Status */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                Simulate Shipment Status:
              </label>
              <div className="flex flex-wrap gap-1">
                {shipmentStatuses.map((st) => (
                  <button
                    key={st}
                    onClick={() => onContextChange({ ...context, shipmentStatus: st })}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                      context.shipmentStatus === st
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Change Courier */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                Simulate Assigned Courier:
              </label>
              <div className="flex flex-wrap gap-1">
                {couriers.map((cid) => (
                  <button
                    key={cid}
                    onClick={() => onSwitchCourier(cid)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                      selectedCourier === cid
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {COURIERS[cid].name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Layer Filter Tabs */}
      <div className="px-4 py-2.5 bg-white border-b border-slate-100 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1 text-[11px]">
          <span className="text-slate-400 font-semibold mr-1">Filter Trace Layer:</span>
          {(['All', 'Platform', 'Courier', 'Brand'] as const).map((layer) => (
            <button
              key={layer}
              onClick={() => setSelectedLayer(layer)}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                selectedLayer === layer
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {layer}
            </button>
          ))}
        </div>

        <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
          Showing {filteredTraces.length} of {traces.length} trace items
        </span>
      </div>

      {/* Trace Items List */}
      <div className="p-4 sm:p-5 space-y-3">
        {filteredTraces.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400">
            No rules in the selected layer fired for this context.
          </div>
        ) : (
          filteredTraces.map((trace, idx) => {
            let effectPill = (
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                ALLOW
              </span>
            );
            if (trace.effect === 'BLOCK') {
              effectPill = (
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                  <Ban className="w-3 h-3" />
                  BLOCK
                </span>
              );
            } else if (trace.effect === 'ESCALATE') {
              effectPill = (
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  ESCALATE
                </span>
              );
            } else if (trace.effect === 'WARN') {
              effectPill = (
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-yellow-100 text-yellow-900 border border-yellow-200 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  WARN
                </span>
              );
            }

            let layerBadge = 'bg-indigo-50 text-indigo-700 border-indigo-200';
            if (trace.layer === 'Courier') layerBadge = 'bg-blue-50 text-blue-700 border-blue-200';
            if (trace.layer === 'Brand') layerBadge = 'bg-purple-50 text-purple-700 border-purple-200';

            return (
              <div
                key={`${trace.ruleId}-${idx}`}
                className={`p-3.5 rounded-xl border transition-all ${
                  trace.changedOutcome
                    ? 'bg-slate-50 border-slate-300 shadow-xs'
                    : 'bg-white border-slate-200/80'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${layerBadge}`}>
                      {trace.layer} Layer
                    </span>
                    {effectPill}
                    <span className="text-[11px] font-bold text-slate-800">
                      Applies to: {trace.appliesTo}
                    </span>
                  </div>

                  {trace.changedOutcome ? (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-900 border border-amber-300">
                      Changed Outcome
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400">Consistent</span>
                  )}
                </div>

                <h4 className="text-xs font-bold text-slate-900 leading-snug">
                  {trace.ruleName}
                </h4>

                <p className="mt-1 text-xs text-slate-600 leading-relaxed italic">
                  "{trace.userFacingReason}"
                </p>

                <div className="mt-2 text-[10px] text-slate-400 font-mono">
                  {trace.details} • ID: {trace.ruleId}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
