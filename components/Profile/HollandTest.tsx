"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Icon from "@/components/Icon";
import { submitHollandTest } from "@/services/profile-tests";
import { useTranslations } from "next-intl";

interface HollandTestProps {
  onComplete: (result: { scores: Record<string, number>; dominant: string }) => void;
  onCancel: () => void;
}

const HOLLAND_QUESTIONS = [
  { id: 1, textKey: "questions.q1", code: "R" },
  { id: 2, textKey: "questions.q2", code: "I" },
  { id: 3, textKey: "questions.q3", code: "A" },
  { id: 4, textKey: "questions.q4", code: "S" },
  { id: 5, textKey: "questions.q5", code: "E" },
  { id: 6, textKey: "questions.q6", code: "C" },
  { id: 7, textKey: "questions.q7", code: "R" },
  { id: 8, textKey: "questions.q8", code: "I" },
  { id: 9, textKey: "questions.q9", code: "A" },
  { id: 10, textKey: "questions.q10", code: "S" },
  { id: 11, textKey: "questions.q11", code: "E" },
  { id: 12, textKey: "questions.q12", code: "C" },
  { id: 13, textKey: "questions.q13", code: "R" },
  { id: 14, textKey: "questions.q14", code: "I" },
  { id: 15, textKey: "questions.q15", code: "A" },
  { id: 16, textKey: "questions.q16", code: "S" },
  { id: 17, textKey: "questions.q17", code: "E" },
  { id: 18, textKey: "questions.q18", code: "C" },
];

// Holland codes reference for future use
// const HOLLAND_CODES = {
//   R: { name: "Realistic", color: "from-red-500 to-red-600", description: "Practical, hands-on, technical" },
//   I: { name: "Investigative", color: "from-blue-500 to-blue-600", description: "Analytical, curious, scientific" },
//   A: { name: "Artistic", color: "from-purple-500 to-purple-600", description: "Creative, expressive, original" },
//   S: { name: "Social", color: "from-green-500 to-green-600", description: "Helpful, caring, supportive" },
//   E: { name: "Enterprising", color: "from-yellow-500 to-yellow-600", description: "Ambitious, persuasive, leadership" },
//   C: { name: "Conventional", color: "from-indigo-500 to-indigo-600", description: "Organized, detail-oriented, systematic" },
// };

export default function HollandTest({ onComplete, onCancel }: HollandTestProps) {
  const t = useTranslations("profile.holland");
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const questionsPerStep = 3;
  const totalSteps = Math.ceil(HOLLAND_QUESTIONS.length / questionsPerStep);
  const currentQuestions = HOLLAND_QUESTIONS.slice(
    currentStep * questionsPerStep,
    (currentStep + 1) * questionsPerStep
  );

  const handleAnswer = (questionId: number, code: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: code,
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
    if (Object.keys(answers).length !== HOLLAND_QUESTIONS.length) {
      setError(t("errors.answerAll"));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await submitHollandTest(answers);
      onComplete(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.submitFailed"));
    } finally {
      setLoading(false);
    }
  };

  const progress = ((Object.keys(answers).length / HOLLAND_QUESTIONS.length) * 100).toFixed(0);

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
              aria-label={t("close")}
            >
              <Icon className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </Icon>
            </button>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-400">
              <span>{t("progress", { current: Object.keys(answers).length, total: HOLLAND_QUESTIONS.length })}</span>
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
          <div className="space-y-4">
            {currentQuestions.map((question) => (
              <motion.div
                key={question.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-3"
              >
                <p className="text-white font-medium">{t(question.textKey)}</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    t("answers.stronglyDisagree"),
                    t("answers.disagree"),
                    t("answers.agree"),
                    t("answers.stronglyAgree"),
                  ].map((label) => (
                    <button
                      key={label}
                      onClick={() => handleAnswer(question.id, question.code)}
                      className={`p-3 rounded-lg border transition-all ${
                        answers[question.id] === question.code
                          ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300"
                          : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
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
                disabled={loading || Object.keys(answers).length !== HOLLAND_QUESTIONS.length}
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
