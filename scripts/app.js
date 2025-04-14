// Import Firebase and module dependencies
import { auth, onAuthStateChanged } from './firebase-config.js';
import * as authModule from './auth.js';
import * as listingsModule from './listings.js';
import * as tradesModule from './trades.js';

// App state to store current user and application state
const appState = {
    currentUser: null,
    currentPage: null,
    isLoading: false,
    error: null
};

// DOM elements that will be used across functions
const elements = {};

// Initialize the application
export async function initApp() {
    // Set up auth state change listener
    onAuthStateChanged(auth, handleAuthStateChanged);
    
    // Cache common DOM elements
    cacheElements();
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize UI based on current URL
    handleRouting();
    
    // Set up navigation handling
    window.addEventListener('popstate', handleRouting);
}

// Cache common DOM elements for reuse
function cacheElements() {
    // Navigation elements
    elements.navBar = document.getElementById('nav-bar');
    elements.authButtons = document.getElementById('auth-buttons');
    elements.navLinks = document.getElementById('nav-links');
    
    // Auth elements
    elements.authModal = document.getElementById('auth-modal');
    elements.loginForm = document.getElementById('login-form');
    elements.registerForm = document.getElementById('register-form');
    elements.resetForm = document.getElementById('reset-form');
    
    // Main content sections
    elements.mainContent = document.getElementById('main-content');
    elements.loadingSpinner = document.getElementById('loading-spinner');
    elements.errorDisplay = document.getElementById('error-display');
    
    // Page-specific elements
    elements.homeSection = document.getElementById('home-section');
    elements.dashboardSection = document.getElementById('dashboard-section');
    elements.listingSection = document.getElementById('listing-section');
    elements.marketplaceSection = document.getElementById('marketplace-section');
    elements.profileSection = document.getElementById('profile-section');
}

// Set up all event listeners for the application
function setupEventListeners() {
    // Auth-related event listeners
    if (elements.loginForm) {
        elements.loginForm.addEventListener('submit', handleLogin);
    }
    
    if (elements.registerForm) {
        elements.registerForm.addEventListener('submit', handleRegister);
    }
    
    if (elements.resetForm) {
        elements.resetForm.addEventListener('submit', handlePasswordReset);
    }
    
    // Navigation event listeners
    document.querySelectorAll('a[data-link]').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            const href = link.getAttribute('href');
            navigateTo(href);
        });
    });
    
    // Logout button
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }
}

// Handle changes in authentication state
function handleAuthStateChanged(user) {
    appState.currentUser = user;
    
    // Update UI based on authentication state
    if (user) {
        // User is signed in
        showAuthenticatedUI();
    } else {
        // User is signed out
        showUnauthenticatedUI();
    }
    
    // Re-render the current page
    handleRouting();
}

// Show UI elements for authenticated users
function showAuthenticatedUI() {
    // Show authenticated navigation items
    if (elements.authButtons) {
        elements.authButtons.innerHTML = `
            <div class="user-info">
                <img src="${appState.currentUser.photoURL || './assets/images/default-avatar.png'}" alt="Profile" class="avatar">
                <span>${appState.currentUser.displayName || appState.currentUser.email}</span>
            </div>
            <button id="logout-button" class="btn-logout">Logout</button>
        `;
        
        // Reconnect the logout event listener
        const logoutButton = document.getElementById('logout-button');
        if (logoutButton) {
            logoutButton.addEventListener('click', handleLogout);
        }
    }
    
    // Show authenticated navigation links
    if (elements.navLinks) {
        elements.navLinks.innerHTML = `
            <a href="/" data-link>Home</a>
            <a href="/dashboard" data-link>Dashboard</a>
            <a href="/marketplace" data-link>Marketplace</a>
            <a href="/profile" data-link>Profile</a>
        `;
        
        // Reconnect navigation event listeners
        document.querySelectorAll('a[data-link]').forEach(link => {
            link.addEventListener('click', e => {
                e.preventDefault();
                const href = link.getAttribute('href');
                navigateTo(href);
            });
        });
    }
}

