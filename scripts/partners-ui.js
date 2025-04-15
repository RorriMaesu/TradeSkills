// Partners UI JavaScript
// Handles UI interactions for the partners functionality

import { auth, onAuthStateChanged } from './firebase-config.js';
import * as partnersModule from './partners.js';

// State to track current user and UI state
const state = {
    currentUser: null,
    activeTab: 'my-partners',
    isLoading: false,
    partners: [],
    requests: [],
    sentRequests: [],
    searchResults: [],
    lastVisible: null,
    hasMorePartners: false,
    selectedPartner: null
};

// DOM elements that will be used across functions
const elements = {};

// Flag to track initialization
let isInitialized = false;

// Initialize the partners UI
export async function initPartnersUI() {
    // Prevent double initialization
    if (isInitialized) {
        console.log('Partners UI already initialized, skipping...');
        return;
    }

    console.log('Initializing partners UI...');

    // Set up auth state change listener
    onAuthStateChanged(auth, handleAuthStateChanged);

    // Cache common DOM elements
    cacheElements();

    // Set up event listeners
    setupEventListeners();

    // Mark as initialized
    isInitialized = true;

    console.log('Partners UI initialized');
}

// Handle auth state changes
function handleAuthStateChanged(user) {
    state.currentUser = user;

    if (user) {
        // Load initial data based on active tab
        loadTabContent(state.activeTab);
        
        // Update pending request count badge
        updateRequestCountBadge();
        
        // Set interval to update request count badge
        setInterval(updateRequestCountBadge, 60000); // Update every minute
    } else {
        // Redirect to home if not logged in
        window.location.href = '/';
    }
}

// Cache DOM elements for reuse
function cacheElements() {
    // Tabs
    elements.tabs = document.querySelectorAll('.tab-button');
    elements.tabContents = document.querySelectorAll('.tab-content');
    
    // My Partners tab elements
    elements.myPartnersTab = document.getElementById('my-partners-tab');
    elements.partnersList = document.getElementById('partners-list');
    elements.partnersLoadMore = document.getElementById('partners-load-more');
    elements.partnersEmptyState = document.getElementById('partners-empty-state');
    elements.partnersLoading = document.getElementById('partners-loading');
    
    // Partner Requests tab elements
    elements.requestsTab = document.getElementById('partner-requests-tab');
    elements.requestsList = document.getElementById('requests-list');
    elements.requestsEmptyState = document.getElementById('requests-empty-state');
    elements.requestsLoading = document.getElementById('requests-loading');
    elements.requestsCount = document.getElementById('requests-count');
    
    // Sent Requests tab elements
    elements.sentRequestsTab = document.getElementById('sent-requests-tab');
    elements.sentRequestsList = document.getElementById('sent-requests-list');
    elements.sentRequestsEmptyState = document.getElementById('sent-requests-empty-state');
    elements.sentRequestsLoading = document.getElementById('sent-requests-loading');
    
    // Find Partners tab elements
    elements.findPartnersTab = document.getElementById('find-partners-tab');
    elements.userSearchInput = document.getElementById('user-search-input');
    elements.searchResults = document.getElementById('search-results');
    elements.searchEmptyState = document.getElementById('search-empty-state');
    elements.searchLoading = document.getElementById('search-loading');
    
    // Partner profile modal
    elements.partnerModal = document.getElementById('partner-modal');
    elements.partnerModalContent = document.getElementById('partner-modal-content');
    elements.closePartnerModal = document.querySelector('#partner-modal .close-button');
}

// Set up event listeners
function setupEventListeners() {
    // Tab switching
    if (elements.tabs) {
        elements.tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.getAttribute('data-tab');
                switchTab(tabId);
            });
        });
    }
    
    // Load more partners
    if (elements.partnersLoadMore) {
        elements.partnersLoadMore.addEventListener('click', loadMorePartners);
    }
    
    // User search
    if (elements.userSearchInput) {
        elements.userSearchInput.addEventListener('input', handleUserSearch);
    }
    
    // Close partner modal
    if (elements.closePartnerModal) {
        elements.closePartnerModal.addEventListener('click', closePartnerModal);
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === elements.partnerModal) {
            closePartnerModal();
        }
    });
}

