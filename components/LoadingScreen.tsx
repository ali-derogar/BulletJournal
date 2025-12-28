'use client';

import { motion } from 'framer-motion';

export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        {/* Logo/Icon */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-primary to-purple-600 rounded-full flex items-center justify-center"
        >
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </motion.div>

        {/* Loading Text */}
        <motion.h2
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-xl font-bold text-foreground mb-2"
        >
          در حال بارگذاری...
        </motion.h2>
        <p className="text-sm text-muted-foreground">
          Loading...
        </p>

        {/* Progress Dots */}
        <div className="flex gap-2 justify-center mt-6">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.3, 1, 0.3],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
              }}
              className="w-3 h-3 bg-primary rounded-full"
            />
          ))}
        </div>

        {/* Debug Info (only in dev) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 text-xs text-muted-foreground">
            <p>اگر بیش از 5 ثانیه طول کشید:</p>
            <p className="mt-2">دکمه 🐛 پایین چپ را بزنید</p>
            <p>If it takes more than 5 seconds:</p>
            <p>Click the 🐛 button at bottom left</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
