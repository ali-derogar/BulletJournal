import { sendChatMessage, ChatMessage } from './ai';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const jalaali = require('jalaali-js');

export type IntentType =
  | 'CREATE_TASK'
  | 'CREATE_GOAL'
  | 'CREATE_NOTE'
  | 'UPDATE_TASK'
  | 'LIST_TASKS'
  | 'COMPLETE_TASK'
  | 'CHAT'; // Default conversational intent

export interface DetectedIntent {
  intent: IntentType;
  confidence: number;
  entities: Record<string, any>;
}

export interface TaskEntity {
  title: string;
  date: string; // Persian YYYY-MM-DD
  estimatedTime?: number;
}

export interface GoalEntity {
  title: string;
  type: 'yearly' | 'quarterly' | 'monthly' | 'weekly';
  year: number;
  quarter?: number;
  month?: number;
  week?: number;
  targetValue: number;
  unit: string;
  description?: string;
}

export interface CalendarNoteEntity {
  date: string; // Persian YYYY-MM-DD
  note: string;
}

/**
 * Detect user intent from message using pattern matching and AI
 */
export async function detectIntent(userMessage: string): Promise<DetectedIntent> {
  const lowerMessage = userMessage.toLowerCase();

  // Quick pattern-based detection (faster, for common phrases)
  const patterns = {
    CREATE_TASK: [
      /تسک.*اضافه/,
      /تسکم.*اضافه/,
      /یک.*تسک.*بساز/,
      /یه.*تسک.*بساز/,
      /یدونه.*تسک/,
      /کار.*اضافه/,
      /کارم.*اضافه/,
      /واسم.*تسک/,
      /برام.*تسک/,
      /میخوام.*تسک/,
      /می‌خوام.*تسک/,
      /یادآور.*کن/,
      /یادآوری.*کن/,
      /قرار.*بذار/,
      /قرار.*بزار/,
      /بنویس.*کار/,
      /درست.*کن.*تسک/,
      /task.*add/i,
      /create.*task/i,
      /add.*task/i
    ],
    CREATE_GOAL: [
      /هدف.*اضافه/,
      /هدفم.*اضافه/,
      /یک.*هدف.*بساز/,
      /یه.*هدف.*بساز/,
      /واسم.*هدف/,
      /برام.*هدف/,
      /میخوام.*هدف/,
      /می‌خوام.*هدف/,
      /هدف.*ماهانه/,
      /هدف.*سالانه/,
      /هدف.*هفتگی/,
      /ماهانه.*هدف/,
      /سالانه.*هدف/,
      /هفتگی.*هدف/,
      /این.*ماه.*میخوام/,
      /این.*ماه.*می‌خوام/,
      /امسال.*میخوام/,
      /قرار.*بذارم.*هدف/,
      /تعیین.*کن.*هدف/,
      /goal.*add/i,
      /create.*goal/i,
      /add.*goal/i,
      /set.*goal/i
    ],
    CREATE_NOTE: [
      /تقویم.*بنویس/,
      /تقویمم.*بنویس/,
      /یادداشت.*تقویم/,
      /در.*تقویم.*یادداشت/,
      /داخل.*تقویم/,
      /تو.*تقویم/,
      /واسم.*تقویم/,
      /برام.*تقویم/,
      /میخوام.*تقویم/,
      /می‌خوام.*تقویم/,
      /یادداشت.*برای/,
      /ثبت.*کن.*تقویم/,
      /بذار.*تقویم/,
      /بزار.*تقویم/,
      /calendar.*note/i,
      /write.*calendar/i,
      /add.*note/i
    ],
    LIST_TASKS: [
      /تسک.*دارم/,
      /کار.*دارم/,
      /کارا.*دارم/,
      /تسکا.*دارم/,
      /چه.*تسک/,
      /چه.*کار/,
      /چیکار.*دارم/,
      /چی.*کار.*دارم/,
      /لیست.*تسک/,
      /لیست.*کار/,
      /تسک.*های.*من/,
      /تسکام.*چیه/,
      /تسکام.*چی/,
      /نشون.*بده.*تسک/,
      /نشونم.*بده/,
      /ببینم.*تسک/,
      /list.*task/i,
      /show.*task/i,
      /my.*task/i
    ],
    COMPLETE_TASK: [
      /تسک.*انجام.*شد/,
      /تسک.*تمام.*شد/,
      /تسک.*کامل.*شد/,
      /انجام.*دادم/,
      /تموم.*کردم/,
      /کامل.*کن/,
      /done/i,
      /complete.*task/i,
      /finish.*task/i,
      /mark.*done/i
    ]
  };

  // Check patterns
  for (const [intent, regexList] of Object.entries(patterns)) {
    for (const regex of regexList) {
      if (regex.test(lowerMessage)) {
        // Found a match! Now extract entities based on intent
        const entities = await extractEntities(userMessage, intent as IntentType);
        return {
          intent: intent as IntentType,
          confidence: 0.85,
          entities
        };
      }
    }
  }

  // If no pattern matched, it's a regular chat
  return {
    intent: 'CHAT',
    confidence: 1.0,
    entities: {}
  };
}

