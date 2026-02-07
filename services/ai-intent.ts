import { ActionResponse } from './ai-actions';
import { getToken } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Call the backend AI Agent to handle a natural language message.
 */
export async function callAgent(message: string, history?: any[]): Promise<ActionResponse> {
  const today = new Date();
  const currentDateStr = today.toISOString().split('T')[0];
  const token = getToken();

  if (!token) {
    console.error('No auth token found. User must be logged in.');
    return {
      success: false,
      message: 'لطفاً ابتدا وارد حساب کاربری خود شوید.',
    };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        message,
        currentDate: currentDateStr,
        history: history || [],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Agent request failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error calling AI Agent:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to communicate with AI Agent',
    };
  }
}
