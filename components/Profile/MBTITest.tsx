"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Icon from "@/components/Icon";
import { submitMBTITest } from "@/services/profile-tests";
import { useTranslations } from "next-intl";

interface MBTITestProps {
  onComplete: (result: { type: string; scores: Record<string, number> }) => void;
  onCancel: () => void;
}

type MBTIQuestion = {
  id: number;
  text: string;
  pair: [string, string];
  options: [string, string];
};

// MBTI types reference for future use
// const MBTI_TYPES = {
//   E: "Extroversion",
//   I: "Introversion",
//   S: "Sensing",
//   N: "Intuition",
//   T: "Thinking",
//   F: "Feeling",
//   J: "Judging",
//   P: "Perceiving",
// };

export default function MBTITest({ onComplete, onCancel }: MBTITestProps) {
  const t = useTranslations("profileTests.mbtiTest");
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const questions = t.raw("questions") as MBTIQuestion[];
  const questionsPerStep = 4;
  const totalSteps = Math.ceil(questions.length / questionsPerStep);
  const currentQuestions = questions.slice(
    currentStep * questionsPerStep,
    (currentStep + 1) * questionsPerStep
  );

  const handleAnswer = (questionId: number, answer: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length !== questions.length) {
      setError(t("errors.answerAll"));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await submitMBTITest(answers);
      onComplete(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.submitFailed"));
    } finally {
      setLoading(false);
    }
  };

  const progress = ((Object.keys(answers).length / questions.length) * 100).toFixed(0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
    >
      <div className="bg-[#1a1a24] border border-white/10 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[#1a1a24] border-b border-white/10 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">{t("title")}</h2>
            <button
              onClick={onCancel}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <Icon className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </Icon>
            </button>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-400">
              <span>
                {t("questionProgress", {
                  current: Object.keys(answers).length,
                  total: questions.length,
                })}
              </span>
              <span>{progress}%</span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Questions */}
          <div className="space-y-6">
            {currentQuestions.map((question) => (
              <motion.div
                key={question.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-3"
              >
                <p className="text-white font-medium">{question.text}</p>
                <div className="space-y-2">
                  {question.options.map((option, idx) => {
                    const answer = question.pair[idx];
                    return (
                      <button
                        key={option}
                        onClick={() => handleAnswer(question.id, answer)}
                        className={`w-full p-4 rounded-lg border text-left transition-all ${
                          answers[question.id] === answer
                            ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300"
                            : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              answers[question.id] === answer
                                ? "border-indigo-500 bg-indigo-500"
                                : "border-gray-500"
                            }`}
                          >
                            {answers[question.id] === answer && (
                              <div className="w-2 h-2 bg-white rounded-full" />
                            )}
                          </div>
                          <span>{option}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Step Indicator */}
          <div className="flex justify-center gap-2">
            {Array.from({ length: totalSteps }).map((_, idx) => (
              <div
                key={idx}
                className={`h-2 rounded-full transition-all ${
                  idx === currentStep
                    ? "w-8 bg-indigo-500"
                    : idx < currentStep
                    ? "w-2 bg-indigo-500/50"
                    : "w-2 bg-white/10"
                }`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="flex-1 px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {t("previous")}
            </button>

            {currentStep < totalSteps - 1 ? (
              <button
                onClick={handleNext}
                className="flex-1 px-4 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors"
              >
                {t("next")}
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading || Object.keys(answers).length !== questions.length}
                className="flex-1 px-4 py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t("submitting")}
                  </>
                ) : (
                  t("submit")
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
