"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Types
interface User {
  id: string;
  nickname: string;
  color: string;
  joinedAt: number;
}

interface Message {
  id: string;
  userId: string;
  nickname: string;
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

const generateUserId = () => `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString('fa-IR', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getUserInitial = (name: string) => name ? name.charAt(0).toUpperCase() : 'U';

export default function ChatRoom() {
  // State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<Map<string, User>>(new Map());
  const [inputText, setInputText] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize
  useEffect(() => {
    // Load from storage
    const savedUser = localStorage.getItem('chatroom_user');
    const savedMessages = localStorage.getItem('chatroom_messages');

    if (savedUser) {
      const user = JSON.parse(savedUser);
      setCurrentUser(user);
      setNicknameInput(user.nickname);
    } else {
      setShowNicknameModal(true);
    }

    if (savedMessages) {
      setMessages(JSON.parse(savedMessages));
    }

    // Initialize BroadcastChannel
    try {
      const bc = new BroadcastChannel('chatroom_channel');
      broadcastChannelRef.current = bc;

      bc.onmessage = (event) => {
        const { type, message, user } = event.data;

        if (type === 'new_message') {
          setMessages(prev => {
            const newMessages = [...prev, message];
            localStorage.setItem('chatroom_messages', JSON.stringify(newMessages));
            return newMessages;
          });
        } else if (type === 'user_update') {
          setUsers(prev => {
            const newUsers = new Map(prev);
            newUsers.set(user.id, user);
            return newUsers;
          });
        }
      };
    } catch (error) {
      console.error('BroadcastChannel not supported:', error);
    }

    return () => {
      broadcastChannelRef.current?.close();
    };
  }, []);

  // Broadcast user update when current user changes
  useEffect(() => {
    if (currentUser && broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({
        type: 'user_update',
        user: currentUser
      });
    }
  }, [currentUser]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handlers
  const handleNicknameSubmit = () => {
    const nickname = nicknameInput.trim();
    if (!nickname) return;

    const newUser: User = currentUser || {
      id: generateUserId(),
      nickname,
      color: generateUserColor(),
      joinedAt: Date.now()
    };

    newUser.nickname = nickname;
    setCurrentUser(newUser);
    localStorage.setItem('chatroom_user', JSON.stringify(newUser));
    setShowNicknameModal(false);
  };

  const handleSendMessage = () => {
    if (!inputText.trim() || !currentUser) return;

    const newMessage: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: currentUser.id,
      nickname: currentUser.nickname,
      color: currentUser.color,
      text: inputText.trim(),
      timestamp: Date.now()
    };

    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    localStorage.setItem('chatroom_messages', JSON.stringify(updatedMessages));
    setInputText('');

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Broadcast
    broadcastChannelRef.current?.postMessage({
      type: 'new_message',
      message: newMessage
    });
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

  // Render Helpers
  const onlineUsers = Array.from(users.values()).filter(u => u.id !== currentUser?.id);
  if (currentUser) onlineUsers.unshift(currentUser);

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
          <div className="w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse"></div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            چت روم
          </h1>
          <span className="hidden sm:block px-3 py-1 bg-[#1e2449] rounded-full text-xs text-slate-400 border border-slate-700">
            {onlineUsers.length} کاربر آنلاین
          </span>
        </div>
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 bg-[#1e2449] rounded-lg border border-slate-700 text-slate-300 hover:text-indigo-400 hover:border-indigo-500 transition-all"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative z-10 p-4 gap-4">
        {/* Messages Area */}
        <div className="flex-1 flex flex-col bg-[#1e2449]/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden shadow-xl">
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500">
                <div className="text-6xl mb-4 animate-bounce">💬</div>
                <h2 className="text-xl font-semibold mb-2">به چت روم خوش آمدید!</h2>
                <p>پیام خود را بنویسید و با دیگران گفتگو کنید</p>
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
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-md shrink-0"
                      style={{ backgroundColor: msg.color }}
                    >
                      {getUserInitial(msg.nickname)}
                    </div>
                    <div className={`flex flex-col gap-1 ${isOwn ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold" style={{ color: msg.color }}>{msg.nickname}</span>
                        <span className="text-xs text-slate-500">{formatTime(msg.timestamp)}</span>
                      </div>
                      <div
                        className={`p-3 rounded-xl break-words text-sm sm:text-base shadow-sm ${
                          isOwn
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

        {/* Sidebar (Desktop) */}
        <aside className={`hidden md:flex w-72 flex-col bg-[#1e2449]/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden shadow-xl transition-all duration-300 ${isSidebarOpen ? 'w-72 opacity-100' : 'w-0 opacity-0 p-0 border-0'}`}>
          <div className="p-4 border-b border-slate-700/50">
            <h3 className="font-semibold text-lg">کاربران آنلاین</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
            {onlineUsers.map((user) => (
              <div key={user.id} className="flex items-center gap-3 p-2 bg-[#141937] rounded-lg border border-slate-700/50 hover:bg-[#1e2449] transition-colors">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm"
                  style={{ backgroundColor: user.color }}
                >
                  {getUserInitial(user.nickname)}
                </div>
                <span className="flex-1 font-medium truncate">{user.nickname}</span>
                {user.id === currentUser?.id && (
                  <span className="text-xs text-emerald-500 font-bold">شما</span>
                )}
              </div>
            ))}
          </div>
        </aside>

        {/* Sidebar (Mobile) */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="md:hidden fixed inset-y-0 right-0 w-3/4 max-w-xs bg-[#0a0e27]/95 backdrop-blur-xl border-l border-slate-700 z-50 shadow-2xl flex flex-col"
            >
              <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                <h3 className="font-semibold text-lg">کاربران آنلاین</h3>
                <button onClick={() => setIsSidebarOpen(false)} className="p-1 hover:bg-slate-800 rounded">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {onlineUsers.map((user) => (
                  <div key={user.id} className="flex items-center gap-3 p-2 bg-[#141937] rounded-lg border border-slate-700/50">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm"
                      style={{ backgroundColor: user.color }}
                    >
                      {getUserInitial(user.nickname)}
                    </div>
                    <span className="flex-1 font-medium truncate">{user.nickname}</span>
                    {user.id === currentUser?.id && (
                      <span className="text-xs text-emerald-500 font-bold">شما</span>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      <div className="p-4 bg-[#1e2449]/60 backdrop-blur-xl border-t border-slate-700/50 z-20">
        <div className="max-w-4xl mx-auto flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-md transition-transform hover:scale-105 cursor-pointer"
              style={{ backgroundColor: currentUser?.color || '#6366f1' }}
              onClick={() => setShowNicknameModal(true)}
            >
              {getUserInitial(currentUser?.nickname || '')}
            </div>
            <input
              type="text"
              value={currentUser?.nickname || ''}
              readOnly
              onClick={() => setShowNicknameModal(true)}
              className="flex-1 bg-[#141937] border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer hover:bg-[#1e2449] transition-colors"
              placeholder="نام شما..."
            />
          </div>
          <div className="flex gap-3 items-end">
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={handleTextareaInput}
              onKeyDown={handleKeyDown}
              placeholder="پیام خود را بنویسید..."
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

      {/* Nickname Modal */}
      <AnimatePresence>
        {showNicknameModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1e2449] border border-slate-700 rounded-2xl p-8 w-full max-w-md shadow-2xl"
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                  به چت روم خوش آمدید! 👋
                </h2>
                <p className="text-slate-400">لطفاً نام خود را وارد کنید</p>
              </div>
              <input
                type="text"
                value={nicknameInput}
                onChange={(e) => setNicknameInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleNicknameSubmit()}
                placeholder="نام شما..."
                maxLength={20}
                autoFocus
                className="w-full bg-[#141937] border border-slate-700 rounded-xl p-4 text-center text-lg text-white mb-6 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <button
                onClick={handleNicknameSubmit}
                disabled={!nicknameInput.trim()}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-semibold text-lg shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50"
              >
                شروع گفتگو
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
