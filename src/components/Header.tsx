import React, { useState, useRef, useEffect } from 'react';
import {
  PackageX,
  Sparkles,
  TableProperties,
  Truck,
  History,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  ChevronDown,
  SlidersHorizontal,
} from 'lucide-react';
import type { CourierId } from '../utils/ndr-rules';
import { COURIERS } from '../utils/ndr-rules';
import type { HistoryItem } from '../utils/history';

interface HeaderProps {
  activeCourier: CourierId;
  onOpenMatrix: () => void;
  onOpenRulesModal?: () => void;
  history: HistoryItem[];
  onSelectHistoryItem: (item: HistoryItem) => void;
  onClearHistory: () => void;
  activeHistoryId: string | null;
}

export const Header: React.FC<HeaderProps> = ({
  activeCourier,
  onOpenMatrix,
  onOpenRulesModal,
  history,
  onSelectHistoryItem,
  onClearHistory,
  activeHistoryId,
}) => {
  const courier = COURIERS[activeCourier];
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsHistoryOpen(false);
      }
    };
    if (isHistoryOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isHistoryOpen]);

  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* App Title & Branding */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-100">
            <PackageX className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900">
                NDR Intent-to-Action Mapper
              </h1>
              <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                <Sparkles className="w-3 h-3 text-indigo-600" />
                Gemini 3.8 Flash
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
              Failed Delivery Resolution & Courier Capability Orchestrator • India
            </p>
          </div>
        </div>

        {/* Action Controls in Header */}
        <div className="flex items-center gap-2">
          {/* Active Courier Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
            <Truck className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-500">Carrier:</span>
            <span className="font-bold text-slate-900">{courier.name}</span>
          </div>

          {/* History Popover in Navbar */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                isHistoryOpen
                  ? 'bg-indigo-50 text-indigo-800 border-indigo-300 ring-2 ring-indigo-200'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
              }`}
              title="View recent analyzed queries"
            >
              <History className="w-3.5 h-3.5 text-indigo-600" />
              <span>History</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                {history.length}
              </span>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isHistoryOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* History Dropdown Menu */}
            {isHistoryOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-in fade-in duration-150">
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <History className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold text-slate-800">
                      Recent Analyses ({history.length} / 5)
                    </span>
                  </div>
                  {history.length > 0 && (
                    <button
                      onClick={() => {
                        onClearHistory();
                        setIsHistoryOpen(false);
                      }}
                      className="text-[11px] text-slate-400 hover:text-rose-600 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      Clear
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 p-1">
                  {history.length === 0 ? (
                    <div className="py-8 px-4 text-center text-slate-400 text-xs">
                      No analyses saved yet. Analyze a customer reply to save it here.
                    </div>
                  ) : (
                    history.map((item) => {
                      const isActive = activeHistoryId === item.id;
                      const c = COURIERS[item.courier];
                      const isAuto = item.escalationFlag === 'Auto-resolve';

                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            onSelectHistoryItem(item);
                            setIsHistoryOpen(false);
                          }}
                          className={`w-full text-left p-2.5 rounded-xl transition-all cursor-pointer flex flex-col gap-1.5 ${
                            isActive
                              ? 'bg-indigo-50/90 text-indigo-950 font-medium'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 text-[10px]">
                            <span className={`px-1.5 py-0.2 rounded font-bold border ${c.badgeColor}`}>
                              {c.name}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`px-1.5 py-0.2 rounded font-black uppercase text-[9px] flex items-center gap-0.5 ${
                                  isAuto ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {isAuto ? (
                                  <CheckCircle2 className="w-2.5 h-2.5" />
                                ) : (
                                  <AlertTriangle className="w-2.5 h-2.5" />
                                )}
                                {item.escalationFlag}
                              </span>
                              <span className="text-slate-400">{item.timestamp}</span>
                            </div>
                          </div>

                          <p className="text-xs text-slate-800 line-clamp-2 italic leading-snug">
                            "{item.replyText}"
                          </p>

                          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                            <span className="truncate max-w-[200px]">
                              {item.intentsSummary.join(', ')}
                            </span>
                            <span className="text-indigo-600 font-semibold flex items-center gap-0.5 shrink-0">
                              Restore <ArrowRight className="w-2.5 h-2.5" />
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Rules Engine Modal Button */}
          {onOpenRulesModal && (
            <button
              onClick={onOpenRulesModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-900 border border-indigo-200 hover:bg-indigo-100 transition-colors shadow-xs cursor-pointer"
              title="Click to view and edit 3-layer deterministic rules (Platform, Courier, Brand)"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-700" />
              <span className="hidden sm:inline">Rules Engine</span>
              <span className="bg-indigo-200/80 text-indigo-950 text-[10px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider">
                11 Rules
              </span>
            </button>
          )}

          {/* Illustrative data badge / Matrix modal button */}
          <button
            onClick={onOpenMatrix}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 transition-colors shadow-xs cursor-pointer"
            title="Click to view hardcoded capability matrix"
          >
            <TableProperties className="w-3.5 h-3.5 text-amber-700" />
            <span className="hidden sm:inline">Capabilities</span>
            <span className="bg-amber-200/80 text-amber-950 text-[10px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider">
              Illustrative data
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