/**
 * Extract entities from message using AI
 */
async function extractEntities(
  userMessage: string,
  intent: IntentType
): Promise<Record<string, any>> {

  const today = new Date();
  const jalaliToday = jalaali.toJalaali(
    today.getFullYear(),
    today.getMonth() + 1,
    today.getDate()
  );
  const currentYear = jalaliToday.jy;
  const currentMonth = jalaliToday.jm;
  const currentDay = jalaliToday.jd;

  let systemPrompt = '';

  switch (intent) {
    case 'CREATE_TASK':
      systemPrompt = `You are an entity extraction assistant. Extract task details from Persian/English text.
Current date (Jalali): ${currentYear}/${currentMonth}/${currentDay}

Extract and return ONLY a JSON object with these fields:
{
  "title": "task title in Persian or English",
  "date": "YYYY-MM-DD in Jalali format",
  "estimatedTime": optional number in minutes
}

Date conversion rules:
- "امروز" or "today" → ${currentYear}/${String(currentMonth).padStart(2, '0')}/${String(currentDay).padStart(2, '0')}
- "فردا" or "tomorrow" → add 1 day to current date
- "پس‌فردا" or "day after tomorrow" → add 2 days
- If no date mentioned, use today
- Format must be Jalali YYYY/MM/DD

Return ONLY the JSON, no other text.`;
      break;

    case 'CREATE_GOAL':
      systemPrompt = `You are an entity extraction assistant. Extract goal details from Persian/English text.
Current date (Jalali): ${currentYear}/${currentMonth}/${currentDay}

Extract and return ONLY a JSON object:
{
  "title": "goal title",
  "type": "yearly|quarterly|monthly|weekly",
  "year": ${currentYear},
  "quarter": 1-4 (if quarterly),
  "month": 1-12 (if monthly),
  "week": 1-53 (if weekly),
  "targetValue": number,
  "unit": "unit like: کتاب, ساعت, کیلومتر, etc",
  "description": "optional description"
}

Type detection:
- "ماهانه" or "monthly" → type: "monthly"
- "سالانه" or "yearly" → type: "yearly"
- "هفتگی" or "weekly" → type: "weekly"
- "فصلی" or "quarterly" → type: "quarterly"
- Default if not specified → "monthly"

Return ONLY the JSON, no other text.`;
      break;

    case 'CREATE_NOTE':
      systemPrompt = `You are an entity extraction assistant. Extract calendar note from Persian/English text.
Current date (Jalali): ${currentYear}/${currentMonth}/${currentDay}

Extract and return ONLY a JSON object:
{
  "date": "YYYY-MM-DD in Jalali format",
  "note": "the note text"
}

Date rules same as task creation.
Return ONLY the JSON, no other text.`;
      break;

    default:
      return {};
  }

  try {
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ];

    const response = await sendChatMessage(messages, {
      temperature: 0.1, // Low temperature for deterministic extraction
      maxTokens: 300
    });

    if (response.error) {
      console.error('[Intent] Entity extraction failed:', response.error);
      return fallbackExtraction(userMessage, intent, jalaliToday);
    }

    // Parse JSON from AI response
    const jsonMatch = response.message.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const entities = JSON.parse(jsonMatch[0]);
      console.log('[Intent] Extracted entities:', entities);
      return entities;
    }

    // Fallback if JSON parsing failed
    return fallbackExtraction(userMessage, intent, jalaliToday);

  } catch (error) {
    console.error('[Intent] Entity extraction error:', error);
    return fallbackExtraction(userMessage, intent, jalaliToday);
  }
}

