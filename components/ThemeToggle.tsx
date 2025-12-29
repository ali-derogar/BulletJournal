'use client';

import { useTheme } from '@/app/context/ThemeContext';
import { motion } from 'framer-motion';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return '☀️';
      case 'dark':
        return '🌙';
      case 'system':
        return '💻';
      default:
        return '☀️';
    }
  };

  const getThemeLabel = () => {
    switch (theme) {
      case 'light':
        return 'Light mode';
      case 'dark':
        return 'Dark mode';
      case 'system':
        return 'System theme';
      default:
        return 'Light mode';
    }
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={toggleTheme}
      className="p-2.5 rounded-lg bg-card border border-border hover:bg-secondary transition-all duration-200 shadow-sm hover:shadow-md"
      title={getThemeLabel()}
      aria-label={getThemeLabel()}
    >
      <motion.span
        key={theme}
        initial={{ scale: 0.8, opacity: 0, rotate: -180 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        exit={{ scale: 0.8, opacity: 0, rotate: 180 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="text-lg block"
      >
        {getThemeIcon()}
      </motion.span>
    </motion.button>
  );
}