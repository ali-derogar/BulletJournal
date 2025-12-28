'use client';

import { useState } from 'react';
import FloatingChatButton from './FloatingChatButton';
import ChatWindow from './ChatWindow';

interface AIChatProps {
  userId: string;
  isFullScreen?: boolean;
}

export default function AIChat({ userId, isFullScreen = false }: AIChatProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Full screen mode - always show the chat window
  if (isFullScreen) {
    return <ChatWindow isOpen={true} userId={userId} isFullScreen={true} />;
  }

  // Floating mode - show button and popup window
  return (
    <>
      <FloatingChatButton
        onClick={() => setIsOpen(!isOpen)}
        isOpen={isOpen}
      />
      <ChatWindow isOpen={isOpen} userId={userId} isFullScreen={false} />
    </>
  );
}
