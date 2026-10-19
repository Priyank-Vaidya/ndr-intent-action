import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateRulesEngine,
  generateCustomerMessageWithRules,
  STARTER_RULES,
  SCENARIO_PRESETS,
  type ShipmentContext,
} from './rules-engine.ts';
import type { DetectedIntent } from './ndr-rules.ts';

const baseContext: ShipmentContext = {
  shipmentStatus: 'NDR raised',
  attemptNumber: 1,
  hoursSinceNdr: 4,
  paymentMode: 'COD',
  orderValue: 1200,
  ndrReason: 'Customer unavailable',
  otpAlreadyAccepted: false,
};

test('Rule 1 & 3: Blocks cancel/RTO when status is Out for delivery', () => {
  const context: ShipmentContext = {
    ...baseContext,
    shipmentStatus: 'Out for delivery',
  };
  const intents: DetectedIntent[] = [
    {
      intent: 'cancel_refuse',
      label: 'Cancel / Refuse Delivery',
      confidence: 0.95,
      reasoning: 'Customer asked to cancel',
      isHighPriority: true,
    },
  ];

  const result = evaluateRulesEngine(context, intents, 'delhivery');
  assert.equal(result.finalDecision, 'Blocked');
  assert.equal(result.intentEvaluations[0].status, 'Blocked');
  assert.match(result.intentEvaluations[0].effectiveReason, /field rider|out for delivery/i);
});

test('Rule 2: Blocks reattempt when status is RTO initiated or attempts >= 3 or OTP accepted', () => {
  // Test attempts >= 3
  const contextMaxAttempts: ShipmentContext = {
    ...baseContext,
    attemptNumber: 3,
  };
  const intents: DetectedIntent[] = [
    {
      intent: 'reschedule_date',
      label: 'Reschedule Date',
      confidence: 0.9,
      extractedValue: 'Tomorrow',
      reasoning: 'Reschedule requested',
      isHighPriority: false,
    },
  ];

  const res1 = evaluateRulesEngine(contextMaxAttempts, intents, 'delhivery');
  assert.equal(res1.finalDecision, 'Blocked');
  assert.equal(res1.intentEvaluations[0].status, 'Blocked');
  assert.match(res1.intentEvaluations[0].effectiveReason, /3-attempt limit/i);

  // Test RTO initiated
  const contextRTO: ShipmentContext = {
    ...baseContext,
    shipmentStatus: 'RTO initiated',
    attemptNumber: 1,
  };
  const res2 = evaluateRulesEngine(contextRTO, intents, 'delhivery');
  assert.equal(res2.finalDecision, 'Blocked');

  // Test OTP accepted
  const contextOTP: ShipmentContext = {
    ...baseContext,
    attemptNumber: 1,
    otpAlreadyAccepted: true,
  };
  const res3 = evaluateRulesEngine(contextOTP, intents, 'delhivery');
  assert.equal(res3.finalDecision, 'Blocked');
});

test('Rule 4: Refusal at doorstep on COD leads to direct RTO (no reattempt)', () => {
  const context: ShipmentContext = {
    ...baseContext,
    ndrReason: 'Refused',
    paymentMode: 'COD',
  };
  const intents: DetectedIntent[] = [
    {
      intent: 'reschedule_date',
      label: 'Reschedule Date',
      confidence: 0.88,
      reasoning: 'Try again later',
      isHighPriority: false,
    },
  ];

  const result = evaluateRulesEngine(context, intents, 'delhivery');
  assert.equal(result.finalDecision, 'Blocked');
  assert.equal(result.intentEvaluations[0].status, 'Blocked');
  assert.match(result.intentEvaluations[0].effectiveReason, /doorstep/i);
});

test('Rule 10: Prepaid refusal marked as mistake allows reattempt', () => {
  const context: ShipmentContext = {
    ...baseContext,
    ndrReason: 'Refused',
    paymentMode: 'Prepaid',
    isRefusalMistakeClaimed: true,
  };
  const intents: DetectedIntent[] = [
    {
      intent: 'reschedule_date',
      label: 'Reschedule Date',
      confidence: 0.95,
      reasoning: 'Customer said mistake',
      isHighPriority: false,
    },
  ];

  const result = evaluateRulesEngine(context, intents, 'delhivery');
  assert.equal(result.finalDecision, 'Auto-resolve');
  assert.equal(result.intentEvaluations[0].status, 'Allowed');
  assert.match(result.intentEvaluations[0].effectiveReason, /unintentional/i);
});