// Switch between tabs
function switchTab(tabId) {
    // Update active tab state
    state.activeTab = tabId;
    
    // Update active tab in UI
    elements.tabs.forEach(tab => {
        if (tab.getAttribute('data-tab') === tabId) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    // Update active content in UI
    elements.tabContents.forEach(content => {
        if (content.id === `${tabId}-tab`) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });
    
    // Load content for the selected tab
    loadTabContent(tabId);
}

// Load content based on active tab
async function loadTabContent(tabId) {
    switch (tabId) {
        case 'my-partners':
            await loadPartners();
            break;
        case 'partner-requests':
            await loadPartnerRequests();
            break;
        case 'sent-requests':
            await loadSentRequests();
            break;
        case 'find-partners':
            // Only clear search results, don't load anything until search is performed
            clearSearchResults();
            break;
    }
}

// Load partners list
async function loadPartners() {
    if (!state.currentUser) return;
    
    showLoading('partners');
    
    try {
        const result = await partnersModule.getPartners();
        
        if (result.success) {
            state.partners = result.partners;
            state.lastVisible = result.lastVisible;
            state.hasMorePartners = result.hasMore;
            
            renderPartners();
        } else {
            showError(result.error);
        }
    } catch (error) {
        showError(`Failed to load partners: ${error.message}`);
    } finally {
        hideLoading('partners');
    }
}

// Load more partners (pagination)
async function loadMorePartners() {
    if (!state.currentUser || !state.lastVisible) return;
    
    elements.partnersLoadMore.textContent = 'Loading...';
    elements.partnersLoadMore.disabled = true;
    
    try {
        const result = await partnersModule.getPartners({
            lastDoc: state.lastVisible
        });
        
        if (result.success) {
            state.partners = [...state.partners, ...result.partners];
            state.lastVisible = result.lastVisible;
            state.hasMorePartners = result.hasMore;
            
            renderPartners();
        } else {
            showError(result.error);
        }
    } catch (error) {
        showError(`Failed to load more partners: ${error.message}`);
    } finally {
        elements.partnersLoadMore.textContent = 'Load More';
        elements.partnersLoadMore.disabled = false;
    }
}

// Render partners list
function renderPartners() {
    if (!elements.partnersList) return;
    
    if (state.partners.length === 0) {
        elements.partnersList.style.display = 'none';
        elements.partnersEmptyState.style.display = 'flex';
        elements.partnersLoadMore.style.display = 'none';
        return;
    }
    
    elements.partnersList.style.display = 'grid';
    elements.partnersEmptyState.style.display = 'none';
    
    // Show or hide load more button
    elements.partnersLoadMore.style.display = state.hasMorePartners ? 'block' : 'none';
    
    // Clear the list first
    elements.partnersList.innerHTML = '';
    
    // Add partner cards
    state.partners.forEach(partner => {
        const partnerCard = document.createElement('div');
        partnerCard.className = 'partner-card';
        partnerCard.innerHTML = `
            <div class="partner-avatar">
                <img src="${partner.partnerPhoto || './assets/images/default-avatar.png'}" alt="${partner.partnerName}">
            </div>
            <div class="partner-info">
                <h3>${partner.partnerName}</h3>
                <p>Partner since ${formatDate(partner.acceptedAt)}</p>
            </div>
            <div class="partner-actions">
                <button class="view-profile-btn" data-id="${partner.partnerId}">View Profile</button>
                <button class="message-btn" data-id="${partner.partnerId}" data-name="${partner.partnerName}">Message</button>
                <button class="remove-partner-btn" data-id="${partner.id}">Remove</button>
            </div>
        `;
        
        elements.partnersList.appendChild(partnerCard);
    });
    
    // Add event listeners to buttons
    addPartnerCardListeners();
}

// Add event listeners to partner card buttons
function addPartnerCardListeners() {
    // View profile buttons
    document.querySelectorAll('.view-profile-btn').forEach(button => {
        button.addEventListener('click', async () => {
            const partnerId = button.getAttribute('data-id');
            await viewPartnerProfile(partnerId);
        });
    });
    
    // Message buttons
    document.querySelectorAll('.message-btn').forEach(button => {
        button.addEventListener('click', () => {
            const partnerId = button.getAttribute('data-id');
            const partnerName = button.getAttribute('data-name');
            navigateToMessages(partnerId, partnerName);
        });
    });
    
    // Remove partner buttons
    document.querySelectorAll('.remove-partner-btn').forEach(button => {
        button.addEventListener('click', async () => {
            const partnershipId = button.getAttribute('data-id');
            await removePartner(partnershipId);
        });
    });
}

// Load partner requests
async function loadPartnerRequests() {
    if (!state.currentUser) return;
    
    showLoading('requests');
    
    try {
        const result = await partnersModule.getPartnerRequests();
        
        if (result.success) {
            state.requests = result.requests;
            renderPartnerRequests();
        } else {
            showError(result.error);
        }
    } catch (error) {
        showError(`Failed to load partner requests: ${error.message}`);
    } finally {
        hideLoading('requests');
    }
}

// Render partner requests
function renderPartnerRequests() {
    if (!elements.requestsList) return;
    
    if (state.requests.length === 0) {
        elements.requestsList.style.display = 'none';
        elements.requestsEmptyState.style.display = 'flex';
        return;
    }
    
    elements.requestsList.style.display = 'block';
    elements.requestsEmptyState.style.display = 'none';
    
    // Update request count
    if (elements.requestsCount) {
        elements.requestsCount.textContent = state.requests.length;
    }
    
    // Clear the list first
    elements.requestsList.innerHTML = '';
    
    // Add request items
    state.requests.forEach(request => {
        const requestItem = document.createElement('div');
        requestItem.className = 'request-item';
        requestItem.innerHTML = `
            <div class="request-avatar">
                <img src="${request.senderPhoto || './assets/images/default-avatar.png'}" alt="${request.senderName}">
            </div>
            <div class="request-info">
                <h3>${request.senderName}</h3>
                <p>Sent ${formatDate(request.createdAt)}</p>
            </div>
            <div class="request-actions">
                <button class="view-profile-btn" data-id="${request.senderId}">View Profile</button>
                <button class="accept-btn" data-id="${request.id}">Accept</button>
                <button class="decline-btn" data-id="${request.id}">Decline</button>
            </div>
        `;
        
        elements.requestsList.appendChild(requestItem);
    });
    
    // Add event listeners to buttons
    addRequestItemListeners();
}

// Add event listeners to request item buttons
function addRequestItemListeners() {
    // View profile buttons
    document.querySelectorAll('.request-item .view-profile-btn').forEach(button => {
        button.addEventListener('click', async () => {
            const userId = button.getAttribute('data-id');
            await viewPartnerProfile(userId);
        });
    });
    
    // Accept buttons
    document.querySelectorAll('.accept-btn').forEach(button => {
        button.addEventListener('click', async () => {
            const requestId = button.getAttribute('data-id');
            await acceptPartnerRequest(requestId);
        });
    });
    
    // Decline buttons
    document.querySelectorAll('.decline-btn').forEach(button => {
        button.addEventListener('click', async () => {
            const requestId = button.getAttribute('data-id');
            await declinePartnerRequest(requestId);
        });
    });
}

// Load sent requests
async function loadSentRequests() {
    if (!state.currentUser) return;
    
    showLoading('sentRequests');
    
    try {
        const result = await partnersModule.getSentPartnerRequests();
        
        if (result.success) {
            state.sentRequests = result.requests;
            renderSentRequests();
        } else {
            showError(result.error);
        }
    } catch (error) {
        showError(`Failed to load sent requests: ${error.message}`);
    } finally {
        hideLoading('sentRequests');
    }
}

// Render sent requests
function renderSentRequests() {
    if (!elements.sentRequestsList) return;
    
    if (state.sentRequests.length === 0) {
        elements.sentRequestsList.style.display = 'none';
        elements.sentRequestsEmptyState.style.display = 'flex';
        return;
    }
    
    elements.sentRequestsList.style.display = 'block';
    elements.sentRequestsEmptyState.style.display = 'none';
    
    // Clear the list first
    elements.sentRequestsList.innerHTML = '';
    
    // Add sent request items
    state.sentRequests.forEach(request => {
        const requestItem = document.createElement('div');
        requestItem.className = 'request-item';
        requestItem.innerHTML = `
            <div class="request-avatar">
                <img src="${request.recipientPhoto || './assets/images/default-avatar.png'}" alt="${request.recipientName}">
            </div>
            <div class="request-info">
                <h3>${request.recipientName}</h3>
                <p>Sent ${formatDate(request.createdAt)}</p>
            </div>
            <div class="request-actions">
                <button class="view-profile-btn" data-id="${request.recipientId}">View Profile</button>
                <button class="cancel-btn" data-id="${request.id}">Cancel Request</button>
            </div>
        `;
        
        elements.sentRequestsList.appendChild(requestItem);
    });
    
    // Add event listeners to buttons
    addSentRequestItemListeners();
}

// Add event listeners to sent request item buttons
function addSentRequestItemListeners() {
    // View profile buttons
    document.querySelectorAll('.request-item .view-profile-btn').forEach(button => {
        button.addEventListener('click', async () => {
            const userId = button.getAttribute('data-id');
            await viewPartnerProfile(userId);
        });
    });
    
    // Cancel buttons
    document.querySelectorAll('.cancel-btn').forEach(button => {
        button.addEventListener('click', async () => {
            const requestId = button.getAttribute('data-id');
            await cancelPartnerRequest(requestId);
        });
    });
}

// Handle user search
function handleUserSearch() {
    const searchTerm = elements.userSearchInput.value.trim();
    
    // Clear search results if search term is too short
    if (searchTerm.length < 2) {
        clearSearchResults();
        return;
    }
    
    // Throttle search to avoid too many requests
    if (state.searchTimeout) {
        clearTimeout(state.searchTimeout);
    }
    
    state.searchTimeout = setTimeout(() => {
        searchUsers(searchTerm);
    }, 500);
}

// Search for users
async function searchUsers(searchTerm) {
    if (!searchTerm || !state.currentUser) return;
    
    showLoading('search');
    clearSearchResults();
    
    try {
        const result = await partnersModule.searchUsers(searchTerm);
        
        if (result.success) {
            state.searchResults = result.users;
            renderSearchResults();
        } else {
            showError(result.error);
        }
    } catch (error) {
        showError(`Failed to search users: ${error.message}`);
    } finally {
        hideLoading('search');
    }
}

// Clear search results
function clearSearchResults() {
    state.searchResults = [];
    if (elements.searchResults) {
        elements.searchResults.innerHTML = '';
        elements.searchResults.style.display = 'none';
    }
    if (elements.searchEmptyState) {
        elements.searchEmptyState.style.display = 'flex';
    }
}

// Render search results
function renderSearchResults() {
    if (!elements.searchResults) return;
    
    if (state.searchResults.length === 0) {
        elements.searchResults.style.display = 'none';
        elements.searchEmptyState.style.display = 'flex';
        return;
    }
    
    elements.searchResults.style.display = 'block';
    elements.searchEmptyState.style.display = 'none';
    
    // Clear the list first
    elements.searchResults.innerHTML = '';
    
    // Create search result items
    state.searchResults.forEach(async (user) => {
        const userItem = document.createElement('div');
        userItem.className = 'user-item';
        
        // Check partner relationship
        const relationshipResult = await partnersModule.getPartnerStatus(user.id);
        const relationship = relationshipResult.success ? relationshipResult : { exists: false };
        
        // Determine appropriate action button based on relationship
        let actionButton = '';
        
        if (relationship.exists) {
            switch (relationship.status) {
                case 'accepted':
                    actionButton = `<button class="already-partner-btn" disabled>Already Partners</button>`;
                    break;
                case 'pending':
                    if (relationship.userRole === 'sender') {
                        actionButton = `<button class="request-sent-btn" disabled>Request Sent</button>`;
                    } else {
                        actionButton = `
                            <button class="accept-btn" data-id="${relationship.id}">Accept</button>
                            <button class="decline-btn" data-id="${relationship.id}">Decline</button>
                        `;
                    }
                    break;
                case 'declined':
                    actionButton = `<button class="add-partner-btn" data-id="${user.id}">Add Partner</button>`;
                    break;
            }
        } else {
            actionButton = `<button class="add-partner-btn" data-id="${user.id}">Add Partner</button>`;
        }
        
        userItem.innerHTML = `
            <div class="user-avatar">
                <img src="${user.photoURL || './assets/images/default-avatar.png'}" alt="${user.displayName}">
            </div>
            <div class="user-info">
                <h3>${user.displayName}</h3>
                <p>${user.email}</p>
            </div>
            <div class="user-actions">
                <button class="view-profile-btn" data-id="${user.id}">View Profile</button>
                ${actionButton}
            </div>
        `;
        
        elements.searchResults.appendChild(userItem);
    });
    
    // Add event listeners to buttons
    addSearchResultListeners();
}

// Add event listeners to search result buttons
function addSearchResultListeners() {
    // View profile buttons
    document.querySelectorAll('.user-item .view-profile-btn').forEach(button => {
        button.addEventListener('click', async () => {
            const userId = button.getAttribute('data-id');
            await viewPartnerProfile(userId);
        });
    });
    
    // Add partner buttons
    document.querySelectorAll('.add-partner-btn').forEach(button => {
        button.addEventListener('click', async () => {
            const userId = button.getAttribute('data-id');
            await sendPartnerRequest(userId);
        });
    });
    
    // Accept buttons
    document.querySelectorAll('.user-item .accept-btn').forEach(button => {
        button.addEventListener('click', async () => {
            const requestId = button.getAttribute('data-id');
            await acceptPartnerRequest(requestId);
        });
    });
    
    // Decline buttons
    document.querySelectorAll('.user-item .decline-btn').forEach(button => {
        button.addEventListener('click', async () => {
            const requestId = button.getAttribute('data-id');
            await declinePartnerRequest(requestId);
        });
    });
}

// Send a partner request
async function sendPartnerRequest(recipientId) {
    try {
        const result = await partnersModule.sendPartnerRequest(recipientId);
        
        if (result.success) {
            showMessage('Partner request sent successfully!');
            // Refresh the search results
            const searchTerm = elements.userSearchInput.value.trim();
            if (searchTerm.length >= 2) {
                await searchUsers(searchTerm);
            }
        } else {
            showError(result.error);
        }
    } catch (error) {
        showError(`Failed to send partner request: ${error.message}`);
    }
}

// Accept a partner request
async function acceptPartnerRequest(requestId) {
    try {
        const result = await partnersModule.acceptPartnerRequest(requestId);
        
        if (result.success) {
            showMessage('Partner request accepted successfully!');
            // Refresh both partners and requests lists
            await loadPartners();
            await loadPartnerRequests();
            // Refresh search results if on that tab
            if (state.activeTab === 'find-partners') {
                const searchTerm = elements.userSearchInput.value.trim();
                if (searchTerm.length >= 2) {
                    await searchUsers(searchTerm);
                }
            }
            // Update request count badge
            updateRequestCountBadge();
        } else {
            showError(result.error);
        }
    } catch (error) {
        showError(`Failed to accept partner request: ${error.message}`);
    }
}

// Decline a partner request
async function declinePartnerRequest(requestId) {
    try {
        const result = await partnersModule.declinePartnerRequest(requestId);
        
        if (result.success) {
            showMessage('Partner request declined successfully.');
            // Refresh requests list
            await loadPartnerRequests();
            // Refresh search results if on that tab
            if (state.activeTab === 'find-partners') {
                const searchTerm = elements.userSearchInput.value.trim();
                if (searchTerm.length >= 2) {
                    await searchUsers(searchTerm);
                }
            }
            // Update request count badge
            updateRequestCountBadge();
        } else {
            showError(result.error);
        }
    } catch (error) {
        showError(`Failed to decline partner request: ${error.message}`);
    }
}

// Cancel a partner request
async function cancelPartnerRequest(requestId) {
    try {
        const result = await partnersModule.cancelPartnerRequest(requestId);
        
        if (result.success) {
            showMessage('Partner request cancelled successfully.');
            // Refresh sent requests list
            await loadSentRequests();
            // Refresh search results if on that tab
            if (state.activeTab === 'find-partners') {
                const searchTerm = elements.userSearchInput.value.trim();
                if (searchTerm.length >= 2) {
                    await searchUsers(searchTerm);
                }
            }
        } else {
            showError(result.error);
        }
    } catch (error) {
        showError(`Failed to cancel partner request: ${error.message}`);
    }
}

// Remove a partner
async function removePartner(partnershipId) {
    // Ask for confirmation first
    if (!confirm('Are you sure you want to remove this partner?')) {
        return;
    }
    
    try {
        const result = await partnersModule.removePartner(partnershipId);
        
        if (result.success) {
            showMessage('Partner removed successfully.');
            // Refresh partners list
            await loadPartners();
            // Refresh search results if on that tab
            if (state.activeTab === 'find-partners') {
                const searchTerm = elements.userSearchInput.value.trim();
                if (searchTerm.length >= 2) {
                    await searchUsers(searchTerm);
                }
            }
        } else {
            showError(result.error);
        }
    } catch (error) {
        showError(`Failed to remove partner: ${error.message}`);
    }
}

// View partner profile
async function viewPartnerProfile(userId) {
    if (!elements.partnerModal || !elements.partnerModalContent) return;
    
    // Clear modal content
    elements.partnerModalContent.innerHTML = '<div class="loading">Loading profile...</div>';
    
    // Show modal
    elements.partnerModal.style.display = 'flex';
    
    try {
        // Get user details directly from Firestore
        const { db, doc, getDoc } = await import('./firebase-config.js');
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
            throw new Error('User not found');
        }
        
        const userData = userDoc.data();
        
        // Get partnership status
        const relationshipResult = await partnersModule.getPartnerStatus(userId);
        const relationship = relationshipResult.success ? relationshipResult : { exists: false };
        
        // Render profile
        elements.partnerModalContent.innerHTML = `
            <div class="profile-header">
                <div class="profile-avatar">
                    <img src="${userData.photoURL || './assets/images/default-avatar.png'}" alt="${userData.displayName || 'User'}">
                </div>
                <div class="profile-info">
                    <h2>${userData.displayName || 'TradeSkills User'}</h2>
                    <p>${userData.email || ''}</p>
                    ${relationship.exists && relationship.status === 'accepted' ? 
                        `<span class="badge partner-badge">Partner</span>` : ''}
                </div>
            </div>
            
            <div class="profile-actions">
                ${renderProfileActions(userId, relationship)}
            </div>
            
            <div class="profile-details">
                <div class="profile-section">
                    <h3>About</h3>
                    <p>${userData.bio || 'No bio available'}</p>
                </div>
                
                <div class="profile-section">
                    <h3>Recent Listings</h3>
                    <div class="recent-listings" id="profile-listings">
                        <p>Loading listings...</p>
                    </div>
                </div>
            </div>
        `;
        
        // Add event listeners to profile actions
        addProfileActionListeners(userId, relationship);
        
        // Load user's listings
        loadUserListings(userId);
    } catch (error) {
        elements.partnerModalContent.innerHTML = `
            <div class="error-message">
                <p>Failed to load profile: ${error.message}</p>
                <button class="btn-secondary close-btn">Close</button>
            </div>
        `;
        
        // Add event listener to close button
        elements.partnerModalContent.querySelector('.close-btn').addEventListener('click', closePartnerModal);
    }
}

// Render profile actions based on relationship
function renderProfileActions(userId, relationship) {
    if (relationship.exists) {
        switch (relationship.status) {
            case 'accepted':
                return `
                    <button class="btn-primary message-btn" data-id="${userId}">Send Message</button>
                    <button class="btn-secondary remove-partner-btn" data-id="${relationship.id}">Remove Partner</button>
                `;
            case 'pending':
                if (relationship.userRole === 'sender') {
                    return `
                        <button class="btn-secondary cancel-request-btn" data-id="${relationship.id}">Cancel Request</button>
                    `;
                } else {
                    return `
                        <button class="btn-primary accept-request-btn" data-id="${relationship.id}">Accept Request</button>
                        <button class="btn-secondary decline-request-btn" data-id="${relationship.id}">Decline Request</button>
                    `;
                }
            case 'declined':
                return `
                    <button class="btn-primary add-partner-btn" data-id="${userId}">Add as Partner</button>
                `;
        }
    } else {
        return `
            <button class="btn-primary add-partner-btn" data-id="${userId}">Add as Partner</button>
        `;
    }
}

// Add event listeners to profile actions
function addProfileActionListeners(userId, relationship) {
    // Message button
    const messageBtn = elements.partnerModalContent.querySelector('.message-btn');
    if (messageBtn) {
        messageBtn.addEventListener('click', () => {
            navigateToMessages(userId);
            closePartnerModal();
        });
    }
    
    // Remove partner button
    const removeBtn = elements.partnerModalContent.querySelector('.remove-partner-btn');
    if (removeBtn) {
        removeBtn.addEventListener('click', async () => {
            const partnershipId = removeBtn.getAttribute('data-id');
            await removePartner(partnershipId);
            closePartnerModal();
        });
    }
    
    // Add partner button
    const addBtn = elements.partnerModalContent.querySelector('.add-partner-btn');
    if (addBtn) {
        addBtn.addEventListener('click', async () => {
            await sendPartnerRequest(userId);
            closePartnerModal();
        });
    }
    
    // Accept request button
    const acceptBtn = elements.partnerModalContent.querySelector('.accept-request-btn');
    if (acceptBtn) {
        acceptBtn.addEventListener('click', async () => {
            const requestId = acceptBtn.getAttribute('data-id');
            await acceptPartnerRequest(requestId);
            closePartnerModal();
        });
    }
    
    // Decline request button
    const declineBtn = elements.partnerModalContent.querySelector('.decline-request-btn');
    if (declineBtn) {
        declineBtn.addEventListener('click', async () => {
            const requestId = declineBtn.getAttribute('data-id');
            await declinePartnerRequest(requestId);
            closePartnerModal();
        });
    }
    
    // Cancel request button
    const cancelBtn = elements.partnerModalContent.querySelector('.cancel-request-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', async () => {
            const requestId = cancelBtn.getAttribute('data-id');
            await cancelPartnerRequest(requestId);
            closePartnerModal();
        });
    }
}

