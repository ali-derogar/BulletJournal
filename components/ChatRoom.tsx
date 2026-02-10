"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/app/context/AuthContext';
import { sendChatMessage, getChatMessages, createChatroomWebSocket, type ChatMessage as ApiChatMessage } from '@/services/chatroom';
import { useLocale, useTranslations } from 'next-intl';

// Types
interface User {
  id: string;
  nickname: string;
  avatar_url?: string;
  color: string;
  joinedAt: number;
}

interface Message {
  id: string;
  userId: string;
  nickname: string;
  avatar_url?: string;
  color: string;
  text: string;
  timestamp: number;
}

// Utility Functions
const generateUserColor = () => {
  const colors = [
    '#6366f1', '#ec4899', '#10b981', '#f59e0b',
    '#8b5cf6', '#06b6d4', '#ef4444', '#14b8a6'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

const LEVELS = ["Iron", "Bronze", "Silver", "Gold", "Platinum", "Diamond"];

const LEVEL_CONFIG: Record<string, { color: string; icon: string; labelKey: string }> = {
  Iron: { color: "#94a3b8", icon: "⚙️", labelKey: "levels.Iron" },
  Bronze: { color: "#cd7f32", icon: "🥉", labelKey: "levels.Bronze" },
  Silver: { color: "#c0c0c0", icon: "🥈", labelKey: "levels.Silver" },
  Gold: { color: "#ffd700", icon: "🥇", labelKey: "levels.Gold" },
  Platinum: { color: "#e5e4e2", icon: "💍", labelKey: "levels.Platinum" },
  Diamond: { color: "#b9f2ff", icon: "💎", labelKey: "levels.Diamond" }
};

export default function ChatRoom() {
  const { user: authUser } = useAuth();
  const t = useTranslations('chatRoom');
  const locale = useLocale();

  // State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [users] = useState<Map<string, User>>(new Map());
  const [inputText, setInputText] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesLoadedRef = useRef(false);
  const timeFormatter = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' });

  const formatTime = (timestamp: number) => {
    return timeFormatter.format(new Date(timestamp));
  };

  const getUserInitial = (name: string) => name ? name.charAt(0).toUpperCase() : t('defaultInitial');

  // Initialize user from auth
  useEffect(() => {
    if (authUser) {
      const userColor = generateUserColor();
      const chatUser: User = {
        id: authUser.id,
        nickname: authUser.username || authUser.name,
        avatar_url: authUser.avatar_url,
        color: userColor,
        joinedAt: Date.now()
      };
      setCurrentUser(chatUser);
    }
  }, [authUser]);

  // Initialize messages and WebSocket when room changes
  useEffect(() => {
    if (!authUser || !currentRoom) return;

    setMessages([]); // Clear messages when switching rooms
    messagesLoadedRef.current = false;

    // Load messages from API
    getChatMessages(currentRoom, 100)
      .then(response => {
        const apiMessages: Message[] = response.messages.map(msg => ({
          id: msg.id,
          userId: msg.userId,
          nickname: msg.nickname,
          avatar_url: msg.avatar_url,
          color: msg.color,
          text: msg.text,
          timestamp: msg.timestamp
        }));
        setMessages(apiMessages);
        messagesLoadedRef.current = true;

        // Create WebSocket connection
        const ws = createChatroomWebSocket(currentRoom, (message: ApiChatMessage) => {
          setMessages(prev => {
            if (prev.some(m => m.id === message.id)) return prev;
            const newMessage: Message = {
              id: message.id,
              userId: message.userId,
              nickname: message.nickname,
              avatar_url: message.avatar_url,
              color: message.color,
              text: message.text,
              timestamp: message.timestamp
            };
            return [...prev, newMessage];
          });
        });
        websocketRef.current = ws;
      })
      .catch(error => {
        console.error('Error loading chat messages:', error);
      });

    return () => {
      if (websocketRef.current) {
        websocketRef.current.close();
        websocketRef.current = null;
      }
    };
  }, [authUser, currentRoom]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handlers
  const handleSendMessage = async () => {
    if (!inputText.trim() || !currentUser || !currentRoom) return;

    const messageText = inputText.trim();
    setInputText('');

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      const sentMessage = await sendChatMessage(messageText, currentRoom);

      const newMessage: Message = {
        id: sentMessage.id,
        userId: sentMessage.userId,
        nickname: sentMessage.nickname,
        avatar_url: sentMessage.avatar_url,
        color: sentMessage.color,
        text: sentMessage.text,
        timestamp: sentMessage.timestamp
      };

      setMessages(prev => {
        if (prev.some(m => m.id === newMessage.id)) return prev;
        return [...prev, newMessage];
      });
    } catch (error) {
      console.error('Error sending message:', error);
      setInputText(messageText);
    }
  };

  const handleLevelClick = (targetLevel: string) => {
    const userLevel = authUser?.level || "Iron";
    const userIdx = LEVELS.indexOf(userLevel);
    const targetIdx = LEVELS.indexOf(targetLevel);

    if (userIdx < targetIdx) {
      setErrorMsg(t('errors.levelLocked', { level: t(LEVEL_CONFIG[targetLevel].labelKey) }));
      setTimeout(() => setErrorMsg(null), 3000);
      return;
    }

    if (userIdx > targetIdx) {
      // Suggest higher level but allow entry? 
      // User said: "بگه تو سطح بالایی داری و بهتر تو این سطح باشی"
      // I'll show a warning but let them enter if they really want, or just set it.
      // For now, let's just allow it with a notification.
      console.log("Entering a lower level room.");
    }

    setCurrentRoom(targetLevel);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  // Render Selection View
  if (!currentRoom) {
    const userLevel = authUser?.level || "Iron";
    const userIdx = LEVELS.indexOf(userLevel);

    return (
      <div className="flex flex-col h-[calc(100vh-80px)] bg-[#0a0e27] text-slate-100 p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto w-full">
          <header className="mb-10 text-center">
            <h1 className="text-4xl font-extrabold mb-4 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              {t('selectionTitle')}
            </h1>
            <p className="text-slate-400">
              {t('currentLevel')}{' '}
              <span className="text-indigo-400 font-bold">
                {LEVEL_CONFIG[userLevel]?.labelKey ? t(LEVEL_CONFIG[userLevel].labelKey) : userLevel}
              </span>
            </p>
          </header>

          <AnimatePresence>
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-red-500/20 border border-red-500/50 text-red-200 p-4 rounded-xl mb-6 text-center backdrop-blur-md"
              >
                {errorMsg}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {LEVELS.map((level, idx) => {
              const config = LEVEL_CONFIG[level];
              const isLocked = userIdx < idx;
              const isHigher = userIdx > idx;

              return (
                <motion.button
                  key={level}
                  whileHover={!isLocked ? { scale: 1.05, translateY: -5 } : {}}
                  whileTap={!isLocked ? { scale: 0.95 } : {}}
                  onClick={() => handleLevelClick(level)}
                  className={`relative p-8 rounded-3xl border-2 transition-all flex flex-col items-center gap-4 text-center overflow-hidden group ${isLocked
                      ? 'bg-slate-900/40 border-slate-800 grayscale cursor-not-allowed opacity-60'
                      : 'bg-[#1e2449]/40 border-slate-700/50 hover:border-indigo-500/50 shadow-xl'
                    }`}
                >
                  {/* Decorative Glow */}
                  <div className="absolute -top-10 -right-10 w-32 h-32 blur-3xl rounded-full opacity-20 pointer-events-none transition-all group-hover:opacity-40" style={{ backgroundColor: config.color }}></div>

                  <div className="text-5xl group-hover:rotate-12 transition-transform duration-300">
                    {config.icon}
                  </div>

                  <div>
                    <h3 className="text-2xl font-bold mb-1" style={{ color: config.color }}>{t(config.labelKey)}</h3>
                    <p className="text-xs text-slate-400 uppercase tracking-widest">{t(config.labelKey)}</p>
                  </div>

                  {isLocked && (
                    <div className="mt-2 py-1 px-3 bg-red-500/20 rounded-full text-[10px] text-red-400 font-bold border border-red-500/30">
                      {t('locked')}
                    </div>
                  )}

                  {!isLocked && isHigher && (
                    <div className="mt-2 py-1 px-4 bg-indigo-500/20 rounded-full text-[10px] text-indigo-300 font-bold border border-indigo-500/30">
                      {t('higherLevelHint')}
                    </div>
                  )}

                  {!isLocked && !isHigher && (
                    <div className="mt-2 py-1 px-4 bg-emerald-500/20 rounded-full text-[10px] text-emerald-400 font-bold border border-emerald-500/30 animate-pulse">
                      {t('homeLevel')}
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Render Helpers
  const onlineUsers = Array.from(users.values()).filter(u => u.id !== currentUser?.id);
  if (currentUser) onlineUsers.unshift(currentUser);

  const userLevel = authUser?.level || "Iron";
  const userIdx = LEVELS.indexOf(userLevel);
  const currentIdx = LEVELS.indexOf(currentRoom);
  const roomConfig = LEVEL_CONFIG[currentRoom];

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-[#0a0e27] text-slate-100 font-sans overflow-hidden relative">
      {/* Background Gradient */}
      <div className="absolute inset-0 z-0 opacity-50 pointer-events-none">
        <div className="absolute top-[20%] left-[20%] w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-[20%] right-[20%] w-96 h-96 bg-pink-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 bg-[#1e2449]/60 backdrop-blur-xl border-b border-slate-700/50 p-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setCurrentRoom(null)}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400"
          >
            {t('back')}
          </button>
          <div className="w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse"></div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <span>{roomConfig.icon}</span>
            <span style={{ color: roomConfig.color }}>
              {t('roomTitle', { room: t(roomConfig.labelKey) })}
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {userIdx > currentIdx && (
            <div className="hidden sm:block text-[10px] bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full border border-indigo-500/30">
              {t('higherLevelNotice')}
            </div>
          )}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 bg-[#1e2449] rounded-lg border border-slate-700 text-slate-300 hover:text-indigo-400 hover:border-indigo-500 transition-all"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
            </svg>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative z-10 p-4 gap-4">
        {/* Messages Area */}
        <div className="flex-1 flex flex-col bg-[#1e2449]/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden shadow-xl">
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500">
                <div className="text-6xl mb-4 animate-bounce">{roomConfig.icon}</div>
                <h2 className="text-xl font-semibold mb-2">
                  {t('welcome', { room: t(roomConfig.labelKey) })}
                </h2>
                <p>{t('beFirst')}</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isOwn = msg.userId === currentUser?.id;
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 max-w-[85%] ${isOwn ? 'self-end flex-row-reverse' : 'self-start'}`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-md shrink-0`}
                      style={{ backgroundColor: msg.color || '#6366f1' }}
                    >
                      {getUserInitial(msg.nickname)}
                    </div>
                    <div className={`flex flex-col gap-1 ${isOwn ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold" style={{ color: msg.color }}>{msg.nickname}</span>
                        <span className="text-xs text-slate-500">{formatTime(msg.timestamp)}</span>
                      </div>
                      <div
                        className={`p-3 rounded-xl break-words text-sm sm:text-base shadow-sm ${isOwn
                            ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-tr-none'
                            : 'bg-[#1e2449] border border-slate-700 text-slate-200 rounded-tl-none'
                          }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 bg-[#1e2449]/60 backdrop-blur-xl border-t border-slate-700/50 z-20">
        <div className="max-w-4xl mx-auto flex gap-3 items-end">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-md shrink-0`}
            style={{ backgroundColor: currentUser?.color || '#6366f1' }}
          >
            {getUserInitial(currentUser?.nickname || '')}
          </div>
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={handleTextareaInput}
            onKeyDown={handleKeyDown}
            placeholder={t('placeholder')}
            rows={1}
            className="flex-1 bg-[#141937] border border-slate-700 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-indigo-500 resize-none max-h-32 custom-scrollbar"
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputText.trim()}
            className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-xl flex items-center justify-center shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
