export type CourierId = 'delhivery' | 'bluedart' | 'ecom_express';

export type IntentType =
  | 'reschedule_date'
  | 'time_slot'
  | 'address_change'
  | 'alt_phone'
  | 'safe_drop'
  | 'call_before_arrival'
  | 'cancel_refuse'
  | 'unclear';

export interface CourierInfo {
  id: CourierId;
  name: string;
  tagline: string;
  badgeColor: string;
  accentColor: string;
}

export interface IntentCapability {
  supported: boolean;
  notes: string;
  sla: string;
  actionCode: string;
  isHighPriority: boolean;
}

export interface DetectedIntent {
  intent: IntentType;
  label: string;
  confidence: number; // 0.0 to 1.0
  extractedValue?: string;
  reasoning: string;
  isHighPriority: boolean;
}

export interface CourierActionItem {
  intent: IntentType;
  intentLabel: string;
  status: 'supported' | 'partial' | 'unsupported';
  actionTitle: string;
  description: string;
  technicalPayloadSnippet?: Record<string, unknown>;
  sla: string;
}

export type EscalationFlag = 'Auto-resolve' | 'Needs human' | 'Blocked';

export interface EscalationStatus {
  flag: EscalationFlag;
  reason: string;
  severity: 'low' | 'medium' | 'high';
}

export interface NDRAnalysisResult {
  courier: CourierId;
  detectedLanguage: string;
  detectedIntents: DetectedIntent[];
  actionPlan: CourierActionItem[];
  customerMessage: string;
  escalation: EscalationStatus;
  overallConfidence: number;
  analyzedAt: string;
}

export interface SampleReply {
  id: string;
  title: string;
  language: string;
  text: string;
  description: string;
  expectedIntents: string[];
}

export const COURIERS: Record<CourierId, CourierInfo> = {
  delhivery: {
    id: 'delhivery',
    name: 'Delhivery',
    tagline: 'Automated unified logistics network with digital NDR webhooks',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    accentColor: '#059669',
  },
  bluedart: {
    id: 'bluedart',
    name: 'Blue Dart',
    tagline: 'Express air & surface courier with strict verification protocol',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    accentColor: '#2563eb',
  },
  ecom_express: {
    id: 'ecom_express',
    name: 'Ecom Express',
    tagline: 'Last-mile dedicated e-commerce delivery partner across tier 2-4',
    badgeColor: 'bg-orange-50 text-orange-700 border-orange-200',
    accentColor: '#ea580c',
  },
};

export const INTENT_META: Record<
  IntentType,
  { label: string; description: string; icon: string; highPriority: boolean }
> = {
  reschedule_date: {
    label: 'Reschedule Date',
    description: 'Postponing attempt to a specific future date',
    icon: 'Calendar',
    highPriority: false,
  },
  time_slot: {
    label: 'Time Slot Preference',
    description: 'Specific hours or morning/evening delivery window',
    icon: 'Clock',
    highPriority: false,
  },
  address_change: {
    label: 'Address Change / Landmark',
    description: 'Redirecting to alternate flat, neighbor, or office',
    icon: 'MapPin',
    highPriority: true,
  },
  alt_phone: {
    label: 'Alternate Contact Number',
    description: 'Secondary mobile number for delivery associate & OTP',
    icon: 'PhoneCall',
    highPriority: false,
  },
  safe_drop: {
    label: 'Safe-Drop / Unattended',
    description: 'Leave at security guard, door, or neighbor',
    icon: 'ShieldCheck',
    highPriority: false,
  },
  call_before_arrival: {
    label: 'Call Before Arrival',
    description: 'Rider notification call 15-30 mins prior to delivery',
    icon: 'PhoneForwarded',
    highPriority: false,
  },
  cancel_refuse: {
    label: 'Cancel / Refuse Delivery',
    description: 'Customer rejects parcel or requests immediate RTO',
    icon: 'XCircle',
    highPriority: true,
  },
  unclear: {
    label: 'Unclear / Ambiguous',
    description: 'Query, complaint, or lacks actionable instructions',
    icon: 'HelpCircle',
    highPriority: true,
  },
};

/**
 * Hardcoded courier capability table for Indian NDR Resolution
 */
export const COURIER_CAPABILITY_TABLE: Record<
  CourierId,
  Record<IntentType, IntentCapability>
