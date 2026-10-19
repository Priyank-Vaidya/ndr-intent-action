import type {
  CourierId,
  NDRAnalysisResult,
  DetectedIntent,
  CourierActionItem,
} from './ndr-rules';
import type { RulesEngineOutput } from './rules-engine';

export type IntentCategory =
  | 'Reschedule'
  | 'Time slot'
  | 'Address change'
  | 'Alt phone'
  | 'Safe-drop'
  | 'Call before arrival'
  | 'Cancel/Refuse'
  | 'Unclear';

export type IntentOutcome = 'Supported' | 'Blocked' | 'Escalated';

export interface HistoryIntent {
  type: IntentCategory;
  supported: boolean;
  outcome: IntentOutcome;
}

export interface HistoryItem {
  id: string;
  timestamp: string;
  courier: CourierId;
  replyPreview: string; // first 40 chars
  replyText: string;
  intents: HistoryIntent[];
  escalationFlag: 'Auto-resolve' | 'Needs human' | 'Blocked';
  escalationReason: string;
  detectedLanguage: string;
  intentsSummary: string[];
  result?: NDRAnalysisResult;
}

export const ALL_INTENT_CATEGORIES: IntentCategory[] = [
  'Reschedule',
  'Time slot',
  'Address change',
  'Alt phone',
  'Safe-drop',
  'Call before arrival',
  'Cancel/Refuse',
  'Unclear',
];

export const INTENT_COLORS: Record<IntentCategory, string> = {
  'Reschedule': '#4f46e5', // Indigo
  'Time slot': '#0284c7', // Sky Blue
  'Address change': '#059669', // Emerald
  'Alt phone': '#7c3aed', // Purple
  'Safe-drop': '#d97706', // Amber
  'Call before arrival': '#db2777', // Pink
  'Cancel/Refuse': '#dc2626', // Red (Strict requirement: red)
  'Unclear': '#64748b', // Grey (Strict requirement: grey)
};

export const OUTCOME_COLORS: Record<IntentOutcome, string> = {
  Supported: '#10b981', // Green
  Blocked: '#ef4444', // Red
  Escalated: '#f59e0b', // Amber
};

export function mapIntentTypeToCategory(intent: string): IntentCategory {
  switch (intent) {
    case 'reschedule_date':
      return 'Reschedule';
    case 'time_slot':
      return 'Time slot';
    case 'address_change':
      return 'Address change';
    case 'alt_phone':
      return 'Alt phone';
    case 'safe_drop':
      return 'Safe-drop';
    case 'call_before_arrival':
      return 'Call before arrival';
    case 'cancel_refuse':
      return 'Cancel/Refuse';
    default:
      return 'Unclear';
  }
}

/**
 * 5 realistic benchmark demo entries covering different couriers and intent types
 */
export const DEMO_HISTORY_ITEMS: HistoryItem[] = [
  {
    id: 'demo_1',
    timestamp: '10:42 AM',
    courier: 'delhivery',
    replyPreview: 'Bhaiya kal 2 baje deliver karna, aaj office me hu'.slice(0, 40),
    replyText: 'Bhaiya kal 2 baje deliver karna, aaj office me hu',
    intents: [
      { type: 'Reschedule', supported: true, outcome: 'Supported' },
      { type: 'Time slot', supported: false, outcome: 'Escalated' },
    ],
    escalationFlag: 'Needs human',
    escalationReason: 'Specific 2 PM time window cannot be guaranteed by Delhivery run-sheet',
    detectedLanguage: 'Hinglish',
    intentsSummary: ['Reschedule Delivery Date', 'Preferred Delivery Time Window'],
  },
  {
    id: 'demo_2',
    timestamp: '11:15 AM',
    courier: 'bluedart',
    replyPreview: 'Please leave at security guard desk, I am out of station'.slice(0, 40),
    replyText: 'Please leave at security guard desk, I am out of station',
    intents: [{ type: 'Safe-drop', supported: true, outcome: 'Supported' }],
    escalationFlag: 'Auto-resolve',
    escalationReason: 'Doorstep safe-drop handover accepted for prepaid parcel',
    detectedLanguage: 'English',
    intentsSummary: ['Safe-drop / Doorstep Delivery'],
  },
  {
    id: 'demo_3',
    timestamp: '01:20 PM',
    courier: 'ecom_express',
    replyPreview: 'Mera flat number 402 hai not 204, also call on 9876543210'.slice(0, 40),
    replyText: 'Mera flat number 402 hai not 204, also call on 9876543210',
    intents: [
      { type: 'Address change', supported: true, outcome: 'Supported' },
      { type: 'Alt phone', supported: true, outcome: 'Supported' },
    ],
    escalationFlag: 'Auto-resolve',
    escalationReason: 'Flat number landmark update and alternate mobile appended to courier run-sheet',
    detectedLanguage: 'Hinglish',
    intentsSummary: ['Update Delivery Address', 'Provide Alternate Phone Number'],
  },
  {
    id: 'demo_4',
    timestamp: '02:45 PM',
    courier: 'delhivery',
    replyPreview: 'Delivery boy ko bolo aane se pehle call kare'.slice(0, 40),
    replyText: 'Delivery boy ko bolo aane se pehle call kare',
    intents: [{ type: 'Call before arrival', supported: true, outcome: 'Supported' }],
    escalationFlag: 'Auto-resolve',
    escalationReason: 'Pre-call dispatch note passed to field delivery executive',
    detectedLanguage: 'Hinglish',
    intentsSummary: ['Call Customer Before Arrival'],
  },
  {
    id: 'demo_5',
    timestamp: '03:10 PM',
    courier: 'bluedart',
    replyPreview: 'Package cancel kardo, mujhe nahi chahiye ab'.slice(0, 40),
    replyText: 'Package cancel kardo, mujhe nahi chahiye ab',
    intents: [{ type: 'Cancel/Refuse', supported: false, outcome: 'Blocked' }],
    escalationFlag: 'Blocked',
    escalationReason: 'Doorstep refusal triggers immediate RTO workflow with no reattempt offered',
    detectedLanguage: 'Hinglish',
    intentsSummary: ['Cancel Order / Refuse Delivery'],
  },
];

