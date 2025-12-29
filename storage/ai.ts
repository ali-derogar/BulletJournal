import { initDB, getDB, STORES } from "./db";

export interface AISession {
    id: string;
    userId: string;
    title: string;
    updatedAt: string;
}

export interface AIMessage {
    id: string;
    sessionId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
}

/**
 * Get all AI chat sessions for a user, sorted by updatedAt descending
 */
export async function getAISessions(userId: string): Promise<AISession[]> {
    try {
        await initDB();
        const db = getDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORES.AI_SESSIONS], "readonly");
            const store = transaction.objectStore(STORES.AI_SESSIONS);
            const index = store.index("userId");
            const request = index.getAll(userId);

            request.onsuccess = () => {
                const sessions = (request.result || []) as AISession[];
                sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
                resolve(sessions);
            };

            request.onerror = () => {
                reject(new Error(`Failed to get AI sessions: ${request.error?.message}`));
            };
        });
    } catch (error) {
        console.error("Error in getAISessions:", error);
        return [];
    }
}

/**
 * Save or update an AI session
 */
export async function saveAISession(session: AISession): Promise<void> {
    try {
        await initDB();
        const db = getDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORES.AI_SESSIONS], "readwrite");
            const store = transaction.objectStore(STORES.AI_SESSIONS);
            const request = store.put(session);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(new Error(`Failed to save AI session: ${request.error?.message}`));
        });
    } catch (error) {
        console.error("Error in saveAISession:", error);
        throw error;
    }
}

/**
 * Get all messages for a specific session, sorted by timestamp ascending
 */
export async function getAIMessages(sessionId: string): Promise<AIMessage[]> {
    try {
        await initDB();
        const db = getDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORES.AI_MESSAGES], "readonly");
            const store = transaction.objectStore(STORES.AI_MESSAGES);
            const index = store.index("sessionId");
            const request = index.getAll(sessionId);

            request.onsuccess = () => {
                const messages = (request.result || []) as AIMessage[];
                messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                resolve(messages);
            };

            request.onerror = () => {
                reject(new Error(`Failed to get AIMessages: ${request.error?.message}`));
            };
        });
    } catch (error) {
        console.error("Error in getAIMessages:", error);
        return [];
    }
}

/**
 * Save a new AI message
 */
export async function saveAIMessage(message: AIMessage): Promise<void> {
    try {
        await initDB();
        const db = getDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORES.AI_MESSAGES, STORES.AI_SESSIONS], "readwrite");

            // 1. Save the message
            const messageStore = transaction.objectStore(STORES.AI_MESSAGES);
            messageStore.put(message);

            // 2. Update session's updatedAt timestamp
            const sessionStore = transaction.objectStore(STORES.AI_SESSIONS);
            const sessionRequest = sessionStore.get(message.sessionId);

            sessionRequest.onsuccess = () => {
                const session = sessionRequest.result as AISession;
                if (session) {
                    session.updatedAt = message.timestamp;
                    // If title is "New Chat", update it with the first message content (shortened)
                    if (session.title === "New Chat" && message.role === 'user') {
                        session.title = message.content.slice(0, 30) + (message.content.length > 30 ? '...' : '');
                    }
                    sessionStore.put(session);
                }
            };

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(new Error(`Transaction failed: ${transaction.error?.message}`));
        });
    } catch (error) {
        console.error("Error in saveAIMessage:", error);
        throw error;
    }
}

/**
 * Delete a session and all its messages
 */
export async function deleteAISession(sessionId: string): Promise<void> {
    try {
        await initDB();
        const db = getDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORES.AI_SESSIONS, STORES.AI_MESSAGES], "readwrite");

            // Delete session
            transaction.objectStore(STORES.AI_SESSIONS).delete(sessionId);

            // Delete all messages for this session
            const messageStore = transaction.objectStore(STORES.AI_MESSAGES);
            const index = messageStore.index("sessionId");
            const request = index.getAllKeys(sessionId);

            request.onsuccess = () => {
                request.result.forEach(key => messageStore.delete(key));
            };

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(new Error(`Delete transaction failed: ${transaction.error?.message}`));
        });
    } catch (error) {
        console.error("Error in deleteAISession:", error);
        throw error;
    }
}