// Load user's listings
async function loadUserListings(userId) {
    try {
        const listingsContainer = document.getElementById('profile-listings');
        if (!listingsContainer) return;
        
        listingsContainer.innerHTML = '<p>Loading listings...</p>';
        
        // Import the listings module
        const listingsModule = await import('./listings.js');
        
        // Get user's listings from Firebase
        const result = await listingsModule.getListings({
            userId: userId,
            limit: 3,
            status: 'active'
        });
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to load listings');
        }
        
        const listings = result.listings;
        
        if (listings.length === 0) {
            listingsContainer.innerHTML = '<p>No listings found.</p>';
            return;
        }
        
        listingsContainer.innerHTML = listings.map(listing => `
            <div class="listing-card">
                <img src="${listing.imageUrl || './assets/images/placeholder.png'}" alt="${listing.title}">
                <div class="listing-card-content">
                    <h4>${listing.title}</h4>
                    <p>${listing.description.substring(0, 50)}${listing.description.length > 50 ? '...' : ''}</p>
                    <a href="/listing?id=${listing.id}" data-link class="view-listing-btn">View Listing</a>
                </div>
            </div>
        `).join('');
        
        // Reconnect navigation event listeners
        document.querySelectorAll('a[data-link]').forEach(link => {
            link.addEventListener('click', e => {
                e.preventDefault();
                const href = link.getAttribute('href');
                closePartnerModal();
                navigateTo(href);
            });
        });
    } catch (error) {
        const listingsContainer = document.getElementById('profile-listings');
        if (listingsContainer) {
            listingsContainer.innerHTML = `<p class="error">Failed to load listings: ${error.message}</p>`;
        }
    }
}

