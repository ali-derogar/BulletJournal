"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Icon from "@/components/Icon";
import { submitMBTITest } from "@/services/profile-tests";

interface MBTITestProps {
  onComplete: (result: { type: string; scores: Record<string, number> }) => void;
  onCancel: () => void;
}

const MBTI_QUESTIONS = [
  { id: 1, text: "At a party, I...", pair: ["E", "I"], options: ["Interact with many, including strangers", "Interact with a few, known to me"] },
  { id: 2, text: "I am more...", pair: ["S", "N"], options: ["Realistic than speculative", "Speculative than realistic"] },
  { id: 3, text: "I value more in myself...", pair: ["T", "F"], options: ["Clearheadedness", "Warmheartedness"] },
  { id: 4, text: "I am more...", pair: ["J", "P"], options: ["Organized than flexible", "Flexible than organized"] },
  { id: 5, text: "I prefer to...", pair: ["E", "I"], options: ["Be in a busy environment", "Work in quiet, focused settings"] },
  { id: 6, text: "I focus more on...", pair: ["S", "N"], options: ["What is real and actual", "What could be possible and theoretical"] },
  { id: 7, text: "When deciding, I rely more on...", pair: ["T", "F"], options: ["Objective logic", "Personal values"] },
  { id: 8, text: "I prefer to...", pair: ["J", "P"], options: ["Have things decided", "Keep options open"] },
  { id: 9, text: "I am energized by...", pair: ["E", "I"], options: ["Interaction with others", "Solitary reflection"] },
  { id: 10, text: "I prefer...", pair: ["S", "N"], options: ["Practical solutions", "Creative possibilities"] },
  { id: 11, text: "I am more...", pair: ["T", "F"], options: ["Objective and impersonal", "Subjective and personal"] },
  { id: 12, text: "I like to...", pair: ["J", "P"], options: ["Plan my activities", "Go with the flow"] },
  { id: 13, text: "I enjoy...", pair: ["E", "I"], options: ["Group activities and discussions", "Individual projects and hobbies"] },
  { id: 14, text: "I trust more in...", pair: ["S", "N"], options: ["Experience and facts", "Intuition and imagination"] },
  { id: 15, text: "I am more...", pair: ["T", "F"], options: ["Firm than gentle", "Gentle than firm"] },
  { id: 16, text: "I prefer...", pair: ["J", "P"], options: ["Structured schedules", "Spontaneous activities"] },
];

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
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const questionsPerStep = 4;
  const totalSteps = Math.ceil(MBTI_QUESTIONS.length / questionsPerStep);
  const currentQuestions = MBTI_QUESTIONS.slice(
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
    if (Object.keys(answers).length !== MBTI_QUESTIONS.length) {
      setError("Please answer all questions");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await submitMBTITest(answers);
      onComplete(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit test");
    } finally {
      setLoading(false);
    }
  };

  const progress = ((Object.keys(answers).length / MBTI_QUESTIONS.length) * 100).toFixed(0);

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
            <h2 className="text-2xl font-bold text-white">MBTI Personality Test</h2>
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
              <span>Question {Object.keys(answers).length} of {MBTI_QUESTIONS.length}</span>
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
              Previous
            </button>

            {currentStep < totalSteps - 1 ? (
              <button
                onClick={handleNext}
                className="flex-1 px-4 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading || Object.keys(answers).length !== MBTI_QUESTIONS.length}
                className="flex-1 px-4 py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Test"
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
