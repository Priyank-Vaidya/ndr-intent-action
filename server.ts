import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import {
  COURIERS,
  COURIER_CAPABILITY_TABLE,
  INTENT_META,
  SAMPLE_REPLIES,
  evaluateEscalation,
  buildCourierActionPlan,
  generateHonestCustomerMessage,
  type CourierId,
  type DetectedIntent,
  type IntentType,
  type NDRAnalysisResult,
} from './src/utils/ndr-rules.ts';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '10mb' }));

// Initialize Google Gen AI client with required User-Agent header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// POST /api/transcribe-audio - transcribes microphone audio with gemini-3.5-transcribe
app.post('/api/transcribe-audio', async (req, res) => {
  const { audioData, mimeType } = req.body as { audioData?: string; mimeType?: string };
  if (!audioData) {
    return res.status(400).json({ error: 'No audio data provided' });
  }

  try {
    const audioPart = {
      inlineData: {
        mimeType: mimeType || 'audio/webm',
        data: audioData,
      },
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: {
        parts: [
          audioPart,
          {
            text: 'Transcribe this voice message from an Indian e-commerce customer replying to a delivery agent or notification. Transcribe accurately in natural Hinglish, English, or Hindi depending on what was spoken. Return ONLY the verbatim transcribed text without commentary.',
          },
        ],
      },
    });

    const transcription = response.text ? response.text.trim() : '';
    res.json({ text: transcription });
  } catch (err: any) {
    console.error('Audio transcription error:', err?.message || err);
    res.status(500).json({ error: 'Failed to transcribe audio with Gemini' });
  }
});

// GET /api/capabilities - returns hardcoded courier capability table
app.get('/api/capabilities', (_req, res) => {
  res.json({
    couriers: COURIERS,
    capabilities: COURIER_CAPABILITY_TABLE,
    intentMeta: INTENT_META,
    sampleReplies: SAMPLE_REPLIES,
  });
});