// Close partner profile modal
function closePartnerModal() {
    if (elements.partnerModal) {
        elements.partnerModal.style.display = 'none';
    }
}

// Navigate to messages with a specific user
function navigateToMessages(userId, userName = '') {
    // This assumes you have a messages page that accepts a userId parameter
    window.location.href = `messages.html?userId=${userId}${userName ? `&userName=${encodeURIComponent(userName)}` : ''}`;
}

// Navigate to a specific page (for SPA navigation)
function navigateTo(url) {
    window.location.href = url;
}

// Update request count badge
async function updateRequestCountBadge() {
    try {
        const result = await partnersModule.getPendingRequestCount();
        
        if (result.success) {
            // Update the badge in the tab
            const badge = document.querySelector('#partner-requests .badge');
            if (badge) {
                if (result.count > 0) {
                    badge.textContent = result.count;
                    badge.style.display = 'inline-flex';
                } else {
                    badge.style.display = 'none';
                }
            }
            
            // Also update the badge in the requests tab
            if (elements.requestsCount) {
                elements.requestsCount.textContent = result.count;
            }
        }
    } catch (error) {
        console.error('Error updating request count badge:', error);
    }
}

// Show loading indicator
function showLoading(section) {
    switch (section) {
        case 'partners':
            if (elements.partnersLoading) elements.partnersLoading.style.display = 'flex';
            break;
        case 'requests':
            if (elements.requestsLoading) elements.requestsLoading.style.display = 'flex';
            break;
        case 'sentRequests':
            if (elements.sentRequestsLoading) elements.sentRequestsLoading.style.display = 'flex';
            break;
        case 'search':
            if (elements.searchLoading) elements.searchLoading.style.display = 'flex';
            break;
    }
}

