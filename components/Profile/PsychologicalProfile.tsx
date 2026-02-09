"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Icon from "@/components/Icon";
import HollandTest from "./HollandTest";
import MBTITest from "./MBTITest";
import {
  getUserTests,
  shareTestResult,
  ProfileTestResponse,
  ShareTestResultResponse,
} from "@/services/profile-tests";

interface PsychologicalProfileProps {
  userId: string;
  token: string;
}

const HOLLAND_CODES = {
  R: { name: "Realistic", color: "from-red-500 to-red-600", description: "Practical, hands-on, technical" },
  I: { name: "Investigative", color: "from-blue-500 to-blue-600", description: "Analytical, curious, scientific" },
  A: { name: "Artistic", color: "from-purple-500 to-purple-600", description: "Creative, expressive, original" },
  S: { name: "Social", color: "from-green-500 to-green-600", description: "Helpful, caring, supportive" },
  E: { name: "Enterprising", color: "from-yellow-500 to-yellow-600", description: "Ambitious, persuasive, leadership" },
  C: { name: "Conventional", color: "from-indigo-500 to-indigo-600", description: "Organized, detail-oriented, systematic" },
};

const MBTI_DESCRIPTIONS: Record<string, string> = {
  INTJ: "The Architect - Strategic thinker with a plan for everything",
  INTP: "The Logician - Innovative inventor with an unquenchable thirst for knowledge",
  ENTJ: "The Commander - Bold, imaginative, and strong-willed leader",
  ENTP: "The Debater - Smart and curious thinker who loves a good debate",
  INFJ: "The Advocate - Quiet and mystical, yet very inspiring and tireless idealist",
  INFP: "The Mediator - Poetic, kind and altruistic people",
  ENFJ: "The Protagonist - Natural-born leader and people person",
  ENFP: "The Campaigner - Enthusiastic, creative, and sociable free spirit",
  ISTJ: "The Logistician - Practical and fact-oriented reliable worker",
  ISFJ: "The Defender - Dedicated and warm protector of those in need",
  ESTJ: "The Executive - Excellent administrator and natural leader",
  ESFJ: "The Consul - Extraordinarily caring, social and popular person",
  ISTP: "The Virtuoso - Bold and practical experimenter",
  ISFP: "The Adventurer - Flexible and charming artist",
  ESTP: "The Entrepreneur - Smart, energetic and perceptive people-person",
  ESFP: "The Entertainer - Outgoing, spontaneous and enjoyable person",
};