> = {
  delhivery: {
    reschedule_date: {
      supported: true,
      notes: 'Supported up to 3 business days via automated run-sheet assignment API.',
      sla: 'Next attempt on requested date (09:00 - 20:00)',
      actionCode: 'DEL_DISPATCH_RESCHEDULE',
      isHighPriority: false,
    },
    time_slot: {
      supported: false,
      notes: 'Fixed hour slots not supported due to dynamic ground routing algorithm.',
      sla: 'Best-effort window communicated to hub; no SLA guarantee',
      actionCode: 'DEL_DISPATCH_NOTE_ONLY',
      isHighPriority: false,
    },
    address_change: {
      supported: true,
      notes: 'Supported within the same delivery pincode/cluster hub.',
      sla: 'Address amended on delivery associate mobile manifest within 2 hours',
      actionCode: 'DEL_ADDR_UPDATE_LOCAL',
      isHighPriority: true,
    },
    alt_phone: {
      supported: true,
      notes: 'Secondary mobile updated in field associate app for OTP and calling.',
      sla: 'Immediate sync with rider terminal',
      actionCode: 'DEL_CONTACT_SECONDARY',
      isHighPriority: false,
    },
    safe_drop: {
      supported: true,
      notes: 'Supported with OTP handover confirmation or security guard acknowledgement.',
      sla: 'Photo POD captured at doorstep/guard',
      actionCode: 'DEL_SAFE_DROP_OTP',
      isHighPriority: false,
    },
    call_before_arrival: {
      supported: true,
      notes: 'Automated Rider IVR alert and in-app prompt 20 mins prior to arrival.',
      sla: 'Triggered when rider is within 1.5 km geo-fence',
      actionCode: 'DEL_PRE_DISPATCH_IVR',
      isHighPriority: false,
    },
    cancel_refuse: {
      supported: true,
      notes: 'Immediate NDR RTO status logged, halts further re-attempts.',
      sla: 'Package marked RTO within 30 mins',
      actionCode: 'DEL_TRIGGER_RTO',
      isHighPriority: true,
    },
    unclear: {
      supported: false,
      notes: 'Automated workflow cannot resolve vague or non-actionable remarks.',
      sla: 'Requires customer executive contact',
      actionCode: 'DEL_MANUAL_REVIEW',
      isHighPriority: true,
    },
  },
  bluedart: {
    reschedule_date: {
      supported: true,
      notes: 'Re-attempt scheduled for next working day within 48h.',
      sla: 'Scheduled on next business cycle',
      actionCode: 'BD_SCHEDULE_REATTEMPT',
      isHighPriority: false,
    },
    time_slot: {
      supported: true,
      notes: 'Supports Morning (09:00 - 13:00) or Afternoon (14:00 - 18:00) slot windows in Tier 1 cities.',
      sla: 'Priority slot manifest allocated',
      actionCode: 'BD_SLOT_BAND_ASSIGN',
      isHighPriority: false,
    },
    address_change: {
      supported: false,
      notes: 'Strict merchant security policy: address re-direction prohibited without shipper re-manifest.',
      sla: 'Not permitted without formal merchant authorization',
      actionCode: 'BD_ADDR_CHANGE_BLOCKED',
      isHighPriority: true,
    },
    alt_phone: {
      supported: true,
      notes: 'Alternate mobile appended to delivery exception ticket.',
      sla: 'Synced before next delivery run',
      actionCode: 'BD_ALT_PHONE_LOG',
      isHighPriority: false,
    },
    safe_drop: {
      supported: false,
      notes: 'Strict physical signature & OTP required; unattended delivery strictly prohibited.',
      sla: 'Requires in-person recipient verification',
      actionCode: 'BD_SAFE_DROP_DENIED',
      isHighPriority: false,
    },
    call_before_arrival: {
      supported: false,
      notes: 'Standard Blue Dart SOP does not mandate rider pre-calling prior to doorstep arrival.',
      sla: 'No pre-call API or dispatch trigger available',
      actionCode: 'BD_PRECALL_NOT_SUPPORTED',
      isHighPriority: false,
    },
    cancel_refuse: {
      supported: true,
      notes: 'Registers customer refusal and initiates return-to-origin cycle.',
      sla: 'RTO initiated on next hub scan',
      actionCode: 'BD_CUSTOMER_REFUSAL_RTO',
      isHighPriority: true,
    },
    unclear: {
      supported: false,
      notes: 'Unclear remarks auto-trigger 3-attempt exhaustion rule.',
      sla: 'Manual intervention required',
      actionCode: 'BD_ESCALATE_CSR',
      isHighPriority: true,
    },
  },
  ecom_express: {
    reschedule_date: {
      supported: true,
      notes: 'Re-attempt permitted up to 48 hours across urban & rural beats.',
      sla: 'Scheduled for next day morning beat',
      actionCode: 'EE_REATTEMPT_NEXT_DAY',
      isHighPriority: false,
    },
    time_slot: {
      supported: false,
      notes: 'Dynamic field routes; deliveries occur during 10:00 - 19:00 window.',
      sla: 'Slot requests treated as rider memo without guarantee',
      actionCode: 'EE_SLOT_UNAVAILABLE',
      isHighPriority: false,
    },
    address_change: {
      supported: true,
      notes: 'Minor address/landmark modifications allowed within same delivery beat/feeder.',
      sla: 'Updated on delivery associate device within 3 hours',
      actionCode: 'EE_LOCAL_ADDR_AMEND',
      isHighPriority: true,
    },
    alt_phone: {
      supported: true,
      notes: 'Field associate handset displays updated secondary contact.',
      sla: 'Real-time sync to field app',
      actionCode: 'EE_UPDATE_SECONDARY_MOBILE',
      isHighPriority: false,
    },
    safe_drop: {
      supported: false,
      notes: 'Mandatory customer handoff and OTP/COD collection policy.',
      sla: 'Consignment requires direct customer verification',
      actionCode: 'EE_NO_UNATTENDED_DROP',
      isHighPriority: false,
    },
    call_before_arrival: {
      supported: true,
      notes: 'Rider-initiated pre-dispatch call protocol enabled for failed deliveries.',
      sla: 'Rider mandated to dial recipient 10-15 mins prior',
      actionCode: 'EE_CALL_MANDATE_FLAG',
      isHighPriority: false,
    },
    cancel_refuse: {
      supported: true,
      notes: 'Logs NDR as customer refused, prevents further delivery attempts.',
      sla: 'Marked for return within 1 hour',
      actionCode: 'EE_MARK_RTO_IMMEDIATE',
      isHighPriority: true,
    },
    unclear: {
      supported: false,
      notes: 'Ambiguous reply flagged for tele-calling team validation.',
      sla: 'Operations agent follow-up needed',
      actionCode: 'EE_TELECALL_ESCALATION',
      isHighPriority: true,
    },
  },
};

