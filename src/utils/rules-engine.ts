import {
  COURIER_CAPABILITY_TABLE,
  COURIERS,
  type CourierId,
  type DetectedIntent,
  type IntentType,
} from './ndr-rules.ts';

export type ShipmentStatus =
  | 'Dispatched'
  | 'In transit'
  | 'Out for delivery'
  | 'NDR raised'
  | 'RTO initiated';

export type NDRReason =
  | 'Customer unavailable'
  | 'Address issue'
  | 'Refused'
  | 'Pincode unserviceable'
  | 'None';

export type RuleLayer = 'Platform' | 'Courier' | 'Brand';
export type RuleEffect = 'BLOCK' | 'WARN' | 'ESCALATE' | 'ALLOW';

export interface ShipmentContext {
  shipmentStatus: ShipmentStatus;
  attemptNumber: 1 | 2 | 3;
  hoursSinceNdr: number;
  paymentMode: 'COD' | 'Prepaid';
  orderValue: number;
  ndrReason: NDRReason;
  otpAlreadyAccepted: boolean;
  outForDeliveryDurationHours?: number; // e.g. 0.5 for fast NDR (< 1h)
  isRefusalMistakeClaimed?: boolean;
}

export interface RuleDefinition {
  id: string;
  layer: RuleLayer;
  name: string;
  conditionDescription: string;
  appliesTo: IntentType | 'all' | 'reattempt' | 'cancel_or_rto';
  effect: RuleEffect;
  userFacingReason: string;
  enabled: boolean;
  courierSpecific?: CourierId;
}

export interface RuleTraceItem {
  ruleId: string;
  ruleName: string;
  layer: RuleLayer;
  effect: RuleEffect;
  appliesTo: string;
  userFacingReason: string;
  changedOutcome: boolean;
  details: string;
}

export interface IntentEvaluationResult {
  intent: IntentType;
  intentLabel: string;
  status: 'Allowed' | 'Blocked' | 'Escalate' | 'Warned';
  effectiveReason: string;
  firedRuleId?: string;
  firedRuleName?: string;
  firedRuleLayer?: RuleLayer;
  isDowngradedToNote?: boolean;
}

export interface RulesEngineOutput {
  finalDecision: 'Auto-resolve' | 'Needs human' | 'Blocked';
  overallReason: string;
  intentEvaluations: IntentEvaluationResult[];
  ruleTraces: RuleTraceItem[];
  suggestedAction: string;
  journeyStage: number; // 1 to 5 for 3D milestone visualization
}

export interface ScenarioPreset {
  id: string;
  title: string;
  subtitle: string;
  context: ShipmentContext;
  recommendedReply: string;
  courier: CourierId;
  expectedOutcome: 'Auto-resolve' | 'Needs human' | 'Blocked';
}

/**
 * 11 Starter Rules (Badge: "Illustrative, based on public seller guides")
 */