// POST /api/analyze-ndr - analyzes customer reply using Gemini 3.8 Flash
app.post('/api/analyze-ndr', async (req, res) => {
  const { replyText, courierId } = req.body as {
    replyText?: string;
    courierId?: CourierId;
  };

  if (!replyText || typeof replyText !== 'string' || !replyText.trim()) {
    return res.status(400).json({ error: 'Customer reply text is required.' });
  }

  const validCouriers: CourierId[] = ['delhivery', 'bluedart', 'ecom_express'];
  const selectedCourier: CourierId = validCouriers.includes(courierId as CourierId)
    ? (courierId as CourierId)
    : 'delhivery';

  const courierInfo = COURIERS[selectedCourier];
  const courierCaps = COURIER_CAPABILITY_TABLE[selectedCourier];

  const capabilitySummary = Object.entries(courierCaps)
    .map(
      ([intent, cap]) =>
        `- ${intent}: ${cap.supported ? 'SUPPORTED' : 'NOT SUPPORTED'}. Notes: ${cap.notes} SLA: ${cap.sla}`
    )
    .join('\n');

  const systemInstruction = `
You are the AI decision engine for an Indian e-commerce Failed Delivery (Non-Delivery Report / NDR) resolution system called "NDR Intent-to-Action Mapper".
Customers in India reply to WhatsApp / SMS automated delivery notifications when their shipment could not be delivered.
Replies are often in Hinglish (Hindi written in English alphabet), Indian English, Hindi, Tamil, or other Indian dialects, and frequently contain MULTIPLE requests in one single message.

Selected Courier: ${courierInfo.name} (${courierInfo.tagline})
Courier Capability Table for ${courierInfo.name}:
${capabilitySummary}

Your objectives:
1. Extract EVERY distinct intent present in the customer's reply:
   Allowed intent types:
   - "reschedule_date" (reschedule delivery date)
   - "time_slot" (requesting a specific time slot or window, e.g. after 3pm, morning)
   - "address_change" (address alteration, landmark update, alternate location)
   - "alt_phone" (providing secondary or alternate contact number)
   - "safe_drop" (leave with security guard, neighbor, at doorstep)
   - "call_before_arrival" (call 15-30 min prior to arrival)
   - "cancel_refuse" (customer rejects order, wants to cancel or request refund)
   - "unclear" (vague, ambiguous, or no actionable instruction)

2. For each intent, extract any specific entity/value mentioned (e.g. extracted date, time, phone number, address text, guard name), assign confidence score (0.0 to 1.0), and provide brief rationale. Mark isHighPriority true for "address_change", "cancel_refuse", and "unclear".

3. Write a short, honest confirmation message to the customer in the EXACT SAME LANGUAGE & DIALECT they used (e.g., natural Hinglish if they wrote in Hinglish, English if English).
   CRITICAL HONESTY RULE:
   - Promise ONLY what is SUPPORTED by ${courierInfo.name}.
   - CLEARLY state what CANNOT be guaranteed or is NOT supported (e.g., if customer asked for a 3 PM slot on Delhivery, clarify that delivery will be attempted on the date but specific hourly slots cannot be guaranteed due to dynamic routing; if address change on Blue Dart, note that address re-routing requires support intervention).
   - Polite, empathetic, natural customer service tone.

4. Escalation Flag:
   - "Auto-resolve" OR "Needs human"
   - One-line specific reason.
   - Rules: Escalate to "Needs human" if:
     a) Order cancellation/refusal is requested ("cancel_refuse")
     b) Reply is unclear or confidence is low (< 0.70)
     c) Any high-priority intent (such as address_change) is NOT supported by ${courierInfo.name}
     Otherwise, set "Auto-resolve".
`.trim();

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Customer Reply: "${replyText.trim()}"\nCourier: ${courierInfo.name}`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedLanguage: {
              type: Type.STRING,
              description: 'Language of customer reply, e.g. Hinglish, English, Hindi, Tamil',
            },
            detectedIntents: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  intent: {
                    type: Type.STRING,
                    description:
                      'One of: reschedule_date, time_slot, address_change, alt_phone, safe_drop, call_before_arrival, cancel_refuse, unclear',
                  },
                  label: {
                    type: Type.STRING,
                    description: 'Human readable intent label',
                  },
                  confidence: {
                    type: Type.NUMBER,
                    description: 'Confidence between 0.0 and 1.0',
                  },
                  extractedValue: {
                    type: Type.STRING,
                    description: 'Extracted entity or parameter value, or empty if none',
                  },
                  reasoning: {
                    type: Type.STRING,
                    description: 'Brief reason why this intent was extracted',
                  },
                  isHighPriority: {
                    type: Type.BOOLEAN,
                    description: 'True if high priority intent',
                  },
                },
                required: ['intent', 'label', 'confidence', 'reasoning'],
              },
            },
            customerMessage: {
              type: Type.STRING,
              description:
                'Short honest confirmation message in customer language, promising only supported items and stating non-guaranteed items',
            },
            escalationFlag: {
              type: Type.STRING,
              description: 'Auto-resolve or Needs human',
            },
            escalationReason: {
              type: Type.STRING,
              description: 'One-line reason for escalation decision',
            },
          },
          required: [
            'detectedLanguage',
            'detectedIntents',
            'customerMessage',
            'escalationFlag',
            'escalationReason',
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');

    // Normalize detected intents and ensure standard types
    const rawIntents = Array.isArray(parsed.detectedIntents) ? parsed.detectedIntents : [];
    const validIntentTypes: IntentType[] = [
      'reschedule_date',
      'time_slot',
      'address_change',
      'alt_phone',
      'safe_drop',
      'call_before_arrival',
      'cancel_refuse',
      'unclear',
    ];

    const detectedIntents: DetectedIntent[] = rawIntents.map((item: any) => {
      const intentType: IntentType = validIntentTypes.includes(item.intent)
        ? (item.intent as IntentType)
        : 'unclear';
      const meta = INTENT_META[intentType];

      return {
        intent: intentType,
        label: meta ? meta.label : (item.label || intentType),
        confidence: typeof item.confidence === 'number' ? Math.min(Math.max(item.confidence, 0.1), 1.0) : 0.85,
        extractedValue: item.extractedValue ? String(item.extractedValue) : undefined,
        reasoning: item.reasoning ? String(item.reasoning) : 'Extracted from customer message',
        isHighPriority: meta ? meta.highPriority : Boolean(item.isHighPriority),
      };
    });

    // If no intents detected, mark as unclear
    if (detectedIntents.length === 0) {
      detectedIntents.push({
        intent: 'unclear',
        label: INTENT_META.unclear.label,
        confidence: 0.5,
        reasoning: 'No specific delivery instructions found in message.',
        isHighPriority: true,
      });
    }

    // Build the courier action plan
    const actionPlan = buildCourierActionPlan(detectedIntents, selectedCourier);

    // Evaluate escalation rules deterministically (cross-verifying with Gemini's suggestion)
    const ruleEscalation = evaluateEscalation(detectedIntents, selectedCourier);
    const finalEscalationFlag =
      ruleEscalation.flag === 'Needs human' || parsed.escalationFlag === 'Needs human'
        ? 'Needs human'
        : 'Auto-resolve';
    const finalEscalationReason =
      ruleEscalation.flag === 'Needs human'
        ? ruleEscalation.reason
        : (parsed.escalationReason || ruleEscalation.reason);

    // Compute average confidence
    const overallConfidence =
      detectedIntents.reduce((acc, curr) => acc + curr.confidence, 0) / detectedIntents.length;

    const result: NDRAnalysisResult = {
      courier: selectedCourier,
      detectedLanguage: parsed.detectedLanguage || 'Hinglish / English',
      detectedIntents,
      actionPlan,
      customerMessage:
        parsed.customerMessage && parsed.customerMessage.trim().length > 10
          ? parsed.customerMessage.trim()
          : generateHonestCustomerMessage(detectedIntents, selectedCourier, parsed.detectedLanguage || 'Hinglish'),
      escalation: {
        flag: finalEscalationFlag,
        reason: finalEscalationReason,
        severity: finalEscalationFlag === 'Needs human' ? 'high' : 'low',
      },
      overallConfidence: Number(overallConfidence.toFixed(2)),
      analyzedAt: new Date().toISOString(),
    };

    return res.json(result);
  } catch (err: any) {
    console.error('Gemini API Error, falling back to local domain rules engine:', err?.message || err);

    // Robust graceful fallback: determine intents using pattern matching
    const fallbackIntents = extractFallbackIntents(replyText);
    const actionPlan = buildCourierActionPlan(fallbackIntents, selectedCourier);
    const escalation = evaluateEscalation(fallbackIntents, selectedCourier);
    const detectedLanguage = detectBasicLanguage(replyText);
    const customerMessage = generateHonestCustomerMessage(fallbackIntents, selectedCourier, detectedLanguage);

    const fallbackResult: NDRAnalysisResult = {
      courier: selectedCourier,
      detectedLanguage,
      detectedIntents: fallbackIntents,
      actionPlan,
      customerMessage,
      escalation,
      overallConfidence: 0.88,
      analyzedAt: new Date().toISOString(),
    };

    return res.json(fallbackResult);
  }
});

function detectBasicLanguage(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('bhaiya') || lower.includes('nahi') || lower.includes('kardo') || lower.includes('karna') || lower.includes('ghar') || lower.includes('kal')) {
    return 'Hinglish';
  }
  if (/[a-zA-Z]/.test(text) && !/[^\x00-\x7F]/.test(text)) {
    return 'English';
  }
  return 'Hinglish / Indian Multilingual';
}

function extractFallbackIntents(text: string): DetectedIntent[] {
  const lower = text.toLowerCase();
  const intents: DetectedIntent[] = [];

  // 1. Cancel / refuse
  if (lower.includes('cancel') || lower.includes('nahi chahiye') || lower.includes('refund') || lower.includes('wapas')) {
    intents.push({
      intent: 'cancel_refuse',
      label: INTENT_META.cancel_refuse.label,
      confidence: 0.94,
      reasoning: 'Customer explicitly asked to cancel or refused order',
      isHighPriority: true,
    });
    return intents;
  }

  // 2. Reschedule date
  if (lower.includes('kal') || lower.includes('tomorrow') || lower.includes('parso') || lower.includes('monday') || lower.includes('tuesday') || lower.includes('next day') || /\d{1,2}(st|nd|rd|th)?\s+(oct|nov|dec|jan|feb|mar|apr|may|jun|jul|aug|sep)/i.test(lower)) {
    const dateMatch = lower.includes('kal') || lower.includes('tomorrow') ? 'Tomorrow' : 'Future date';
    intents.push({
      intent: 'reschedule_date',
      label: INTENT_META.reschedule_date.label,
      confidence: 0.92,
      extractedValue: dateMatch,
      reasoning: `Found reschedule keyword '${dateMatch}' in message`,
      isHighPriority: false,
    });
  }

  // 3. Time slot
  if (lower.includes('baje') || lower.includes('pm') || lower.includes('am') || lower.includes('dopahar') || lower.includes('morning') || lower.includes('evening') || lower.includes('afternoon')) {
    const timeMatch = lower.match(/\b\d{1,2}\s*(baje|pm|am)?\b/i)?.[0] || 'After 3 PM';
    intents.push({
      intent: 'time_slot',
      label: INTENT_META.time_slot.label,
      confidence: 0.88,
      extractedValue: timeMatch,
      reasoning: 'Customer specified a time preference window',
      isHighPriority: false,
    });
  }

  // 4. Address change
  if (lower.includes('office') || lower.includes('plot') || lower.includes('sector') || lower.includes('flat') || lower.includes('instead') || lower.includes('address') || lower.includes('ghar ke badle')) {
    intents.push({
      intent: 'address_change',
      label: INTENT_META.address_change.label,
      confidence: 0.91,
      extractedValue: 'Alternate address/office location',
      reasoning: 'Customer requested delivery at alternate address or office',
      isHighPriority: true,
    });
  }

  // 5. Alternate phone
  const phoneMatch = text.match(/\b[6-9]\d{9}\b/);
  if (phoneMatch || lower.includes('call my') || lower.includes('number')) {
    intents.push({
      intent: 'alt_phone',
      label: INTENT_META.alt_phone.label,
      confidence: 0.95,
      extractedValue: phoneMatch ? phoneMatch[0] : 'Provided number',
      reasoning: 'Customer provided secondary contact phone number',
      isHighPriority: false,
    });
  }

  // 6. Safe drop
  if (lower.includes('guard') || lower.includes('gatekeeper') || lower.includes('door') || lower.includes('neighbor') || lower.includes('padosi') || lower.includes('packet chhod')) {
    intents.push({
      intent: 'safe_drop',
      label: INTENT_META.safe_drop.label,
      confidence: 0.89,
      extractedValue: 'Security Guard / Neighbor',
      reasoning: 'Customer instructed to leave parcel with security guard or neighbor',
      isHighPriority: false,
    });
  }

  // 7. Call before arrival
  if (lower.includes('call karna') || lower.includes('call karke') || lower.includes('call before') || lower.includes('phone karna')) {
    intents.push({
      intent: 'call_before_arrival',
      label: INTENT_META.call_before_arrival.label,
      confidence: 0.93,
      reasoning: 'Customer requested driver pre-arrival call notification',
      isHighPriority: false,
    });
  }

  if (intents.length === 0) {
    intents.push({
      intent: 'unclear',
      label: INTENT_META.unclear.label,
      confidence: 0.60,
      reasoning: 'No clear delivery instructions detected in message',
      isHighPriority: true,
    });
  }

  return intents;
}

// Setup Vite middleware in development or serve static in production
async function startServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NDR Intent-to-Action Mapper server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
