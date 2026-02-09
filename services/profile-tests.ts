import { getStoredToken } from "./auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface HollandTestResult {
  scores: Record<string, number>;
  dominant: string;
}

export interface MBTITestResult {
  type: string;
  scores: Record<string, number>;
}

export interface ProfileTestResponse {
  id: string;
  user_id: string;
  holland_scores: Record<string, number> | null;
  holland_dominant: string | null;
  mbti_type: string | null;
  mbti_scores: Record<string, number> | null;
  created_at: string;
  updated_at: string;
}

export interface ShareTestResultResponse {
  share_token: string;
  share_url: string;
  expires_at: string | null;
}

export interface SharedTestResultPublic {
  test_type: string;
  holland_scores: Record<string, number> | null;
  holland_dominant: string | null;
  mbti_type: string | null;
  mbti_scores: Record<string, number> | null;
  created_at: string;
  expires_at: string | null;
}

/**
 * Submit Holland Career Interest Test answers
 */
export async function submitHollandTest(
  answers: Record<number, string>
): Promise<HollandTestResult> {
  const token = getStoredToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${API_BASE}/api/profile/tests/holland`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ answers }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to submit Holland test");
  }

  return response.json();
}

/**
 * Submit MBTI Personality Test answers
 */
export async function submitMBTITest(
  answers: Record<number, string>
): Promise<MBTITestResult> {
  const token = getStoredToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${API_BASE}/api/profile/tests/mbti`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ answers }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to submit MBTI test");
  }

  return response.json();
}

/**
 * Get user's saved test results
 */
export async function getUserTests(): Promise<ProfileTestResponse> {
  const token = getStoredToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${API_BASE}/api/profile/tests`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to fetch test results");
  }

  return response.json();
}

/**
 * Share a test result and get a shareable link
 */
export async function shareTestResult(
  testType: "holland" | "mbti",
  expiresInDays?: number
): Promise<ShareTestResultResponse> {
  const token = getStoredToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(
    `${API_BASE}/api/profile/tests/${testType}/share`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        test_type: testType,
        expires_in_days: expiresInDays,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to create share link");
  }

  return response.json();
}

/**
 * Get a shared test result (public endpoint, no auth required)
 */
export async function getSharedTestResult(
  shareToken: string
): Promise<SharedTestResultPublic> {
  const response = await fetch(
    `${API_BASE}/api/profile/share/profile-test/${shareToken}`,
    {
      method: "GET",
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to fetch shared result");
  }

  return response.json();
}
