import { getStoredToken } from './auth';

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
    const token = getStoredToken();
    if (!token) {
      return {
        success: false,
        message: 'Please login first'
      };
    }

    console.log(`[AI Action] Sending POST to /api/actions/create-task:`, params);
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

    console.log(`[AI Action] Received status ${response.status} from /api/actions/create-task`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[AI Action] Create task error data:', errorData);
      return {
        success: false,
        message: errorData.detail || `Error creating task (${response.status})`
      };
    }

    const result = await response.json();
    console.log('[AI Action] Create task success result:', result);
    return result;

  } catch (error) {
    console.error('[AI Action] Fetch error in createTaskAction:', error);
    return {
      success: false,
      message: 'Server connection error'
    };
  }
}

/**
 * Create a new goal via AI action
 */
export async function createGoalAction(params: CreateGoalParams): Promise<ActionResponse> {
  try {
    const token = getStoredToken();
    if (!token) {
      return {
        success: false,
        message: 'Please login first'
      };
    }

    console.log(`[AI Action] Sending POST to /api/actions/create-goal:`, params);
    const response = await fetch(`${API_BASE_URL}/api/actions/create-goal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(params)
    });

    console.log(`[AI Action] Received status ${response.status} from /api/actions/create-goal`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[AI Action] Create goal error data:', errorData);
      return {
        success: false,
        message: errorData.detail || `Error creating goal (${response.status})`
      };
    }

    const result = await response.json();
    console.log('[AI Action] Create goal success result:', result);
    return result;

  } catch (error) {
    console.error('[AI Action] Fetch error in createGoalAction:', error);
    return {
      success: false,
      message: 'Server connection error'
    };
  }
}

/**
 * Create a calendar note via AI action
 */
export async function createCalendarNoteAction(params: CreateCalendarNoteParams): Promise<ActionResponse> {
  try {
    const token = getStoredToken();
    if (!token) {
      return {
        success: false,
        message: 'Please login first'
      };
    }

    console.log(`[AI Action] Sending POST to /api/actions/create-calendar-note:`, params);
    const response = await fetch(`${API_BASE_URL}/api/actions/create-calendar-note`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(params)
    });

    console.log(`[AI Action] Received status ${response.status} from /api/actions/create-calendar-note`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[AI Action] Create note error data:', errorData);
      return {
        success: false,
        message: errorData.detail || `Error creating note (${response.status})`
      };
    }

    const result = await response.json();
    console.log('[AI Action] Create note success result:', result);
    return result;

  } catch (error) {
    console.error('[AI Action] Fetch error in createCalendarNoteAction:', error);
    return {
      success: false,
      message: 'Server connection error'
    };
  }
}

/**
 * Update an existing task
 */
export async function updateTaskAction(params: UpdateTaskParams): Promise<ActionResponse> {
  try {
    const token = getStoredToken();
    if (!token) {
      return {
        success: false,
        message: 'Please login first'
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
        message: errorData.detail || `Error updating task (${response.status})`
      };
    }

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('[AI Actions] Update task failed:', error);
    return {
      success: false,
      message: 'Server connection error'
    };
  }
}

/**
 * List tasks with optional filters
 */
export async function listTasksAction(params: ListTasksParams = {}): Promise<ActionResponse> {
  try {
    const token = getStoredToken();
    if (!token) {
      return {
        success: false,
        message: 'Please login first'
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
        message: errorData.detail || `Error fetching list (${response.status})`
      };
    }

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('[AI Actions] List tasks failed:', error);
    return {
      success: false,
      message: 'Server connection error'
    };
  }
}

/**
 * Mark a task as completed
 */
export async function completeTaskAction(taskId: string): Promise<ActionResponse> {
  try {
    const token = getStoredToken();
    if (!token) {
      return {
        success: false,
        message: 'Please login first'
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
        message: errorData.detail || `Error completing task (${response.status})`
      };
    }

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('[AI Actions] Complete task failed:', error);
    return {
      success: false,
      message: 'Server connection error'
    };
  }
}
