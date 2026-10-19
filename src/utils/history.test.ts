import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addHistoryItemToList,
  mapIntentTypeToCategory,
  generateHistoryInsight,
  mapDetectedIntentsToHistoryIntents,
  DEMO_HISTORY_ITEMS,
  type HistoryItem,
} from './history.ts';

const mockResult = {
  courier: 'delhivery' as const,
  detectedLanguage: 'Hinglish',
  detectedIntents: [],
  actionPlan: [],
  customerMessage: 'Ok',
  escalation: { flag: 'Auto-resolve' as const, reason: 'Ok', severity: 'low' as const },
  overallConfidence: 0.95,
  analyzedAt: '2026-10-18T00:00:00Z',
};

test('addHistoryItemToList limits list to max 5 items', () => {
  let list: HistoryItem[] = [];

  for (let i = 1; i <= 7; i++) {
    const item: HistoryItem = {
      id: `id_${i}`,
      timestamp: `10:0${i}`,
      replyText: `Message #${i}`,
      replyPreview: `Message #${i}`,
      courier: 'delhivery',
      intents: [{ type: 'Reschedule', supported: true, outcome: 'Supported' }],
      escalationFlag: 'Auto-resolve',
      escalationReason: 'Test',
      detectedLanguage: 'Hinglish',
      intentsSummary: ['Reschedule'],
      result: mockResult,
    };
    list = addHistoryItemToList(list, item, 5);
  }

  assert.equal(list.length, 5);
  // Item 7 should be at index 0 (newest)
  assert.equal(list[0].replyText, 'Message #7');
  // Item 3 should be at index 4 (oldest of the 5)
  assert.equal(list[4].replyText, 'Message #3');
});

test('addHistoryItemToList updates position and dedupes identical replyText + courier', () => {
  const item1: HistoryItem = {
    id: '1',
    timestamp: '10:01',
    replyText: 'Kal aana',
    replyPreview: 'Kal aana',
    courier: 'delhivery',
    intents: [{ type: 'Reschedule', supported: true, outcome: 'Supported' }],
    escalationFlag: 'Auto-resolve',
    escalationReason: 'Ok',
    detectedLanguage: 'Hinglish',
    intentsSummary: [],
    result: mockResult,
  };

  const item2: HistoryItem = {
    id: '2',
    timestamp: '10:02',
    replyText: 'Cancel it',
    replyPreview: 'Cancel it',
    courier: 'bluedart',
    intents: [{ type: 'Cancel/Refuse', supported: false, outcome: 'Blocked' }],
    escalationFlag: 'Needs human',
    escalationReason: 'Cancel',
    detectedLanguage: 'English',
    intentsSummary: [],
    result: mockResult,
  };

  const item1Updated: HistoryItem = {
    ...item1,
    id: '3',
    timestamp: '10:05',
  };

  let list = [item2, item1];
  list = addHistoryItemToList(list, item1Updated, 5);

  assert.equal(list.length, 2);
  assert.equal(list[0].id, '3'); // Newest moved to top
  assert.equal(list[1].id, '2');
});

test('DEMO_HISTORY_ITEMS has exactly 5 realistic seeded items', () => {
  assert.equal(DEMO_HISTORY_ITEMS.length, 5);
  for (const item of DEMO_HISTORY_ITEMS) {
    assert.ok(item.id);
    assert.ok(item.replyPreview);
    assert.ok(item.replyPreview.length <= 40);
    assert.ok(item.intents.length > 0);
    assert.ok(item.courier);
  }
});

test('mapIntentTypeToCategory maps all 8 categories correctly', () => {
  assert.equal(mapIntentTypeToCategory('reschedule_date'), 'Reschedule');
  assert.equal(mapIntentTypeToCategory('time_slot'), 'Time slot');
  assert.equal(mapIntentTypeToCategory('address_change'), 'Address change');
  assert.equal(mapIntentTypeToCategory('alt_phone'), 'Alt phone');
  assert.equal(mapIntentTypeToCategory('safe_drop'), 'Safe-drop');
  assert.equal(mapIntentTypeToCategory('call_before_arrival'), 'Call before arrival');
  assert.equal(mapIntentTypeToCategory('cancel_refuse'), 'Cancel/Refuse');
  assert.equal(mapIntentTypeToCategory('unclear'), 'Unclear');
  assert.equal(mapIntentTypeToCategory('unknown_xyz'), 'Unclear');
});

test('generateHistoryInsight generates descriptive deterministic summary', () => {
  const sentence = generateHistoryInsight(DEMO_HISTORY_ITEMS);
  assert.ok(sentence);
  assert.ok(sentence.includes('is the most common intent'));
  assert.ok(sentence.includes('%'));

  // Test empty state
  assert.equal(generateHistoryInsight([]), 'Run an analysis to see trends.');
});

test('mapDetectedIntentsToHistoryIntents evaluates outcomes properly', () => {
  const detected = [
    {
      intent: 'reschedule_date' as const,
      label: 'Reschedule Delivery Date',
      confidence: 0.9,
      reasoning: 'Customer asked for tomorrow',
      isHighPriority: false,
    },
    {
      intent: 'cancel_refuse' as const,
      label: 'Cancel Order',
      confidence: 0.95,
      reasoning: 'Customer wants to cancel',
      isHighPriority: true,
    },
  ];

  const actionPlan = [
    {
      intent: 'reschedule_date' as const,
      intentLabel: 'Reschedule',
      status: 'supported' as const,
      actionTitle: 'Book reattempt',
      description: 'Done',
      sla: '24h',
    },
    {
      intent: 'cancel_refuse' as const,
      intentLabel: 'Cancel',
      status: 'unsupported' as const,
      actionTitle: 'Blocked: Cancel',
      description: 'Refusal leads to RTO',
      sla: 'Immediate',
    },
  ];

  const result = mapDetectedIntentsToHistoryIntents(detected, undefined, actionPlan);
  assert.equal(result.length, 2);
  assert.equal(result[0].type, 'Reschedule');
  assert.equal(result[0].outcome, 'Supported');
  assert.equal(result[0].supported, true);
  assert.equal(result[1].type, 'Cancel/Refuse');
  assert.equal(result[1].outcome, 'Blocked');
  assert.equal(result[1].supported, false);
});