/**
 * 5 Rich Clickable Sample Replies covering realistic Indian NDR scenarios
 */
export const SAMPLE_REPLIES: SampleReply[] = [
  {
    id: 'sample-1',
    title: 'Hinglish Multi-Intent (Date + Time + Call)',
    language: 'Hinglish',
    text: 'Bhaiya aaj ghar pe nahi hu, kal dopahar 3 baje ke baad aana aur aane se pehle call karna please',
    description: 'Reschedule request + specific time slot + call before arrival request.',
    expectedIntents: ['Reschedule Date', 'Time Slot Preference', 'Call Before Arrival'],
  },
  {
    id: 'sample-2',
    title: 'Office Address Change + Alt Phone',
    language: 'English',
    text: 'I am at my office right now. Please deliver to Plot 14, Sector 18 instead, or call my brother at 9811223344 for delivery.',
    description: 'Local address relocation + secondary contact number.',
    expectedIntents: ['Address Change', 'Alternate Contact Number'],
  },
  {
    id: 'sample-3',
    title: 'Hinglish Cancellation / Refusal',
    language: 'Hinglish',
    text: 'Nahi chahiye ab yeh order, bohot late ho gaya hai. Cancel kardo aur mera refund initiate karo jaldi.',
    description: 'Explicit order cancellation/refusal with refund demand.',
    expectedIntents: ['Cancel / Refuse Delivery'],
  },
  {
    id: 'sample-4',
    title: 'Safe Drop with Guard / Neighbor',
    language: 'Hinglish',
    text: 'Main out of station hu. Packet building ke gatekeeper Ramu kaka ko de dena, OTP unko WhatsApp par forward kar diya hai.',
    description: 'Safe-drop instructions for security guard with OTP forwarding.',
    expectedIntents: ['Safe-Drop / Unattended'],
  },
  {
    id: 'sample-5',
    title: 'Vague / Ambiguous Complaint',
    language: 'Hindi (Hinglish)',
    text: 'Kaha reh gaya delivery boy? Subah se wait kar raha hu, jaldi aao!',
    description: 'Complaint about delay without any date, time, or address instructions.',
    expectedIntents: ['Unclear / Ambiguous'],
  },
];