export default function PsychologicalProfile({ userId, token }: PsychologicalProfileProps) {
  const [testResults, setTestResults] = useState<ProfileTestResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHollandTest, setShowHollandTest] = useState(false);
  const [showMBTITest, setShowMBTITest] = useState(false);
  const [sharing, setSharing] = useState<"holland" | "mbti" | null>(null);
  const [shareLink, setShareLink] = useState<ShareTestResultResponse | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    loadTestResults();
  }, []);

  const loadTestResults = async () => {
    try {
      setLoading(true);
      const results = await getUserTests();
      setTestResults(results);
      setError(null);
    } catch (err) {
      // It's okay if no tests have been taken yet
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  const handleHollandComplete = (result: any) => {
    setShowHollandTest(false);
    loadTestResults();
  };

  const handleMBTIComplete = (result: any) => {
    setShowMBTITest(false);
    loadTestResults();
  };

  const handleShareTest = async (testType: "holland" | "mbti") => {
    setSharing(testType);
    try {
      const response = await shareTestResult(testType);
      setShareLink(response);
      setShowShareModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create share link");
    } finally {
      setSharing(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-2xl font-bold text-white mb-2">Psychological Profile</h3>
        <p className="text-gray-400">Discover your career interests and personality type</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Holland Test Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 relative overflow-hidden group"
      >
        <div className="absolute -right-4 -top-4 w-24 h-24 bg-red-500/20 rounded-full blur-2xl group-hover:bg-red-500/30 transition-colors" />
        <div className="relative">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h4 className="text-lg font-bold text-white mb-1">Holland Career Interest Test</h4>
              <p className="text-sm text-gray-400">Discover your RIASEC career interests</p>
            </div>
            <Icon className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </Icon>
          </div>

          {testResults?.holland_dominant ? (
            <div className="space-y-4">
              {/* Result Display */}
              <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                <p className="text-sm text-gray-400 mb-3">Your Dominant Types</p>
                <div className="flex gap-3 mb-4">
                  {testResults.holland_dominant.split("").map((code) => (
                    <div
                      key={code}
                      className={`flex-1 bg-gradient-to-br ${HOLLAND_CODES[code as keyof typeof HOLLAND_CODES]?.color || "from-gray-500 to-gray-600"} rounded-xl p-4 text-center`}
                    >
                      <div className="text-2xl font-bold text-white mb-1">{code}</div>
                      <div className="text-xs text-white/80">
                        {HOLLAND_CODES[code as keyof typeof HOLLAND_CODES]?.name}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Scores */}
                <div className="space-y-2">
                  <p className="text-xs text-gray-400 uppercase tracking-widest mb-3">Score Breakdown</p>
                  {Object.entries(testResults.holland_scores || {}).map(([code, score]) => (
                    <div key={code} className="flex items-center gap-3">
                      <span className="w-8 font-bold text-white">{code}</span>
                      <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full bg-gradient-to-r ${HOLLAND_CODES[code as keyof typeof HOLLAND_CODES]?.color || "from-gray-500 to-gray-600"}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${(score / 3) * 100}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                      <span className="text-sm text-gray-400 w-8 text-right">{score}</span>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-gray-500 mt-4">
                  Taken on {new Date(testResults.created_at).toLocaleDateString()}
                </p>
              </div>

              {/* Share Button */}
              <button
                onClick={() => handleShareTest("holland")}
                disabled={sharing === "holland"}
                className="w-full px-4 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {sharing === "holland" ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating Link...
                  </>
                ) : (
                  <>
                    <Icon className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.658 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </Icon>
                    Share Result
                  </>
                )}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowHollandTest(true)}
              className="w-full px-6 py-4 rounded-lg bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium transition-all hover:shadow-lg hover:shadow-red-500/20"
            >
              Take Holland Test
            </button>
          )}
        </div>
      </motion.div>

      {/* MBTI Test Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 relative overflow-hidden group"
      >
        <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-500/20 rounded-full blur-2xl group-hover:bg-purple-500/30 transition-colors" />
        <div className="relative">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h4 className="text-lg font-bold text-white mb-1">MBTI Personality Test</h4>
              <p className="text-sm text-gray-400">Understand your personality type</p>
            </div>
            <Icon className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </Icon>
          </div>

          {testResults?.mbti_type ? (
            <div className="space-y-4">
              {/* Result Display */}
              <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                <p className="text-sm text-gray-400 mb-3">Your Personality Type</p>
                <div className="mb-4">
                  <div className="text-4xl font-bold text-white mb-2">{testResults.mbti_type}</div>
                  <p className="text-sm text-gray-300">
                    {MBTI_DESCRIPTIONS[testResults.mbti_type] || "Unique personality type"}
                  </p>
                </div>

                {/* Scores */}
                <div className="space-y-3">
                  <p className="text-xs text-gray-400 uppercase tracking-widest mb-3">Preference Scores</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { pair: "E/I", label: "Extroversion/Introversion" },
                      { pair: "S/N", label: "Sensing/Intuition" },
                      { pair: "T/F", label: "Thinking/Feeling" },
                      { pair: "J/P", label: "Judging/Perceiving" },
                    ].map(({ pair, label }) => {
                      const [first, second] = pair.split("/");
                      const firstScore = testResults.mbti_scores?.[first] || 0;
                      const secondScore = testResults.mbti_scores?.[second] || 0;
                      const total = firstScore + secondScore;
                      const percentage = total > 0 ? (firstScore / total) * 100 : 50;

                      return (
                        <div key={pair} className="space-y-2">
                          <p className="text-xs text-gray-400">{label}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white w-6">{first}</span>
                            <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                              <motion.div
                                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                                initial={{ width: 0 }}
                                animate={{ width: `${percentage}%` }}
                                transition={{ duration: 0.5 }}
                              />
                            </div>
                            <span className="text-xs font-bold text-white w-6 text-right">{second}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <p className="text-xs text-gray-500 mt-4">
                  Taken on {new Date(testResults.created_at).toLocaleDateString()}
                </p>
              </div>

              {/* Share Button */}
              <button
                onClick={() => handleShareTest("mbti")}
                disabled={sharing === "mbti"}
                className="w-full px-4 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {sharing === "mbti" ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating Link...
                  </>
                ) : (
                  <>
                    <Icon className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.658 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </Icon>
                    Share Result
                  </>
                )}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowMBTITest(true)}
              className="w-full px-6 py-4 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-medium transition-all hover:shadow-lg hover:shadow-purple-500/20"
            >
              Take MBTI Test
            </button>
          )}
        </div>
      </motion.div>

      {/* Test Modals */}
      <AnimatePresence>
        {showHollandTest && (
          <HollandTest
            onComplete={handleHollandComplete}
            onCancel={() => setShowHollandTest(false)}
          />
        )}
        {showMBTITest && (
          <MBTITest
            onComplete={handleMBTIComplete}
            onCancel={() => setShowMBTITest(false)}
          />
        )}
      </AnimatePresence>

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && shareLink && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          >
            <div className="bg-[#1a1a24] border border-white/10 rounded-3xl max-w-md w-full p-8">
              <h3 className="text-2xl font-bold text-white mb-4">Share Your Result</h3>

              <div className="space-y-4">
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <p className="text-xs text-gray-400 mb-2">Share Link</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={`${window.location.origin}/share/profile-test/${shareLink.share_token}`}
                      readOnly
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                    />
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `${window.location.origin}/share/profile-test/${shareLink.share_token}`
                        )
                      }
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white font-medium transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                {shareLink.expires_at && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 text-yellow-400 text-sm">
                    Expires on {new Date(shareLink.expires_at).toLocaleDateString()}
                  </div>
                )}

                <button
                  onClick={() => setShowShareModal(false)}
                  className="w-full px-4 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
