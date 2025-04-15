// Import Firebase and module dependencies
import { auth, onAuthStateChanged } from './firebase-config.js';
import * as messagesModule from './messages.js';

// DOM elements
const elements = {
    conversationsList: document.getElementById('conversations-list'),
    searchConversations: document.getElementById('search-conversations'),
    newMessageButton: document.getElementById('new-message-button'),
    chatArea: document.getElementById('chat-area'),
    chatContent: document.getElementById('chat-content'),
    emptyChat: document.getElementById('empty-chat'),
    chatHeader: document.getElementById('chat-header'),
    chatMessages: document.getElementById('chat-messages'),
    messageInput: document.getElementById('message-input'),
    sendMessageButton: document.getElementById('send-message-button'),
    attachButton: document.getElementById('attach-button'),
    newMessageModal: document.getElementById('new-message-modal'),
    userSearch: document.getElementById('user-search'),
    userSearchResults: document.getElementById('user-search-results')
};

// App state
const appState = {
    currentUser: null,
    conversations: [],
    currentConversation: null,
    messages: [],
    messageListener: null,
    searchTimeout: null
};

// Flag to track initialization
let isInitialized = false;

// Initialize the messaging UI
export async function initMessagingUI() {
    // Prevent double initialization
    if (isInitialized) {
        console.log('Messaging UI already initialized, skipping...');
        return;
    }

    console.log('Initializing messaging UI...');

    // Set up auth state change listener
    onAuthStateChanged(auth, handleAuthStateChanged);

    // Set up event listeners
    setupEventListeners();

    // Mark as initialized
    isInitialized = true;
}

// Handle authentication state changes
function handleAuthStateChanged(user) {
    appState.currentUser = user;

    if (user) {
        // User is logged in, load conversations
        loadConversations();
    } else {
        // User is not logged in, redirect to home
        window.location.href = '/';
    }
}

// Set up event listeners
function setupEventListeners() {
    // New message button
    if (elements.newMessageButton) {
        elements.newMessageButton.addEventListener('click', showNewMessageModal);
    }

    // Search conversations
    if (elements.searchConversations) {
        elements.searchConversations.addEventListener('input', handleSearchConversations);
    }

    // Send message button
    if (elements.sendMessageButton) {
        elements.sendMessageButton.addEventListener('click', handleSendMessage);
    }

    // Message input (send on Enter)
    if (elements.messageInput) {
        elements.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
            }
        });
    }

    // User search
    if (elements.userSearch) {
        elements.userSearch.addEventListener('input', handleUserSearch);
    }

    // Close modal buttons
    document.querySelectorAll('.close-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
}

// Load conversations
async function loadConversations() {
    try {
        const result = await messagesModule.getConversations();

        if (result.success) {
            appState.conversations = result.conversations;
            renderConversations();
        } else {
            showError(result.error);
        }
    } catch (error) {
        showError('Error loading conversations: ' + error.message);
    }
}

// Render conversations
function renderConversations() {
    if (!elements.conversationsList) return;

    if (appState.conversations.length === 0) {
        elements.conversationsList.innerHTML = `
            <div class="empty-state">
                <p>No conversations yet.</p>
                <p>Start a new conversation by clicking the + button.</p>
            </div>
        `;
        return;
    }

    elements.conversationsList.innerHTML = '';

    appState.conversations.forEach(conversation => {
        const conversationItem = document.createElement('div');
        conversationItem.className = 'conversation-item';
        if (appState.currentConversation && appState.currentConversation.otherParticipantId === conversation.otherParticipantId) {
            conversationItem.classList.add('active');
        }

        // Format time
        const timeString = formatTime(conversation.lastMessageTime);

        conversationItem.innerHTML = `
            <img src="${conversation.otherParticipantPhoto || './assets/images/default-avatar.png'}" alt="${conversation.otherParticipantName}" class="conversation-avatar">
            <div class="conversation-info">
                <div class="conversation-name">${conversation.otherParticipantName}</div>
                <div class="conversation-preview">${conversation.isFromMe ? 'You: ' : ''}${conversation.lastMessage}</div>
            </div>
            <div class="conversation-meta">
                <div class="conversation-time">${timeString}</div>
                ${conversation.unreadCount ? `<div class="unread-badge">${conversation.unreadCount}</div>` : ''}
            </div>
        `;

        conversationItem.addEventListener('click', () => {
            loadConversation(conversation);
        });

        elements.conversationsList.appendChild(conversationItem);
    });
}

