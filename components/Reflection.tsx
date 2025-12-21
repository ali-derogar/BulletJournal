"use client";

import { useState, useEffect, useCallback } from "react";
import type { MoodInfo } from "@/domain";
import { getMood, saveMood } from "@/storage";

interface ReflectionProps {
  date: string;
  userId: string;
}

export default function Reflection({ date, userId }: ReflectionProps) {
  const [notes, setNotes] = useState("");
  const [waterIntake, setWaterIntake] = useState(0);
  const [studyMinutes, setStudyMinutes] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const moodData = await getMood(date, userId);

        if (moodData) {
          setNotes(moodData.notes || "");
          setWaterIntake(moodData.waterIntake || 0);
          setStudyMinutes(moodData.studyMinutes || 0);
        } else {
          setNotes("");
          setWaterIntake(0);
          setStudyMinutes(0);
        }
      } catch (error) {
        console.error("Failed to load reflection data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [date, userId]);

  const saveReflectionData = useCallback(
    async (
      newNotes: string,
      newWaterIntake: number,
      newStudyMinutes: number
    ) => {
      try {
        const existingMood = await getMood(date, userId);

        const moodData: MoodInfo = {
          id: `mood-${date}`,
          userId,
          date,
          rating: existingMood?.rating || 5,
          dayScore: existingMood?.dayScore || 5,
          notes: newNotes,
          waterIntake: newWaterIntake,
          studyMinutes: newStudyMinutes,
          createdAt: existingMood?.createdAt || new Date().toISOString(),
        };

        await saveMood(moodData);
      } catch (error) {
        console.error("Failed to save reflection data:", error);
      }
    },
    [date, userId]
  );

  const handleNotesChange = (value: string) => {
    setNotes(value);
    saveReflectionData(value, waterIntake, studyMinutes);
  };

  const handleWaterIntakeChange = (value: number) => {
    setWaterIntake(value);
    saveReflectionData(notes, value, studyMinutes);
  };

  const handleStudyMinutesChange = (value: number) => {
    setStudyMinutes(value);
    saveReflectionData(notes, waterIntake, value);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-lg p-4 shadow animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-24 mb-4"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-32"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-32"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
          <div className="h-40 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-lg p-4 shadow">
        <h2 className="text-lg font-semibold text-card-foreground mb-4">Habits</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-card-foreground mb-2">
              Water Intake (glasses)
            </label>
            <input
              type="number"
              value={waterIntake}
              onChange={(e) =>
                handleWaterIntakeChange(Number(e.target.value) || 0)
              }
              min="0"
              className="w-full px-3 py-2 border rounded"
            />
            <div className="mt-2 text-sm text-gray-600">
              {waterIntake >= 8 ? "✓ Goal reached!" : `${8 - waterIntake} more to reach goal`}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Study Time (minutes)
            </label>
            <input
              type="number"
              value={studyMinutes}
              onChange={(e) =>
                handleStudyMinutesChange(Number(e.target.value) || 0)
              }
              min="0"
              className="w-full px-3 py-2 border rounded"
            />
            <div className="mt-2 text-sm text-gray-600">
              {studyMinutes >= 60
                ? "✓ Goal reached!"
                : `${60 - studyMinutes} more to reach goal`}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg p-4 shadow">
        <h2 className="text-lg font-semibold text-card-foreground mb-4">Daily Reflection</h2>
        <textarea
          value={notes}
          onChange={(e) => handleNotesChange(e.target.value)}
          placeholder="Write your thoughts for the day..."
          className="w-full px-3 py-2 border border-input rounded min-h-[200px] resize-y focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
        />
        <div className="mt-2 text-sm text-muted-foreground">
          {notes.length} characters
        </div>
      </div>
    </div>
  );
}
