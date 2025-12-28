import { detectLanguage, detectLanguageFromHistory, getLanguagePromptEnhancement } from '../languageDetection';

describe('Language Detection', () => {
  describe('detectLanguage', () => {
    test('detects Persian/Farsi', () => {
      const result = detectLanguage('سلام دنیا');
      expect(result.code).toBe('fa');
      expect(result.name).toBe('Persian');
      expect(result.direction).toBe('rtl');
    });

    test('detects Arabic', () => {
      const result = detectLanguage('مرحبا كيف حالك');
      expect(result.code).toBe('fa'); // Persian and Arabic share Unicode range
      expect(result.direction).toBe('rtl');
    });

    test('detects Chinese', () => {
      const result = detectLanguage('你好世界');
      expect(result.code).toBe('zh');
      expect(result.name).toBe('Chinese');
      expect(result.direction).toBe('ltr');
    });

    test('detects Japanese', () => {
      const result = detectLanguage('こんにちは世界');
      expect(result.code).toBe('ja');
      expect(result.name).toBe('Japanese');
      expect(result.direction).toBe('ltr');
    });

    test('detects Korean', () => {
      const result = detectLanguage('안녕하세요');
      expect(result.code).toBe('ko');
      expect(result.name).toBe('Korean');
      expect(result.direction).toBe('ltr');
    });

    test('detects Russian', () => {
      const result = detectLanguage('Привет мир');
      expect(result.code).toBe('ru');
      expect(result.name).toBe('Russian');
      expect(result.direction).toBe('ltr');
    });

    test('detects Spanish', () => {
      const result = detectLanguage('Hola, ¿cómo estás?');
      expect(result.code).toBe('es');
      expect(result.name).toBe('Spanish');
      expect(result.direction).toBe('ltr');
    });

    test('detects French', () => {
      const result = detectLanguage('Bonjour, comment allez-vous?');
      expect(result.code).toBe('fr');
      expect(result.name).toBe('French');
      expect(result.direction).toBe('ltr');
    });

    test('detects German', () => {
      const result = detectLanguage('Hallo, wie geht es dir?');
      expect(result.code).toBe('de');
      expect(result.name).toBe('German');
      expect(result.direction).toBe('ltr');
    });

    test('detects Hindi', () => {
      const result = detectLanguage('नमस्ते दुनिया');
      expect(result.code).toBe('hi');
      expect(result.name).toBe('Hindi');
      expect(result.direction).toBe('ltr');
    });

    test('defaults to English for undetected language', () => {
      const result = detectLanguage('Hello world');
      expect(result.code).toBe('en');
      expect(result.name).toBe('English');
      expect(result.direction).toBe('ltr');
    });

    test('handles empty string', () => {
      const result = detectLanguage('');
      expect(result.code).toBe('en');
      expect(result.name).toBe('English');
    });
  });

  describe('detectLanguageFromHistory', () => {
    test('detects language from user messages', () => {
      const messages = [
        { role: 'user', content: 'سلام' },
        { role: 'assistant', content: 'سلام! چطور می‌تونم کمکتون کنم؟' },
        { role: 'user', content: 'میخوام یه وظیفه اضافه کنم' },
      ];

      const result = detectLanguageFromHistory(messages);
      expect(result.code).toBe('fa');
    });

    test('returns most common language', () => {
      const messages = [
        { role: 'user', content: 'Hello' },
        { role: 'user', content: 'سلام' },
        { role: 'user', content: 'چطوری؟' },
        { role: 'user', content: 'خوبم' },
      ];

      const result = detectLanguageFromHistory(messages);
      expect(result.code).toBe('fa'); // 3 Persian vs 1 English
    });

    test('handles empty message history', () => {
      const result = detectLanguageFromHistory([]);
      expect(result.code).toBe('en');
    });
  });

  describe('getLanguagePromptEnhancement', () => {
    test('returns instruction for Persian', () => {
      const enhancement = getLanguagePromptEnhancement('سلام');
      expect(enhancement).toContain('Persian');
      expect(enhancement).toContain('IMPORTANT');
    });

    test('returns empty string for English', () => {
      const enhancement = getLanguagePromptEnhancement('Hello');
      expect(enhancement).toBe('');
    });

    test('returns instruction for Spanish', () => {
      const enhancement = getLanguagePromptEnhancement('¿Hola cómo estás?');
      expect(enhancement).toContain('Spanish');
    });
  });

  describe('Mixed language detection', () => {
    test('detects primary language in mixed text', () => {
      const result = detectLanguage('سلام Hello دنیا');
      expect(result.code).toBe('fa'); // Persian characters detected first
    });

    test('handles code snippets', () => {
      const result = detectLanguage('const x = 10; // Initialize variable');
      expect(result.code).toBe('en');
    });
  });

  describe('Edge cases', () => {
    test('handles numbers only', () => {
      const result = detectLanguage('123456');
      expect(result.code).toBe('en');
    });

    test('handles special characters only', () => {
      const result = detectLanguage('!@#$%^&*()');
      expect(result.code).toBe('en');
    });

    test('handles whitespace', () => {
      const result = detectLanguage('   ');
      expect(result.code).toBe('en');
    });
  });
});
