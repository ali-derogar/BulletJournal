'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';

interface FloatingChatButtonProps {
  onClick: () => void;
  isOpen: boolean;
}

export default function FloatingChatButton({ onClick, isOpen }: FloatingChatButtonProps) {
  const t = useTranslations('aiChat');
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      onClick={onClick}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="fixed bottom-6 right-6 z-50 group outline-none"
    >
      <div className="relative">
        {/* Advanced Layered Glow Effect */}
        <AnimatePresence>
          <motion.div
            animate={{
              scale: isHovered ? [1.2, 1.3, 1.2] : [1, 1.1, 1],
              opacity: isHovered ? [0.6, 0.8, 0.6] : [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute inset-0 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 rounded-full blur-2xl"
          />
        </AnimatePresence>

        {/* 3D Glass Orb Button */}
        <motion.div
          className="relative w-16 h-16 rounded-full flex items-center justify-center overflow-hidden shadow-[0_20px_50px_rgba(79,70,229,0.3)]"
          style={{
            background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.9), rgba(147, 51, 234, 0.9))',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}
        >
          {/* Inner highlights for 3D effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent pointer-events-none" />
          <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />

          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
                className="z-10"
              >
                <svg className="w-8 h-8 text-white drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </motion.div>
            ) : (
              <motion.div
                key="open"
                initial={{ rotate: 90, opacity: 0, scale: 0.5 }}
                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                exit={{ rotate: -90, opacity: 0, scale: 0.5 }}
                className="z-10 flex items-center justify-center"
              >
                <motion.div
                  animate={{
                    filter: ['drop-shadow(0 0 2px #fff)', 'drop-shadow(0 0 8px #fff)', 'drop-shadow(0 0 2px #fff)']
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <svg className="w-9 h-9 text-white drop-shadow-md" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12,2C6.477,2,2,6.477,2,12c0,4.418,2.865,8.166,6.839,9.489c0.111,0.02,0.211-0.052,0.228-0.162 c0.017-0.109-0.047-0.216-0.155-0.246C6.18,19.344,4,16.488,4,13.25c0-4.005,3.245-7.25,7.25-7.25c4.005,0,7.25,3.245,7.25,7.25 c0,3.238-2.18,6.094-4.912,6.831c-0.108,0.03-0.172,0.137-0.155,0.246c0.017,0.11,0.117,0.182,0.228,0.162 C19.135,20.166,22,16.418,22,12C22,6.477,17.523,2,12,2z M12,6c-3.314,0-6,2.686-6,6c0,2.68,1.751,4.95,4.161,5.719 c0.091,0.029,0.187-0.02,0.223-0.111c0.036-0.092-0.011-0.194-0.101-0.23C8.423,16.828,7,15.074,7,13c0-2.761,2.239-5,5-5 s5,2.239,5,5c0,2.074-1.423,3.828-3.283,4.378c-0.09,0.026-0.137,0.138-0.101,0.23c0.036,0.091,0.132,0.14,0.223,0.111 C16.249,16.95,18,14.68,18,12C18,8.686,15.314,6,12,6z M12,9c-1.657,0-3,1.343-3,3s1.343,3,3,3s3-1.343,3-3S13.657,9,12,9z" />
                  </svg>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Liquid animated overlay */}
          <motion.div
            animate={{
              x: [-20, 20, -20],
              y: [-20, 20, -20],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute inset-0 bg-white/5 opacity-50 blur-xl pointer-events-none"
          />
        </motion.div>

        {/* Floating Tooltip */}
        <AnimatePresence>
          {isHovered && !isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
              className="absolute bottom-full right-0 mb-4 whitespace-nowrap"
            >
              <div className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-4 py-2 rounded-2xl text-sm font-semibold shadow-[0_10px_30px_rgba(0,0,0,0.3)] flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                {t('floatingTooltip')}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.button>
  );
}