// Format time for display
function formatTime(timestamp) {
    if (!timestamp) return '';

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
    const now = new Date();
    const diff = now - date;

    // Less than 24 hours ago
    if (diff < 24 * 60 * 60 * 1000) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // Less than 7 days ago
    if (diff < 7 * 24 * 60 * 60 * 1000) {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return days[date.getDay()];
    }

    // More than 7 days ago
    return date.toLocaleDateString();
}

// Load a conversation
async function loadConversation(conversation) {
    appState.currentConversation = conversation;

    // Update UI
    elements.emptyChat.style.display = 'none';
    elements.chatContent.style.display = 'flex';

    // Update header
    elements.chatHeader.innerHTML = `
        <img src="${conversation.otherParticipantPhoto || './assets/images/default-avatar.png'}" alt="${conversation.otherParticipantName}" class="chat-header-avatar">
        <div class="chat-header-info">
            <h3>${conversation.otherParticipantName}</h3>
            <div class="chat-header-status">Active now</div>
        </div>
    `;

    // Clear messages
    elements.chatMessages.innerHTML = '<div class="loading">Loading messages...</div>';

    // Load messages
    try {
        // Unsubscribe from previous listener
        if (appState.messageListener) {
            appState.messageListener();
            appState.messageListener = null;
        }

        // Subscribe to messages
        appState.messageListener = messagesModule.subscribeToMessages(
            conversation.otherParticipantId,
            handleMessagesUpdate
        );
    } catch (error) {
        showError('Error loading messages: ' + error.message);
    }

    // Update active conversation in the list
    document.querySelectorAll('.conversation-item').forEach(item => {
        item.classList.remove('active');
    });

    document.querySelectorAll('.conversation-item').forEach(item => {
        const name = item.querySelector('.conversation-name').textContent;
        if (name === conversation.otherParticipantName) {
            item.classList.add('active');
        }
    });
}

// Handle messages update from the subscription
function handleMessagesUpdate(result) {
    if (result.success) {
        appState.messages = result.messages;
        renderMessages();
    } else {
        showError(result.error);
    }
}

// Render messages
function renderMessages() {
    if (!elements.chatMessages) return;

    if (appState.messages.length === 0) {
        elements.chatMessages.innerHTML = `
            <div class="empty-state">
                <p>No messages yet.</p>
                <p>Start the conversation by sending a message.</p>
            </div>
        `;
        return;
    }

    elements.chatMessages.innerHTML = '';

    let lastDate = null;

    appState.messages.forEach(message => {
        // Add date separator if needed
        const messageDate = message.createdAt.toDate ? message.createdAt.toDate() : new Date(message.createdAt.seconds * 1000);
        const messageDay = messageDate.toDateString();

        if (lastDate !== messageDay) {
            const dateSeparator = document.createElement('div');
            dateSeparator.className = 'date-separator';
            dateSeparator.textContent = formatDateSeparator(messageDate);
            elements.chatMessages.appendChild(dateSeparator);
            lastDate = messageDay;
        }

        const messageElement = document.createElement('div');
        messageElement.className = `chat-message ${message.isFromMe ? 'sent' : 'received'}`;

        const timeString = messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        messageElement.innerHTML = `
            <div class="message-content">${message.text}</div>
            ${message.attachmentUrl ? `<img src="${message.attachmentUrl}" alt="Attachment" class="message-attachment">` : ''}
            <div class="message-time">${timeString}</div>
        `;

        elements.chatMessages.appendChild(messageElement);
    });

    // Scroll to bottom
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

// Format date for separator
function formatDateSeparator(date) {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === now.toDateString()) {
        return 'Today';
    }

    if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
    }

    return date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

// Handle send message
async function handleSendMessage() {
    if (!elements.messageInput || !appState.currentConversation) return;

    const messageText = elements.messageInput.value.trim();
    if (!messageText) return;

    // Clear input
    elements.messageInput.value = '';

    try {
        const result = await messagesModule.sendDirectMessage(
            appState.currentConversation.otherParticipantId,
            messageText
        );

        if (!result.success) {
            showError(result.error);
        }
    } catch (error) {
        showError('Error sending message: ' + error.message);
    }
}

