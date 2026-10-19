import React, { useState, useRef } from 'react';
import {
  Send,
  Sparkles,
  Truck,
  RotateCcw,
  MessageSquare,
  Mic,
  MicOff,
  Square,
  Volume2,
} from 'lucide-react';
import {
  COURIERS,
  SAMPLE_REPLIES,
  type CourierId,
  type SampleReply,
} from '../utils/ndr-rules';

interface InputSectionProps {
  replyText: string;
  setReplyText: (text: string) => void;
  selectedCourier: CourierId;
  setSelectedCourier: (c: CourierId) => void;
  onAnalyze: () => void;
  isLoading: boolean;
  selectedSampleId: string | null;
  onSelectSample: (sample: SampleReply) => void;
}

export const InputSection: React.FC<InputSectionProps> = ({
  replyText,
  setReplyText,
  selectedCourier,
  setSelectedCourier,
  onAnalyze,
  isLoading,
  selectedSampleId,
  onSelectSample,
}) => {
  const couriers: CourierId[] = ['delhivery', 'bluedart', 'ecom_express'];
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [transcribeNotice, setTranscribeNotice] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setRecordingSeconds(0);
      setTranscribeNotice(null);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        clearInterval(timerRef.current);
        // Stop all tracks to release microphone
        stream.getTracks().forEach((track) => track.stop());

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size === 0) return;

        setIsTranscribing(true);
        try {
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Data = (reader.result as string).split(',')[1];
            const response = await fetch('/api/transcribe-audio', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                audioData: base64Data,
                mimeType: 'audio/webm',
              }),
            });

            if (!response.ok) {
              throw new Error('Transcription failed');
            }

            const data = await response.json();
            if (data.text) {
              setReplyText(data.text);
              setTranscribeNotice('Audio transcribed with Gemini 3.5 Transcribe!');
              setTimeout(() => setTranscribeNotice(null), 4000);
            }
          };
        } catch (err) {
          console.error('Audio transcription error:', err);
          setTranscribeNotice('Audio transcription error. Please try again or type message.');
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn('Microphone access denied or unavailable:', err);
      setTranscribeNotice('Microphone access not available in this browser.');
      setTimeout(() => setTranscribeNotice(null), 4000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      onAnalyze();
    }
  };

  return (
    <section className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-5 h-full flex flex-col justify-between">
      {/* 5 Clickable Sample Replies */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
            Clickable Sample Replies (Indian NDR Scenarios)
          </label>
          <span className="text-[11px] text-slate-400">Click any chip to populate & test</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          {SAMPLE_REPLIES.map((sample, idx) => {
            const isSelected = selectedSampleId === sample.id;
            return (
              <button
                key={sample.id}
                onClick={() => onSelectSample(sample)}
                className={`text-left p-2.5 rounded-xl border text-xs transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-indigo-50/90 border-indigo-500 text-indigo-950 shadow-xs ring-1 ring-indigo-400'
                    : 'bg-slate-50/70 hover:bg-slate-100/90 border-slate-200 text-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-semibold truncate">
                      {idx + 1}. {sample.title}
                    </span>
                    <span className="shrink-0 text-[10px] px-1.5 py-0.2 rounded font-medium bg-slate-200/80 text-slate-700">
                      {sample.language}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-2 italic leading-relaxed">
                    "{sample.text}"
                  </p>
                </div>
                <div className="mt-2 pt-1 border-t border-slate-200/60 flex flex-wrap gap-1">
                  {sample.expectedIntents.slice(0, 2).map((ei) => (
                    <span
                      key={ei}
                      className="text-[9px] px-1 py-0.2 rounded bg-white text-slate-600 border border-slate-200"
                    >
                      {ei}
                    </span>
                  ))}
                  {sample.expectedIntents.length > 2 && (
                    <span className="text-[9px] text-slate-400">
                      +{sample.expectedIntents.length - 2}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Input Form */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Customer Reply Text Area */}
          <div className="lg:col-span-8 flex flex-col">
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="customer-reply-box" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                Customer's WhatsApp / SMS Reply
                <span className="text-[11px] font-normal text-slate-400">
                  (Hinglish, English, or Indian regional languages)
                </span>
              </label>

              <div className="flex items-center gap-2">
                {/* Voice Input with Gemini 3.5 Transcribe */}
                {isRecording ? (
                  <button
                    onClick={stopRecording}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-600 text-white animate-pulse shadow-xs cursor-pointer"
                    title="Stop recording"
                  >
                    <Square className="w-3 h-3 fill-current" />
                    <span>Stop ({recordingSeconds}s)</span>
                  </button>
                ) : isTranscribing ? (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                    <div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    <span>Transcribing with Gemini 3.5...</span>
                  </div>
                ) : (
                  <button
                    onClick={startRecording}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors cursor-pointer"
                    title="Speak customer reply via microphone"
                  >
                    <Mic className="w-3 h-3 text-indigo-600" />
                    <span>Voice Input</span>
                  </button>
                )}

                {replyText && (
                  <button
                    onClick={() => setReplyText('')}
                    className="text-[11px] text-slate-400 hover:text-slate-600 flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Clear
                  </button>
                )}
              </div>
            </div>

            {transcribeNotice && (
              <div className="mb-2 p-2 rounded-lg bg-indigo-50 border border-indigo-200 text-xs font-medium text-indigo-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>{transcribeNotice}</span>
              </div>
            )}

            <div className="relative flex-1">
              <textarea
                id="customer-reply-box"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={4}
                placeholder="Type or paste customer's reply here... Or click 'Voice Input' to speak in Hinglish/Hindi/English"
                className="w-full h-full min-h-[105px] p-3 text-sm bg-slate-50/50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 placeholder:text-slate-400 transition-colors resize-y leading-relaxed"
              />
            </div>
          </div>

          {/* Courier Selector and Action Button */}
          <div className="lg:col-span-4 flex flex-col justify-between space-y-3">
            <div>
              <label htmlFor="courier-select" className="text-xs font-bold text-slate-700 block mb-1.5">
                Assigned Delivery Courier
              </label>

              {/* Styled Dropdown / Radio selection */}
              <div className="space-y-1.5">
                {couriers.map((cid) => {
                  const c = COURIERS[cid];
                  const isChecked = selectedCourier === cid;
                  return (
                    <label
                      key={cid}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        isChecked
                          ? 'border-indigo-600 bg-indigo-50/70 text-slate-900 font-semibold ring-1 ring-indigo-500/30'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          id={`courier-option-${cid}`}
                          name="courier-selector"
                          checked={isChecked}
                          onChange={() => setSelectedCourier(cid)}
                          className="text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                        />
                        <div>
                          <div className="text-slate-900 font-bold">{c.name}</div>
                          <div className="text-[10px] text-slate-500 line-clamp-1 font-normal">
                            {c.tagline}
                          </div>
                        </div>
                      </div>
                      <Truck className={`w-3.5 h-3.5 ${isChecked ? 'text-indigo-600' : 'text-slate-400'}`} />
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Run Button */}
            <button
              onClick={onAnalyze}
              disabled={isLoading || !replyText.trim()}
              className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Analyzing with Gemini...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Map Intents & Action Plan</span>
                  <span className="hidden sm:inline-block text-[11px] font-normal opacity-70 ml-1">
                    (Ctrl+Enter)
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