export const STARTER_RULES: RuleDefinition[] = [
  // 1. Platform: Block seller-initiated RTO or cancel when status is Out for delivery
  {
    id: 'RULE_PLAT_OFD_BLOCK_RTO',
    layer: 'Platform',
    name: 'Block RTO/Cancel during Out For Delivery',
    conditionDescription: 'shipmentStatus === "Out for delivery" and action is Cancel or RTO',
    appliesTo: 'cancel_or_rto',
    effect: 'BLOCK',
    userFacingReason:
      'Cancellation or return cannot be processed while the package is physically out for delivery with the associate.',
    enabled: true,
  },
  // 2. Platform: Block reattempt when status is RTO initiated, attempts are 3 or more, or OTP was accepted
  {
    id: 'RULE_PLAT_BLOCK_REATTEMPT_TERMINAL',
    layer: 'Platform',
    name: 'Block reattempt on terminal states (RTO / 3+ attempts / OTP confirmed)',
    conditionDescription:
      'shipmentStatus === "RTO initiated" OR attemptNumber >= 3 OR otpAlreadyAccepted === true',
    appliesTo: 'reattempt',
    effect: 'BLOCK',
    userFacingReason:
      'Re-attempt cannot be scheduled because the parcel has either initiated return transit, reached the 3-attempt limit, or delivery OTP was confirmed.',
    enabled: true,
  },
  // 3. Platform: Block cancel after Out for delivery
  {
    id: 'RULE_PLAT_BLOCK_CANCEL_OFD',
    layer: 'Platform',
    name: 'Block cancellation after package has reached delivery associate run-sheet',
    conditionDescription: 'shipmentStatus === "Out for delivery" and intent is cancel_refuse',
    appliesTo: 'cancel_refuse',
    effect: 'BLOCK',
    userFacingReason:
      'Package is currently with field rider; cancel requests must wait for delivery run-sheet closure.',
    enabled: true,
  },
  // 4. Platform: Refusal at doorstep leads to direct RTO, with no reattempt offered (for COD)
  {
    id: 'RULE_PLAT_COD_REFUSAL_RTO',
    layer: 'Platform',
    name: 'COD doorstep refusal mandates direct RTO without re-attempt',
    conditionDescription: 'ndrReason === "Refused" and paymentMode === "COD"',
    appliesTo: 'reattempt',
    effect: 'BLOCK',
    userFacingReason:
      'Customer refused cash-on-delivery consignment at doorstep; courier protocol prohibits re-attempts and routes parcel for direct RTO.',
    enabled: true,
  },
  // 5. Platform: Warn when more than 24 hours have passed since NDR
  {
    id: 'RULE_PLAT_WARN_STALE_NDR',
    layer: 'Platform',
    name: 'Warn when more than 24 hours have elapsed since NDR notification',
    conditionDescription: 'hoursSinceNdr > 24',
    appliesTo: 'all',
    effect: 'WARN',
    userFacingReason:
      'Warning: NDR notice has been pending over 24 hours. Courier hub may auto-initiate return if re-dispatch SLA lapses.',
    enabled: true,
  },
  // 6. Platform: Escalate suspected fake NDR when out-for-delivery duration is under 1 hour
  {
    id: 'RULE_PLAT_ESCALATE_FAKE_NDR',
    layer: 'Platform',
    name: 'Escalate suspected fake / phantom NDR when OFD duration < 1 hour',
    conditionDescription: 'outForDeliveryDurationHours < 1.0',
    appliesTo: 'all',
    effect: 'ESCALATE',
    userFacingReason:
      'Delivery partner flagged non-delivery under 1 hour from hub departure; escalated as suspected phantom NDR for operations verification.',
    enabled: true,
  },
  // 7. Courier: Address change allowed between attempts; downgrade full rewrite to instruction note for note-only carriers
  {
    id: 'RULE_COUR_DOWNGRADE_ADDR_NOTE',
    layer: 'Courier',
    name: 'Downgrade full address rewrite to rider instruction-note on restricted couriers',
    conditionDescription: 'courier is Blue Dart and intent is address_change',
    appliesTo: 'address_change',
    effect: 'WARN',
    courierSpecific: 'bluedart',
    userFacingReason:
      'Blue Dart restricts in-transit address amendments; request will be forwarded as an associate delivery memo without changing destination AWB.',
    enabled: true,
  },
  // 8. Courier: Pincode unserviceable: suggest switching courier or RTO
  {
    id: 'RULE_COUR_PINCODE_UNSERVICEABLE',
    layer: 'Courier',
    name: 'Pincode unserviceable by current courier route',
    conditionDescription: 'ndrReason === "Pincode unserviceable"',
    appliesTo: 'all',
    effect: 'ESCALATE',
    userFacingReason:
      'Destination pincode is flagged unserviceable by carrier routing; requires carrier re-manifest or return authorization.',
    enabled: true,
  },
  // 9. Brand: Escalate any auto-action on orders above ₹5,000
  {
    id: 'RULE_BRAND_ESCALATE_HIGH_VALUE',
    layer: 'Brand',
    name: 'Escalate automated NDR actions on high-value orders (> ₹5,000)',
    conditionDescription: 'orderValue > 5000',
    appliesTo: 'all',
    effect: 'ESCALATE',
    userFacingReason:
      'Order value (₹5,000+) exceeds automated self-resolution limits; routed to premier customer care supervisor.',
    enabled: true,
  },
  // 10. Brand: Prepaid refusal marked as mistake: allow reattempt; COD refusal: do not
  {
    id: 'RULE_BRAND_PREPAID_REFUSAL_MISTAKE',
    layer: 'Brand',
    name: 'Allow re-attempt if prepaid customer confirms refusal was a mistake',
    conditionDescription:
      'ndrReason === "Refused" and paymentMode === "Prepaid" and isRefusalMistakeClaimed === true',
    appliesTo: 'reattempt',
    effect: 'ALLOW',
    userFacingReason:
      'Prepaid customer confirmed refusal was unintentional; authorized 1 courtesy re-attempt.',
    enabled: true,
  },
  // 11. Brand: Order of execution: address correction before reschedule
  {
    id: 'RULE_BRAND_EXEC_ORDER_ADDR_FIRST',
    layer: 'Brand',
    name: 'Priority execution: Dispatch address amendment before booking reschedule date',
    conditionDescription: 'both address_change and reschedule_date are present',
    appliesTo: 'address_change',
    effect: 'ALLOW',
    userFacingReason:
      'Execution sequence: delivery address correction will be synchronized on associate terminal prior to date re-attempt.',
    enabled: true,
  },
];

