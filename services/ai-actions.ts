import { getAuthToken } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface ActionResponse {
  success: boolean;
  message: string;
  data?: any;
}

export interface CreateTaskParams {
  title: string;
  date: string;
  status?: 'todo' | 'in-progress' | 'done';
  estimatedTime?: number;
}

export interface CreateGoalParams {
  title: string;
  type: 'yearly' | 'quarterly' | 'monthly' | 'weekly';
  year: number;
  quarter?: number;
  month?: number;
  week?: number;
  targetValue: number;
  unit: string;
  description?: string;
}

export interface CreateCalendarNoteParams {
  date: string;
  note: string;
}

export interface UpdateTaskParams {
  taskId: string;
  status?: 'todo' | 'in-progress' | 'done';
  title?: string;
  spentTime?: number;
}

export interface ListTasksParams {
  date?: string;
  status?: 'todo' | 'in-progress' | 'done';
}

/**
 * Create a new task via AI action
 */
export async function createTaskAction(params: CreateTaskParams): Promise<ActionResponse> {
  try {
    const token = getAuthToken();
    if (!token) {
      return {
        success: false,
        message: 'لطفاً ابتدا وارد شوید'
      };
    }

    const response = await fetch(`${API_BASE_URL}/api/actions/create-task`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title: params.title,
        date: params.date,
        status: params.status || 'todo',
        estimatedTime: params.estimatedTime
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.detail || `خطا در ساخت تسک (${response.status})`
      };
    }

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('[AI Actions] Create task failed:', error);
    return {
      success: false,
      message: 'خطا در ارتباط با سرور'
    };
  }
}

/**
 * Create a new goal via AI action
 */
export async function createGoalAction(params: CreateGoalParams): Promise<ActionResponse> {
  try {
    const token = getAuthToken();
    if (!token) {
      return {
        success: false,
        message: 'لطفاً ابتدا وارد شوید'
      };
    }

    const response = await fetch(`${API_BASE_URL}/api/actions/create-goal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.detail || `خطا در ساخت هدف (${response.status})`
      };
    }

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('[AI Actions] Create goal failed:', error);
    return {
      success: false,
      message: 'خطا در ارتباط با سرور'
    };
  }
}

/**
 * Create a calendar note via AI action
 */
export async function createCalendarNoteAction(params: CreateCalendarNoteParams): Promise<ActionResponse> {
  try {
    const token = getAuthToken();
    if (!token) {
      return {
        success: false,
        message: 'لطفاً ابتدا وارد شوید'
      };
    }

    const response = await fetch(`${API_BASE_URL}/api/actions/create-calendar-note`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.detail || `خطا در ساخت یادداشت (${response.status})`
      };
    }

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('[AI Actions] Create calendar note failed:', error);
    return {
      success: false,
      message: 'خطا در ارتباط با سرور'
    };
  }
}

/**
 * Update an existing task
 */
export async function updateTaskAction(params: UpdateTaskParams): Promise<ActionResponse> {
  try {
    const token = getAuthToken();
    if (!token) {
      return {
        success: false,
        message: 'لطفاً ابتدا وارد شوید'
      };
    }

    const response = await fetch(`${API_BASE_URL}/api/actions/update-task`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.detail || `خطا در به‌روزرسانی تسک (${response.status})`
      };
    }

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('[AI Actions] Update task failed:', error);
    return {
      success: false,
      message: 'خطا در ارتباط با سرور'
    };
  }
}

/**
 * List tasks with optional filters
 */
export async function listTasksAction(params: ListTasksParams = {}): Promise<ActionResponse> {
  try {
    const token = getAuthToken();
    if (!token) {
      return {
        success: false,
        message: 'لطفاً ابتدا وارد شوید'
      };
    }

    const response = await fetch(`${API_BASE_URL}/api/actions/list-tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.detail || `خطا در دریافت لیست (${response.status})`
      };
    }

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('[AI Actions] List tasks failed:', error);
    return {
      success: false,
      message: 'خطا در ارتباط با سرور'
    };
  }
}

/**
 * Mark a task as completed
 */
export async function completeTaskAction(taskId: string): Promise<ActionResponse> {
  try {
    const token = getAuthToken();
    if (!token) {
      return {
        success: false,
        message: 'لطفاً ابتدا وارد شوید'
      };
    }

    const response = await fetch(`${API_BASE_URL}/api/actions/complete-task?task_id=${encodeURIComponent(taskId)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.detail || `خطا در تکمیل تسک (${response.status})`
      };
    }

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('[AI Actions] Complete task failed:', error);
    return {
      success: false,
      message: 'خطا در ارتباط با سرور'
    };
  }
}