// Hide loading indicator
function hideLoading(section) {
    switch (section) {
        case 'partners':
            if (elements.partnersLoading) elements.partnersLoading.style.display = 'none';
            break;
        case 'requests':
            if (elements.requestsLoading) elements.requestsLoading.style.display = 'none';
            break;
        case 'sentRequests':
            if (elements.sentRequestsLoading) elements.sentRequestsLoading.style.display = 'none';
            break;
        case 'search':
            if (elements.searchLoading) elements.searchLoading.style.display = 'none';
            break;
    }
}

// Format date for display
function formatDate(timestamp) {
    if (!timestamp) return 'Unknown date';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        return 'Today';
    } else if (diffDays === 1) {
        return 'Yesterday';
    } else if (diffDays < 7) {
        return `${diffDays} days ago`;
    } else if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
    } else if (diffDays < 365) {
        const months = Math.floor(diffDays / 30);
        return `${months} ${months === 1 ? 'month' : 'months'} ago`;
    } else {
        const years = Math.floor(diffDays / 365);
        return `${years} ${years === 1 ? 'year' : 'years'} ago`;
    }
}

// Show error message
function showError(message) {
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

// Show success message
function showMessage(message) {
    // Create success toast
    const successToast = document.createElement('div');
    successToast.className = 'success-toast';
    successToast.textContent = message;
    
    // Add to body
    document.body.appendChild(successToast);
    
    // Remove after 5 seconds
    setTimeout(() => {
        successToast.remove();
    }, 5000);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initPartnersUI);