/**
 * 8 Clickable Scenario Presets
 */
export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: 'scenario-1',
    title: '1. High-Value COD (> ₹5,000)',
    subtitle: '₹6,800 COD • Attempt 1 • Customer unavailable',
    context: {
      shipmentStatus: 'NDR raised',
      attemptNumber: 1,
      hoursSinceNdr: 4,
      paymentMode: 'COD',
      orderValue: 6800,
      ndrReason: 'Customer unavailable',
      otpAlreadyAccepted: false,
    },
    courier: 'delhivery',
    recommendedReply:
      'Bhaiya kal dopahar ko aana, main paise ready rakhunga cash dene ke liye.',
    expectedOutcome: 'Needs human',
  },
  {
    id: 'scenario-2',
    title: '2. Out for Delivery (Cancel Blocked)',
    subtitle: 'Out for delivery • Attempt 1 • Cancel request',
    context: {
      shipmentStatus: 'Out for delivery',
      attemptNumber: 1,
      hoursSinceNdr: 0,
      paymentMode: 'Prepaid',
      orderValue: 1499,
      ndrReason: 'None',
      otpAlreadyAccepted: false,
    },
    courier: 'delhivery',
    recommendedReply:
      'Order cancel kardo, mujhe nahi chahiye abhi.',
    expectedOutcome: 'Blocked',
  },
  {
    id: 'scenario-3',
    title: '3. Max Attempts Exhausted (3/3)',
    subtitle: 'NDR raised • Attempt 3 • Reattempt Blocked',
    context: {
      shipmentStatus: 'NDR raised',
      attemptNumber: 3,
      hoursSinceNdr: 8,
      paymentMode: 'COD',
      orderValue: 899,
      ndrReason: 'Customer unavailable',
      otpAlreadyAccepted: false,
    },
    courier: 'ecom_express',
    recommendedReply:
      'Kal ek aur baar try karo na please, is baar pakka ghar pe hounga.',
    expectedOutcome: 'Blocked',
  },
  {
    id: 'scenario-4',
    title: '4. COD Doorstep Refusal',
    subtitle: 'Refused at doorstep • COD • Direct RTO',
    context: {
      shipmentStatus: 'NDR raised',
      attemptNumber: 1,
      hoursSinceNdr: 3,
      paymentMode: 'COD',
      orderValue: 1850,
      ndrReason: 'Refused',
      otpAlreadyAccepted: false,
    },
    courier: 'delhivery',
    recommendedReply:
      'Nahi lena packet, rider ko bola tha wapas le jao. Parso aana ho toh aao.',
    expectedOutcome: 'Blocked',
  },
  {
    id: 'scenario-5',
    title: '5. Prepaid Refusal (Mistake Claimed)',
    subtitle: 'Refused • Prepaid • Mistake claimed • Reattempt Allowed',
    context: {
      shipmentStatus: 'NDR raised',
      attemptNumber: 1,
      hoursSinceNdr: 5,
      paymentMode: 'Prepaid',
      orderValue: 2400,
      ndrReason: 'Refused',
      otpAlreadyAccepted: false,
      isRefusalMistakeClaimed: true,
    },
    courier: 'bluedart',
    recommendedReply:
      'Sorry bhai galti se mummy ne mana kar diya tha parcel lene se, kal subah bhej do maine online pay kiya hai.',
    expectedOutcome: 'Auto-resolve',
  },
  {
    id: 'scenario-6',
    title: '6. Suspected Fake NDR (< 1h OFD)',
    subtitle: 'OFD Duration 25m • Attempt 1 • Escalated',
    context: {
      shipmentStatus: 'NDR raised',
      attemptNumber: 1,
      hoursSinceNdr: 1,
      paymentMode: 'COD',
      orderValue: 1250,
      ndrReason: 'Customer unavailable',
      otpAlreadyAccepted: false,
      outForDeliveryDurationHours: 0.4,
    },
    courier: 'delhivery',
    recommendedReply:
      'Rider jhooth bol raha hai! Koi nahi aaya ghar par na phone kiya, turant bhejo.',
    expectedOutcome: 'Needs human',
  },
  {
    id: 'scenario-7',
    title: '7. Stale NDR (> 24 Hours SLA Warning)',
    subtitle: 'NDR raised 32h ago • Attempt 2 • SLA Warning',
    context: {
      shipmentStatus: 'NDR raised',
      attemptNumber: 2,
      hoursSinceNdr: 32,
      paymentMode: 'Prepaid',
      orderValue: 2199,
      ndrReason: 'Customer unavailable',
      otpAlreadyAccepted: false,
    },
    courier: 'ecom_express',
    recommendedReply:
      'Kal dopehar 3 baje deliver kardo please, phone par baat ho gayi thi.',
    expectedOutcome: 'Auto-resolve',
  },
  {
    id: 'scenario-8',
    title: '8. Terminal RTO Already Initiated',
    subtitle: 'RTO initiated • Attempt 2 • All actions blocked',
    context: {
      shipmentStatus: 'RTO initiated',
      attemptNumber: 2,
      hoursSinceNdr: 48,
      paymentMode: 'COD',
      orderValue: 3499,
      ndrReason: 'Customer unavailable',
      otpAlreadyAccepted: false,
    },
    courier: 'bluedart',
    recommendedReply:
      'Main out of town tha, ab aa gaya hu kal subah deliver kardo.',
    expectedOutcome: 'Blocked',
  },
];