/**
 * Determine escalation status based on detected intents and chosen courier
 */
export function evaluateEscalation(
  intents: DetectedIntent[],
  courierId: CourierId
): EscalationStatus {
  if (intents.length === 0) {
    return {
      flag: 'Needs human',
      reason: 'No actionable intents detected; customer care representative must review.',
      severity: 'high',
    };
  }

  // 1. Cancel / Refuse is always escalated to human
  const cancelIntent = intents.find((i) => i.intent === 'cancel_refuse');
  if (cancelIntent) {
    return {
      flag: 'Needs human',
      reason: 'Order cancellation/refusal requested; requires ops verification for return authorization and refund.',
      severity: 'high',
    };
  }

  // 2. Unclear / Ambiguous intent
  const unclearIntent = intents.find((i) => i.intent === 'unclear');
  if (unclearIntent) {
    return {
      flag: 'Needs human',
      reason: 'Customer message lacks specific actionable delivery instructions; tele-caller outreach required.',
      severity: 'medium',
    };
  }

  // 3. Low confidence check (< 0.70)
  const lowConfidenceIntent = intents.find((i) => i.confidence < 0.7);
  if (lowConfidenceIntent) {
    return {
      flag: 'Needs human',
      reason: `Low confidence (${Math.round(lowConfidenceIntent.confidence * 100)}%) for '${lowConfidenceIntent.label}'; requires human verification before dispatching.`,
      severity: 'medium',
    };
  }

  // 4. Check if high-priority intent is unsupported by the selected courier
  const courierCaps = COURIER_CAPABILITY_TABLE[courierId];
  for (const item of intents) {
    const cap = courierCaps[item.intent];
    if (item.isHighPriority && (!cap || !cap.supported)) {
      const courierName = COURIERS[courierId].name;
      return {
        flag: 'Needs human',
        reason: `${courierName} cannot execute '${item.label}'; manual customer care intervention needed for re-routing.`,
        severity: 'high',
      };
    }
  }

  // Otherwise, all high priority intents are supported and confidence is adequate
  const courierName = COURIERS[courierId].name;
  return {
    flag: 'Auto-resolve',
    reason: `All actionable customer requests are supported by ${courierName}'s automated NDR API workflow.`,
    severity: 'low',
  };
}

/**
 * Generates courier action items by mapping detected intents against courier capability table
 */
