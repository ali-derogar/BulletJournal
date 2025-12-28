'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ChatMessage } from '@/services/ai';

interface ChatWindowProps {
  isOpen: boolean;
  userId: string;
  isFullScreen?: boolean;
}

export default function ChatWindow({ isOpen, userId, isFullScreen = false }: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: input.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Check if we need to load full context (first interaction of the day)
      const { shouldLoadFullContext, gatherUserContext, generateSystemPrompt } = await import('@/services/ai-context');
      const { sendChatMessage } = await import('@/services/ai');
      const { detectLanguage, getLanguagePromptEnhancementFromHistory } = await import('@/utils/languageDetection');

      // Detect language from user's message
      const userLanguage = detectLanguage(userMessage.content);
      const languageInstruction = getLanguagePromptEnhancementFromHistory([...messages, userMessage]);

      let systemPrompt = '';

      if (shouldLoadFullContext()) {
        setIsLoadingContext(true);
        const context = await gatherUserContext(userId);
        systemPrompt = generateSystemPrompt(context, languageInstruction);
        setIsLoadingContext(false);
      } else {
        // Lightweight prompt for subsequent interactions with language detection
        systemPrompt = `You are a personal productivity assistant for a Bullet Journal app.
Keep responses concise (2-4 sentences). Be encouraging and specific.
ALWAYS respond in the same language as the user's message.${languageInstruction}`;
      }

      const messagesToSend: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        ...messages,
        userMessage,
      ];

      const response = await sendChatMessage(messagesToSend);

      if (response.error) {
        const errorMessage: ChatMessage = {
          role: 'assistant',
          content: `Sorry, I encountered an error: ${response.error}. Please try again.`,
        };
        setMessages(prev => [...prev, errorMessage]);
      } else {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: response.message,
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsLoadingContext(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={isFullScreen ? { opacity: 0 } : { opacity: 0, y: 40, scale: 0.9, filter: 'blur(15px)' }}
          animate={isFullScreen ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
          exit={isFullScreen ? { opacity: 0 } : { opacity: 0, y: 40, scale: 0.9, filter: 'blur(15px)' }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          className={isFullScreen
            ? "max-w-5xl mx-auto p-4 sm:p-6 h-[calc(100vh-180px)] flex flex-col"
            : "fixed bottom-28 right-6 z-40 w-[94vw] sm:w-[420px] h-[650px] flex flex-col"
          }
        >
          {/* Main Glassmorphic Container */}
          <div className="relative h-full bg-white/10 dark:bg-black/40 backdrop-blur-2xl rounded-3xl overflow-hidden flex flex-col border border-white/20 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)]">

            {/* Header: Layered Premium Look */}
            <div className="relative bg-gradient-to-br from-indigo-600/90 via-purple-600/90 to-pink-500/90 p-5 flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                    className="w-12 h-12 rounded-full border-2 border-dashed border-white/40 flex items-center justify-center"
                  >
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12,2C6.477,2,2,6.477,2,12c0,4.418,2.865,8.166,6.839,9.489c0.111,0.02,0.211-0.052,0.228-0.162 c0.017-0.109-0.047-0.216-0.155-0.246C6.18,19.344,4,16.488,4,13.25c0-4.005,3.245-7.25,7.25-7.25c4.005,0,7.25,3.245,7.25,7.25 c0,3.238-2.18,6.094-4.912,6.831c-0.108,0.03-0.172,0.137-0.155,0.246c0.017,0.11,0.117,0.182,0.228,0.162 C19.135,20.166,22,16.418,22,12C22,6.477,17.523,2,12,2z" />
                      </svg>
                    </div>
                  </motion.div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-indigo-600 rounded-full" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white tracking-tight">AI Assistant</h3>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-indigo-200 rounded-full animate-pulse" />
                    <p className="text-xs text-indigo-100 font-medium opacity-80 uppercase tracking-widest leading-none">Intelligence Engine</p>
                  </div>
                </div>
              </div>

              <button className="text-white/60 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                </svg>
              </button>
            </div>

            {/* Messages area: Soft backgrounds, Smooth bubbles */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-white/5 dark:bg-transparent">
              {messages.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full flex flex-col items-center justify-center text-center space-y-6 px-4"
                >
                  <div className="grid grid-cols-2 gap-3 w-full">
                    {[
                      { icon: '💡', title: 'Task Tips', color: 'bg-blue-500/10 text-blue-400' },
                      { icon: '🎯', title: 'Goal Advice', color: 'bg-purple-500/10 text-purple-400' },
                      { icon: '⚡', title: 'Focus Boost', color: 'bg-amber-500/10 text-amber-400' },
                      { icon: '📊', title: 'Daily Review', color: 'bg-emerald-500/10 text-emerald-400' }
                    ].map((feature, i) => (
                      <motion.div
                        key={i}
                        whileHover={{ y: -5, scale: 1.02 }}
                        className={`p-4 rounded-2xl border border-white/5 ${feature.color} backdrop-blur-sm cursor-pointer`}
                      >
                        <span className="text-2xl mb-1 block">{feature.icon}</span>
                        <span className="text-xs font-bold uppercase tracking-tighter opacity-80">{feature.title}</span>
                      </motion.div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-gray-900 dark:text-white font-extrabold text-xl">Power up your day</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-[240px]">
                      Your intelligent productivity partner is ready. How can we optimize your flow today?
                    </p>
                  </div>
                </motion.div>
              )}

              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 15, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`relative max-w-[85%] px-5 py-4 rounded-3xl text-sm font-medium leading-relaxed drop-shadow-sm ${message.role === 'user'
                        ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20'
                        : 'bg-white dark:bg-gray-800/80 text-gray-800 dark:text-gray-100 border border-white/10 shadow-lg'
                      }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    {message.role === 'assistant' && (
                      <div className="absolute -left-2 top-4 w-4 h-4 bg-white dark:bg-gray-800 border-l border-t border-white/10 rotate-[-45deg] z-[-1]" />
                    )}
                  </div>
                </motion.div>
              ))}

              {(isLoading || isLoadingContext) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-white/50 dark:bg-gray-800/60 backdrop-blur-md rounded-2xl px-5 py-4 flex items-center gap-3 border border-white/10 shadow-lg">
                    <div className="flex gap-1.5">
                      <motion.span
                        animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.2, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="w-2 h-2 bg-indigo-500 rounded-full"
                      />
                      <motion.span
                        animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.2, 1] }}
                        transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                        className="w-2 h-2 bg-purple-500 rounded-full"
                      />
                      <motion.span
                        animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.2, 1] }}
                        transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                        className="w-2 h-2 bg-pink-500 rounded-full"
                      />
                    </div>
                    <span className="text-xs font-bold text-gray-500 dark:text-indigo-300 uppercase tracking-widest">Processing</span>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area: Sleek & Integrated */}
            <div className="p-6 bg-white/5 dark:bg-black/20 border-t border-white/10 backdrop-blur-md">
              <div className="relative group flex items-center bg-white dark:bg-gray-800 rounded-2xl border border-white/20 shadow-inner-lg transition-all focus-within:ring-2 focus-within:ring-indigo-500/50">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask your assistant anything... | از دستیار خود بپرسید..."
                  disabled={isLoading}
                  className="flex-1 bg-transparent text-gray-900 dark:text-white px-5 py-4 text-sm font-semibold focus:outline-none disabled:opacity-50 placeholder:text-gray-400"
                />
                <div className="pr-3 flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className="w-10 h-10 flex items-center justify-center bg-gradient-to-tr from-indigo-600 to-purple-600 text-white rounded-xl shadow-lg shadow-indigo-600/30 disabled:opacity-40 disabled:cursor-not-allowed group-hover:shadow-indigo-600/50 transition-shadow"
                  >
                    {isLoading ? (
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    )}
                  </motion.button>
                </div>
              </div>
              <p className="mt-3 text-[10px] text-center text-gray-400 font-bold uppercase tracking-tighter opacity-50">
                Secured by Advanced AI Architecture
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
