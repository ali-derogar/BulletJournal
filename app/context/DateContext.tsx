"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { formatDate } from "@/utils/date";

interface DateContextType {
  currentDate: string;
  setCurrentDate: (date: string) => void;
}

const DateContext = createContext<DateContextType | undefined>(undefined);

export function DateProvider({ children }: { children: ReactNode }) {
  const [currentDate, setCurrentDate] = useState<string>(
    formatDate(new Date())
  );

  return (
    <DateContext.Provider value={{ currentDate, setCurrentDate }}>
      {children}
    </DateContext.Provider>
  );
}

export function useDate() {
  const context = useContext(DateContext);
  if (context === undefined) {
    throw new Error("useDate must be used within a DateProvider");
  }
  return context;
}
