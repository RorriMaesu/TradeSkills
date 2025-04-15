// Import Firebase and module dependencies
import { auth, onAuthStateChanged, db, collection, query, where, getDocs } from './firebase-config.js';
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
    console.log('Initializing application...');

    // Set up auth state change listener
    onAuthStateChanged(auth, handleAuthStateChanged);

    // Cache common DOM elements
    cacheElements();

    // Set up event listeners
    setupEventListeners();

    // Convert all regular links to SPA links
    convertLinksToSPA();

    // Initialize UI based on current URL
    handleRouting();

    // Set up navigation handling
    window.addEventListener('popstate', handleRouting);

    console.log('Application initialization complete');
}

// Convert regular links to SPA navigation
function convertLinksToSPA() {
    document.querySelectorAll('a[data-link]').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            const href = link.getAttribute('href');
            navigateTo(href);
        });
    });
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

    // Google sign-in buttons
    const googleLoginButton = document.getElementById('google-login-button');
    if (googleLoginButton) {
        googleLoginButton.addEventListener('click', handleGoogleLogin);
    }

    const googleRegisterButton = document.getElementById('google-register-button');
    if (googleRegisterButton) {
        googleRegisterButton.addEventListener('click', handleGoogleLogin);
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
    const wasLoggedIn = !!appState.currentUser;
    const isNowLoggedIn = !!user;

    // Update the current user in app state
    appState.currentUser = user;

    // Update UI based on authentication state
    if (user) {
        // User is signed in
        showAuthenticatedUI();

        // If this is a new login (not just a page refresh while logged in)
        if (!wasLoggedIn && isNowLoggedIn) {
            console.log('User newly logged in, redirecting to dashboard');
            // Redirect to dashboard after login
            navigateTo('/dashboard');
            return; // Skip handleRouting() as navigateTo will call it
        }
    } else {
        // User is signed out
        showUnauthenticatedUI();

        // If user just logged out (not just a page refresh while logged out)
        if (wasLoggedIn && !isNowLoggedIn) {
            console.log('User logged out, redirecting to home');
            // Redirect to home page after logout
            navigateTo('/');
            return; // Skip handleRouting() as navigateTo will call it
        }
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

        // Set up Google sign-in buttons
        const googleLoginButton = document.getElementById('google-login-button');
        if (googleLoginButton) {
            googleLoginButton.addEventListener('click', handleGoogleLogin);
        }

        const googleRegisterButton = document.getElementById('google-register-button');
        if (googleRegisterButton) {
            googleRegisterButton.addEventListener('click', handleGoogleLogin);
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

// Handle Google login/register
async function handleGoogleLogin() {
    try {
        setLoading(true);
        const result = await authModule.loginWithGoogle();

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
    // If the URL is a full path (starts with http or https), navigate directly
    if (url.startsWith('http://') || url.startsWith('https://')) {
        window.location.href = url;
        return;
    }

    // If it's an HTML file, handle it directly
    if (url.endsWith('.html')) {
        // For HTML files, we'll use the browser's navigation
        window.location.href = url;
        return;
    }

    // For SPA routes, use history API
    // Check if we need to add the GitHub Pages repository path
    const isGitHubPages = window.location.hostname.includes('github.io');
    const repoPath = isGitHubPages ? '/TradeSkills' : '';

    // Construct the full URL
    const fullUrl = repoPath + url;

    // Update the URL and handle routing
    history.pushState(null, null, fullUrl);
    handleRouting();
}

// Route handling based on URL
function handleRouting() {
    console.log('Handling routing...');
    // Get the path from the URL
    let path = window.location.pathname;
    console.log('Original path:', path);

    // Handle GitHub Pages repository path
    const isGitHubPages = window.location.hostname.includes('github.io');
    const repoPath = isGitHubPages ? '/TradeSkills' : '';
    console.log('Is GitHub Pages:', isGitHubPages, 'Repo path:', repoPath);

    if (path.startsWith(repoPath)) {
        path = path.substring(repoPath.length);
        console.log('Path after repo path handling:', path);
    }

    // Handle HTML file extensions for direct navigation
    if (path.endsWith('.html')) {
        path = '/' + path.replace('.html', '');
    }

    // Handle root path and index.html
    if (path === '/' || path === '/index' || path === '') {
        path = '/';
    }

    console.log('Routing to path:', path);

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
        case '/index':
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
        case '/about':
            navigateTo('/about.html');
            break;
        case '/how-it-works':
            navigateTo('/how-it-works.html');
            break;
        default:
            // Check if it's a direct HTML file access
            if (path.includes('.html')) {
                // Let the browser handle it
                return;
            }
            // 404 - Not found
            showNotFoundSection();
    }
}

// Hide all main content sections
function hideAllSections() {
    console.log('Hiding all sections');
    if (elements.homeSection) {
        elements.homeSection.style.display = 'none';
    }
    if (elements.dashboardSection) {
        elements.dashboardSection.style.display = 'none';
    }
    if (elements.listingSection) {
        elements.listingSection.style.display = 'none';
    }
    if (elements.marketplaceSection) {
        elements.marketplaceSection.style.display = 'none';
    }
    if (elements.profileSection) {
        elements.profileSection.style.display = 'none';
    }

    // Reset main content if needed
    if (elements.mainContent) {
        // Don't clear the content here, let each section handler manage its content
        // elements.mainContent.innerHTML = '';
        console.log('Main content preserved for section handlers');
    }
}

// Show 404 Not Found section
function showNotFoundSection() {
    if (elements.mainContent) {
        elements.mainContent.innerHTML = `
            <section id="not-found-section" class="section section-not-found">
                <div class="not-found-container">
                    <h1>404 - Page Not Found</h1>
                    <p>The page you are looking for does not exist or has been moved.</p>
                    <a href="/" data-link class="btn-primary">Return to Home</a>
                </div>
            </section>
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
                    ${appState.currentUser ?
                        `<a href="/marketplace" data-link class="cta-button">Browse Marketplace</a>` :
                        `<button id="join-now-button" class="cta-button">Join Now</button>`
                    }
                </div>

                <div class="features">
                    <div class="feature">
                        <img src="assets/images/boxIcon.png" alt="Create Listings" class="feature-icon">
                        <h2>Create Listings</h2>
                        <p>List items or services you want to trade. Add photos and detailed descriptions.</p>
                    </div>
                    <div class="feature">
                        <img src="assets/images/featureIconsGroup.png" alt="Find Trades" class="feature-icon">
                        <h2>Find Trades</h2>
                        <p>Browse the marketplace for items or services you need.</p>
                    </div>
                    <div class="feature">
                        <img src="assets/images/wrenchIcon.png" alt="Make Offers" class="feature-icon">
                        <h2>Make Offers</h2>
                        <p>Propose trades with other users. Negotiate until both parties are satisfied.</p>
                    </div>
                    <div class="feature">
                        <img src="assets/images/shieldIcon.png" alt="Complete Trades" class="feature-icon">
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

// Show marketplace section
function showMarketplaceSection() {
    console.log('Showing marketplace section');
    // Always recreate the marketplace section to ensure it's fresh
    if (elements.mainContent) {
        elements.mainContent.innerHTML = `
            <section id="marketplace-section" class="section section-marketplace">
                <div class="container">
                    <div class="marketplace-header">
                        <h1>Marketplace</h1>
                        <button class="btn-primary" id="create-listing-button">Create Listing</button>
                    </div>

                    <div class="marketplace-filters">
                        <div class="form-group">
                            <input type="text" id="search-input" placeholder="Search listings...">
                        </div>
                        <div class="form-group">
                            <select id="category-filter">
                                <option value="">All Categories</option>
                                <option value="goods">Goods</option>
                                <option value="services">Services</option>
                                <option value="skills">Skills</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <select id="sort-filter">
                                <option value="newest">Newest First</option>
                                <option value="oldest">Oldest First</option>
                            </select>
                        </div>
                    </div>

                    <div id="listings-container" class="marketplace-grid">
                        <p class="loading-text">Loading listings...</p>
                    </div>
                </div>
            </section>
        `;

        // Add event listeners
        const createListingButton = document.getElementById('create-listing-button');
        if (createListingButton) {
            createListingButton.addEventListener('click', () => {
                if (appState.currentUser) {
                    navigateTo('/create-listing');
                } else {
                    showAuthModal('login');
                }
            });
        }

        // Add search and filter functionality
        const searchInput = document.getElementById('search-input');
        const categoryFilter = document.getElementById('category-filter');
        const sortFilter = document.getElementById('sort-filter');

        if (searchInput) {
            searchInput.addEventListener('input', debounce(() => {
                applyFiltersAndSearch();
            }, 300));
        }

        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => {
                applyFiltersAndSearch();
            });
        }

        if (sortFilter) {
            sortFilter.addEventListener('change', () => {
                applyFiltersAndSearch();
            });
        }

        // Load listings
        loadMarketplaceListings();

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

// Debounce function to limit how often a function can be called
function debounce(func, delay) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

// Apply filters and search to marketplace listings
async function applyFiltersAndSearch() {
    console.log('Applying filters and search');
    const searchInput = document.getElementById('search-input');
    const categoryFilter = document.getElementById('category-filter');
    const sortFilter = document.getElementById('sort-filter');

    // Get filter values
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    const category = categoryFilter ? categoryFilter.value : '';
    const sortBy = sortFilter ? sortFilter.value : 'newest';

    console.log('Filter values:', { searchTerm, category, sortBy });

    try {
        setLoading(true);

        // Get all listings first, then filter client-side
        let listings = [];
        try {
            const listingsRef = collection(db, 'listings');
            // Simple query without filters
            const q = query(listingsRef);

            try {
                const querySnapshot = await getDocs(q);

                // Process results
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    listings.push({
                        id: doc.id,
                        ...data
                    });
                });

                console.log('All listings loaded for filtering:', listings.length);
            } catch (error) {
                console.error('Error with simple query for filtering:', error);
                // Use sample data as fallback
                listings = [
                    {
                        id: 'sample1',
                        title: 'Sample Listing 1',
                        description: 'This is a sample listing to demonstrate the marketplace functionality.',
                        lookingFor: 'Open to offers',
                        userName: 'Demo User',
                        category: 'goods',
                        imageUrl: './assets/images/placeholder.png',
                        status: 'active',
                        createdAt: { seconds: Date.now() / 1000 }
                    },
                    {
                        id: 'sample2',
                        title: 'Sample Listing 2',
                        description: 'Another sample listing with different details to show multiple items.',
                        lookingFor: 'Tools or equipment',
                        userName: 'Demo User',
                        category: 'services',
                        imageUrl: './assets/images/placeholder.png',
                        status: 'active',
                        createdAt: { seconds: (Date.now() / 1000) - 86400 }
                    }
                ];
                console.log('Using sample listings for filtering');
            }

            // Filter by status (active) client-side
            listings = listings.filter(listing => listing.status === 'active' || !listing.status);
            console.log('Active listings filtered:', listings.length);

            // Filter by category if specified
            if (category) {
                listings = listings.filter(listing => listing.category === category);
                console.log('Category filtered listings:', listings.length);
            }
        } catch (error) {
            console.error('Error in main try block of applyFiltersAndSearch:', error);
            // Try the module as fallback
            try {
                const result = await listingsModule.getListings({ category, status: 'active' });
                if (result.success) {
                    listings = result.listings;
                    console.log('Listings loaded via module for filtering:', listings.length);
                }
            } catch (moduleError) {
                console.error('Module fallback also failed for filtering:', moduleError);
                // Use sample data as last resort
                listings = [
                    {
                        id: 'sample1',
                        title: 'Sample Listing 1',
                        description: 'This is a sample listing to demonstrate the marketplace functionality.',
                        lookingFor: 'Open to offers',
                        userName: 'Demo User',
                        category: 'goods',
                        imageUrl: './assets/images/placeholder.png',
                        status: 'active',
                        createdAt: { seconds: Date.now() / 1000 }
                    }
                ];
                console.log('Using emergency sample data for filtering');
            }
        }

        // Apply search filter client-side
        if (searchTerm) {
            listings = listings.filter(listing =>
                listing.title.toLowerCase().includes(searchTerm) ||
                listing.description.toLowerCase().includes(searchTerm) ||
                (listing.lookingFor && listing.lookingFor.toLowerCase().includes(searchTerm))
            );
        }

        // Apply sorting client-side
        if (sortBy === 'newest') {
            listings.sort((a, b) => {
                const dateA = a.createdAt?.seconds || 0;
                const dateB = b.createdAt?.seconds || 0;
                return dateB - dateA;
            });
        } else if (sortBy === 'oldest') {
            listings.sort((a, b) => {
                const dateA = a.createdAt?.seconds || 0;
                const dateB = b.createdAt?.seconds || 0;
                return dateA - dateB;
            });
        }

        // Update the UI
        const listingsContainer = document.getElementById('listings-container');
        if (listingsContainer) {
            if (listings.length > 0) {
                listingsContainer.innerHTML = listings.map(listing => `
                    <div class="marketplace-card" data-id="${listing.id}">
                        <img src="${listing.imageUrl || './assets/images/placeholder.png'}" alt="${listing.title}">
                        <div class="marketplace-card-content">
                            <h3>${listing.title}</h3>
                            <p>${listing.description.substring(0, 100)}${listing.description.length > 100 ? '...' : ''}</p>
                            <p><strong>Looking for:</strong> ${listing.lookingFor || 'Not specified'}</p>
                        </div>
                        <div class="marketplace-card-footer">
                            <div class="user-badge">
                                <img src="./assets/images/default-avatar.png" alt="User">
                                <span>${listing.userName || 'Anonymous'}</span>
                            </div>
                            <button class="btn-primary view-listing-btn" data-id="${listing.id}">View Details</button>
                        </div>
                    </div>
                `).join('');

                // Add event listeners to view listing buttons
                document.querySelectorAll('.view-listing-btn').forEach(button => {
                    button.addEventListener('click', () => {
                        const listingId = button.dataset.id;
                        navigateTo(`/listing?id=${listingId}`);
                    });
                });
            } else {
                listingsContainer.innerHTML = '<p class="empty-state">No listings found matching your criteria.</p>';
            }
        }
    } catch (error) {
        console.error('Error applying filters:', error);
        showError('Error filtering listings: ' + error.message);
    } finally {
        setLoading(false);
    }
}

// Load marketplace listings
async function loadMarketplaceListings() {
    try {
        console.log('Loading marketplace listings...');
        setLoading(true);

        // Use direct Firestore query to avoid index issues
        let listings = [];
        try {
            // Get all listings without sorting (we'll sort client-side)
            const listingsRef = collection(db, 'listings');
            console.log('Collection reference created');

            // Try to get all listings without filters first
            let q = query(listingsRef);

            try {
                console.log('Executing simple query without filters');
                const querySnapshot = await getDocs(q);
                console.log('Query executed, processing results');

                // Process results
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    listings.push({
                        id: doc.id,
                        ...data
                    });
                });

                console.log('All listings loaded:', listings.length);

                // Filter active listings client-side
                listings = listings.filter(listing => listing.status === 'active' || !listing.status);
                console.log('Active listings filtered:', listings.length);
            } catch (error) {
                console.error('Error with simple query:', error);
                // Fallback to dummy data if needed
                listings = [
                    {
                        id: 'sample1',
                        title: 'Sample Listing 1',
                        description: 'This is a sample listing to demonstrate the marketplace functionality.',
                        lookingFor: 'Open to offers',
                        userName: 'Demo User',
                        imageUrl: './assets/images/placeholder.png',
                        status: 'active',
                        createdAt: { seconds: Date.now() / 1000 }
                    },
                    {
                        id: 'sample2',
                        title: 'Sample Listing 2',
                        description: 'Another sample listing with different details to show multiple items.',
                        lookingFor: 'Tools or equipment',
                        userName: 'Demo User',
                        imageUrl: './assets/images/placeholder.png',
                        status: 'active',
                        createdAt: { seconds: (Date.now() / 1000) - 86400 }
                    }
                ];
                console.log('Using sample listings as fallback');
            }

            // Sort by createdAt (descending) - client-side
            listings.sort((a, b) => {
                const dateA = a.createdAt?.seconds || 0;
                const dateB = b.createdAt?.seconds || 0;
                return dateB - dateA;
            });

            console.log('Marketplace listings sorted and ready');
        } catch (error) {
            console.error('Error in main try block of loadMarketplaceListings:', error);
            // Try the module as fallback
            try {
                const result = await listingsModule.getListings();
                if (result.success) {
                    listings = result.listings;
                    console.log('Listings loaded via module:', listings.length);
                }
            } catch (moduleError) {
                console.error('Module fallback also failed:', moduleError);
                // Use sample data as last resort
                listings = [
                    {
                        id: 'sample1',
                        title: 'Sample Listing 1',
                        description: 'This is a sample listing to demonstrate the marketplace functionality.',
                        lookingFor: 'Open to offers',
                        userName: 'Demo User',
                        imageUrl: './assets/images/placeholder.png',
                        status: 'active',
                        createdAt: { seconds: Date.now() / 1000 }
                    }
                ];
                console.log('Using emergency sample data');
            }
        }

        const listingsContainer = document.getElementById('listings-container');
        if (listingsContainer) {
            if (listings.length > 0) {
                listingsContainer.innerHTML = listings.map(listing => `
                    <div class="marketplace-card" data-id="${listing.id}">
                        <img src="${listing.imageUrl || './assets/images/placeholder.png'}" alt="${listing.title}">
                        <div class="marketplace-card-content">
                            <h3>${listing.title}</h3>
                            <p>${listing.description.substring(0, 100)}${listing.description.length > 100 ? '...' : ''}</p>
                            <p><strong>Looking for:</strong> ${listing.lookingFor || 'Not specified'}</p>
                        </div>
                        <div class="marketplace-card-footer">
                            <div class="user-badge">
                                <img src="./assets/images/default-avatar.png" alt="User">
                                <span>${listing.userName || 'Anonymous'}</span>
                            </div>
                            <button class="btn-primary view-listing-btn" data-id="${listing.id}">View Details</button>
                        </div>
                    </div>
                `).join('');

                // Add event listeners to view listing buttons
                document.querySelectorAll('.view-listing-btn').forEach(button => {
                    button.addEventListener('click', () => {
                        const listingId = button.dataset.id;
                        navigateTo(`/listing?id=${listingId}`);
                    });
                });
            } else {
                listingsContainer.innerHTML = '<p class="empty-state">No listings found. Be the first to create one!</p>';
            }
        }
    } catch (error) {
        console.error('Error in loadMarketplaceListings:', error);
        const listingsContainer = document.getElementById('listings-container');
        if (listingsContainer) {
            listingsContainer.innerHTML = '<p class="empty-state">Error loading listings. Please try again later.</p>';
        }
        showError('Error loading listings: ' + error.message);
    } finally {
        setLoading(false);
    }
}

// Show listing detail section
async function showListingDetailSection() {
    const urlParams = new URLSearchParams(window.location.search);
    const listingId = urlParams.get('id');

    if (!listingId) {
        navigateTo('/marketplace');
        return;
    }

    setLoading(true);

    try {
        const result = await listingsModule.getListing(listingId);

        if (result.success) {
            const { listing } = result;
            const isOwner = appState.currentUser && appState.currentUser.uid === listing.userId;

            if (elements.mainContent) {
                elements.mainContent.innerHTML = `
                    <section id="listing-detail-section" class="section section-listing-detail">
                        <div class="container">
                            <div class="listing-detail">
                                <div class="listing-image">
                                    <img src="${listing.imageUrl || './assets/images/placeholder.png'}" alt="${listing.title}">
                                    ${listing.imageUploadNote ? `<div class="form-note warning">${listing.imageUploadNote}</div>` : ''}
                                </div>
                                <div class="listing-info">
                                    <h1>${listing.title}</h1>
                                    <div class="listing-meta">
                                        <span class="listing-date">Posted on ${new Date(listing.createdAt?.seconds * 1000).toLocaleDateString()}</span>
                                        <span class="listing-status status-${listing.status}">${listing.status}</span>
                                    </div>
                                    <div class="listing-owner">
                                        <img src="./assets/images/default-avatar.png" alt="${listing.userName}">
                                        <span>${listing.userName}</span>
                                    </div>
                                    <div class="listing-description">
                                        <h2>Description</h2>
                                        <p>${listing.description}</p>
                                    </div>
                                    <div class="listing-looking-for">
                                        <h2>Looking For</h2>
                                        <p>${listing.lookingFor}</p>
                                    </div>
                                    <div class="listing-actions">
                                        ${isOwner ? `
                                            <button class="btn-edit" id="edit-listing-button">Edit Listing</button>
                                            <button class="btn-delete" id="delete-listing-button">Delete Listing</button>
                                        ` : `
                                            <button class="btn-primary" id="propose-trade-button">Propose Trade</button>
                                        `}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                `;

                // Add event listeners
                if (isOwner) {
                    const editButton = document.getElementById('edit-listing-button');
                    const deleteButton = document.getElementById('delete-listing-button');

                    if (editButton) {
                        editButton.addEventListener('click', () => {
                            navigateTo(`/edit-listing?id=${listingId}`);
                        });
                    }

                    if (deleteButton) {
                        deleteButton.addEventListener('click', async () => {
                            if (confirm('Are you sure you want to delete this listing?')) {
                                try {
                                    setLoading(true);
                                    const result = await listingsModule.deleteListing(listingId);

                                    if (result.success) {
                                        navigateTo('/dashboard');
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
                    }
                } else {
                    const proposeTradeButton = document.getElementById('propose-trade-button');

                    if (proposeTradeButton) {
                        proposeTradeButton.addEventListener('click', () => {
                            if (appState.currentUser) {
                                // Show trade proposal modal or navigate to trade page
                                showMessage('Trade proposal feature coming soon!');
                            } else {
                                showAuthModal('login');
                            }
                        });
                    }
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
        } else {
            showError(result.error);
            navigateTo('/marketplace');
        }
    } catch (error) {
        showError('Error loading listing: ' + error.message);
    } finally {
        setLoading(false);
    }
}

// Show create listing section
function showCreateListingSection() {
    if (!appState.currentUser) {
        navigateTo('/');
        showAuthModal('login');
        return;
    }

    if (elements.mainContent) {
        elements.mainContent.innerHTML = `
            <section id="create-listing-section" class="section section-create-listing">
                <div class="container">
                    <h1>Create New Listing</h1>
                    <form id="create-listing-form" class="listing-form">
                        <div class="form-group">
                            <label for="listing-title">Title</label>
                            <input type="text" id="listing-title" required>
                        </div>
                        <div class="form-group">
                            <label for="listing-category">Category</label>
                            <select id="listing-category" required>
                                <option value="">Select a category</option>
                                <option value="goods">Goods</option>
                                <option value="services">Services</option>
                                <option value="skills">Skills</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="listing-description">Description</label>
                            <textarea id="listing-description" rows="5" required></textarea>
                        </div>
                        <div class="form-group">
                            <label for="listing-looking-for">What are you looking for in return?</label>
                            <textarea id="listing-looking-for" rows="3" required></textarea>
                        </div>
                        <div class="form-group">
                            <label for="listing-image">Image (Optional)</label>
                            <input type="file" id="listing-image" accept="image/*">
                            ${window.location.hostname.includes('github.io') ?
                                `<div class="form-note warning">
                                    <strong>Note:</strong> Image uploads may not work on GitHub Pages due to CORS restrictions.
                                    Your listing will use a placeholder image instead.
                                </div>` :
                                ''
                            }
                        </div>
                        <div class="form-actions">
                            <button type="button" id="cancel-listing-button" class="btn-secondary">Cancel</button>
                            <button type="submit" class="btn-primary">Create Listing</button>
                        </div>
                    </form>
                </div>
            </section>
        `;

        // Add event listeners
        const createListingForm = document.getElementById('create-listing-form');
        const cancelButton = document.getElementById('cancel-listing-button');

        if (createListingForm) {
            createListingForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                console.log('Create listing form submitted');

                const title = document.getElementById('listing-title').value;
                const category = document.getElementById('listing-category').value;
                const description = document.getElementById('listing-description').value;
                const lookingFor = document.getElementById('listing-looking-for').value;
                const imageInput = document.getElementById('listing-image');
                const imageFile = imageInput.files.length > 0 ? imageInput.files[0] : null;

                // Validate form data
                if (!title || !category || !description || !lookingFor) {
                    showError('Please fill in all required fields');
                    return;
                }

                try {
                    setLoading(true);
                    showMessage('Creating your listing... Please wait.');

                    // Log form data for debugging
                    console.log('Form data:', { title, category, description, lookingFor });
                    console.log('Image file:', imageFile ? `${imageFile.name} (${imageFile.size} bytes)` : 'None');

                    const result = await listingsModule.createListing({
                        title,
                        category,
                        description,
                        lookingFor
                    }, imageFile);

                    if (result.success) {
                        console.log('Listing created successfully with ID:', result.listingId);
                        navigateTo('/dashboard');
                        showMessage('Listing created successfully!');
                    } else {
                        console.error('Error from createListing:', result.error);
                        showError(result.error || 'Failed to create listing');
                    }
                } catch (error) {
                    console.error('Exception in form submission handler:', error);
                    showError('Error creating listing: ' + (error.message || 'Unknown error'));

                    // Try to create the listing without the image as a fallback
                    if (imageFile) {
                        try {
                            console.log('Attempting to create listing without image as fallback...');
                            const fallbackResult = await listingsModule.createListing({
                                title,
                                category,
                                description,
                                lookingFor
                            }, null);

                            if (fallbackResult.success) {
                                console.log('Fallback listing creation succeeded');
                                navigateTo('/dashboard');
                                showMessage('Listing created successfully, but without the image due to upload issues.');
                            }
                        } catch (fallbackError) {
                            console.error('Fallback attempt also failed:', fallbackError);
                        }
                    }
                } finally {
                    setLoading(false);
                }
            });
        }

        if (cancelButton) {
            cancelButton.addEventListener('click', () => {
                navigateTo('/dashboard');
            });
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

// Show profile section
function showProfileSection() {
    if (!appState.currentUser) {
        navigateTo('/');
        showAuthModal('login');
        return;
    }

    if (elements.mainContent) {
        elements.mainContent.innerHTML = `
            <section id="profile-section" class="section section-profile">
                <div class="container">
                    <h1>Your Profile</h1>
                    <div class="profile-content">
                        <div class="profile-info">
                            <div class="profile-avatar">
                                <img src="${appState.currentUser.photoURL || './assets/images/default-avatar.png'}" alt="Profile">
                            </div>
                            <div class="profile-details">
                                <h2>${appState.currentUser.displayName || 'TradeSkills User'}</h2>
                                <p>${appState.currentUser.email}</p>
                            </div>
                        </div>
                        <div class="profile-actions">
                            <button id="edit-profile-button" class="btn-primary">Edit Profile</button>
                        </div>
                    </div>
                    <div class="profile-stats">
                        <div class="stat-card">
                            <h3>Active Listings</h3>
                            <p class="stat-number">0</p>
                        </div>
                        <div class="stat-card">
                            <h3>Completed Trades</h3>
                            <p class="stat-number">0</p>
                        </div>
                        <div class="stat-card">
                            <h3>Member Since</h3>
                            <p class="stat-text">${new Date(appState.currentUser.metadata.creationTime).toLocaleDateString()}</p>
                        </div>
                    </div>
                </div>
            </section>
        `;

        // Add event listeners
        const editProfileButton = document.getElementById('edit-profile-button');

        if (editProfileButton) {
            editProfileButton.addEventListener('click', () => {
                showMessage('Profile editing feature coming soon!');
            });
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
        console.log('Loading dashboard for user:', appState.currentUser.uid);

        // Default empty results
        let listingsResult = { success: true, listings: [] };
        let sentTradesResult = { success: true, trades: [] };
        let receivedTradesResult = { success: true, trades: [] };

        // Fetch user's listings with error handling
        try {
            // Use a direct query without any sorting to avoid index requirements
            const listingsRef = collection(db, 'listings');
            const q = query(listingsRef, where('userId', '==', appState.currentUser.uid));
            const querySnapshot = await getDocs(q);

            // Process results manually
            const listings = [];
            querySnapshot.forEach((doc) => {
                listings.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            // Sort by createdAt (descending) - client-side
            listings.sort((a, b) => {
                const dateA = a.createdAt?.seconds || 0;
                const dateB = b.createdAt?.seconds || 0;
                return dateB - dateA;
            });

            listingsResult = { success: true, listings };
            console.log('Listings loaded successfully:', listings.length);
        } catch (listingError) {
            console.error('Error loading listings:', listingError);
            // Continue with empty listings array
        }

        // Fetch user's trade proposals
        try {
            // Use direct queries without any sorting to avoid index requirements
            sentTradesResult = await tradesModule.getTradeProposals({ role: 'proposer' });
            receivedTradesResult = await tradesModule.getTradeProposals({ role: 'receiver' });
            console.log('Trade proposals loaded successfully');
        } catch (tradeError) {
            console.error('Error loading trade proposals:', tradeError);
            // Continue with empty trade arrays
        }

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