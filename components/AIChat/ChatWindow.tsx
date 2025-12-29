'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ChatMessage } from '@/services/ai';
import {
  getAISessions,
  saveAISession,
  getAIMessages,
  saveAIMessage,
  deleteAISession,
  type AISession,
  type AIMessage
} from '@/storage/ai';
const generateId = () => typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
import Icon from '@/components/Icon';
import { performDownload } from '@/services/sync';

interface ChatWindowProps {
  isOpen: boolean;
  userId: string;
  isFullScreen?: boolean;
}

export default function ChatWindow({ isOpen, userId, isFullScreen = false }: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessions, setSessions] = useState<AISession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showSessions, setShowSessions] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSelectSession = useCallback(async (sessionId: string) => {
    setCurrentSessionId(sessionId);
    const sessionMessages = await getAIMessages(sessionId);
    setMessages(sessionMessages.map(m => ({ role: m.role, content: m.content })));
    setShowSessions(false);
  }, []);

  const createNewSession = useCallback(async () => {
    const newSession: AISession = {
      id: generateId(),
      userId,
      title: "New Chat",
      updatedAt: new Date().toISOString(),
    };
    await saveAISession(newSession);
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setMessages([]);
  }, [userId]);

  // Load sessions on mount
  useEffect(() => {
    if (userId) {
      const load = async () => {
        const userSessions = await getAISessions(userId);
        setSessions(userSessions);

        // If no session is selected, select the most recent one or create a new one
        if (userSessions.length > 0) {
          handleSelectSession(userSessions[0].id);
        } else {
          createNewSession();
        }
      };
      load();
    }
  }, [userId, handleSelectSession, createNewSession]);

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this chat?')) {
      await deleteAISession(sessionId);
      const updatedSessions = sessions.filter(s => s.id !== sessionId);
      setSessions(updatedSessions);

      if (currentSessionId === sessionId) {
        if (updatedSessions.length > 0) {
          handleSelectSession(updatedSessions[0].id);
        } else {
          createNewSession();
        }
      }
    }
  };

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

    // Save user message to DB
    if (currentSessionId) {
      const dbUserMessage: AIMessage = {
        id: generateId(),
        sessionId: currentSessionId,
        role: 'user',
        content: userMessage.content,
        timestamp: new Date().toISOString(),
      };
      await saveAIMessage(dbUserMessage);
      // Refresh sessions to update title if it was "New Chat"
      const updatedSessions = await getAISessions(userId);
      setSessions(updatedSessions);
    }

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Step 1: Detect user intent first
      setStatusMessage('Detecting intent...');
      const { detectIntent, isActionIntent } = await import('@/services/ai-intent');
      const detectedIntent = await detectIntent(userMessage.content);

      console.log('[ChatWindow] Detected intent:', detectedIntent);

      // Step 2: If it's an action intent, execute the action
      if (isActionIntent(detectedIntent.intent)) {
        setStatusMessage('Executing action...');
        const {
          createTaskAction,
          createGoalAction,
          createCalendarNoteAction,
          listTasksAction,
          updateTaskAction,
          completeTaskAction
        } = await import('@/services/ai-actions');

        let actionResult;

        try {
          switch (detectedIntent.intent) {
            case 'CREATE_TASK':
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              actionResult = await createTaskAction(detectedIntent.entities as never);
              break;
            case 'CREATE_GOAL':
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              actionResult = await createGoalAction(detectedIntent.entities as never);
              break;
            case 'CREATE_NOTE':
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              actionResult = await createCalendarNoteAction(detectedIntent.entities as never);
              break;
            case 'LIST_TASKS':
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              actionResult = await listTasksAction(detectedIntent.entities as never);
              break;
            case 'UPDATE_TASK':
              actionResult = await updateTaskAction(detectedIntent.entities as never);
              break;
            case 'COMPLETE_TASK': {
              const entities = detectedIntent.entities as Record<string, string | number | null | undefined>;
              let taskId = entities.taskId as string | undefined;
              const entityTitle = entities.title as string | undefined;

              // If AI didn't find the ID but found a title, try to find the task in today's context
              if (!taskId && entityTitle) {
                const { getTasks } = await import('@/storage/task');
                const today = new Date().toISOString().split('T')[0];
                const todayTasks = await getTasks(today, userId);
                const match = todayTasks.find(t =>
                  t.title.toLowerCase().includes(entityTitle.toLowerCase()) ||
                  entityTitle.toLowerCase().includes(t.title.toLowerCase())
                );
                if (match) taskId = match.id;
              }

              if (taskId) {
                actionResult = await completeTaskAction(taskId);
              } else {
                actionResult = {
                  success: false,
                  message: entityTitle ? `Could not find a task named "${entityTitle}"` : "Could not identify which task to complete"
                };
              }
              break;
            }
          }

          // Display action result
          if (actionResult) {
            const actionMessage: ChatMessage = {
              role: 'assistant',
              content: actionResult.success
                ? `✅ ${actionResult.message}`
                : `❌ ${actionResult.message}`,
            };

            // Save to DB
            if (currentSessionId) {
              const dbActionMessage: AIMessage = {
                id: generateId(),
                sessionId: currentSessionId,
                role: 'assistant',
                content: actionMessage.content,
                timestamp: new Date().toISOString(),
              };
              await saveAIMessage(dbActionMessage);
            }

            setMessages(prev => [...prev, actionMessage]);
            setIsLoading(false);

            // Auto-sync after action
            if (actionResult.success) {
              console.log('[ChatWindow] Action successful, triggering auto-sync...');
              setStatusMessage('Syncing changes...');
              try {
                await performDownload(userId);
                console.log('[ChatWindow] Auto-sync completed');
              } catch (syncError) {
                console.error('[ChatWindow] Auto-sync failed:', syncError);
              }
            }

            return; // Don't continue to regular chat
          }
        } catch (actionError) {
          console.error('[ChatWindow] Action execution error:', actionError);
          // Fall through to regular chat if action fails
        }
      }

      // Step 3: Regular chat flow (if not an action or action failed)
      const { shouldLoadFullContext, gatherUserContext, generateSystemPrompt } = await import('@/services/ai-context');
      const { sendChatMessage } = await import('@/services/ai');
      const { detectLanguage, getLanguagePromptEnhancementFromHistory } = await import('@/utils/languageDetection');

      // Detect language from user's message
      detectLanguage(userMessage.content);
      const languageInstruction = getLanguagePromptEnhancementFromHistory([...messages, userMessage]);

      let systemPrompt = '';

      if (shouldLoadFullContext()) {
        setStatusMessage('Gathering context...');
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

      setStatusMessage('Generating response...');
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

        // Save assistant message to DB
        if (currentSessionId) {
          const dbAssistantMessage: AIMessage = {
            id: generateId(),
            sessionId: currentSessionId,
            role: 'assistant',
            content: assistantMessage.content,
            timestamp: new Date().toISOString(),
          };
          await saveAIMessage(dbAssistantMessage);
        }

        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch {
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsLoadingContext(false);
      setStatusMessage(null);
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
                <button
                  onClick={() => setShowSessions(!showSessions)}
                  className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all border border-white/20"
                  title="History"
                >
                  <Icon className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </Icon>
                </button>
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

            {/* Sessions Overlay */}
            <AnimatePresence>
              {showSessions && (
                <motion.div
                  initial={{ x: -300, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -300, opacity: 0 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className="absolute inset-y-0 left-0 w-80 bg-gray-900/95 backdrop-blur-2xl z-50 border-r border-white/10 shadow-2xl flex flex-col"
                >
                  <div className="p-5 border-b border-white/10 flex items-center justify-between">
                    <h4 className="text-white font-bold text-lg">Recent Chats</h4>
                    <button onClick={() => setShowSessions(false)} className="text-white/60 hover:text-white p-1">
                      <Icon className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </Icon>
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                    <button
                      onClick={createNewSession}
                      className="w-full p-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold flex items-center gap-3 transition-all shadow-lg shadow-indigo-600/20"
                    >
                      <Icon className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </Icon>
                      New Conversation
                    </button>

                    <div className="space-y-1">
                      {sessions.map(session => (
                        <div
                          key={session.id}
                          onClick={() => handleSelectSession(session.id)}
                          className={`group relative p-4 rounded-2xl border cursor-pointer transition-all ${currentSessionId === session.id
                            ? 'bg-white/10 border-indigo-500/50 text-white shadow-inner'
                            : 'bg-transparent border-transparent text-white/60 hover:bg-white/5 hover:text-white'
                            }`}
                        >
                          <div className="pr-10">
                            <p className="text-sm font-semibold truncate">{session.title}</p>
                            <p className="text-[10px] uppercase tracking-widest font-bold opacity-30 mt-1">
                              {new Date(session.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <button
                            onClick={(e) => handleDeleteSession(e, session.id)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-2 hover:bg-red-500/20 text-red-400 rounded-xl transition-all"
                          >
                            <Icon className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </Icon>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

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
                    <span className="text-xs font-bold text-gray-500 dark:text-indigo-300 uppercase tracking-widest">
                      {statusMessage || 'Processing'}
                    </span>
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
