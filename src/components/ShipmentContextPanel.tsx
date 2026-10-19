import React from 'react';
import {
  Package,
  Layers,
  Clock,
  IndianRupee,
  ShieldAlert,
  KeyRound,
  RotateCcw,
  Sparkles,
  SlidersHorizontal,
} from 'lucide-react';
import {
  SCENARIO_PRESETS,
  type NDRReason,
  type ScenarioPreset,
  type ShipmentContext,
  type ShipmentStatus,
} from '../utils/rules-engine';
import type { CourierId } from '../utils/ndr-rules';

interface ShipmentContextPanelProps {
  context: ShipmentContext;
  onContextChange: (ctx: ShipmentContext) => void;
  onSelectPreset: (preset: ScenarioPreset) => void;
  selectedPresetId: string | null;
}

export const ShipmentContextPanel: React.FC<ShipmentContextPanelProps> = ({
  context,
  onContextChange,
  onSelectPreset,
  selectedPresetId,
}) => {
  const updateField = <K extends keyof ShipmentContext>(
    key: K,
    value: ShipmentContext[K]
  ) => {
    onContextChange({ ...context, [key]: value });
  };

  const shipmentStatuses: ShipmentStatus[] = [
    'Dispatched',
    'In transit',
    'Out for delivery',
    'NDR raised',
    'RTO initiated',
  ];

  const ndrReasons: NDRReason[] = [
    'Customer unavailable',
    'Address issue',
    'Refused',
    'Pincode unserviceable',
    'None',
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 sm:p-5 mb-5">
      {/* 8 Clickable Scenario Presets */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
            Shipment Scenario Presets (8 Indian NDR Benchmarks)
          </label>
          <span className="text-[11px] text-slate-400">Click to pre-fill context & reply</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5">
          {SCENARIO_PRESETS.map((preset) => {
            const isSelected = selectedPresetId === preset.id;
            const isBlocked = preset.expectedOutcome === 'Blocked';
            const isEscalate = preset.expectedOutcome === 'Needs human';

            return (
              <button
                key={preset.id}
                onClick={() => onSelectPreset(preset)}
                className={`text-left p-2 rounded-xl border text-xs transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-950 shadow-xs ring-1 ring-indigo-400'
                    : 'bg-slate-50/70 hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
                title={preset.subtitle}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-bold text-[11px] truncate">
                      {preset.title.split('.')[1] || preset.title}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 line-clamp-1 leading-tight">
                    {preset.subtitle}
                  </p>
                </div>

                <div className="mt-1.5 pt-1 border-t border-slate-200/60 flex items-center justify-between">
                  <span
                    className={`text-[9px] font-black uppercase px-1 py-0.2 rounded ${
                      isBlocked
                        ? 'bg-rose-100 text-rose-800'
                        : isEscalate
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {preset.expectedOutcome}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Shipment Context Controls Grid */}
      <div className="pt-3 border-t border-slate-100">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-indigo-600" />
            Consignment Context Inputs
          </span>
          <span className="text-[11px] text-slate-400">
            Governs deterministic rule evaluations in real time
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          {/* 1. Shipment Status */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">
              Shipment Status
            </label>
            <select
              value={context.shipmentStatus}
              onChange={(e) => updateField('shipmentStatus', e.target.value as ShipmentStatus)}
              className="w-full py-1.5 px-2 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {shipmentStatuses.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Attempt Number */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">
              Attempt Count (1–3)
            </label>
            <div className="flex items-center rounded-lg border border-slate-300 overflow-hidden bg-slate-50">
              {[1, 2, 3].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => updateField('attemptNumber', num as 1 | 2 | 3)}
                  className={`flex-1 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                    context.attemptNumber === num
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  #{num}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Hours Since NDR */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">
              Hours Since NDR ({context.hoursSinceNdr}h)
            </label>
            <input
              type="number"
              min="0"
              max="96"
              value={context.hoursSinceNdr}
              onChange={(e) => updateField('hoursSinceNdr', Math.max(0, Number(e.target.value)))}
              className="w-full py-1.5 px-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* 4. Payment Mode */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">
              Payment Mode
            </label>
            <div className="flex items-center rounded-lg border border-slate-300 overflow-hidden bg-slate-50">
              {(['COD', 'Prepaid'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => updateField('paymentMode', mode)}
                  className={`flex-1 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                    context.paymentMode === mode
                      ? mode === 'COD'
                        ? 'bg-amber-600 text-white'
                        : 'bg-emerald-600 text-white'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* 5. Order Value (₹) */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">
              Order Value (₹)
            </label>
            <div className="relative">
              <span className="absolute left-2.5 top-2 text-slate-400 font-bold text-xs">₹</span>
              <input
                type="number"
                min="0"
                step="100"
                value={context.orderValue}
                onChange={(e) => updateField('orderValue', Math.max(0, Number(e.target.value)))}
                className="w-full py-1.5 pl-6 pr-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* 6. NDR Reason */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">
              NDR Failure Reason
            </label>
            <select
              value={context.ndrReason}
              onChange={(e) => updateField('ndrReason', e.target.value as NDRReason)}
              className="w-full py-1.5 px-2 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {ndrReasons.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Secondary context flags */}
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            {/* OTP Already Accepted (Yes/No) */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={context.otpAlreadyAccepted}
                onChange={(e) => updateField('otpAlreadyAccepted', e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
              />
              <span className="font-semibold text-slate-700">
                OTP Already Accepted:{' '}
                <strong className={context.otpAlreadyAccepted ? 'text-rose-700 font-bold' : 'text-slate-500'}>
                  {context.otpAlreadyAccepted ? 'Yes (Terminal)' : 'No'}
                </strong>
              </span>
            </label>

            {/* Mistake Claimed (for prepaid refusal) */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(context.isRefusalMistakeClaimed)}
                onChange={(e) => updateField('isRefusalMistakeClaimed', e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
              />
              <span className="font-semibold text-slate-700">
                Prepaid Refusal Marked as Mistake
              </span>
            </label>
          </div>

          {/* OFD duration tag */}
          {context.outForDeliveryDurationHours !== undefined && (
            <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
              OFD Duration: {context.outForDeliveryDurationHours * 60} mins ({'< 1h'} suspected fake)
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
