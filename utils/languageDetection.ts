/**
 * Language Detection Utility
 * Detects the language of user input and provides appropriate instructions for AI
 */

export interface LanguageInfo {
  code: string;
  name: string;
  direction: 'ltr' | 'rtl';
  instruction: string;
}

// Language patterns and detection
const LANGUAGE_PATTERNS = {
  // Persian/Farsi
  fa: {
    regex: /[\u0600-\u06FF]/,
    name: 'Persian',
    direction: 'rtl' as const,
    instruction: 'IMPORTANT: The user is writing in Persian/Farsi. You MUST respond in Persian (فارسی) using Persian script. Do not respond in English.',
  },
  // Arabic
  ar: {
    regex: /[\u0600-\u06FF\u0750-\u077F]/,
    name: 'Arabic',
    direction: 'rtl' as const,
    instruction: 'IMPORTANT: The user is writing in Arabic. You MUST respond in Arabic (العربية). Do not respond in English.',
  },
  // Chinese
  zh: {
    regex: /[\u4E00-\u9FFF]/,
    name: 'Chinese',
    direction: 'ltr' as const,
    instruction: 'IMPORTANT: The user is writing in Chinese. You MUST respond in Chinese (中文). Do not respond in English.',
  },
  // Japanese
  ja: {
    regex: /[\u3040-\u309F\u30A0-\u30FF]/,
    name: 'Japanese',
    direction: 'ltr' as const,
    instruction: 'IMPORTANT: The user is writing in Japanese. You MUST respond in Japanese (日本語). Do not respond in English.',
  },
  // Korean
  ko: {
    regex: /[\uAC00-\uD7AF]/,
    name: 'Korean',
    direction: 'ltr' as const,
    instruction: 'IMPORTANT: The user is writing in Korean. You MUST respond in Korean (한국어). Do not respond in English.',
  },
  // Russian
  ru: {
    regex: /[\u0400-\u04FF]/,
    name: 'Russian',
    direction: 'ltr' as const,
    instruction: 'IMPORTANT: The user is writing in Russian. You MUST respond in Russian (Русский). Do not respond in English.',
  },
  // Spanish
  es: {
    regex: /\b(qué|cómo|dónde|cuándo|por qué|hola|gracias|buenos días)\b/i,
    name: 'Spanish',
    direction: 'ltr' as const,
    instruction: 'IMPORTANT: The user is writing in Spanish. You MUST respond in Spanish (Español). Do not respond in English.',
  },
  // French
  fr: {
    regex: /\b(où|quoi|comment|pourquoi|bonjour|merci|s'il vous plaît)\b/i,
    name: 'French',
    direction: 'ltr' as const,
    instruction: 'IMPORTANT: The user is writing in French. You MUST respond in French (Français). Do not respond in English.',
  },
  // German
  de: {
    regex: /\b(wie|was|wo|wann|warum|hallo|danke|bitte)\b/i,
    name: 'German',
    direction: 'ltr' as const,
    instruction: 'IMPORTANT: The user is writing in German. You MUST respond in German (Deutsch). Do not respond in English.',
  },
  // Italian
  it: {
    regex: /\b(come|cosa|dove|quando|perché|ciao|grazie|prego)\b/i,
    name: 'Italian',
    direction: 'ltr' as const,
    instruction: 'IMPORTANT: The user is writing in Italian. You MUST respond in Italian (Italiano). Do not respond in English.',
  },
  // Portuguese
  pt: {
    regex: /\b(como|o que|onde|quando|por que|olá|obrigado|por favor)\b/i,
    name: 'Portuguese',
    direction: 'ltr' as const,
    instruction: 'IMPORTANT: The user is writing in Portuguese. You MUST respond in Portuguese (Português). Do not respond in English.',
  },
  // Turkish
  tr: {
    regex: /\b(nasıl|ne|nerede|ne zaman|neden|merhaba|teşekkürler)\b/i,
    name: 'Turkish',
    direction: 'ltr' as const,
    instruction: 'IMPORTANT: The user is writing in Turkish. You MUST respond in Turkish (Türkçe). Do not respond in English.',
  },
  // Hindi
  hi: {
    regex: /[\u0900-\u097F]/,
    name: 'Hindi',
    direction: 'ltr' as const,
    instruction: 'IMPORTANT: The user is writing in Hindi. You MUST respond in Hindi (हिन्दी). Do not respond in English.',
  },
  // English (default)
  en: {
    regex: /./,
    name: 'English',
    direction: 'ltr' as const,
    instruction: 'Respond in English.',
  },
};

/**
 * Detect the language of the given text
 */
export function detectLanguage(text: string): LanguageInfo {
  // Trim and normalize text
  const normalizedText = text.trim();

  // Check each language pattern (order matters - check specific patterns first)
  for (const [code, pattern] of Object.entries(LANGUAGE_PATTERNS)) {
    if (code === 'en') continue; // Skip English, use as default

    if (pattern.regex.test(normalizedText)) {
      return {
        code,
        name: pattern.name,
        direction: pattern.direction,
        instruction: pattern.instruction,
      };
    }
  }

  // Default to English
  return {
    code: 'en',
    name: 'English',
    direction: 'ltr',
    instruction: LANGUAGE_PATTERNS.en.instruction,
  };
}

/**
 * Detect language from conversation history
 * Returns the most commonly used language
 */
export function detectLanguageFromHistory(messages: Array<{ role: string; content: string }>): LanguageInfo {
  const userMessages = messages.filter(m => m.role === 'user');

  if (userMessages.length === 0) {
    return detectLanguage('');
  }

  // Count language occurrences
  const languageCounts: Record<string, number> = {};

  userMessages.forEach(message => {
    const lang = detectLanguage(message.content);
    languageCounts[lang.code] = (languageCounts[lang.code] || 0) + 1;
  });

  // Find most common language
  const mostCommonLang = Object.entries(languageCounts).sort((a, b) => b[1] - a[1])[0];

  if (mostCommonLang && mostCommonLang[0] !== 'en') {
    return detectLanguage(userMessages.find(m => detectLanguage(m.content).code === mostCommonLang[0])!.content);
  }

  // Default to detecting from latest message
  return detectLanguage(userMessages[userMessages.length - 1].content);
}

/**
 * Get language-specific prompt enhancement
 */
export function getLanguagePromptEnhancement(text: string): string {
  const lang = detectLanguage(text);

  if (lang.code === 'en') {
    return '';
  }

  return `\n\n${lang.instruction}\n`;
}

/**
 * Get language-specific prompt enhancement from conversation history
 */
export function getLanguagePromptEnhancementFromHistory(messages: Array<{ role: string; content: string }>): string {
  const lang = detectLanguageFromHistory(messages);

  if (lang.code === 'en') {
    return '';
  }

  return `\n\n${lang.instruction}\n`;
}
