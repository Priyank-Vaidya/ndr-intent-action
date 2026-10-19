import React, { useState } from 'react';
import {
  X,
  Shield,
  Layers,
  Check,
  AlertTriangle,
  Ban,
  AlertCircle,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Info,
  Search,
} from 'lucide-react';
import {
  STARTER_RULES,
  type RuleDefinition,
  type RuleLayer,
  type RuleEffect,
} from '../utils/rules-engine';

interface RulesEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  rules: RuleDefinition[];
  onToggleRule: (ruleId: string) => void;
  onResetRules: () => void;
}

export const RulesEditorModal: React.FC<RulesEditorModalProps> = ({
  isOpen,
  onClose,
  rules,
  onToggleRule,
  onResetRules,
}) => {
  const [selectedLayer, setSelectedLayer] = useState<'All' | RuleLayer>('All');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredRules = rules.filter((rule) => {
    if (selectedLayer !== 'All' && rule.layer !== selectedLayer) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        rule.name.toLowerCase().includes(q) ||
        rule.userFacingReason.toLowerCase().includes(q) ||
        rule.conditionDescription.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const layerCounts = {
    All: rules.length,
    Platform: rules.filter((r) => r.layer === 'Platform').length,
    Courier: rules.filter((r) => r.layer === 'Courier').length,
    Brand: rules.filter((r) => r.layer === 'Brand').length,
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Deterministic NDR Rules Engine
                </h3>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  Illustrative, based on public seller guides
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Hierarchical priority: <strong className="text-indigo-700">Platform</strong> &gt;{' '}
                <strong className="text-blue-700">Courier</strong> &gt;{' '}
                <strong className="text-purple-700">Brand</strong>. Platform always wins.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            aria-label="Close rules editor"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter bar */}
        <div className="px-6 py-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Layer tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            {(['All', 'Platform', 'Courier', 'Brand'] as const).map((layer) => (
              <button
                key={layer}
                onClick={() => setSelectedLayer(layer)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  selectedLayer === layer
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {layer} ({layerCounts[layer]})
              </button>
            ))}
          </div>

          {/* Search box & Reset */}
          <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-end">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Search rules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-44 sm:w-56"
              />
            </div>
            <button
              onClick={onResetRules}
              className="text-xs text-slate-500 hover:text-slate-800 font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Reset Defaults
            </button>
          </div>
        </div>

        {/* Rules List */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3">
          {filteredRules.map((rule) => {
            let effectBadge = (
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                ALLOW
              </span>
            );
            if (rule.effect === 'BLOCK') {
              effectBadge = (
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                  <Ban className="w-3 h-3" />
                  BLOCK
                </span>
              );
            } else if (rule.effect === 'ESCALATE') {
              effectBadge = (
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  ESCALATE
                </span>
              );
            } else if (rule.effect === 'WARN') {
              effectBadge = (
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-yellow-100 text-yellow-900 border border-yellow-200 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  WARN
                </span>
              );
            }

            let layerColor = 'bg-indigo-50 text-indigo-700 border-indigo-200';
            if (rule.layer === 'Courier') layerColor = 'bg-blue-50 text-blue-700 border-blue-200';
            if (rule.layer === 'Brand') layerColor = 'bg-purple-50 text-purple-700 border-purple-200';

            return (
              <div
                key={rule.id}
                className={`p-3.5 sm:p-4 rounded-xl border transition-all ${
                  rule.enabled
                    ? 'bg-white border-slate-200 shadow-xs'
                    : 'bg-slate-50/70 border-slate-200 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${layerColor}`}>
                      Layer: {rule.layer}
                    </span>
                    {effectBadge}
                    <span className="text-[10px] font-mono text-slate-400">
                      ID: {rule.id}
                    </span>
                    {rule.courierSpecific && (
                      <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded">
                        Target: {rule.courierSpecific}
                      </span>
                    )}
                  </div>

                  {/* Toggle Enable/Disable switch */}
                  <button
                    onClick={() => onToggleRule(rule.id)}
                    className="flex items-center gap-1 text-xs font-semibold cursor-pointer text-slate-600 hover:text-slate-900 shrink-0"
                    title={rule.enabled ? 'Disable rule' : 'Enable rule'}
                  >
                    {rule.enabled ? (
                      <ToggleRight className="w-6 h-6 text-indigo-600" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-slate-400" />
                    )}
                    <span className="hidden sm:inline">{rule.enabled ? 'Active' : 'Disabled'}</span>
                  </button>
                </div>

                <h4 className="text-sm font-bold text-slate-900 leading-snug mb-1">
                  {rule.name}
                </h4>

                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80 font-mono text-[11px] text-slate-700 mb-2">
                  <span className="text-slate-400 font-sans font-medium mr-1.5">Condition:</span>
                  {rule.conditionDescription}
                </div>

                <div className="text-xs text-slate-600 flex items-start gap-1.5 leading-relaxed">
                  <span className="font-semibold text-slate-800 shrink-0">User-Facing Reason:</span>
                  <span className="italic">"{rule.userFacingReason}"</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>
            Total Rules: <strong>{rules.length}</strong> (Active: {rules.filter((r) => r.enabled).length})
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 text-white font-medium rounded-lg hover:bg-slate-900 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