export function buildCourierActionPlan(
  intents: DetectedIntent[],
  courierId: CourierId
): CourierActionItem[] {
  const courierCaps = COURIER_CAPABILITY_TABLE[courierId];
  const courier = COURIERS[courierId];

  return intents.map((item) => {
    const cap = courierCaps[item.intent];
    const isSupported = cap ? cap.supported : false;

    // Determine status
    let status: 'supported' | 'partial' | 'unsupported' = 'unsupported';
    if (isSupported) {
      status = 'supported';
    } else if (item.intent === 'time_slot' || item.intent === 'call_before_arrival') {
      // Soft request: can be added as non-binding rider note
      status = 'partial';
    }

    let actionTitle = '';
    let description = '';

    switch (item.intent) {
      case 'reschedule_date':
        if (isSupported) {
          actionTitle = `Schedule re-attempt on ${item.extractedValue || 'requested date'}`;
          description = `Automated API call dispatched to ${courier.name} hub run-sheet system. ${cap.notes}`;
        } else {
          actionTitle = `Date reschedule rejected by ${courier.name}`;
          description = cap.notes;
        }
        break;

      case 'time_slot':
        if (isSupported) {
          actionTitle = `Lock delivery window: ${item.extractedValue || 'Requested slot'}`;
          description = `Priority time-band manifest allocated in ${courier.name} metro sorting facility.`;
        } else {
          actionTitle = `Time slot (${item.extractedValue || 'custom'}) treated as unbinding note`;
          description = `${courier.name} routes do not guarantee fixed hourly slots. Added as rider delivery remark.`;
        }
        break;

      case 'address_change':
        if (isSupported) {
          actionTitle = `Update delivery destination to ${item.extractedValue || 'new address'}`;
          description = `Local redirection applied. Delivery associate manifest updated for same-pincode delivery.`;
        } else {
          actionTitle = `Address change blocked by ${courier.name} policy`;
          description = `${courier.name} restricts address changes without merchant shipper re-manifest.`;
        }
        break;

      case 'alt_phone':
        if (isSupported) {
          actionTitle = `Attach alternate mobile: ${item.extractedValue || 'Provided number'}`;
          description = `Secondary phone updated in rider handheld terminal for verification & OTP delivery.`;
        } else {
          actionTitle = `Secondary phone not updated`;
          description = cap.notes;
        }
        break;

      case 'safe_drop':
        if (isSupported) {
          actionTitle = `Authorize safe-drop at ${item.extractedValue || 'security / doorstep'}`;
          description = `Automated photo POD and security handover protocol assigned to field rider.`;
        } else {
          actionTitle = `Safe-drop denied: in-person receiver mandatory`;
          description = `${courier.name} policy strictly mandates direct physical recipient handover.`;
        }
        break;

      case 'call_before_arrival':
        if (isSupported) {
          actionTitle = `Trigger automated pre-arrival call notification`;
          description = `Automated IVR/rider prompt will dial customer 15-20 minutes prior to doorstep arrival.`;
        } else {
          actionTitle = `Pre-arrival call not guaranteed`;
          description = `${courier.name} SOP does not offer automated pre-call notification service.`;
        }
        break;

      case 'cancel_refuse':
        actionTitle = `Log customer refusal & initiate Return to Origin (RTO)`;
        description = `Package marked for return shipment. Delivery attempts suspended; shipper notified for refund workflow.`;
        break;

      case 'unclear':
      default:
        actionTitle = `Route to Customer Support Helpdesk`;
        description = `Message lacks clear delivery instructions. Ticket logged for outbound tele-calling follow-up.`;
        break;
    }

    return {
      intent: item.intent,
      intentLabel: item.label,
      status,
      actionTitle,
      description,
      sla: cap ? cap.sla : 'Standard SLA',
      technicalPayloadSnippet: {
        courier: courierId,
        actionCode: cap ? cap.actionCode : 'UNKNOWN_ACTION',
        intent: item.intent,
        extractedEntity: item.extractedValue || null,
        confidence: item.confidence,
        timestamp: new Date().toISOString(),
      },
    };
  });
}

/**
 * Generate an honest customer confirmation message in the customer's language
 */