/**
 * Deterministic Rules Engine:
 * Layer priority: Platform (wins over Courier & Brand) -> Courier (wins over Brand) -> Brand.
 */
export function evaluateRulesEngine(
  context: ShipmentContext,
  intents: DetectedIntent[],
  courierId: CourierId,
  rulesList: RuleDefinition[] = STARTER_RULES
): RulesEngineOutput {
  const activeRules = rulesList.filter((r) => r.enabled);
  const ruleTraces: RuleTraceItem[] = [];
  const intentEvaluations: IntentEvaluationResult[] = [];

  // Determine journey milestone index (1 to 5) for 3D visualization
  let journeyStage = 4; // Default to NDR raised
  if (context.shipmentStatus === 'Dispatched') journeyStage = 1;
  else if (context.shipmentStatus === 'In transit') journeyStage = 2;
  else if (context.shipmentStatus === 'Out for delivery') journeyStage = 3;
  else if (context.shipmentStatus === 'NDR raised') journeyStage = 4;
  else if (context.shipmentStatus === 'RTO initiated') journeyStage = 5;

  let hasBlock = false;
  let hasEscalate = false;
  let primaryBlockReason = '';
  let primaryEscalateReason = '';

  // Order of execution: If both address_change and reschedule_date are present,
  // ensure address_change is evaluated first per Rule 11
  const sortedIntents = [...intents].sort((a, b) => {
    if (a.intent === 'address_change') return -1;
    if (b.intent === 'address_change') return 1;
    return 0;
  });

  for (const intentObj of sortedIntents) {
    const intent = intentObj.intent;
    let finalStatus: 'Allowed' | 'Blocked' | 'Escalate' | 'Warned' = 'Allowed';
    let winningReason = 'Action is permissible under active operating guidelines.';
    let winningRule: RuleDefinition | null = null;
    let isDowngradedToNote = false;

    // Check Courier Capability Table first
    const cap = COURIER_CAPABILITY_TABLE[courierId]?.[intent];
    if (cap && !cap.supported && intent !== 'time_slot' && intent !== 'call_before_arrival') {
      if (intent === 'address_change' && courierId === 'bluedart') {
        // Will be evaluated by Rule 7 (downgrade to note)
      } else {
        finalStatus = 'Escalate';
        winningReason = `${COURIERS[courierId].name} does not support '${intentObj.label}' directly (${cap.notes}).`;
      }
    }

    // Evaluate rules by layer priority: Platform -> Courier -> Brand
    const layers: RuleLayer[] = ['Platform', 'Courier', 'Brand'];

    for (const layer of layers) {
      // If already blocked by a higher layer (e.g. Platform), lower layer cannot unblock it
      if (finalStatus === 'Blocked') break;

      const layerRules = activeRules.filter((r) => r.layer === layer);

      for (const rule of layerRules) {
        let applies = false;
        if (rule.appliesTo === 'all') applies = true;
        else if (rule.appliesTo === intent) applies = true;
        else if (
          rule.appliesTo === 'reattempt' &&
          (intent === 'reschedule_date' || intent === 'time_slot' || intent === 'safe_drop')
        ) {
          applies = true;
        } else if (
          rule.appliesTo === 'cancel_or_rto' &&
          intent === 'cancel_refuse'
        ) {
          applies = true;
        }

        if (!applies) continue;

        // Check rule conditions
        let conditionMet = false;

        switch (rule.id) {
          case 'RULE_PLAT_OFD_BLOCK_RTO':
          case 'RULE_PLAT_BLOCK_CANCEL_OFD':
            if (
              context.shipmentStatus === 'Out for delivery' &&
              intent === 'cancel_refuse'
            ) {
              conditionMet = true;
            }
            break;

          case 'RULE_PLAT_BLOCK_REATTEMPT_TERMINAL':
            if (
              (context.shipmentStatus === 'RTO initiated' ||
                context.attemptNumber >= 3 ||
                context.otpAlreadyAccepted) &&
              (intent === 'reschedule_date' || intent === 'time_slot')
            ) {
              conditionMet = true;
            }
            break;

          case 'RULE_PLAT_COD_REFUSAL_RTO':
            if (
              context.ndrReason === 'Refused' &&
              context.paymentMode === 'COD' &&
              (intent === 'reschedule_date' || intent === 'time_slot')
            ) {
              conditionMet = true;
            }
            break;

          case 'RULE_PLAT_WARN_STALE_NDR':
            if (context.hoursSinceNdr > 24) {
              conditionMet = true;
            }
            break;

          case 'RULE_PLAT_ESCALATE_FAKE_NDR':
            if (
              context.outForDeliveryDurationHours !== undefined &&
              context.outForDeliveryDurationHours < 1.0
            ) {
              conditionMet = true;
            }
            break;

          case 'RULE_COUR_DOWNGRADE_ADDR_NOTE':
            if (courierId === 'bluedart' && intent === 'address_change') {
              conditionMet = true;
              isDowngradedToNote = true;
            }
            break;

          case 'RULE_COUR_PINCODE_UNSERVICEABLE':
            if (context.ndrReason === 'Pincode unserviceable') {
              conditionMet = true;
            }
            break;

          case 'RULE_BRAND_ESCALATE_HIGH_VALUE':
            if (context.orderValue > 5000) {
              conditionMet = true;
            }
            break;

          case 'RULE_BRAND_PREPAID_REFUSAL_MISTAKE':
            if (
              context.ndrReason === 'Refused' &&
              context.paymentMode === 'Prepaid' &&
              context.isRefusalMistakeClaimed &&
              intent === 'reschedule_date'
            ) {
              conditionMet = true;
            }
            break;

          case 'RULE_BRAND_EXEC_ORDER_ADDR_FIRST':
            if (
              intents.some((i) => i.intent === 'address_change') &&
              intents.some((i) => i.intent === 'reschedule_date') &&
              intent === 'address_change'
            ) {
              conditionMet = true;
            }
            break;

          default:
            break;
        }

        if (conditionMet) {
          const prevStatus = finalStatus;

          if (rule.effect === 'BLOCK') {
            finalStatus = 'Blocked';
            winningReason = rule.userFacingReason;
            winningRule = rule;
            hasBlock = true;
            if (!primaryBlockReason) primaryBlockReason = rule.userFacingReason;
          } else if (rule.effect === 'ESCALATE') {
            if (finalStatus !== 'Blocked') {
              finalStatus = 'Escalate';
              winningReason = rule.userFacingReason;
              winningRule = rule;
              hasEscalate = true;
              if (!primaryEscalateReason) primaryEscalateReason = rule.userFacingReason;
            }
          } else if (rule.effect === 'WARN') {
            if (finalStatus === 'Allowed') {
              finalStatus = 'Warned';
              winningReason = rule.userFacingReason;
              winningRule = rule;
            }
          } else if (rule.effect === 'ALLOW') {
            if (finalStatus !== 'Blocked') {
              finalStatus = 'Allowed';
              winningReason = rule.userFacingReason;
              winningRule = rule;
            }
          }

          // Record trace item
          ruleTraces.push({
            ruleId: rule.id,
            ruleName: rule.name,
            layer: rule.layer,
            effect: rule.effect,
            appliesTo: intentObj.label,
            userFacingReason: rule.userFacingReason,
            changedOutcome: prevStatus !== finalStatus,
            details: `Condition matched on shipment context (${context.shipmentStatus}, Attempt ${context.attemptNumber}, ${context.paymentMode})`,
          });
        }
      }
    }

    intentEvaluations.push({
      intent,
      intentLabel: intentObj.label,
      status: finalStatus,
      effectiveReason: winningReason,
      firedRuleId: winningRule?.id,
      firedRuleName: winningRule?.name,
      firedRuleLayer: winningRule?.layer,
      isDowngradedToNote,
    });
  }

  // Final overall decision
  let finalDecision: 'Auto-resolve' | 'Needs human' | 'Blocked' = 'Auto-resolve';
  let overallReason = 'All customer requests pass deterministic platform and carrier rules.';

  if (hasBlock) {
    finalDecision = 'Blocked';
    overallReason = primaryBlockReason;
  } else if (hasEscalate || intents.some((i) => i.intent === 'cancel_refuse' || i.confidence < 0.7)) {
    finalDecision = 'Needs human';
    overallReason = primaryEscalateReason || 'Human ops supervisor review required.';
  } else {
    // Check if warnings exist
    const hasWarn = intentEvaluations.some((i) => i.status === 'Warned');
    if (hasWarn) {
      overallReason = 'Approved with operational warnings; proceeding with automated dispatch.';
    }
  }

  // Formulate a 3D Action Suggestion
  let suggestedAction = 'Proceed with automated courier reschedule run-sheet sync';
  if (finalDecision === 'Blocked') {
    suggestedAction = 'Action restricted by platform SOP: notify customer of policy limitation';
  } else if (finalDecision === 'Needs human') {
    if (context.orderValue > 5000) {
      suggestedAction = 'VIP Escalate: Assign to senior tele-caller for order value > ₹5,000';
    } else if (context.ndrReason === 'Pincode unserviceable') {
      suggestedAction = 'Routing Exception: Switch to alternate 3PL network or initiate return';
    } else if (context.outForDeliveryDurationHours && context.outForDeliveryDurationHours < 1) {
      suggestedAction = 'Investigate Fake NDR: Request GPS/IVR call logs from courier hub';
    } else {
      suggestedAction = 'Ticket queued for supervisor tele-calling review';
    }
  } else if (context.hoursSinceNdr > 24) {
    suggestedAction = 'Urgent Dispatch: SLA > 24h, expedite run-sheet assignment before RTO';
  }

  return {
    finalDecision,
    overallReason,
    intentEvaluations,
    ruleTraces,
    suggestedAction,
    journeyStage,
  };
}