const STORAGE_KEY = 'ndr_history_v2';
const DEMO_FLAG_KEY = 'ndr_history_is_demo';
const MAX_HISTORY = 5;

/**
 * Pure helper function to manage history list in memory (testable without DOM)
 */
export function addHistoryItemToList(
  currentList: HistoryItem[],
  newItem: HistoryItem,
  maxItems = MAX_HISTORY
): HistoryItem[] {
  // Filter out any existing item with identical replyText & courier
  const filtered = currentList.filter(
    (item) => !(item.replyText.trim() === newItem.replyText.trim() && item.courier === newItem.courier)
  );
  // Add new item to front and limit to maxItems (5)
  return [newItem, ...filtered].slice(0, maxItems);
}

/**
 * Map detected intents and rules evaluation to HistoryIntent format
 */
export function mapDetectedIntentsToHistoryIntents(
  detectedIntents: DetectedIntent[],
  rulesOutput?: RulesEngineOutput,
  actionPlan?: CourierActionItem[]
): HistoryIntent[] {
  if (!detectedIntents || detectedIntents.length === 0) {
    return [];
  }

  return detectedIntents.map((di) => {
    const category = mapIntentTypeToCategory(di.intent);

    if (rulesOutput?.intentEvaluations) {
      const evalItem = rulesOutput.intentEvaluations.find((e) => e.intent === di.intent);
      if (evalItem) {
        if (evalItem.status === 'Blocked') {
          return { type: category, supported: false, outcome: 'Blocked' };
        }
        if (evalItem.status === 'Escalate') {
          return { type: category, supported: false, outcome: 'Escalated' };
        }
        return { type: category, supported: true, outcome: 'Supported' };
      }
    }

    if (actionPlan) {
      const planItem = actionPlan.find((p) => p.intent === di.intent);
      if (planItem) {
        if (planItem.status === 'unsupported') {
          return { type: category, supported: false, outcome: 'Blocked' };
        }
        if (planItem.status === 'partial') {
          return { type: category, supported: false, outcome: 'Escalated' };
        }
        return { type: category, supported: true, outcome: 'Supported' };
      }
    }

    return { type: category, supported: true, outcome: 'Supported' };
  });
}

/**
 * Auto-generated insight sentence computed from the history data (no LLM call)
 */
