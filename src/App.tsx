import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { CapabilityModal } from './components/CapabilityModal';
import { RulesEditorModal } from './components/RulesEditorModal';
import { InputSection } from './components/InputSection';
import { ShipmentContextPanel } from './components/ShipmentContextPanel';
import { EscalationAndSwitcher } from './components/EscalationAndSwitcher';
import { DetectedIntentsCard } from './components/DetectedIntentsCard';
import { CourierActionPlanCard } from './components/CourierActionPlanCard';
import { CustomerMessageCard } from './components/CustomerMessageCard';
import { RuleTracePanel } from './components/RuleTracePanel';
import { Delivery3DScene } from './components/Delivery3DScene';
import { IntentDistributionSection } from './components/IntentDistributionSection';
import {
  COURIERS,
  SAMPLE_REPLIES,
  buildCourierActionPlan,
  evaluateEscalation,
  generateHonestCustomerMessage,
  type CourierId,
  type NDRAnalysisResult,
  type SampleReply,
} from './utils/ndr-rules';
import {
  STARTER_RULES,
  SCENARIO_PRESETS,
  evaluateRulesEngine,
  generateCustomerMessageWithRules,
  type ShipmentContext,
  type RuleDefinition,
  type ScenarioPreset,
  type RulesEngineOutput,
} from './utils/rules-engine';
import {
  loadHistoryFromStorage,
  saveAnalysisToStorage,
  clearStorageHistory,
  type HistoryItem,
} from './utils/history';
import { AlertCircle } from 'lucide-react';