/**
 * Generate an honest customer confirmation message incorporating deterministic rules engine outcomes,
 * promising ONLY what is allowed and explaining blocked items using each rule's user-facing reason.
 */
export function generateCustomerMessageWithRules(
  rulesOutput: RulesEngineOutput,
  intents: DetectedIntent[],
  courierId: CourierId,
  detectedLanguage: string = 'Hinglish',
  context?: ShipmentContext
): string {
  const isEnglish =
    detectedLanguage.toLowerCase().includes('english') &&
    !detectedLanguage.toLowerCase().includes('hinglish');
  const courierName = COURIERS[courierId]?.name || 'Courier';

  const blockedItems = rulesOutput.intentEvaluations.filter(
    (e) => e.status === 'Blocked'
  );
  const allowedItems = rulesOutput.intentEvaluations.filter(
    (e) => e.status === 'Allowed' || e.status === 'Warned'
  );

  // If everything is blocked
  if (blockedItems.length > 0 && allowedItems.length === 0) {
    const reasons = blockedItems.map((b) => b.effectiveReason).join(' ');
    if (isEnglish) {
      return `Hello! We received your request. However, we cannot process this change at this time. Policy reason: ${reasons}. For assistance, please reach out to customer support.`;
    }
    return `Namaste! Humne aapki request receive ki hai. Lekin abhi yeh update accept nahi kiya ja sakta. Kripya dhyan dein: ${reasons}. Kisi bhi sahayata ke liye aap hamari support team se sampark kar sakte hain.`;
  }

  // If partially blocked
  if (blockedItems.length > 0 && allowedItems.length > 0) {
    const blockedReasons = blockedItems
      .map((b) => `${b.intentLabel}: ${b.effectiveReason}`)
      .join(' ');
    const allowedLabels = allowedItems.map((a) => a.intentLabel).join(', ');

    if (isEnglish) {
      return `Hello! We have processed your request for ${allowedLabels} with ${courierName}. Important note: ${blockedReasons}. Our team will follow the approved delivery plan accordingly.`;
    }
    return `Namaste! Humne ${courierName} ke sath aapki request (${allowedLabels}) confirm kar li hai. Kripya dhyan dein: ${blockedReasons}. Hamara delivery partner approved plan ke anusar delivery karega.`;
  }

  // If needs human review (e.g. high-value order > 5000 or fake NDR suspected)
  if (rulesOutput.finalDecision === 'Needs human') {
    if (context && context.orderValue > 5000) {
      if (isEnglish) {
        return `Hello! We have received your delivery update for order value ₹${context.orderValue.toLocaleString('en-IN')}. Due to priority handling guidelines, our dedicated customer care specialist is personally coordinating with ${courierName} and will verify details with you shortly.`;
      }
      return `Namaste! Humne aapka delivery update receive kar liya hai. Aapka order ₹${context.orderValue.toLocaleString('en-IN')} ka hone ke karan, hamara senior care supervisor ise ${courierName} ke sath personally coordinate kar raha hai aur aapse jald hi call par baat karega.`;
    }

    if (isEnglish) {
      return `Hello! We have noted your request. As this case requires manual operational routing with ${courierName}, our customer support team has flagged this for immediate priority follow-up.`;
    }
    return `Namaste! Humne aapki request note kar li hai. Kyunki iss request mein ${courierName} ke sath special coordination zaroori hai, hamari customer care team jald hi ispar aapse sampark karegi.`;
  }

  // If everything is allowed - use courier specific promises & disclaimers
  const hasReschedule = intents.find((i) => i.intent === 'reschedule_date');
  const hasTimeSlot = intents.find((i) => i.intent === 'time_slot');
  const hasSafeDrop = intents.find((i) => i.intent === 'safe_drop');
  const hasCall = intents.find((i) => i.intent === 'call_before_arrival');
  const hasAddr = intents.find((i) => i.intent === 'address_change');

  if (isEnglish) {
    const parts: string[] = [];
    if (hasReschedule) parts.push(`re-attempt scheduled for ${hasReschedule.extractedValue || 'tomorrow'}`);
    if (hasAddr) parts.push('destination address instruction recorded');
    if (hasSafeDrop) parts.push('safe-drop instructions shared with rider');
    if (hasCall) parts.push('pre-arrival call request flagged');

    const confirmedText = parts.length > 0 ? parts.join(', ') : 'delivery request recorded';
    const disclaimers: string[] = [];
    if (hasTimeSlot) {
      disclaimers.push(`Note: While your preferred time (${hasTimeSlot.extractedValue || 'requested slot'}) is noted, specific hourly slots cannot be guaranteed due to dynamic route sequencing by ${courierName}.`);
    }

    return `Hello! We have confirmed your ${confirmedText} with ${courierName}. ${disclaimers.join(' ')} We will notify you once the package is out for delivery.`;
  }

  // Hinglish
  const parts: string[] = [];
  if (hasReschedule) parts.push(`delivery ${hasReschedule.extractedValue || 'kal'} ke liye schedule kar di gayi hai`);
  if (hasAddr) parts.push('naya address rider ke instruction mein jod diya gaya hai');
  if (hasSafeDrop) parts.push('safe-drop instruction pass kar di gayi hai');
  if (hasCall) parts.push('aane se pehle call karne ka prompt set kar diya hai');

  const confirmedText = parts.length > 0 ? parts.join(', ') : 'delivery instruction note kar li gayi hai';
  let timeDisclaimer = '';
  if (hasTimeSlot) {
    timeDisclaimer = ` Dhyan rahe ki rider route ke hisab se delivery karta hai, isliye exact time slot (${hasTimeSlot.extractedValue || 'specified time'}) 100% guarantee nahi ho sakta, par poori koshish ki jayegi.`;
  }

  return `Namaste! ${courierName} ke sath aapki ${confirmedText}.${timeDisclaimer} Packet deliver hote hi aapko SMS/WhatsApp par update mil jayega. Dhanyawad!`;
}
