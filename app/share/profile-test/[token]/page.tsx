"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import Icon from "@/components/Icon";
import { getSharedTestResult, SharedTestResultPublic } from "@/services/profile-tests";
import enMessages from "@/messages/en.json";
import faMessages from "@/messages/fa.json";

const HOLLAND_COLORS = {
  R: "from-red-500 to-red-600",
  I: "from-blue-500 to-blue-600",
  A: "from-purple-500 to-purple-600",
  S: "from-green-500 to-green-600",
  E: "from-yellow-500 to-yellow-600",
  C: "from-indigo-500 to-indigo-600",
};

const getLocaleFromPath = (path: string) => (path && path.startsWith("/fa") ? "fa" : "en");
const getMessage = (messages: Record<string, unknown>, key: string) => {
  let current: unknown = messages;
  for (const part of key.split(".")) {
    if (current && typeof current === "object") {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return current;
};
const formatMessage = (template: unknown, values?: Record<string, string | number>) => {
  if (typeof template !== "string") return "";
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) => (values[k] !== undefined ? String(values[k]) : `{${k}}`));
};

export default function SharedTestResultPage() {
  const params = useParams();
  const token = (params?.token as string) || "";
  const [result, setResult] = useState<SharedTestResultPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const locale = typeof window !== "undefined" ? getLocaleFromPath(window.location.pathname) : "en";
  const messages = useMemo(() => (locale === "fa" ? faMessages : enMessages), [locale]);
  const t = useCallback((key: string, values?: Record<string, string | number>) =>
    formatMessage(getMessage(messages as Record<string, unknown>, key), values),
  [messages]);
  const hollandCodes = (getMessage(messages as Record<string, unknown>, "profileTests.holland.codes") as Record<string, { name: string; description: string }>) || {};
  const mbtiDescriptions = (getMessage(messages as Record<string, unknown>, "profileTests.mbti.descriptions") as Record<string, string>) || {};
  const mbtiPreferencePairs = (getMessage(messages as Record<string, unknown>, "profileTests.mbti.preferencePairs") as Array<{ pair: string; label: string }>) || [];

  useEffect(() => {
    const loadResult = async () => {
      try {
        setLoading(true);
        const data = await getSharedTestResult(token);
        setResult(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("sharedTest.loadFailed"));
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      loadResult();
    }
  }, [token, t]);

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
          <h2 className="text-2xl font-bold mb-2">{t("sharedTest.errorTitle")}</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <Link
            href="/"
            className="inline-block px-6 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors"
          >
            {t("sharedTest.goHome")}
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
            {t("sharedTest.title")}
          </h1>
          <p className="text-gray-400">
            {result.test_type === "holland" ? t("sharedTest.subtitleHolland") : t("sharedTest.subtitleMbti")}
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
                <h2 className="text-2xl font-bold text-white">{t("profileTests.holland.title")}</h2>
              </div>

              {/* Dominant Types */}
              <div className="mb-8">
                <p className="text-sm text-gray-400 mb-4">{t("sharedTest.holland.dominantTypes")}</p>
                <div className="grid grid-cols-3 gap-4">
                  {result.holland_dominant.split("").map((code) => (
                    <motion.div
                      key={code}
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className={`bg-gradient-to-br ${HOLLAND_COLORS[code as keyof typeof HOLLAND_COLORS] || "from-gray-500 to-gray-600"} rounded-2xl p-6 text-center`}
                    >
                      <div className="text-3xl font-bold text-white mb-2">{code}</div>
                      <div className="text-sm text-white/90 font-medium mb-1">
                        {hollandCodes?.[code]?.name}
                      </div>
                      <div className="text-xs text-white/70">
                        {hollandCodes?.[code]?.description}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Score Breakdown */}
              <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                <p className="text-sm text-gray-400 mb-4 uppercase tracking-widest">{t("profileTests.holland.scoreBreakdown")}</p>
                <div className="space-y-3">
                  {Object.entries(result.holland_scores || {}).map(([code, score]) => (
                    <div key={code} className="flex items-center gap-3">
                      <span className="w-8 font-bold text-white">{code}</span>
                      <div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full bg-gradient-to-r ${HOLLAND_COLORS[code as keyof typeof HOLLAND_COLORS] || "from-gray-500 to-gray-600"}`}
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
                <span>{t("profileTests.common.takenOn", { date: new Date(result.created_at).toLocaleDateString(locale) })}</span>
                {result.expires_at && (
                  <span className="text-yellow-400">
                    {t("profileTests.shareModal.expiresOn", { date: new Date(result.expires_at).toLocaleDateString(locale) })}
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
                <h2 className="text-2xl font-bold text-white">{t("profileTests.mbti.title")}</h2>
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
                    {mbtiDescriptions?.[result.mbti_type] || t("profileTests.mbti.uniqueType")}
                  </p>
                </motion.div>
              </div>

              {/* Preference Scores */}
              <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                <p className="text-sm text-gray-400 mb-4 uppercase tracking-widest">{t("profileTests.mbti.preferenceScores")}</p>
                <div className="grid grid-cols-2 gap-6">
                  {mbtiPreferencePairs.map(({ pair, label }) => {
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
                <span>{t("profileTests.common.takenOn", { date: new Date(result.created_at).toLocaleDateString(locale) })}</span>
                {result.expires_at && (
                  <span className="text-yellow-400">
                    {t("profileTests.shareModal.expiresOn", { date: new Date(result.expires_at).toLocaleDateString(locale) })}
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
          <p className="text-gray-400 mb-4">{t("sharedTest.footerQuestion")}</p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors font-medium"
          >
            {t("sharedTest.footerCta")}
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