export default function App() {
  const [selectedCourier, setSelectedCourier] = useState<CourierId>('delhivery');
  const [replyText, setReplyText] = useState<string>(SAMPLE_REPLIES[0].text);
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>(SAMPLE_REPLIES[0].id);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

  // Modals state
  const [isCapabilityModalOpen, setIsCapabilityModalOpen] = useState<boolean>(false);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState<boolean>(false);

  // Loading & network state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSwitching, setIsSwitching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<NDRAnalysisResult | null>(null);

  // Shipment Context state (initialized to Preset #1 values)
  const [shipmentContext, setShipmentContext] = useState<ShipmentContext>(SCENARIO_PRESETS[0].context);

  // Rules state (Platform, Courier, Brand)
  const [rules, setRules] = useState<RuleDefinition[]>(STARTER_RULES);

  // Local storage history state (maintains last 5 analyzed results, accessed via navbar and charts)
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isDemoData, setIsDemoData] = useState<boolean>(false);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);

  // Load history from localStorage on initial mount (seeds 5 demo entries if empty)
  useEffect(() => {
    const { items, isDemo } = loadHistoryFromStorage();
    setHistory(items);
    setIsDemoData(isDemo);
  }, []);

  // Deterministic Rules Engine evaluation (strictly in plain code: Platform > Courier > Brand)
  const rulesOutput: RulesEngineOutput = useMemo(() => {
    if (!analysisResult?.detectedIntents || analysisResult.detectedIntents.length === 0) {
      return {
        finalDecision: 'Auto-resolve',
        overallReason: 'Awaiting customer reply parsing.',
        intentEvaluations: [],
        ruleTraces: [],
        suggestedAction: 'Monitoring shipment telemetry and dispatch run-sheet',
        journeyStage: 4,
      };
    }
    return evaluateRulesEngine(shipmentContext, analysisResult.detectedIntents, selectedCourier, rules);
  }, [shipmentContext, analysisResult?.detectedIntents, selectedCourier, rules]);

  // Derived effective customer confirmation message adhering to engine rules
  const activeCustomerMessage = useMemo(() => {
    if (!analysisResult?.detectedIntents || analysisResult.detectedIntents.length === 0) {
      return analysisResult?.customerMessage || '';
    }
    return generateCustomerMessageWithRules(
      rulesOutput,
      analysisResult.detectedIntents,
      selectedCourier,
      analysisResult.detectedLanguage,
      shipmentContext
    );
  }, [rulesOutput, analysisResult, selectedCourier, shipmentContext]);

  // Derived effective escalation status reflecting finalDecision
  const activeEscalation = useMemo(() => {
    return {
      flag: rulesOutput.finalDecision,
      reason: rulesOutput.overallReason,
      severity: (rulesOutput.finalDecision === 'Blocked'
        ? 'high'
        : rulesOutput.finalDecision === 'Needs human'
        ? 'high'
        : 'low') as 'low' | 'medium' | 'high',
    };
  }, [rulesOutput]);

  // Derived action plan synced with deterministic rules engine (e.g. if blocked by OFD or max attempts)
  const activeActionPlan = useMemo(() => {
    if (!analysisResult?.detectedIntents) return [];
    const basePlan = buildCourierActionPlan(analysisResult.detectedIntents, selectedCourier);

    return basePlan.map((item) => {
      const evaluation = rulesOutput.intentEvaluations.find((e) => e.intent === item.intent);
      if (evaluation && evaluation.status === 'Blocked') {
        return {
          ...item,
          status: 'unsupported' as const,
          actionTitle: `Blocked: ${item.intentLabel}`,
          description: evaluation.effectiveReason,
        };
      }
      return item;
    });
  }, [analysisResult?.detectedIntents, selectedCourier, rulesOutput.intentEvaluations]);

  // Analysis function calling server-side Gemini 3.8 Flash
  const runAnalysis = useCallback(
    async (text: string, courier: CourierId, showLoader = true, isUserAction = true) => {
      if (!text.trim()) return;
      if (showLoader) setIsLoading(true);
      setError(null);
      setActiveHistoryId(null);

      try {
        const response = await fetch('/api/analyze-ndr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ replyText: text, courierId: courier }),
        });

        if (!response.ok) {
          throw new Error(`Server returned HTTP ${response.status}`);
        }

        const data: NDRAnalysisResult = await response.json();
        setAnalysisResult(data);

        // Save into local storage history (maintaining max 5)
        const { items: updatedHistory, isDemo } = saveAnalysisToStorage(
          text,
          courier,
          data,
          rulesOutput,
          isUserAction
        );
        setHistory(updatedHistory);
        setIsDemoData(isDemo);
      } catch (err: any) {
        console.warn('API error, applying client-side domain rules:', err);
        setError('Network offline or proxy unreachable. Using local NDR rules engine.');

        if (analysisResult?.detectedIntents) {
          const remappedPlan = buildCourierActionPlan(analysisResult.detectedIntents, courier);
          const remappedEscalation = evaluateEscalation(analysisResult.detectedIntents, courier);
          const remappedMsg = generateHonestCustomerMessage(
            analysisResult.detectedIntents,
            courier,
            analysisResult.detectedLanguage || 'Hinglish'
          );
          const fallbackData: NDRAnalysisResult = {
            ...analysisResult,
            courier,
            actionPlan: remappedPlan,
            escalation: remappedEscalation,
            customerMessage: remappedMsg,
          };
          setAnalysisResult(fallbackData);

          const { items: updatedHistory, isDemo } = saveAnalysisToStorage(
            text,
            courier,
            fallbackData,
            rulesOutput,
            isUserAction
          );
          setHistory(updatedHistory);
          setIsDemoData(isDemo);
        }
      } finally {
        if (showLoader) setIsLoading(false);
      }
    },
    [analysisResult, rulesOutput]
  );

  // Initial load with Sample 1 (populates cards; keeps seeded demo data until user interaction)
  useEffect(() => {
    runAnalysis(SAMPLE_REPLIES[0].text, 'delhivery', true, false);
  }, []);

  // Handle switching courier instantly
  const handleSwitchCourier = async (newCourier: CourierId) => {
    if (newCourier === selectedCourier) return;
    setSelectedCourier(newCourier);
    setActiveHistoryId(null);

    // If we already have detected intents from the model, instantly recalculate action plan,
    // escalation, and customer message so the UI responds in 0ms!
    if (analysisResult && analysisResult.detectedIntents.length > 0) {
      setIsSwitching(true);
      const newPlan = buildCourierActionPlan(analysisResult.detectedIntents, newCourier);
      const newEscalation = evaluateEscalation(analysisResult.detectedIntents, newCourier);
      const newCustomerMsg = generateHonestCustomerMessage(
        analysisResult.detectedIntents,
        newCourier,
        analysisResult.detectedLanguage
      );

      const updatedResult: NDRAnalysisResult = {
        ...analysisResult,
        courier: newCourier,
        actionPlan: newPlan,
        escalation: newEscalation,
        customerMessage: newCustomerMsg,
      };

      setAnalysisResult(updatedResult);

      const { items: updatedHistory, isDemo } = saveAnalysisToStorage(
        replyText,
        newCourier,
        updatedResult,
        rulesOutput,
        true
      );
      setHistory(updatedHistory);
      setIsDemoData(isDemo);

      // Also call server asynchronously to refresh with Gemini's nuanced phrasing
      try {
        const res = await fetch('/api/analyze-ndr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ replyText, courierId: newCourier }),
        });
        if (res.ok) {
          const freshData = await res.json();
          setAnalysisResult(freshData);
          const { items: freshHistory, isDemo: freshDemo } = saveAnalysisToStorage(
            replyText,
            newCourier,
            freshData,
            rulesOutput,
            true
          );
          setHistory(freshHistory);
          setIsDemoData(freshDemo);
        }
      } catch (e) {
        // Handled gracefully
      } finally {
        setIsSwitching(false);
      }
    } else {
      runAnalysis(replyText, newCourier, true, true);
    }
  };

  // Handle clicking sample reply
  const handleSelectSample = (sample: SampleReply) => {
    setSelectedSampleId(sample.id);
    setSelectedPresetId(null);
    setReplyText(sample.text);
    runAnalysis(sample.text, selectedCourier, true, true);
  };

  // Handle clicking scenario preset (fills shipment context, sets reply and courier)
  const handleSelectPreset = (preset: ScenarioPreset) => {
    setSelectedPresetId(preset.id);
    setSelectedSampleId(null);
    setActiveHistoryId(null);
    setShipmentContext(preset.context);
    setReplyText(preset.recommendedReply);
    setSelectedCourier(preset.courier);
    runAnalysis(preset.recommendedReply, preset.courier, true, true);
  };

  // Handle restoring a past analysis from navbar history
  const handleSelectHistoryItem = (item: HistoryItem) => {
    setActiveHistoryId(item.id);
    setSelectedSampleId(null);
    setSelectedPresetId(null);
    setReplyText(item.replyText);
    setSelectedCourier(item.courier);
    if (item.result) {
      setAnalysisResult(item.result);
    } else {
      runAnalysis(item.replyText, item.courier, true, false);
    }
  };

  // Handle clearing local storage history
  const handleClearHistory = () => {
    clearStorageHistory();
    setHistory([]);
    setIsDemoData(false);
    setActiveHistoryId(null);
  };

  // Handle toggle individual rule in rules engine
  const handleToggleRule = (ruleId: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r))
    );
  };

  // Handle resetting rules to defaults
  const handleResetRules = () => {
    setRules(STARTER_RULES);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans antialiased selection:bg-indigo-500 selection:text-white">
      {/* Navbar with App Title, Active Courier, History Popover, Rules Engine & Capability Modal */}
      <Header
        activeCourier={selectedCourier}
        onOpenMatrix={() => setIsCapabilityModalOpen(true)}
        onOpenRulesModal={() => setIsRulesModalOpen(true)}
        history={history}
        onSelectHistoryItem={handleSelectHistoryItem}
        onClearHistory={handleClearHistory}
        activeHistoryId={activeHistoryId}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5">
        {/* Error notification if any */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => runAnalysis(replyText, selectedCourier)}
              className="text-amber-800 font-bold hover:underline ml-2 cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Top Hero Section: Customer's Message / WA / SMS on Left + Compact 3D Scene on Side */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-5 items-stretch">
          {/* Main Input Form (Starts directly on top as requested) */}
          <div className="lg:col-span-8 flex flex-col">
            <InputSection
              replyText={replyText}
              setReplyText={(t) => {
                setReplyText(t);
                setSelectedSampleId(null);
                setSelectedPresetId(null);
                setActiveHistoryId(null);
              }}
              selectedCourier={selectedCourier}
              setSelectedCourier={handleSwitchCourier}
              onAnalyze={() => runAnalysis(replyText, selectedCourier, true, true)}
              isLoading={isLoading}
              selectedSampleId={selectedSampleId}
              onSelectSample={handleSelectSample}
            />
          </div>

          {/* Compact 3D Scene on the Side (Direct visibility into shipment position and suggested action) */}
          <div className="lg:col-span-4 flex flex-col">
            <Delivery3DScene
              activeCourier={selectedCourier}
              escalationFlag={activeEscalation.flag}
              shipmentStatus={shipmentContext.shipmentStatus}
              suggestedAction={rulesOutput.suggestedAction}
              onSelectStatus={(status) => {
                setShipmentContext((prev) => ({ ...prev, shipmentStatus: status }));
                setSelectedPresetId(null);
              }}
            />
          </div>
        </div>

        {/* Shipment Context Panel with 8 Benchmark Presets & Full Controls */}
        <ShipmentContextPanel
          context={shipmentContext}
          onContextChange={(newCtx) => {
            setShipmentContext(newCtx);
            setSelectedPresetId(null);
          }}
          onSelectPreset={handleSelectPreset}
          selectedPresetId={selectedPresetId}
        />

        {/* Results Area */}
        {analysisResult && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Escalation Status Banner & Instant Courier Switcher */}
            <EscalationAndSwitcher
              escalation={activeEscalation}
              detectedLanguage={analysisResult.detectedLanguage}
              overallConfidence={analysisResult.overallConfidence}
              activeCourier={selectedCourier}
              onSwitchCourier={handleSwitchCourier}
              isSwitching={isSwitching}
            />

            {/* The Three Core Output Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
              {/* Card 1: Detected Intents with Confidence */}
              <div className="min-h-[380px]">
                <DetectedIntentsCard intents={analysisResult.detectedIntents} />
              </div>

              {/* Card 2: Courier Action Plan with Green / Amber / Red status */}
              <div className="min-h-[380px]">
                <CourierActionPlanCard
                  actionPlan={activeActionPlan}
                  courierId={selectedCourier}
                />
              </div>

              {/* Card 3: Honest Customer Confirmation Message (Promising only allowed, explaining blocked) */}
              <div className="min-h-[380px]">
                <CustomerMessageCard
                  message={activeCustomerMessage}
                  detectedLanguage={analysisResult.detectedLanguage}
                  courierId={selectedCourier}
                  detectedIntents={analysisResult.detectedIntents}
                />
              </div>
            </div>

            {/* Intent Distribution (Last 5 Analyses) - Recharts Section */}
            <IntentDistributionSection
              history={history}
              isDemoData={isDemoData}
              onClearHistory={handleClearHistory}
            />

            {/* Deterministic Rule Execution Trace Panel with Layer Filter & "What If?" Sandbox */}
            <RuleTracePanel
              traces={rulesOutput.ruleTraces}
              context={shipmentContext}
              onContextChange={(newCtx) => {
                setShipmentContext(newCtx);
                setSelectedPresetId(null);
              }}
              selectedCourier={selectedCourier}
              onSwitchCourier={handleSwitchCourier}
              onOpenRulesEditor={() => setIsRulesModalOpen(true)}
            />
          </div>
        )}

        {/* Loading state indicator */}
        {!analysisResult && isLoading && (
          <div className="py-20 flex flex-col items-center justify-center text-slate-500">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm font-semibold">Gemini is parsing intents and evaluating rules engine...</p>
          </div>
        )}
      </main>

      {/* Courier Capability Matrix Modal */}
      <CapabilityModal
        isOpen={isCapabilityModalOpen}
        onClose={() => setIsCapabilityModalOpen(false)}
        activeCourier={selectedCourier}
        onSelectCourier={handleSwitchCourier}
      />

      {/* Editable Deterministic Rules Modal (3 Layers: Platform, Courier, Brand) */}
      <RulesEditorModal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
        rules={rules}
        onToggleRule={handleToggleRule}
        onResetRules={handleResetRules}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white/80 py-4 text-center text-xs text-slate-500 mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            NDR Intent-to-Action Mapper • Indian E-Commerce Delivery Logistics
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsRulesModalOpen(true)}
              className="text-indigo-600 hover:underline font-medium cursor-pointer"
            >
              Rules Engine (3 Layers)
            </button>
            <span>•</span>
            <button
              onClick={() => setIsCapabilityModalOpen(true)}
              className="text-indigo-600 hover:underline font-medium cursor-pointer"
            >
              Courier Capabilities
            </button>
            <span>•</span>
            <span className="text-slate-400">Illustrative data badge active</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
