"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import Icon from "@/components/Icon";
import { getSharedTestResult, SharedTestResultPublic } from "@/services/profile-tests";

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

export default function SharedTestResultPage() {
  const params = useParams();
  const token = (params?.token as string) || "";
  const [result, setResult] = useState<SharedTestResultPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadResult = async () => {
      try {
        setLoading(true);
        const data = await getSharedTestResult(token);
        setResult(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load shared result");
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      loadResult();
    }
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center p-4">
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 max-w-md w-full text-center">
          <Icon className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </Icon>
          <h2 className="text-2xl font-bold mb-2">Error</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <Link
            href="/"
            className="inline-block px-6 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  if (!result) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white selection:bg-indigo-500/30">
      {/* Background Gradients */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[100px] mix-blend-screen" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[100px] mix-blend-screen" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 mb-4">
            Shared Test Result
          </h1>
          <p className="text-gray-400">
            {result.test_type === "holland" ? "Holland Career Interest Test" : "MBTI Personality Test"}
          </p>
        </motion.div>

        {/* Holland Test Result */}
        {result.test_type === "holland" && result.holland_dominant && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 relative overflow-hidden group mb-8"
          >
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-red-500/20 rounded-full blur-2xl group-hover:bg-red-500/30 transition-colors" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-8">
                <Icon className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </Icon>
                <h2 className="text-2xl font-bold text-white">Holland Career Interest Test</h2>
              </div>

              {/* Dominant Types */}
              <div className="mb-8">
                <p className="text-sm text-gray-400 mb-4">Dominant Career Interest Types</p>
                <div className="grid grid-cols-3 gap-4">
                  {result.holland_dominant.split("").map((code) => (
                    <motion.div
                      key={code}
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className={`bg-gradient-to-br ${HOLLAND_CODES[code as keyof typeof HOLLAND_CODES]?.color || "from-gray-500 to-gray-600"} rounded-2xl p-6 text-center`}
                    >
                      <div className="text-3xl font-bold text-white mb-2">{code}</div>
                      <div className="text-sm text-white/90 font-medium mb-1">
                        {HOLLAND_CODES[code as keyof typeof HOLLAND_CODES]?.name}
                      </div>
                      <div className="text-xs text-white/70">
                        {HOLLAND_CODES[code as keyof typeof HOLLAND_CODES]?.description}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Score Breakdown */}
              <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                <p className="text-sm text-gray-400 mb-4 uppercase tracking-widest">Score Breakdown</p>
                <div className="space-y-3">
                  {Object.entries(result.holland_scores || {}).map(([code, score]) => (
                    <div key={code} className="flex items-center gap-3">
                      <span className="w-8 font-bold text-white">{code}</span>
                      <div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full bg-gradient-to-r ${HOLLAND_CODES[code as keyof typeof HOLLAND_CODES]?.color || "from-gray-500 to-gray-600"}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${(score / 3) * 100}%` }}
                          transition={{ duration: 0.8, delay: 0.1 }}
                        />
                      </div>
                      <span className="text-sm text-gray-400 w-8 text-right">{score}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Info */}
              <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-between text-sm text-gray-400">
                <span>Test taken on {new Date(result.created_at).toLocaleDateString()}</span>
                {result.expires_at && (
                  <span className="text-yellow-400">
                    Expires on {new Date(result.expires_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* MBTI Test Result */}
        {result.test_type === "mbti" && result.mbti_type && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 relative overflow-hidden group mb-8"
          >
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-500/20 rounded-full blur-2xl group-hover:bg-purple-500/30 transition-colors" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-8">
                <Icon className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </Icon>
                <h2 className="text-2xl font-bold text-white">MBTI Personality Test</h2>
              </div>

              {/* MBTI Type */}
              <div className="mb-8">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-8 text-center mb-6"
                >
                  <div className="text-5xl font-bold text-white mb-3">{result.mbti_type}</div>
                  <p className="text-lg text-white/90">
                    {MBTI_DESCRIPTIONS[result.mbti_type] || "Unique personality type"}
                  </p>
                </motion.div>
              </div>

              {/* Preference Scores */}
              <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                <p className="text-sm text-gray-400 mb-4 uppercase tracking-widest">Preference Scores</p>
                <div className="grid grid-cols-2 gap-6">
                  {[
                    { pair: "E/I", label: "Extroversion/Introversion" },
                    { pair: "S/N", label: "Sensing/Intuition" },
                    { pair: "T/F", label: "Thinking/Feeling" },
                    { pair: "J/P", label: "Judging/Perceiving" },
                  ].map(({ pair, label }) => {
                    const [first, second] = pair.split("/");
                    const firstScore = result.mbti_scores?.[first] || 0;
                    const secondScore = result.mbti_scores?.[second] || 0;
                    const total = firstScore + secondScore;
                    const percentage = total > 0 ? (firstScore / total) * 100 : 50;

                    return (
                      <div key={pair} className="space-y-2">
                        <p className="text-xs text-gray-400">{label}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white w-6">{first}</span>
                          <div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              transition={{ duration: 0.8, delay: 0.1 }}
                            />
                          </div>
                          <span className="text-xs font-bold text-white w-6 text-right">{second}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Info */}
              <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-between text-sm text-gray-400">
                <span>Test taken on {new Date(result.created_at).toLocaleDateString()}</span>
                {result.expires_at && (
                  <span className="text-yellow-400">
                    Expires on {new Date(result.expires_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center mt-12"
        >
          <p className="text-gray-400 mb-4">Want to take these tests yourself?</p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors font-medium"
          >
            Go to Bullet Journal
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