/**
 * Fallback extraction using simple regex when AI fails
 */
function fallbackExtraction(
  message: string,
  intent: IntentType,
  jalaliToday: { jy: number; jm: number; jd: number }
): Record<string, any> {

  const { jy, jm, jd } = jalaliToday;
  let date = `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`;

  // Detect "tomorrow"
  if (/فردا|tomorrow/i.test(message)) {
    const gregorian = jalaali.toGregorian(jy, jm, jd);
    const tomorrowDate = new Date(gregorian.gy, gregorian.gm - 1, gregorian.gd);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const jalaliTomorrow = jalaali.toJalaali(
      tomorrowDate.getFullYear(),
      tomorrowDate.getMonth() + 1,
      tomorrowDate.getDate()
    );
    date = `${jalaliTomorrow.jy}/${String(jalaliTomorrow.jm).padStart(2, '0')}/${String(jalaliTomorrow.jd).padStart(2, '0')}`;
  }

  switch (intent) {
    case 'CREATE_TASK':
      // Extract title (everything after keywords)
      let title = message
        .replace(/(برام|برایم|واسم|واسه‌ام|یک|یه|یکی|یدونه|را|رو|از|به|تو|در|تسک|تسکم|کار|کارم|اضافه|بساز|درست|بنویس|کن|بکن|یادآور|یادآوری|میخوام|می‌خوام|خواهش|لطفا|لطفاً|برای|برا|واسه|واسهٔ|فردا|امروز|پس‌فردا|صبح|عصر|شب|ساعت|دارم|داشته|باشم|باشه)/gi, '')
        .replace(/\s+/g, ' ')  // Remove extra spaces
        .trim();

      if (!title) title = 'تسک جدید';

      return {
        title,
        date,
        estimatedTime: null
      };

    case 'CREATE_GOAL':
      let goalTitle = message
        .replace(/(برام|برایم|واسم|یک|یه|یکی|را|رو|به|هدف|هدفم|ماهانه|سالانه|سال|هفتگی|هفته|فصلی|فصل|اضافه|بساز|درست|تعیین|کن|بکن|میخوام|می‌خوام|لطفا|لطفاً|برای|برا|واسه|این|ماه|امسال|قرار|بذار|بزار|بده)/gi, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (!goalTitle) goalTitle = 'هدف جدید';

      // Detect numbers for targetValue
      const numberMatch = message.match(/\d+/);
      const targetValue = numberMatch ? parseInt(numberMatch[0]) : 10;

      // Detect type
      let type: 'yearly' | 'quarterly' | 'monthly' | 'weekly' = 'monthly';
      if (/سالانه|yearly/i.test(message)) type = 'yearly';
      if (/هفتگی|weekly/i.test(message)) type = 'weekly';
      if (/فصلی|quarterly/i.test(message)) type = 'quarterly';

      return {
        title: goalTitle,
        type,
        year: jy,
        month: type === 'monthly' ? jm : undefined,
        targetValue,
        unit: 'مورد'
      };

    case 'CREATE_NOTE':
      let note = message
        .replace(/(برام|واسم|یک|یه|را|رو|به|تو|در|داخل|تقویم|تقویمم|بنویس|یادداشت|یادداشتی|نوشت|ثبت|اضافه|کن|بکن|میخوام|می‌خوام|لطفا|لطفاً|برای|برا|واسه|فردا|امروز|پس‌فردا|که|بذار|بزار|قرار)/gi, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (!note) note = 'یادداشت جدید';

      return {
        date,
        note
      };

    default:
      return {};
  }
}

/**
 * Check if message is an action intent (not just chat)
 */
export function isActionIntent(intent: IntentType): boolean {
  return intent !== 'CHAT';
}
