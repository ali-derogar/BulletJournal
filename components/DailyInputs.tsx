"use client";

import { useState, useEffect, useCallback } from "react";
import type { SleepInfo, MoodInfo } from "@/domain";
import { getSleep, saveSleep, getMood, saveMood } from "@/storage";
import { calculateSleepDuration } from "@/utils/sleep";

interface DailyInputsProps {
  date: string;
  userId: string;
}

export default function DailyInputs({ date, userId }: DailyInputsProps) {
  const [sleepTime, setSleepTime] = useState<string>("");
  const [wakeTime, setWakeTime] = useState<string>("");
  const [sleepQuality, setSleepQuality] = useState<number>(5);
  const [mood, setMood] = useState<number>(5);
  const [dayScore, setDayScore] = useState<number>(5);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [sleepData, moodData] = await Promise.all([
          getSleep(date, userId),
          getMood(date, userId),
        ]);

        if (sleepData) {
          setSleepTime(sleepData.sleepTime || "");
          setWakeTime(sleepData.wakeTime || "");
          setSleepQuality(sleepData.quality);
        } else {
          setSleepTime("");
          setWakeTime("");
          setSleepQuality(5);
        }

        if (moodData) {
          setMood(moodData.rating);
          setDayScore(moodData.dayScore);
        } else {
          setMood(5);
          setDayScore(5);
        }
      } catch (error) {
        console.error("Failed to load daily inputs:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();

    // Listen for data download events to refresh daily inputs
    const handleDataDownloaded = () => {
      console.log('[DEBUG] Data downloaded event received, reloading daily inputs');
      loadData();
    };

    window.addEventListener('data-downloaded', handleDataDownloaded);

    return () => {
      window.removeEventListener('data-downloaded', handleDataDownloaded);
    };
  }, [date, userId]);

  const saveSleepData = useCallback(
    async (
      newSleepTime: string,
      newWakeTime: string,
      newQuality: number
    ) => {
      try {
        const hoursSlept = calculateSleepDuration(newSleepTime, newWakeTime);
        const sleepData: SleepInfo = {
          id: `sleep-${date}`,
          userId,
          date,
          sleepTime: newSleepTime || null,
          wakeTime: newWakeTime || null,
          hoursSlept,
          quality: newQuality,
          createdAt: new Date().toISOString(),
        };
        await saveSleep(sleepData);
      } catch (error) {
        console.error("Failed to save sleep data:", error);
      }
    },
    [date, userId]
  );

  const saveMoodData = useCallback(
    async (newMood: number, newDayScore: number) => {
      try {
        const existingMood = await getMood(date, userId);
        const moodData: MoodInfo = {
          id: `mood-${date}`,
          userId,
          date,
          rating: newMood,
          dayScore: newDayScore,
          notes: existingMood?.notes || "",
          waterIntake: existingMood?.waterIntake || 0,
          studyMinutes: existingMood?.studyMinutes || 0,
          createdAt: existingMood?.createdAt || new Date().toISOString(),
        };
        await saveMood(moodData);
      } catch (error) {
        console.error("Failed to save mood data:", error);
      }
    },
    [date, userId]
  );

  const handleSleepTimeChange = (value: string) => {
    setSleepTime(value);
    saveSleepData(value, wakeTime, sleepQuality);
  };

  const handleWakeTimeChange = (value: string) => {
    setWakeTime(value);
    saveSleepData(sleepTime, value, sleepQuality);
  };

  const handleSleepQualityChange = (value: number) => {
    setSleepQuality(value);
    saveSleepData(sleepTime, wakeTime, value);
  };

  const handleMoodChange = (value: number) => {
    setMood(value);
    saveMoodData(value, dayScore);
  };

  const handleDayScoreChange = (value: number) => {
    setDayScore(value);
    saveMoodData(mood, value);
  };

  const sleepDuration = calculateSleepDuration(sleepTime, wakeTime);

  if (loading) {
    return (
      <div className="p-4 space-y-6">
        <div className="bg-white rounded-lg p-4 shadow animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-24 mb-4"></div>
          <div className="space-y-4">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-6 bg-gray-200 rounded w-full"></div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
          <div className="space-y-4">
            <div className="h-6 bg-gray-200 rounded w-full"></div>
            <div className="h-6 bg-gray-200 rounded w-full"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div className="bg-card rounded-lg p-4 shadow">
        <h2 className="text-lg font-semibold text-card-foreground mb-4">Sleep</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-card-foreground mb-1">
              Sleep Time
            </label>
            <input
              type="time"
              value={sleepTime}
              onChange={(e) => handleSleepTimeChange(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Wake Time
            </label>
            <input
              type="time"
              value={wakeTime}
              onChange={(e) => handleWakeTimeChange(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          {sleepDuration > 0 && (
            <div className="text-sm text-muted-foreground">
              Duration: {sleepDuration} hours
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-card-foreground mb-1">
              Sleep Quality: {sleepQuality}/10
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={sleepQuality}
              onChange={(e) => handleSleepQualityChange(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg p-4 shadow">
        <h2 className="text-lg font-semibold text-card-foreground mb-4">Daily Reflection</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-card-foreground mb-1">
              Mood: {mood}/10
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={mood}
              onChange={(e) => handleMoodChange(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-card-foreground mb-1">
              Day Score: {dayScore}/10
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={dayScore}
              onChange={(e) => handleDayScoreChange(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