// Handle search conversations
function handleSearchConversations() {
    if (!elements.searchConversations) return;

    const searchTerm = elements.searchConversations.value.trim().toLowerCase();

    // Clear previous timeout
    if (appState.searchTimeout) {
        clearTimeout(appState.searchTimeout);
    }

    // Set new timeout to avoid too many renders
    appState.searchTimeout = setTimeout(() => {
        if (!searchTerm) {
            // Show all conversations
            document.querySelectorAll('.conversation-item').forEach(item => {
                item.style.display = 'flex';
            });
            return;
        }

        // Filter conversations
        document.querySelectorAll('.conversation-item').forEach(item => {
            const name = item.querySelector('.conversation-name').textContent.toLowerCase();
            const preview = item.querySelector('.conversation-preview').textContent.toLowerCase();

            if (name.includes(searchTerm) || preview.includes(searchTerm)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    }, 300);
}

// Show new message modal
function showNewMessageModal() {
    if (!elements.newMessageModal) return;

    elements.newMessageModal.style.display = 'flex';
    elements.userSearch.value = '';
    elements.userSearchResults.innerHTML = '';
    elements.userSearch.focus();
}

// Handle user search
function handleUserSearch() {
    if (!elements.userSearch || !elements.userSearchResults) return;

    const searchTerm = elements.userSearch.value.trim();

    // Clear previous timeout
    if (appState.searchTimeout) {
        clearTimeout(appState.searchTimeout);
    }

    // Clear results if search term is empty
    if (!searchTerm) {
        elements.userSearchResults.innerHTML = '';
        return;
    }

    // Set new timeout to avoid too many API calls
    appState.searchTimeout = setTimeout(async () => {
        try {
            const result = await messagesModule.searchUsers(searchTerm);

            if (result.success) {
                renderUserSearchResults(result.users);
            } else {
                showError(result.error);
            }
        } catch (error) {
            showError('Error searching users: ' + error.message);
        }
    }, 500);
}

// Render user search results
function renderUserSearchResults(users) {
    if (!elements.userSearchResults) return;

    if (users.length === 0) {
        elements.userSearchResults.innerHTML = `
            <div class="empty-state">
                <p>No users found.</p>
                <p>Try a different search term.</p>
            </div>
        `;
        return;
    }

    elements.userSearchResults.innerHTML = '';

    users.forEach(user => {
        const userItem = document.createElement('div');
        userItem.className = 'user-search-item';

        userItem.innerHTML = `
            <img src="${user.photoURL || './assets/images/default-avatar.png'}" alt="${user.displayName}" class="user-search-avatar">
            <div class="user-search-info">
                <div class="user-search-name">${user.displayName}</div>
                <div class="user-search-email">${user.email}</div>
            </div>
        `;

        userItem.addEventListener('click', () => {
            startConversation(user);
        });

        elements.userSearchResults.appendChild(userItem);
    });
}

// Start a conversation with a user
async function startConversation(user) {
    // Close the modal
    elements.newMessageModal.style.display = 'none';

    // Check if conversation already exists
    const existingConversation = appState.conversations.find(
        conv => conv.otherParticipantId === user.id
    );

    if (existingConversation) {
        // Load existing conversation
        loadConversation(existingConversation);
    } else {
        // Create a new conversation object
        const newConversation = {
            otherParticipantId: user.id,
            otherParticipantName: user.displayName,
            otherParticipantPhoto: user.photoURL,
            lastMessage: '',
            lastMessageTime: new Date(),
            isFromMe: true
        };

        // Add to conversations array
        appState.conversations.unshift(newConversation);

        // Render conversations
        renderConversations();

        // Load the new conversation
        loadConversation(newConversation);
    }
}

// Show error message
function showError(message) {
    console.error(message);

    // Create error toast
    const errorToast = document.createElement('div');
    errorToast.className = 'error-toast';
    errorToast.textContent = message;

    // Add to body
    document.body.appendChild(errorToast);

    // Remove after 5 seconds
    setTimeout(() => {
        errorToast.remove();
    }, 5000);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initMessagingUI);
