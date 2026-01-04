// ============================================
// Application State
// ============================================
const APP_STATE = {
    currentUser: null,
    messages: [],
    users: new Map(),
    broadcastChannel: null
};

// ============================================
// Utility Functions
// ============================================

// Generate random color for user avatar
function generateUserColor() {
    const colors = [
        '#6366f1', '#ec4899', '#10b981', '#f59e0b',
        '#8b5cf6', '#06b6d4', '#ef4444', '#14b8a6'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

// Generate user ID
function generateUserId() {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Format time
function formatTime(date) {
    return new Date(date).toLocaleTimeString('fa-IR', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Get user initial
function getUserInitial(name) {
    return name ? name.charAt(0).toUpperCase() : 'U';
}

// ============================================
// Storage Functions
// ============================================

function saveToStorage() {
    try {
        localStorage.setItem('chatroom_user', JSON.stringify(APP_STATE.currentUser));
        localStorage.setItem('chatroom_messages', JSON.stringify(APP_STATE.messages));
    } catch (error) {
        console.error('Error saving to storage:', error);
    }
}

function loadFromStorage() {
    try {
        const savedUser = localStorage.getItem('chatroom_user');
        const savedMessages = localStorage.getItem('chatroom_messages');

        if (savedUser) {
            APP_STATE.currentUser = JSON.parse(savedUser);
        }

        if (savedMessages) {
            APP_STATE.messages = JSON.parse(savedMessages);
        }
    } catch (error) {
        console.error('Error loading from storage:', error);
    }
}

// ============================================
// User Management
// ============================================

function initializeUser() {
    loadFromStorage();

    if (!APP_STATE.currentUser) {
        APP_STATE.currentUser = {
            id: generateUserId(),
            nickname: '',
            color: generateUserColor(),
            joinedAt: Date.now()
        };
        saveToStorage();
    }

    updateCurrentUserUI();
}

function updateCurrentUserUI() {
    const user = APP_STATE.currentUser;
    const avatarEl = document.getElementById('currentUserAvatar');
    const initialEl = document.getElementById('currentUserInitial');
    const nicknameInput = document.getElementById('nicknameInput');

    if (avatarEl && user) {
        avatarEl.style.background = user.color;
        initialEl.textContent = getUserInitial(user.nickname);
    }

    if (nicknameInput && user) {
        nicknameInput.value = user.nickname;
    }
}

function updateUserNickname(nickname) {
    if (APP_STATE.currentUser) {
        APP_STATE.currentUser.nickname = nickname.trim();
        saveToStorage();
        updateCurrentUserUI();
        broadcastUserUpdate();
    }
}

function broadcastUserUpdate() {
    if (APP_STATE.broadcastChannel) {
        APP_STATE.broadcastChannel.postMessage({
            type: 'user_update',
            user: APP_STATE.currentUser
        });
    }
}

// ============================================
// Message Functions
// ============================================

function createMessage(text) {
    if (!text.trim() || !APP_STATE.currentUser.nickname) {
        return null;
    }

    return {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: APP_STATE.currentUser.id,
        nickname: APP_STATE.currentUser.nickname,
        color: APP_STATE.currentUser.color,
        text: text.trim(),
        timestamp: Date.now()
    };
}

function addMessage(message) {
    APP_STATE.messages.push(message);
    saveToStorage();
    renderMessage(message);
    scrollToBottom();
}

function sendMessage(text) {
    const message = createMessage(text);
    if (!message) return;

    addMessage(message);

    // Broadcast to other tabs
    if (APP_STATE.broadcastChannel) {
        APP_STATE.broadcastChannel.postMessage({
            type: 'new_message',
            message: message
        });
    }
}

// ============================================
// UI Rendering
// ============================================

function renderMessage(message) {
    const messagesList = document.getElementById('messagesList');

    // Remove welcome message if it exists
    const welcomeMsg = messagesList.querySelector('.welcome-message');
    if (welcomeMsg) {
        welcomeMsg.remove();
    }

    const isOwn = message.userId === APP_STATE.currentUser.id;

    const messageEl = document.createElement('div');
    messageEl.className = `message ${isOwn ? 'own' : ''}`;
    messageEl.innerHTML = `
        <div class="message-avatar" style="background: ${message.color}">
            <span>${getUserInitial(message.nickname)}</span>
        </div>
        <div class="message-content">
            <div class="message-header">
                <span class="message-sender" style="color: ${message.color}">${message.nickname}</span>
                <span class="message-time">${formatTime(message.timestamp)}</span>
            </div>
            <div class="message-bubble">
                ${escapeHtml(message.text)}
            </div>
        </div>
    `;

    messagesList.appendChild(messageEl);
}

function renderAllMessages() {
    const messagesList = document.getElementById('messagesList');
    messagesList.innerHTML = '';

    if (APP_STATE.messages.length === 0) {
        messagesList.innerHTML = `
            <div class="welcome-message">
                <div class="welcome-icon">💬</div>
                <h2>به چت روم خوش آمدید!</h2>
                <p>پیام خود را بنویسید و با دیگران گفتگو کنید</p>
            </div>
        `;
    } else {
        APP_STATE.messages.forEach(message => renderMessage(message));
    }
}

function renderUsersList() {
    const usersList = document.getElementById('usersList');
    const onlineCount = document.getElementById('onlineCount');

    usersList.innerHTML = '';

    // Add current user
    const users = [APP_STATE.currentUser];

    // Add other users from broadcast
    APP_STATE.users.forEach(user => {
        if (user.id !== APP_STATE.currentUser.id) {
            users.push(user);
        }
    });

    users.forEach(user => {
        const userEl = document.createElement('div');
        userEl.className = 'user-item';
        userEl.innerHTML = `
            <div class="user-item-avatar" style="background: ${user.color}">
                <span>${getUserInitial(user.nickname)}</span>
            </div>
            <span class="user-item-name">${user.nickname || 'کاربر'}</span>
            ${user.id === APP_STATE.currentUser.id ? '<span style="color: var(--color-success); font-size: 0.75rem;">شما</span>' : ''}
        `;
        usersList.appendChild(userEl);
    });

    // Update online count
    if (onlineCount) {
        const count = users.length;
        onlineCount.textContent = `${count} کاربر آنلاین`;
    }
}

function scrollToBottom() {
    const messagesList = document.getElementById('messagesList');
    setTimeout(() => {
        messagesList.scrollTop = messagesList.scrollHeight;
    }, 100);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// Broadcast Channel
// ============================================

function initializeBroadcastChannel() {
    try {
        APP_STATE.broadcastChannel = new BroadcastChannel('chatroom_channel');

        APP_STATE.broadcastChannel.onmessage = (event) => {
            const { type, message, user } = event.data;

            if (type === 'new_message') {
                // Only add if not from current user
                if (message.userId !== APP_STATE.currentUser.id) {
                    addMessage(message);
                }
            } else if (type === 'user_update') {
                if (user.id !== APP_STATE.currentUser.id) {
                    APP_STATE.users.set(user.id, user);
                    renderUsersList();
                }
            }
        };

        // Announce presence
        broadcastUserUpdate();
    } catch (error) {
        console.error('BroadcastChannel not supported:', error);
    }
}

// ============================================
// Event Handlers
// ============================================

function handleSendMessage() {
    const messageInput = document.getElementById('messageInput');
    const text = messageInput.value.trim();

    if (!text) return;

    if (!APP_STATE.currentUser.nickname) {
        alert('لطفاً ابتدا نام خود را وارد کنید');
        document.getElementById('nicknameInput').focus();
        return;
    }

    sendMessage(text);
    messageInput.value = '';
    messageInput.style.height = 'auto';
}

function handleNicknameChange(nickname) {
    updateUserNickname(nickname);

    // Close modal if open
    const modal = document.getElementById('nicknameModal');
    if (modal.classList.contains('active')) {
        modal.classList.remove('active');
    }
}

function toggleUserSidebar() {
    const sidebar = document.getElementById('userSidebar');
    sidebar.classList.toggle('active');
}

// ============================================
// Auto-resize textarea
// ============================================

function autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
}

// ============================================
// Initialization
// ============================================

function init() {
    // Initialize user
    initializeUser();

    // Load and render messages
    renderAllMessages();
    renderUsersList();
    scrollToBottom();

    // Initialize broadcast channel
    initializeBroadcastChannel();

    // Show nickname modal if no nickname
    if (!APP_STATE.currentUser.nickname) {
        const modal = document.getElementById('nicknameModal');
        modal.classList.add('active');
        document.getElementById('modalNicknameInput').focus();
    }

    // Event Listeners
    const sendButton = document.getElementById('sendButton');
    const messageInput = document.getElementById('messageInput');
    const nicknameInput = document.getElementById('nicknameInput');
    const modalSubmitButton = document.getElementById('modalSubmitButton');
    const modalNicknameInput = document.getElementById('modalNicknameInput');
    const userListToggle = document.getElementById('userListToggle');
    const closeSidebar = document.getElementById('closeSidebar');

    // Send message
    sendButton.addEventListener('click', handleSendMessage);

    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });

    messageInput.addEventListener('input', (e) => {
        autoResizeTextarea(e.target);
    });

    // Nickname change
    nicknameInput.addEventListener('change', (e) => {
        handleNicknameChange(e.target.value);
    });

    nicknameInput.addEventListener('blur', (e) => {
        handleNicknameChange(e.target.value);
    });

    // Modal
    modalSubmitButton.addEventListener('click', () => {
        const nickname = modalNicknameInput.value.trim();
        if (nickname) {
            handleNicknameChange(nickname);
        }
    });

    modalNicknameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const nickname = modalNicknameInput.value.trim();
            if (nickname) {
                handleNicknameChange(nickname);
            }
        }
    });

    // User sidebar toggle
    userListToggle.addEventListener('click', toggleUserSidebar);
    closeSidebar.addEventListener('click', toggleUserSidebar);

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        const sidebar = document.getElementById('userSidebar');
        if (sidebar.classList.contains('active') &&
            !sidebar.contains(e.target) &&
            !userListToggle.contains(e.target)) {
            sidebar.classList.remove('active');
        }
    });
}

// Start the application
document.addEventListener('DOMContentLoaded', init);