export function generateHonestCustomerMessage(
  intents: DetectedIntent[],
  courierId: CourierId,
  detectedLanguage: string
): string {
  const courier = COURIERS[courierId];
  const caps = COURIER_CAPABILITY_TABLE[courierId];

  const hasReschedule = intents.find((i) => i.intent === 'reschedule_date');
  const hasTimeSlot = intents.find((i) => i.intent === 'time_slot');
  const hasAddress = intents.find((i) => i.intent === 'address_change');
  const hasAltPhone = intents.find((i) => i.intent === 'alt_phone');
  const hasSafeDrop = intents.find((i) => i.intent === 'safe_drop');
  const hasCallBefore = intents.find((i) => i.intent === 'call_before_arrival');
  const hasCancel = intents.find((i) => i.intent === 'cancel_refuse');
  const hasUnclear = intents.find((i) => i.intent === 'unclear');

  const isEnglish = detectedLanguage.toLowerCase().includes('english') && !detectedLanguage.toLowerCase().includes('hinglish');

  // Handle Cancellation
  if (hasCancel) {
    if (isEnglish) {
      return `Hello, we have noted your request to cancel this delivery. We have notified ${courier.name} to halt further delivery attempts and initiate the return process. Our team will verify and process any applicable refund shortly.`;
    }
    return `Namaste! Humne aapki request note kar li hai aur iss order ki delivery cancel karne ke liye ${courier.name} ko notify kar diya hai. Aage koi attempt nahi hoga aur refund process shuru kar diya jayega.`;
  }

  // Handle Unclear
  if (hasUnclear || intents.length === 0) {
    if (isEnglish) {
      return `Hello, thank you for reaching out. We could not clearly understand your preferred delivery instruction from your message. Our customer support executive will call you shortly to assist with your package delivery.`;
    }
    return `Namaste! Aapke message se delivery ka exact instruction clear nahi ho paaya. Humari support team jaldi hi aapko call karegi taaki aapka parcel bina kisi dikkat ke deliver ho sake.`;
  }

  // Build composite message
  const promises: string[] = [];
  const limitations: string[] = [];

  // Reschedule Date
  if (hasReschedule) {
    const val = hasReschedule.extractedValue || 'requested date';
    if (caps.reschedule_date.supported) {
      promises.push(
        isEnglish
          ? `re-attempt your delivery on ${val}`
          : `aapki delivery ${val} ke liye reschedule kar di gayi hai`
      );
    }
  }

  // Address
  if (hasAddress) {
    if (caps.address_change.supported) {
      promises.push(
        isEnglish
          ? `updated your delivery address to '${hasAddress.extractedValue || 'requested address'}'`
          : `aapka naya address (${hasAddress.extractedValue || 'requested location'}) update kar diya hai`
      );
    } else {
      limitations.push(
        isEnglish
          ? `Please note that ${courier.name} does not allow in-transit address changes. Our support executive will reach out to verify this redirection`
          : `Kripya dhyan dein ki ${courier.name} policy ke hisaab se raaste me address change nahi ho sakta, isliye humari team aapse call par baat karegi`
      );
    }
  }

  // Alt Phone
  if (hasAltPhone && caps.alt_phone.supported) {
    promises.push(
      isEnglish
        ? `added ${hasAltPhone.extractedValue || 'your alternate number'} as a secondary contact for the driver`
        : `aapka doosra mobile number (${hasAltPhone.extractedValue || 'alternate number'}) rider ko forward kar diya gaya hai`
    );
  }

  // Safe Drop
  if (hasSafeDrop) {
    if (caps.safe_drop.supported) {
      promises.push(
        isEnglish
          ? `instructed the driver to leave the package safely (${hasSafeDrop.extractedValue || 'with guard/door'})`
          : `rider ko packet surakshit jagah (${hasSafeDrop.extractedValue || 'guard/door'}) chhodne ka instruction diya hai`
      );
    } else {
      limitations.push(
        isEnglish
          ? `${courier.name} requires direct in-person recipient verification, so unattended drop cannot be guaranteed`
          : `${courier.name} me bina OTP/physical receiver ke packet chhodna allowed nahi hai`
      );
    }
  }

  // Time Slot
  if (hasTimeSlot) {
    if (caps.time_slot.supported) {
      promises.push(
        isEnglish
          ? `prioritized your delivery for the ${hasTimeSlot.extractedValue || 'requested'} time slot`
          : `aapke bataye gaye time slot (${hasTimeSlot.extractedValue || 'requested time'}) ko prioritize kiya gaya hai`
      );
    } else {
      limitations.push(
        isEnglish
          ? `A specific time slot (${hasTimeSlot.extractedValue || 'exact time'}) cannot be guaranteed as ${courier.name} follows dynamic delivery routes`
          : `Exact time slot (${hasTimeSlot.extractedValue || 'requested time'}) guarantee nahi kiya ja sakta kyunki ${courier.name} ka delivery route dynamic hota hai`
      );
    }
  }

  // Call Before Arrival
  if (hasCallBefore) {
    if (caps.call_before_arrival.supported) {
      promises.push(
        isEnglish
          ? `requested the delivery associate to call you before arriving`
          : `rider ko aane se pehle call karne ka prompt bhej diya hai`
      );
    } else {
      limitations.push(
        isEnglish
          ? `Prior arrival phone calls cannot be guaranteed under ${courier.name}'s standard service`
          : `${courier.name} riders ke liye aane se pehle call karna compulsory nahi hota`
      );
    }
  }

  if (isEnglish) {
    let msg = `Hello! `;
    if (promises.length > 0) {
      msg += `We have ${promises.join(', and ')}. `;
    } else {
      msg += `We have received your delivery update. `;
    }
    if (limitations.length > 0) {
      msg += `However, please note: ${limitations.join('. ')}. `;
    }
    msg += `Thank you for choosing us!`;
    return msg;
  }

  // Hinglish
  let msg = `Namaste! `;
  if (promises.length > 0) {
    msg += `${promises.join(', aur ')}. `;
  } else {
    msg += `Aapki delivery update request mil gayi hai. `;
  }
  if (limitations.length > 0) {
    msg += `Kripya note karein: ${limitations.join('. ')}. `;
  }
  msg += `Dhanyawad!`;
  return msg;
}