export function generateHistoryInsight(history: HistoryItem[]): string {
  if (!history || history.length === 0) {
    return 'Run an analysis to see trends.';
  }

  const allIntents = history.flatMap((item) => item.intents || []);
  if (allIntents.length === 0) {
    return 'Run an analysis to see trends.';
  }

  const typeCounts: Record<string, number> = {};
  let blockedCount = 0;
  let escalatedCount = 0;
  let supportedCount = 0;

  for (const intent of allIntents) {
    typeCounts[intent.type] = (typeCounts[intent.type] || 0) + 1;
    if (intent.outcome === 'Blocked') blockedCount++;
    else if (intent.outcome === 'Escalated') escalatedCount++;
    else supportedCount++;
  }

  let topIntent = '';
  let topCount = 0;
  for (const [type, count] of Object.entries(typeCounts)) {
    if (count > topCount) {
      topCount = count;
      topIntent = type;
    }
  }

  const total = allIntents.length;
  const topPct = Math.round((topCount / total) * 100);
  const blockedPct = Math.round((blockedCount / total) * 100);
  const escalatedPct = Math.round((escalatedCount / total) * 100);

  if (blockedCount > 0 && escalatedCount > 0) {
    return `${topIntent} is the most common intent (${topPct}%), but ${blockedPct}% of requests were blocked and ${escalatedPct}% escalated for manual review.`;
  } else if (blockedCount > 0) {
    return `${topIntent} is the most common intent (${topPct}%), but ${blockedPct}% of requests were blocked by courier or platform rules.`;
  } else if (escalatedCount > 0) {
    return `${topIntent} is the most common intent (${topPct}%), while ${escalatedPct}% required human intervention or policy safeguards.`;
  } else {
    return `${topIntent} is the most common intent (${topPct}%), with 100% of analyzed requests supported for automated resolution.`;
  }
}

export interface LoadedHistoryState {
  items: HistoryItem[];
  isDemo: boolean;
}

/**
 * Retrieve saved history from localStorage safely.
 * If empty on initial load, seed with 5 realistic demo entries and set isDemo: true.
 */
export function loadHistoryFromStorage(): LoadedHistoryState {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { items: DEMO_HISTORY_ITEMS, isDemo: true };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const demoFlag = window.localStorage.getItem(DEMO_FLAG_KEY);

    if (!raw) {
      // First load or cleared: seed with 5 demo entries
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(DEMO_HISTORY_ITEMS));
      window.localStorage.setItem(DEMO_FLAG_KEY, 'true');
      return { items: DEMO_HISTORY_ITEMS, isDemo: true };
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      // If empty array saved, respect user clear
      if (demoFlag === 'false') {
        return { items: [], isDemo: false };
      }
      return { items: DEMO_HISTORY_ITEMS, isDemo: true };
    }

    const isDemo = demoFlag === 'true';
    return { items: parsed.slice(0, MAX_HISTORY), isDemo };
  } catch (e) {
    console.warn('Failed to load NDR history from localStorage:', e);
    return { items: DEMO_HISTORY_ITEMS, isDemo: true };
  }
}

/**
 * Save analysis result into localStorage (maintaining max 5 items).
 * When user runs their own analysis, marks isDemo as false.
 */
export function saveAnalysisToStorage(
  replyText: string,
  courier: CourierId,
  result: NDRAnalysisResult,
  rulesOutput?: RulesEngineOutput,
  isUserAction = true
): { items: HistoryItem[]; isDemo: boolean } {
  const cleanReply = replyText.trim();
  const replyPreview = cleanReply.slice(0, 40);

  const historyIntents = mapDetectedIntentsToHistoryIntents(
    result.detectedIntents,
    rulesOutput,
    result.actionPlan
  );

  const newItem: HistoryItem = {
    id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    replyText: cleanReply,
    replyPreview,
    courier,
    intents: historyIntents,
    escalationFlag: result.escalation.flag,
    escalationReason: result.escalation.reason,
    detectedLanguage: result.detectedLanguage,
    intentsSummary: result.detectedIntents.map((i) => i.label),
    result,
  };

  if (typeof window === 'undefined' || !window.localStorage) {
    return { items: [newItem], isDemo: false };
  }

  try {
    const { items: existing, isDemo } = loadHistoryFromStorage();
    // If current history is purely the initial demo entries and user ran analysis,
    // transition to user's real analysis
    let baseList = existing;
    if (isDemo && isUserAction) {
      // Replace demo items with real analysis (user's real analysis becomes #1)
      baseList = [];
    }

    const updated = addHistoryItemToList(baseList, newItem, MAX_HISTORY);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.localStorage.setItem(DEMO_FLAG_KEY, 'false');
    return { items: updated, isDemo: false };
  } catch (e) {
    console.warn('Failed to write history to localStorage:', e);
    return { items: [newItem], isDemo: false };
  }
}

/**
 * Clear all history and demo state from localStorage
 */
export function clearStorageHistory(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    window.localStorage.setItem(DEMO_FLAG_KEY, 'false');
  } catch (e) {
    console.warn('Failed to clear history from localStorage:', e);
  }
}
