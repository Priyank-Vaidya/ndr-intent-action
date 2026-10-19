import React, { useState } from 'react';
import {
  MessageSquareText,
  Copy,
  Check,
  Smartphone,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  Share2,
} from 'lucide-react';
import type { CourierId, DetectedIntent } from '../utils/ndr-rules';
import { COURIER_CAPABILITY_TABLE, COURIERS } from '../utils/ndr-rules';

interface CustomerMessageCardProps {
  message: string;
  detectedLanguage: string;
  courierId: CourierId;
  detectedIntents: DetectedIntent[];
}

export const CustomerMessageCard: React.FC<CustomerMessageCardProps> = ({
  message,
  detectedLanguage,
  courierId,
  detectedIntents,
}) => {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'whatsapp'>('whatsapp');
  const courier = COURIERS[courierId];
  const caps = COURIER_CAPABILITY_TABLE[courierId];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Compute what is promised vs what is disclaimed for transparency breakdown
  const promisedItems = detectedIntents.filter((i) => {
    const c = caps[i.intent];
    return c && c.supported && i.intent !== 'unclear';
  });

  const disclaimedItems = detectedIntents.filter((i) => {
    const c = caps[i.intent];
    return !c || !c.supported || i.intent === 'time_slot';
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm flex flex-col h-full overflow-hidden">
      {/* Card Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-700 flex items-center justify-center">
            <MessageSquareText className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              3. Customer Confirmation
            </h3>
            <p className="text-[11px] text-slate-500">
              Honest response in <span className="font-semibold text-slate-800">{detectedLanguage}</span>
            </p>
          </div>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 p-0.5 bg-slate-200/70 rounded-lg text-xs">
          <button
            onClick={() => setViewMode('whatsapp')}
            className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
              viewMode === 'whatsapp'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            WhatsApp
          </button>
          <button
            onClick={() => setViewMode('card')}
            className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
              viewMode === 'card'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Clean Text
          </button>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 sm:p-5 space-y-4 flex-1 flex flex-col justify-between overflow-y-auto">
        {viewMode === 'whatsapp' ? (
          /* WhatsApp Style Chat Bubble Simulation */
          <div className="rounded-xl bg-[#e5ddd5] p-3 sm:p-4 border border-[#d1c7be] shadow-inner relative flex-1 flex flex-col justify-center">
            {/* WhatsApp Header / Sender indicator */}
            <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-[#00000010] text-[11px]">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>E-Commerce Delivery Bot</span>
                <span className="text-[9px] font-normal text-slate-500 bg-white/70 px-1 rounded">
                  via WhatsApp
                </span>
              </div>
              <span className="text-slate-500 text-[10px]">Today</span>
            </div>

            {/* Message Bubble */}
            <div className="bg-white rounded-lg rounded-tl-none p-3 shadow-sm max-w-lg text-xs sm:text-sm text-slate-800 leading-relaxed relative">
              <p className="whitespace-pre-wrap">{message}</p>
              <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-slate-400">
                <span>Just now</span>
                <span className="text-sky-500 font-bold">✓✓</span>
              </div>
            </div>
          </div>
        ) : (
          /* Plain Text Card */
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs sm:text-sm leading-relaxed flex-1 flex flex-col justify-center">
            <p className="whitespace-pre-wrap font-sans">{message}</p>
          </div>
        )}

        {/* Honest Promises & Limitations Callout */}
        <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Honest Policy Check for {courier.name}:
          </div>

          <div className="grid grid-cols-1 gap-1.5">
            {promisedItems.length > 0 && (
              <div className="p-2 rounded-lg bg-emerald-50/70 border border-emerald-200/80 text-[11px] text-emerald-900 flex items-start gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Promised: </span>
                  {promisedItems.map((p) => p.label).join(', ')}
                </div>
              </div>
            )}

            {disclaimedItems.length > 0 && (
              <div className="p-2 rounded-lg bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-900 flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Explicitly Not Guaranteed: </span>
                  {disclaimedItems.map((d) => d.label).join(', ')}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between gap-2 pt-2">
          <div className="text-[11px] text-slate-400">
            {message.length} chars • ~{Math.ceil(message.split(' ').length / 30)} sec read
          </div>

          <button
            onClick={handleCopy}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              copied
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Message</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