// Show UI elements for unauthenticated users
function showUnauthenticatedUI() {
    // Show unauthenticated navigation items
    if (elements.authButtons) {
        elements.authButtons.innerHTML = `
            <button id="login-button" class="btn-login">Login</button>
            <button id="register-button" class="btn-register">Register</button>
        `;
        
        // Add event listeners for auth buttons
        const loginButton = document.getElementById('login-button');
        const registerButton = document.getElementById('register-button');
        
        if (loginButton) {
            loginButton.addEventListener('click', () => showAuthModal('login'));
        }
        
        if (registerButton) {
            registerButton.addEventListener('click', () => showAuthModal('register'));
        }
    }
    
    // Show unauthenticated navigation links
    if (elements.navLinks) {
        elements.navLinks.innerHTML = `
            <a href="/" data-link>Home</a>
            <a href="/marketplace" data-link>Marketplace</a>
        `;
        
        // Reconnect navigation event listeners
        document.querySelectorAll('a[data-link]').forEach(link => {
            link.addEventListener('click', e => {
                e.preventDefault();
                const href = link.getAttribute('href');
                navigateTo(href);
            });
        });
    }
}

// Show the authentication modal with the specified form
function showAuthModal(formType) {
    if (elements.authModal) {
        elements.authModal.style.display = 'flex';
        
        // Hide all forms first
        document.querySelectorAll('.auth-form').forEach(form => {
            form.style.display = 'none';
        });
        
        // Show the requested form
        const formId = `${formType}-form`;
        const form = document.getElementById(formId);
        if (form) {
            form.style.display = 'block';
        }
        
        // Add close event listener
        const closeButton = document.querySelector('.auth-modal .close-button');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                elements.authModal.style.display = 'none';
            });
        }
    }
}

// Handle user login
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    try {
        setLoading(true);
        const result = await authModule.loginUser(email, password);
        
        if (result.success) {
            // Close the modal
            if (elements.authModal) {
                elements.authModal.style.display = 'none';
            }
        } else {
            showError(result.error);
        }
    } catch (error) {
        showError(error.message);
    } finally {
        setLoading(false);
    }
}

// Handle user registration
async function handleRegister(e) {
    e.preventDefault();
    
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const displayName = document.getElementById('register-name').value;
    
    try {
        setLoading(true);
        const result = await authModule.registerUser(email, password, displayName);
        
        if (result.success) {
            // Close the modal
            if (elements.authModal) {
                elements.authModal.style.display = 'none';
            }
        } else {
            showError(result.error);
        }
    } catch (error) {
        showError(error.message);
    } finally {
        setLoading(false);
    }
}

// Handle password reset
async function handlePasswordReset(e) {
    e.preventDefault();
    
    const email = document.getElementById('reset-email').value;
    
    try {
        setLoading(true);
        const result = await authModule.resetPassword(email);
        
        if (result.success) {
            showMessage('Password reset email sent. Please check your inbox.');
            
            // Switch back to login form
            showAuthModal('login');
        } else {
            showError(result.error);
        }
    } catch (error) {
        showError(error.message);
    } finally {
        setLoading(false);
    }
}

// Handle user logout
async function handleLogout() {
    try {
        setLoading(true);
        const result = await authModule.logoutUser();
        
        if (result.success) {
            // Redirect to home page
            navigateTo('/');
        } else {
            showError(result.error);
        }
    } catch (error) {
        showError(error.message);
    } finally {
        setLoading(false);
    }
}

// Display an error message
function showError(message) {
    if (elements.errorDisplay) {
        elements.errorDisplay.textContent = message;
        elements.errorDisplay.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            elements.errorDisplay.style.display = 'none';
        }, 5000);
    }
}

// Display a success/info message
function showMessage(message) {
    // You can implement a separate message display or use the error display with different styling
    if (elements.errorDisplay) {
        elements.errorDisplay.textContent = message;
        elements.errorDisplay.style.display = 'block';
        elements.errorDisplay.classList.add('success-message');
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            elements.errorDisplay.style.display = 'none';
            elements.errorDisplay.classList.remove('success-message');
        }, 5000);
    }
}

// Set loading state
function setLoading(isLoading) {
    appState.isLoading = isLoading;
    
    if (elements.loadingSpinner) {
        elements.loadingSpinner.style.display = isLoading ? 'block' : 'none';
    }
}

