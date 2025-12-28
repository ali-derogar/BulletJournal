'use client';

import { useState } from 'react';
import FloatingChatButton from './FloatingChatButton';
import ChatWindow from './ChatWindow';

interface AIChatProps {
  userId: string;
}

export default function AIChat({ userId }: AIChatProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <FloatingChatButton
        onClick={() => setIsOpen(!isOpen)}
        isOpen={isOpen}
      />
      <ChatWindow isOpen={isOpen} userId={userId} />
    </>
  );
}