test('Rule 9: Escalate any auto-action on orders above ₹5,000', () => {
  const context: ShipmentContext = {
    ...baseContext,
    orderValue: 7500,
  };
  const intents: DetectedIntent[] = [
    {
      intent: 'reschedule_date',
      label: 'Reschedule Date',
      confidence: 0.9,
      reasoning: 'Customer asked for tomorrow',
      isHighPriority: false,
    },
  ];

  const result = evaluateRulesEngine(context, intents, 'delhivery');
  assert.equal(result.finalDecision, 'Needs human');
  assert.match(result.overallReason, /5,000/i);
});

test('Rule 6: Escalate suspected fake NDR when OFD duration < 1 hour', () => {
  const context: ShipmentContext = {
    ...baseContext,
    outForDeliveryDurationHours: 0.5,
  };
  const intents: DetectedIntent[] = [
    {
      intent: 'reschedule_date',
      label: 'Reschedule Date',
      confidence: 0.9,
      reasoning: 'Tomorrow',
      isHighPriority: false,
    },
  ];

  const result = evaluateRulesEngine(context, intents, 'delhivery');
  assert.equal(result.finalDecision, 'Needs human');
  assert.match(result.overallReason, /phantom NDR/i);
});

test('Rule 7: Downgrade address rewrite to instruction note for Blue Dart', () => {
  const context = { ...baseContext };
  const intents: DetectedIntent[] = [
    {
      intent: 'address_change',
      label: 'Address Change / Landmark',
      confidence: 0.92,
      extractedValue: 'Plot 14, Sector 18',
      reasoning: 'Address change',
      isHighPriority: true,
    },
  ];

  const result = evaluateRulesEngine(context, intents, 'bluedart');
  assert.equal(result.intentEvaluations[0].isDowngradedToNote, true);
  assert.match(result.intentEvaluations[0].effectiveReason, /delivery memo/i);
});

test('Hierarchy: Platform rule wins over Courier and Brand', () => {
  // If Platform says BLOCK, Courier or Brand cannot ALLOW
  const context: ShipmentContext = {
    ...baseContext,
    shipmentStatus: 'Out for delivery',
  };
  const intents: DetectedIntent[] = [
    {
      intent: 'cancel_refuse',
      label: 'Cancel / Refuse Delivery',
      confidence: 0.95,
      reasoning: 'Cancel',
      isHighPriority: true,
    },
  ];

  const result = evaluateRulesEngine(context, intents, 'delhivery');
  assert.equal(result.finalDecision, 'Blocked');
  // First trace that changed outcome should be Platform layer
  assert.equal(result.ruleTraces[0].layer, 'Platform');
  assert.equal(result.ruleTraces[0].effect, 'BLOCK');
});

test('All 8 scenario presets are valid and defined', () => {
  assert.equal(SCENARIO_PRESETS.length, 8);
  for (const preset of SCENARIO_PRESETS) {
    assert.ok(preset.title);
    assert.ok(preset.context);
    assert.ok(preset.courier);
    assert.ok(preset.expectedOutcome);
  }
});

test('generateCustomerMessageWithRules explains blocked policy when cancel requested in OFD', () => {
  const context: ShipmentContext = {
    ...baseContext,
    shipmentStatus: 'Out for delivery',
  };
  const intents: DetectedIntent[] = [
    {
      intent: 'cancel_refuse',
      label: 'Cancel / Refuse Delivery',
      confidence: 0.95,
      reasoning: 'Customer asked to cancel',
      isHighPriority: true,
    },
  ];

  const rulesOutput = evaluateRulesEngine(context, intents, 'delhivery');
  const message = generateCustomerMessageWithRules(
    rulesOutput,
    intents,
    'delhivery',
    'Hinglish',
    context
  );

  assert.ok(message.length > 20);
  assert.match(message, /accept nahi kiya ja sakta|out for delivery|field rider/i);
});