// Navigation function
function navigateTo(url) {
    history.pushState(null, null, url);
    handleRouting();
}

// Route handling based on URL
function handleRouting() {
    const path = window.location.pathname;
    
    // Hide all page sections first
    hideAllSections();
    
    // Store the current page
    appState.currentPage = path;
    
    // Check if user is authenticated for protected routes
    const isAuthenticated = !!appState.currentUser;
    const protectedRoutes = ['/dashboard', '/profile', '/create-listing'];
    
    if (protectedRoutes.includes(path) && !isAuthenticated) {
        // Redirect to home if trying to access protected route while not logged in
        navigateTo('/');
        showAuthModal('login');
        return;
    }
    
    // Handle different routes
    switch (path) {
        case '/':
            showHomeSection();
            break;
        case '/dashboard':
            showDashboardSection();
            break;
        case '/marketplace':
            showMarketplaceSection();
            break;
        case '/listing':
            showListingDetailSection();
            break;
        case '/create-listing':
            showCreateListingSection();
            break;
        case '/profile':
            showProfileSection();
            break;
        default:
            // 404 - Not found
            showNotFoundSection();
    }
}

// Hide all main content sections
function hideAllSections() {
    if (elements.homeSection) elements.homeSection.style.display = 'none';
    if (elements.dashboardSection) elements.dashboardSection.style.display = 'none';
    if (elements.listingSection) elements.listingSection.style.display = 'none';
    if (elements.marketplaceSection) elements.marketplaceSection.style.display = 'none';
    if (elements.profileSection) elements.profileSection.style.display = 'none';
    
    // Reset main content if needed
    if (elements.mainContent) {
        elements.mainContent.innerHTML = '';
    }
}

// Show home section
function showHomeSection() {
    if (elements.homeSection) {
        elements.homeSection.style.display = 'block';
    } else if (elements.mainContent) {
        elements.mainContent.innerHTML = `
            <section id="home-section" class="section section-home">
                <div class="hero">
                    <h1>TradeSkills</h1>
                    <p>Exchange goods and services without cash. Join our bartering community today!</p>
                    ${!appState.currentUser ? 
                        `<button id="join-now-button" class="cta-button">Join Now</button>` : 
                        `<a href="/marketplace" data-link class="cta-button">Browse Marketplace</a>`
                    }
                </div>
                
                <div class="features">
                    <div class="feature">
                        <h2>Create Listings</h2>
                        <p>List items or services you want to trade. Add photos and detailed descriptions.</p>
                    </div>
                    <div class="feature">
                        <h2>Find Trades</h2>
                        <p>Browse the marketplace for items or services you need.</p>
                    </div>
                    <div class="feature">
                        <h2>Make Offers</h2>
                        <p>Propose trades with other users. Negotiate until both parties are satisfied.</p>
                    </div>
                    <div class="feature">
                        <h2>Complete Trades</h2>
                        <p>Finalize trades securely, leave feedback, and build your reputation.</p>
                    </div>
                </div>
                
                <div class="how-it-works">
                    <h2>How It Works</h2>
                    <div class="steps">
                        <div class="step">
                            <div class="step-number">1</div>
                            <h3>Create Your Profile</h3>
                            <p>Sign up and complete your profile with your interests and trade preferences.</p>
                        </div>
                        <div class="step">
                            <div class="step-number">2</div>
                            <h3>List Your Items</h3>
                            <p>Add items or services you're willing to trade.</p>
                        </div>
                        <div class="step">
                            <div class="step-number">3</div>
                            <h3>Browse & Offer</h3>
                            <p>Find items you want and make trade offers.</p>
                        </div>
                        <div class="step">
                            <div class="step-number">4</div>
                            <h3>Complete Trades</h3>
                            <p>Finalize the deal and arrange exchange details.</p>
                        </div>
                    </div>
                </div>
            </section>
        `;
        
        // Add event listener for the Join Now button
        const joinButton = document.getElementById('join-now-button');
        if (joinButton) {
            joinButton.addEventListener('click', () => showAuthModal('register'));
        }
        
        // Reconnect navigation event listeners
        document.querySelectorAll('a[data-link]').forEach(link => {
            link.addEventListener('click', e => {
                e.preventDefault();
                const href = link.getAttribute('href');
                navigateTo(href);
            });
        });
    }
}

