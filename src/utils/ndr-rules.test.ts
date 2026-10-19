import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateEscalation,
  buildCourierActionPlan,
  generateHonestCustomerMessage,
  COURIER_CAPABILITY_TABLE,
  type DetectedIntent,
} from './ndr-rules.ts';

test('Courier capability table has all 3 couriers and 8 intents defined', () => {
  const couriers = ['delhivery', 'bluedart', 'ecom_express'] as const;
  const intents = [
    'reschedule_date',
    'time_slot',
    'address_change',
    'alt_phone',
    'safe_drop',
    'call_before_arrival',
    'cancel_refuse',
    'unclear',
  ] as const;

  for (const c of couriers) {
    assert.ok(COURIER_CAPABILITY_TABLE[c], `Missing courier ${c}`);
    for (const intent of intents) {
      assert.ok(COURIER_CAPABILITY_TABLE[c][intent], `Missing intent ${intent} in ${c}`);
      assert.equal(typeof COURIER_CAPABILITY_TABLE[c][intent].supported, 'boolean');
    }
  }
});

test('Escalation triggers "Needs human" on cancellation/refusal', () => {
  const cancelIntents: DetectedIntent[] = [
    {
      intent: 'cancel_refuse',
      label: 'Cancel / Refuse Delivery',
      confidence: 0.95,
      reasoning: 'Customer said cancel order',
      isHighPriority: true,
    },
  ];

  const escalation = evaluateEscalation(cancelIntents, 'delhivery');
  assert.equal(escalation.flag, 'Needs human');
  assert.equal(escalation.severity, 'high');
  assert.match(escalation.reason, /cancellation/i);
});

test('Escalation triggers "Needs human" when Blue Dart does not support address changes', () => {
  const addressIntents: DetectedIntent[] = [
    {
      intent: 'address_change',
      label: 'Address Change / Landmark',
      confidence: 0.92,
      extractedValue: 'Plot 14, Sector 18',
      reasoning: 'Customer requested alternate office delivery',
      isHighPriority: true,
    },
  ];

  // Delhivery supports address change -> Auto-resolve
  const delhiveryEscalation = evaluateEscalation(addressIntents, 'delhivery');
  assert.equal(delhiveryEscalation.flag, 'Auto-resolve');

  // Blue Dart does not support address change -> Needs human
  const bluedartEscalation = evaluateEscalation(addressIntents, 'bluedart');
  assert.equal(bluedartEscalation.flag, 'Needs human');
  assert.match(bluedartEscalation.reason, /Blue Dart cannot execute 'Address Change/i);
});

test('Escalation triggers "Needs human" when confidence is below 0.70', () => {
  const lowConfidenceIntents: DetectedIntent[] = [
    {
      intent: 'reschedule_date',
      label: 'Reschedule Date',
      confidence: 0.55,
      extractedValue: 'someday',
      reasoning: 'Customer text is faint or ambiguous',
      isHighPriority: false,
    },
  ];

  const escalation = evaluateEscalation(lowConfidenceIntents, 'delhivery');
  assert.equal(escalation.flag, 'Needs human');
  assert.match(escalation.reason, /Low confidence/i);
});

test('Action plan correctly marks supported and partial statuses', () => {
  const mixedIntents: DetectedIntent[] = [
    {
      intent: 'reschedule_date',
      label: 'Reschedule Date',
      confidence: 0.95,
      extractedValue: 'Tomorrow',
      reasoning: 'Customer asked for tomorrow',
      isHighPriority: false,
    },
    {
      intent: 'time_slot',
      label: 'Time Slot Preference',
      confidence: 0.90,
      extractedValue: 'after 3 PM',
      reasoning: 'Customer asked for 3pm',
      isHighPriority: false,
    },
  ];

  // For Delhivery: Reschedule is supported, Time slot is dynamic/partial
  const delhiveryPlan = buildCourierActionPlan(mixedIntents, 'delhivery');
  assert.equal(delhiveryPlan.length, 2);
  assert.equal(delhiveryPlan[0].status, 'supported');
  assert.equal(delhiveryPlan[1].status, 'partial');

  // For Blue Dart: Both reschedule and time slot window are supported!
  const bluedartPlan = buildCourierActionPlan(mixedIntents, 'bluedart');
  assert.equal(bluedartPlan[0].status, 'supported');
  assert.equal(bluedartPlan[1].status, 'supported');
});

test('Honest customer message includes promises and explicit limitations', () => {
  const mixedIntents: DetectedIntent[] = [
    {
      intent: 'reschedule_date',
      label: 'Reschedule Date',
      confidence: 0.95,
      extractedValue: 'kal',
      reasoning: 'Customer said kal',
      isHighPriority: false,
    },
    {
      intent: 'time_slot',
      label: 'Time Slot Preference',
      confidence: 0.88,
      extractedValue: '3 baje',
      reasoning: 'Customer said 3 baje',
      isHighPriority: false,
    },
  ];

  const hinglishMsg = generateHonestCustomerMessage(mixedIntents, 'delhivery', 'Hinglish');
  assert.match(hinglishMsg, /reschedule/i);
  assert.match(hinglishMsg, /guarantee nahi/i); // Explicitly notes time slot is not guaranteed
});