// Show dashboard section
async function showDashboardSection() {
    if (!appState.currentUser) {
        navigateTo('/');
        return;
    }
    
    setLoading(true);
    
    try {
        // Fetch user's listings
        const listingsResult = await listingsModule.getListings({ userId: appState.currentUser.uid });
        
        // Fetch user's trade proposals
        const sentTradesResult = await tradesModule.getTradeProposals({ role: 'proposer' });
        const receivedTradesResult = await tradesModule.getTradeProposals({ role: 'receiver' });
        
        // Display dashboard
        if (elements.mainContent) {
            elements.mainContent.innerHTML = `
                <section id="dashboard-section" class="section section-dashboard">
                    <h1>Your Dashboard</h1>
                    
                    <div class="dashboard-grid">
                        <div class="dashboard-card listings-card">
                            <h2>Your Listings</h2>
                            <a href="/create-listing" data-link class="btn-create">Create New Listing</a>
                            <div class="listings-container">
                                ${listingsResult.success && listingsResult.listings.length > 0 ? 
                                    listingsResult.listings.map(listing => `
                                        <div class="listing-card" data-id="${listing.id}">
                                            <img src="${listing.imageUrl || './assets/images/placeholder.png'}" alt="${listing.title}">
                                            <div class="listing-details">
                                                <h3>${listing.title}</h3>
                                                <p>${listing.description.substring(0, 50)}${listing.description.length > 50 ? '...' : ''}</p>
                                                <span class="status-badge status-${listing.status}">${listing.status}</span>
                                            </div>
                                            <div class="listing-actions">
                                                <button class="btn-edit" data-id="${listing.id}">Edit</button>
                                                <button class="btn-delete" data-id="${listing.id}">Delete</button>
                                            </div>
                                        </div>
                                    `).join('') : 
                                    '<p class="empty-state">You don\'t have any listings yet. Create one to start trading!</p>'
                                }
                            </div>
                        </div>
                        
                        <div class="dashboard-card trades-card">
                            <h2>Trade Proposals</h2>
                            <div class="trades-tabs">
                                <button class="tab-button active" data-tab="received">Received</button>
                                <button class="tab-button" data-tab="sent">Sent</button>
                            </div>
                            
                            <div class="tab-content active" id="received-trades">
                                ${receivedTradesResult.success && receivedTradesResult.trades.length > 0 ? 
                                    receivedTradesResult.trades.map(trade => `
                                        <div class="trade-card" data-id="${trade.id}">
                                            <div class="trade-details">
                                                <h3>Trade from ${trade.proposerName}</h3>
                                                <p>Status: <span class="status-badge status-${trade.status}">${trade.status}</span></p>
                                                <p>Created: ${new Date(trade.createdAt?.seconds * 1000).toLocaleDateString()}</p>
                                            </div>
                                            <div class="trade-actions">
                                                <button class="btn-view" data-id="${trade.id}">View Details</button>
                                                ${trade.status === 'pending' ? `
                                                    <button class="btn-accept" data-id="${trade.id}">Accept</button>
                                                    <button class="btn-decline" data-id="${trade.id}">Decline</button>
                                                ` : ''}
                                            </div>
                                        </div>
                                    `).join('') : 
                                    '<p class="empty-state">You don\'t have any received trade proposals.</p>'
                                }
                            </div>
                            
                            <div class="tab-content" id="sent-trades">
                                ${sentTradesResult.success && sentTradesResult.trades.length > 0 ? 
                                    sentTradesResult.trades.map(trade => `
                                        <div class="trade-card" data-id="${trade.id}">
                                            <div class="trade-details">
                                                <h3>Trade to ${trade.receiverName}</h3>
                                                <p>Status: <span class="status-badge status-${trade.status}">${trade.status}</span></p>
                                                <p>Created: ${new Date(trade.createdAt?.seconds * 1000).toLocaleDateString()}</p>
                                            </div>
                                            <div class="trade-actions">
                                                <button class="btn-view" data-id="${trade.id}">View Details</button>
                                                ${trade.status === 'pending' ? `
                                                    <button class="btn-cancel" data-id="${trade.id}">Cancel</button>
                                                ` : ''}
                                            </div>
                                        </div>
                                    `).join('') : 
                                    '<p class="empty-state">You haven\'t sent any trade proposals yet.</p>'
                                }
                            </div>
                        </div>
                    </div>
                </section>
            `;
            
            // Set up event listeners for the dashboard
            setupDashboardListeners();
        }
    } catch (error) {
        showError('Error loading dashboard: ' + error.message);
    } finally {
        setLoading(false);
    }
}

// Set up event listeners for dashboard elements
function setupDashboardListeners() {
    // Tab navigation for trades
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all tabs
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked tab
            button.classList.add('active');
            const tabId = `${button.dataset.tab}-trades`;
            document.getElementById(tabId).classList.add('active');
        });
    });
    
    // Listing actions
    document.querySelectorAll('.btn-edit').forEach(button => {
        button.addEventListener('click', () => {
            const listingId = button.dataset.id;
            navigateTo(`/edit-listing?id=${listingId}`);
        });
    });
    
    document.querySelectorAll('.btn-delete').forEach(button => {
        button.addEventListener('click', async () => {
            const listingId = button.dataset.id;
            if (confirm('Are you sure you want to delete this listing?')) {
                try {
                    setLoading(true);
                    const result = await listingsModule.deleteListing(listingId);
                    
                    if (result.success) {
                        // Refresh the dashboard
                        showDashboardSection();
                        showMessage('Listing deleted successfully');
                    } else {
                        showError(result.error);
                    }
                } catch (error) {
                    showError('Error deleting listing: ' + error.message);
                } finally {
                    setLoading(false);
                }
            }
        });
    });
    
    // Trade actions
    document.querySelectorAll('.btn-view').forEach(button => {
        button.addEventListener('click', () => {
            const tradeId = button.dataset.id;
            navigateTo(`/trade?id=${tradeId}`);
        });
    });
    
    document.querySelectorAll('.btn-accept').forEach(button => {
        button.addEventListener('click', async () => {
            const tradeId = button.dataset.id;
            try {
                setLoading(true);
                const result = await tradesModule.updateTradeStatus(tradeId, 'accepted', 'I accept this trade proposal.');
                
                if (result.success) {
                    // Refresh the dashboard
                    showDashboardSection();
                    showMessage('Trade accepted successfully');
                } else {
                    showError(result.error);
                }
            } catch (error) {
                showError('Error accepting trade: ' + error.message);
            } finally {
                setLoading(false);
            }
        });
    });
    
    document.querySelectorAll('.btn-decline').forEach(button => {
        button.addEventListener('click', async () => {
            const tradeId = button.dataset.id;
            try {
                setLoading(true);
                const result = await tradesModule.updateTradeStatus(tradeId, 'declined', 'I decline this trade proposal.');
                
                if (result.success) {
                    // Refresh the dashboard
                    showDashboardSection();
                    showMessage('Trade declined successfully');
                } else {
                    showError(result.error);
                }
            } catch (error) {
                showError('Error declining trade: ' + error.message);
            } finally {
                setLoading(false);
            }
        });
    });
    
    document.querySelectorAll('.btn-cancel').forEach(button => {
        button.addEventListener('click', async () => {
            const tradeId = button.dataset.id;
            try {
                setLoading(true);
                const result = await tradesModule.updateTradeStatus(tradeId, 'cancelled', 'I cancelled this trade proposal.');
                
                if (result.success) {
                    // Refresh the dashboard
                    showDashboardSection();
                    showMessage('Trade cancelled successfully');
                } else {
                    showError(result.error);
                }
            } catch (error) {
                showError('Error cancelling trade: ' + error.message);
            } finally {
                setLoading(false);
            }
        });
    });
    
    // Reconnect navigation event listeners
    document.querySelectorAll('a[data-link]').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            const href = link.getAttribute('href');
            navigateTo(href);
        });
    });
}