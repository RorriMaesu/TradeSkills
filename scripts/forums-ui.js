// Forums UI JavaScript
// Handles UI interactions for the forums functionality

import { auth, onAuthStateChanged } from './firebase-config.js';
import * as forumsModule from './forums.js';

// State to track current user and UI state
const state = {
    currentUser: null,
    currentPage: null,
    currentCategoryId: null,
    currentPostId: null,
    isLoading: false
};

// DOM elements that will be used across functions
const elements = {};

// Flag to track initialization
let isInitialized = false;

// Initialize the forums UI
export async function initForumsUI() {
    // Prevent double initialization
    if (isInitialized) {
        console.log('Forums UI already initialized, skipping...');
        return;
    }

    console.log('Initializing forums UI...');

    // Set up auth state change listener
    onAuthStateChanged(auth, handleAuthStateChanged);

    // Cache common DOM elements
    cacheElements();

    // Determine current page
    detectCurrentPage();

    // Set up event listeners
    setupEventListeners();

    // Initialize UI based on current page
    await initializePageContent();

    // Mark as initialized
    isInitialized = true;

    console.log('Forums UI initialized');
}

// Handle auth state changes
function handleAuthStateChanged(user) {
    state.currentUser = user;
    updateUIForAuthState();
}

// Update UI elements based on authentication state
function updateUIForAuthState() {
    // Show/hide elements based on auth state
    const isLoggedIn = !!state.currentUser;

    // Update create buttons visibility
    if (elements.createCategoryButton) {
        elements.createCategoryButton.style.display = isLoggedIn ? 'block' : 'none';
    }

    if (elements.createPostButton) {
        elements.createPostButton.style.display = isLoggedIn ? 'block' : 'none';
    }

    // Update comment form visibility
    if (elements.commentForm) {
        elements.commentForm.style.display = isLoggedIn ? 'block' : 'none';

        if (!isLoggedIn && elements.commentInput) {
            elements.commentInput.placeholder = 'Please log in to comment';
        } else if (elements.commentInput) {
            elements.commentInput.placeholder = 'Write a comment...';
        }
    }
}

// Cache DOM elements for reuse
function cacheElements() {
    // Common elements across all pages
    elements.mainContent = document.getElementById('main-content');

    // Forums main page elements - Newsfeed
    elements.categoryMenu = document.getElementById('category-menu');
    elements.tagCloud = document.getElementById('tag-cloud');
    elements.postFeed = document.getElementById('post-feed');
    elements.emptyFeedState = document.getElementById('empty-feed-state');
    elements.recentActivityList = document.getElementById('recent-activity-list');
    elements.contributorsList = document.getElementById('contributors-list');
    elements.postInputTrigger = document.getElementById('post-input-trigger');
    elements.postImageButton = document.getElementById('post-image-button');
    elements.postTagButton = document.getElementById('post-tag-button');
    elements.postLocationButton = document.getElementById('post-location-button');
    elements.userAvatar = document.getElementById('user-avatar');

    // Create Post Modal
    elements.createPostModal = document.getElementById('create-post-modal');
    elements.createPostForm = document.getElementById('create-post-form');
    elements.modalUserAvatar = document.getElementById('modal-user-avatar');
    elements.postCreatorName = document.getElementById('post-creator-name');
    elements.postType = document.getElementById('post-type');
    elements.postTitle = document.getElementById('post-title');
    elements.postContent = document.getElementById('post-content');
    elements.postCategory = document.getElementById('post-category');
    elements.postImage = document.getElementById('post-image');
    elements.imagePreview = document.getElementById('image-preview');
    elements.postLocation = document.getElementById('post-location');
    elements.postTags = document.getElementById('post-tags');
    elements.cancelPostButton = document.getElementById('cancel-post-button');

    // Create Category Modal (keeping for admin functionality)
    elements.createCategoryModal = document.getElementById('create-category-modal');
    elements.createCategoryForm = document.getElementById('create-category-form');
    elements.categoryName = document.getElementById('category-name');
    elements.categoryDescription = document.getElementById('category-description');
    elements.cancelCategoryButton = document.getElementById('cancel-category-button');

    // Forum post page elements (keeping for post detail view)
    elements.postDetail = document.getElementById('post-detail');
    elements.commentForm = document.getElementById('comment-form');
    elements.commentInput = document.getElementById('comment-input');
    elements.submitCommentButton = document.getElementById('submit-comment-button');
    elements.commentsList = document.getElementById('comments-list');

    // Modal close buttons
    const closeButtons = document.querySelectorAll('.close-button');
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const modal = button.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });
}

// Detect which forum page we're on
function detectCurrentPage() {
    const path = window.location.pathname;

    if (path.includes('forum-post.html')) {
        state.currentPage = 'post';
        const urlParams = new URLSearchParams(window.location.search);
        state.currentPostId = urlParams.get('id');
    } else if (path.includes('forum-category.html')) {
        state.currentPage = 'category';
        const urlParams = new URLSearchParams(window.location.search);
        state.currentCategoryId = urlParams.get('id');
    } else {
        state.currentPage = 'forums';
    }

    console.log(`Current page: ${state.currentPage}`);
}

// Set up event listeners based on current page
function setupEventListeners() {
    // Set up page-specific event listeners
    switch (state.currentPage) {
        case 'forums':
            setupForumsPageEventListeners();
            break;
        case 'category':
            setupCategoryPageEventListeners();
            break;
        case 'post':
            setupPostPageEventListeners();
            break;
    }
}

// Set up event listeners for the main forums page
function setupForumsPageEventListeners() {
    if (elements.createCategoryButton) {
        elements.createCategoryButton.addEventListener('click', () => {
            if (!state.currentUser) {
                alert('Please log in to create a category');
                return;
            }
            elements.createCategoryModal.style.display = 'block';
        });
    }

    if (elements.createCategoryForm) {
        elements.createCategoryForm.addEventListener('submit', handleCreateCategory);
    }

    if (elements.cancelCategoryButton) {
        elements.cancelCategoryButton.addEventListener('click', () => {
            elements.createCategoryModal.style.display = 'none';
        });
    }

    if (elements.forumsSearchInput) {
        elements.forumsSearchInput.addEventListener('input', handleSearchCategories);
    }
}

// Set up event listeners for the category page
function setupCategoryPageEventListeners() {
    if (elements.createPostButton) {
        elements.createPostButton.addEventListener('click', () => {
            if (!state.currentUser) {
                alert('Please log in to create a post');
                return;
            }

            // Set the category ID in the hidden input
            if (elements.categoryId) {
                elements.categoryId.value = state.currentCategoryId;
            }

            elements.createPostModal.style.display = 'block';
        });
    }

    if (elements.createPostForm) {
        elements.createPostForm.addEventListener('submit', handleCreatePost);
    }

    if (elements.cancelPostButton) {
        elements.cancelPostButton.addEventListener('click', () => {
            elements.createPostModal.style.display = 'none';
        });
    }

    if (elements.postsSearchInput) {
        elements.postsSearchInput.addEventListener('input', handleSearchPosts);
    }
}

// Set up event listeners for the post page
function setupPostPageEventListeners() {
    if (elements.submitCommentButton) {
        elements.submitCommentButton.addEventListener('click', handleSubmitComment);
    }

    if (elements.commentInput) {
        elements.commentInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmitComment();
            }
        });
    }

    if (elements.commentsSortSelect) {
        elements.commentsSortSelect.addEventListener('change', handleSortComments);
    }
}

// Initialize page content based on current page
async function initializePageContent() {
    switch (state.currentPage) {
        case 'forums':
            await loadForumsPageContent();
            break;
        case 'category':
            await loadCategoryPageContent();
            break;
        case 'post':
            await loadPostPageContent();
            break;
    }
}

// Load content for the main forums page
async function loadForumsPageContent() {
    try {
        state.isLoading = true;

        // Load categories for sidebar
        const categoriesResult = await forumsModule.getCategories();

        if (categoriesResult.success) {
            renderCategorySidebar(categoriesResult.categories);
        } else {
            showError(elements.categoryMenu, categoriesResult.error);
        }

        // Load posts for newsfeed
        const postsResult = await forumsModule.getAllPosts();

        if (postsResult.success) {
            renderPostFeed(postsResult.posts);
        } else {
            showError(elements.postFeed, postsResult.error);
        }

        // Load recent activity
        const activityResult = await forumsModule.getRecentActivity();

        if (activityResult.success) {
            renderRecentActivity(activityResult.activity);
        } else {
            showError(elements.recentActivityList, activityResult.error);
        }

        // Load top contributors
        const contributorsResult = await forumsModule.getTopContributors();

        if (contributorsResult.success) {
            renderTopContributors(contributorsResult.contributors);
        } else {
            showError(elements.contributorsList, contributorsResult.error);
        }

        // Load popular tags
        const tagsResult = await forumsModule.getPopularTags();

        if (tagsResult.success) {
            renderTagCloud(tagsResult.tags);
        } else {
            showError(elements.tagCloud, tagsResult.error);
        }

        // Update user avatar if logged in
        if (state.currentUser && elements.userAvatar) {
            elements.userAvatar.src = state.currentUser.photoURL || 'assets/images/default-avatar.png';
        }

        // Setup post creation area
        setupPostCreationArea();
    } catch (error) {
        console.error('Error loading forums page content:', error);
        showError(elements.mainContent, 'Failed to load forums content. Please try again later.');
    } finally {
        state.isLoading = false;
    }
}

// Load content for the category page
async function loadCategoryPageContent() {
    try {
        state.isLoading = true;

        if (!state.currentCategoryId) {
            window.location.href = 'forums.html';
            return;
        }

        // Load category details
        const categoryDoc = await forumsModule.getCategory(state.currentCategoryId);

        if (!categoryDoc.success) {
            showError(elements.mainContent, 'Category not found');
            return;
        }

        const category = categoryDoc.category;

        // Update page title
        document.title = `${category.name} | TradeSkills Forums`;

        // Update category header
        if (elements.categoryHeader) {
            elements.categoryHeader.innerHTML = `
                <h1>${category.name}</h1>
                <p class="category-header-description">${category.description}</p>
            `;
        }

        // Load posts for this category
        const postsResult = await forumsModule.getPosts(state.currentCategoryId);

        if (postsResult.success) {
            renderPosts(postsResult.posts);
        } else {
            showError(elements.postsList, postsResult.error);
        }
    } catch (error) {
        console.error('Error loading category page content:', error);
        showError(elements.mainContent, 'Failed to load category content. Please try again later.');
    } finally {
        state.isLoading = false;
    }
}

// Load content for the post page
async function loadPostPageContent() {
    try {
        state.isLoading = true;

        if (!state.currentPostId) {
            window.location.href = 'forums.html';
            return;
        }

        // Load post details
        const postResult = await forumsModule.getPost(state.currentPostId);

        if (!postResult.success) {
            showError(elements.mainContent, 'Post not found');
            return;
        }

        const post = postResult.post;

        // Update page title
        document.title = `${post.title} | TradeSkills Forums`;

        // Update breadcrumb
        if (elements.postTitleBreadcrumb) {
            elements.postTitleBreadcrumb.textContent = post.title;
        }

        // Load category details for the breadcrumb
        const categoryResult = await forumsModule.getCategory(post.categoryId);

        if (categoryResult.success && elements.categoryLink) {
            elements.categoryLink.textContent = categoryResult.category.name;
            elements.categoryLink.href = `forum-category.html?id=${post.categoryId}`;
        }

        // Render post details
        renderPostDetail(post);

        // Load comments
        const commentsResult = await forumsModule.getComments(state.currentPostId);

        if (commentsResult.success) {
            renderComments(commentsResult.comments);
        } else {
            showError(elements.commentsList, commentsResult.error);
        }
    } catch (error) {
        console.error('Error loading post page content:', error);
        showError(elements.mainContent, 'Failed to load post content. Please try again later.');
    } finally {
        state.isLoading = false;
    }
}

// Render categories in sidebar
function renderCategorySidebar(categories) {
    if (!elements.categoryMenu) return;

    let html = '<li class="active"><a href="#" data-category="all"><i class="fas fa-stream"></i> All Posts</a></li>';

    categories.forEach(category => {
        // Get first letter of category name for icon
        const iconLetter = category.name.charAt(0).toUpperCase();

        html += `
            <li>
                <a href="#" data-category="${category.id}">
                    <span class="category-icon">${iconLetter}</span>
                    ${category.name}
                </a>
            </li>
        `;
    });

    elements.categoryMenu.innerHTML = html;

    // Add event listeners to category links
    const categoryLinks = elements.categoryMenu.querySelectorAll('a');
    categoryLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();

            // Remove active class from all links
            categoryLinks.forEach(l => l.parentElement.classList.remove('active'));

            // Add active class to clicked link
            link.parentElement.classList.add('active');

            // Filter posts by category
            const categoryId = link.getAttribute('data-category');
            filterPostsByCategory(categoryId);
        });
    });
}

// Render post feed (Facebook-style)
function renderPostFeed(posts) {
    if (!elements.postFeed) return;

    if (posts.length === 0) {
        elements.emptyFeedState.style.display = 'flex';
        return;
    }

    elements.emptyFeedState.style.display = 'none';
    let html = '';

    posts.forEach(post => {
        const time = formatTimestamp(post.createdAt);
        const postType = post.type || 'offering'; // Default to offering if not specified
        const postTypeBadgeClass = `post-type-badge ${postType}`;
        const postTypeBadgeText = postType.charAt(0).toUpperCase() + postType.slice(1);

        // Get category name
        const categoryName = post.categoryName || 'General';

        // Format post images if any
        let imagesHtml = '';
        if (post.images && post.images.length > 0) {
            imagesHtml = `
                <div class="post-images">
                    <img src="${post.images[0]}" alt="Post image" class="post-image">
                </div>
            `;
        }

        // Format post tags if any
        let tagsHtml = '';
        if (post.tags && post.tags.length > 0) {
            tagsHtml = '<div class="post-tags">';
            post.tags.forEach(tag => {
                tagsHtml += `<span class="post-tag">${tag}</span>`;
            });
            tagsHtml += '</div>';
        }

        // Format location if any
        let locationHtml = '';
        if (post.location) {
            locationHtml = `<span class="post-location"><i class="fas fa-map-marker-alt"></i> ${post.location}</span>`;
        }

        html += `
            <div class="post-card" data-id="${post.id}" data-category="${post.categoryId || 'none'}">
                <div class="post-header">
                    <img src="${post.authorPhotoURL || 'assets/images/default-avatar.png'}" alt="${post.authorName}" class="post-avatar">
                    <div class="post-user-info">
                        <div class="post-user-name">${post.authorName}</div>
                        <div class="post-meta">
                            <span class="post-type-badge ${postTypeBadgeClass}">${postTypeBadgeText}</span>
                            <span class="post-time">${time}</span>
                            ${locationHtml}
                        </div>
                    </div>
                </div>
                <div class="post-content">
                    <h3 class="post-title">${post.title}</h3>
                    <p class="post-text">${post.content}</p>
                    ${imagesHtml}
                    ${tagsHtml}
                </div>
                <div class="post-stats">
                    <div class="post-likes">
                        <i class="fas fa-thumbs-up"></i> ${post.likes || 0}
                    </div>
                    <div class="post-comments-count">
                        ${post.commentCount || 0} comments
                    </div>
                </div>
                <div class="post-actions-buttons">
                    <button class="post-action" data-action="like" data-id="${post.id}">
                        <i class="far fa-thumbs-up"></i> Like
                    </button>
                    <button class="post-action" data-action="comment" data-id="${post.id}">
                        <i class="far fa-comment"></i> Comment
                    </button>
                    <button class="post-action" data-action="share" data-id="${post.id}">
                        <i class="far fa-share-square"></i> Share
                    </button>
                </div>
            </div>
        `;
    });

    elements.postFeed.innerHTML = html;

    // Add event listeners to post actions
    const postActions = elements.postFeed.querySelectorAll('.post-action');
    postActions.forEach(action => {
        action.addEventListener('click', handlePostAction);
    });

    // Add event listeners to post titles for navigation
    const postTitles = elements.postFeed.querySelectorAll('.post-title');
    postTitles.forEach(title => {
        title.addEventListener('click', (e) => {
            const postCard = e.target.closest('.post-card');
            if (postCard) {
                const postId = postCard.getAttribute('data-id');
                window.location.href = `forum-post.html?id=${postId}`;
            }
        });
    });
}

// Render tag cloud
function renderTagCloud(tags) {
    if (!elements.tagCloud) return;

    if (tags.length === 0) {
        elements.tagCloud.innerHTML = '<div class="empty-state">No tags found</div>';
        return;
    }

    let html = '';
    tags.forEach(tag => {
        html += `<span class="tag" data-tag="${tag.name}">${tag.name} (${tag.count})</span>`;
    });

    elements.tagCloud.innerHTML = html;

    // Add event listeners to tags
    const tagElements = elements.tagCloud.querySelectorAll('.tag');
    tagElements.forEach(tagElement => {
        tagElement.addEventListener('click', (e) => {
            // Toggle active class
            tagElement.classList.toggle('active');

            // Get all active tags
            const activeTags = Array.from(elements.tagCloud.querySelectorAll('.tag.active'))
                .map(tag => tag.getAttribute('data-tag'));

            // Filter posts by tags
            filterPostsByTags(activeTags);
        });
    });
}

// Render top contributors
function renderTopContributors(contributors) {
    if (!elements.contributorsList) return;

    if (contributors.length === 0) {
        elements.contributorsList.innerHTML = '<div class="empty-state">No contributors found</div>';
        return;
    }

    let html = '';
    contributors.forEach(contributor => {
        html += `
            <li class="contributor-item">
                <img src="${contributor.photoURL || 'assets/images/default-avatar.png'}" alt="${contributor.name}" class="contributor-avatar">
                <div class="contributor-info">
                    <div class="contributor-name">${contributor.name}</div>
                    <div class="contributor-stats">
                        <span>${contributor.postCount || 0} posts</span> •
                        <span>${contributor.commentCount || 0} comments</span>
                    </div>
                </div>
            </li>
        `;
    });

    elements.contributorsList.innerHTML = html;
}

// Setup post creation area
function setupPostCreationArea() {
    if (!elements.postInputTrigger) return;

    // Open post creation modal when clicking on the post input
    elements.postInputTrigger.addEventListener('click', () => {
        openCreatePostModal();
    });

    // Setup post action buttons
    if (elements.postImageButton) {
        elements.postImageButton.addEventListener('click', () => {
            openCreatePostModal('image');
        });
    }

    if (elements.postTagButton) {
        elements.postTagButton.addEventListener('click', () => {
            openCreatePostModal('tag');
        });
    }

    if (elements.postLocationButton) {
        elements.postLocationButton.addEventListener('click', () => {
            openCreatePostModal('location');
        });
    }
}

// Open create post modal
function openCreatePostModal(focusOn = null) {
    if (!elements.createPostModal || !state.currentUser) {
        alert('You must be logged in to create a post');
        return;
    }

    // Set user info in modal
    if (elements.modalUserAvatar) {
        elements.modalUserAvatar.src = state.currentUser.photoURL || 'assets/images/default-avatar.png';
    }

    if (elements.postCreatorName) {
        elements.postCreatorName.textContent = state.currentUser.displayName || 'User';
    }

    // Load categories into dropdown
    loadCategoriesIntoDropdown();

    // Setup image upload preview
    setupImageUploadPreview();

    // Show modal
    elements.createPostModal.style.display = 'block';

    // Focus on specific field if requested
    if (focusOn === 'image' && elements.postImage) {
        elements.postImage.click();
    } else if (focusOn === 'tag' && elements.postTags) {
        elements.postTags.focus();
    } else if (focusOn === 'location' && elements.postLocation) {
        elements.postLocation.focus();
    }
}

// Load categories into dropdown
async function loadCategoriesIntoDropdown() {
    if (!elements.postCategory) return;

    try {
        const categoriesResult = await forumsModule.getCategories();

        if (categoriesResult.success) {
            let html = '<option value="">Select a Category</option>';

            categoriesResult.categories.forEach(category => {
                html += `<option value="${category.id}">${category.name}</option>`;
            });

            elements.postCategory.innerHTML = html;
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// Setup image upload preview
function setupImageUploadPreview() {
    if (!elements.postImage || !elements.imagePreview) return;

    elements.postImage.addEventListener('change', (e) => {
        elements.imagePreview.innerHTML = '';

        const files = e.target.files;
        if (!files || files.length === 0) return;

        for (let i = 0; i < Math.min(files.length, 5); i++) {
            const file = files[i];
            const reader = new FileReader();

            reader.onload = (e) => {
                const container = document.createElement('div');
                container.className = 'preview-image-container';

                const img = document.createElement('img');
                img.src = e.target.result;
                img.className = 'preview-image';

                const removeButton = document.createElement('button');
                removeButton.className = 'remove-image';
                removeButton.innerHTML = '&times;';
                removeButton.addEventListener('click', () => {
                    container.remove();
                });

                container.appendChild(img);
                container.appendChild(removeButton);
                elements.imagePreview.appendChild(container);
            };

            reader.readAsDataURL(file);
        }
    });
}

// Filter posts by category
function filterPostsByCategory(categoryId) {
    if (!elements.postFeed) return;

    const posts = elements.postFeed.querySelectorAll('.post-card');

    posts.forEach(post => {
        if (categoryId === 'all' || post.getAttribute('data-category') === categoryId) {
            post.style.display = 'block';
        } else {
            post.style.display = 'none';
        }
    });
}

// Filter posts by tags
function filterPostsByTags(tags) {
    // This would require server-side filtering or more complex client-side implementation
    // For now, we'll just log the selected tags
    console.log('Filtering by tags:', tags);

    // In a real implementation, you would fetch posts with these tags from the server
    // or filter the existing posts based on their tags
}

// Handle post actions (like, comment, share)
function handlePostAction(e) {
    const action = e.currentTarget.getAttribute('data-action');
    const postId = e.currentTarget.getAttribute('data-id');

    if (!state.currentUser) {
        alert('You must be logged in to perform this action');
        return;
    }

    switch (action) {
        case 'like':
            handleLikePost(postId, e.currentTarget);
            break;
        case 'comment':
            window.location.href = `forum-post.html?id=${postId}#comments`;
            break;
        case 'share':
            handleSharePost(postId);
            break;
    }
}

// Handle liking a post
async function handleLikePost(postId, button) {
    try {
        const result = await forumsModule.likePost(postId);

        if (result.success) {
            // Update UI
            button.classList.add('liked');
            button.querySelector('i').className = 'fas fa-thumbs-up';

            // Update like count
            const likesElement = button.closest('.post-card').querySelector('.post-likes');
            if (likesElement) {
                const currentLikes = parseInt(likesElement.textContent.trim().split(' ')[1] || '0');
                likesElement.innerHTML = `<i class="fas fa-thumbs-up"></i> ${currentLikes + 1}`;
            }
        } else {
            alert(`Failed to like post: ${result.error}`);
        }
    } catch (error) {
        console.error('Error liking post:', error);
        alert('An error occurred while liking the post');
    }
}

// Handle sharing a post
function handleSharePost(postId) {
    // Create a shareable link
    const shareUrl = `${window.location.origin}${window.location.pathname}?post=${postId}`;

    // Try to use the Web Share API if available
    if (navigator.share) {
        navigator.share({
            title: 'Check out this post on TradeSkills',
            url: shareUrl
        }).catch(error => {
            console.error('Error sharing:', error);
            fallbackShare(shareUrl);
        });
    } else {
        fallbackShare(shareUrl);
    }
}

// Fallback sharing method
function fallbackShare(url) {
    // Create a temporary input to copy the URL
    const input = document.createElement('input');
    input.value = url;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);

    alert('Link copied to clipboard!');
}

// Render recent activity
function renderRecentActivity(activities) {
    if (!elements.recentActivityList) return;

    if (activities.length === 0) {
        elements.recentActivityList.innerHTML = `
            <div class="empty-state">
                <p>No recent activity.</p>
            </div>
        `;
        return;
    }

    let html = '';

    activities.forEach(activity => {
        const time = formatTimestamp(activity.createdAt);

        if (activity.type === 'post') {
            html += `
                <div class="activity-item">
                    <div class="activity-icon">
                        <i class="fas fa-file-alt"></i>
                    </div>
                    <div class="activity-content">
                        <p>
                            <strong>${activity.authorName}</strong> posted
                            <a href="forum-post.html?id=${activity.id}">${activity.title}</a>
                        </p>
                        <p class="activity-time">${time}</p>
                    </div>
                </div>
            `;
        } else if (activity.type === 'comment') {
            html += `
                <div class="activity-item">
                    <div class="activity-icon">
                        <i class="fas fa-comment"></i>
                    </div>
                    <div class="activity-content">
                        <p>
                            <strong>${activity.authorName}</strong> commented on
                            <a href="forum-post.html?id=${activity.postId}">${activity.postTitle}</a>
                        </p>
                        <p class="activity-comment">${activity.content}</p>
                        <p class="activity-time">${time}</p>
                    </div>
                </div>
            `;
        }
    });

    elements.recentActivityList.innerHTML = html;
}

// Render posts list
function renderPosts(posts) {
    if (!elements.postsList) return;

    if (posts.length === 0) {
        elements.postsList.innerHTML = `
            <div class="empty-state">
                <p>No posts found in this category.</p>
                <p>Be the first to create a post!</p>
            </div>
        `;
        return;
    }

    let html = '';

    posts.forEach(post => {
        const time = formatTimestamp(post.createdAt);

        html += `
            <div class="post-card">
                <div class="post-info">
                    <h3><a href="forum-post.html?id=${post.id}">${post.title}</a></h3>
                    <p class="post-meta">
                        Posted by <span class="author">${post.authorName}</span> • ${time}
                    </p>
                </div>
                <div class="post-stats">
                    <div class="stat">
                        <span class="stat-value">${post.commentCount || 0}</span>
                        <span class="stat-label">Comments</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value">${post.views || 0}</span>
                        <span class="stat-label">Views</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value">${post.upvotes || 0}</span>
                        <span class="stat-label">Upvotes</span>
                    </div>
                </div>
            </div>
        `;
    });

    elements.postsList.innerHTML = html;
}

// Render post detail
function renderPostDetail(post) {
    if (!elements.postDetail) return;

    const time = formatTimestamp(post.createdAt);

    const html = `
        <div class="post-header">
            <h1>${post.title}</h1>
            <div class="post-meta">
                Posted by <span class="author">${post.authorName}</span> • ${time}
            </div>
        </div>
        <div class="post-content">
            ${post.content}
        </div>
        <div class="post-actions">
            <div class="vote-buttons">
                <button class="vote-button upvote" data-id="${post.id}" data-type="post">
                    <i class="fas fa-arrow-up"></i>
                    <span class="vote-count">${post.upvotes || 0}</span>
                </button>
                <button class="vote-button downvote" data-id="${post.id}" data-type="post">
                    <i class="fas fa-arrow-down"></i>
                    <span class="vote-count">${post.downvotes || 0}</span>
                </button>
            </div>
            <div class="post-stats">
                <span><i class="fas fa-eye"></i> ${post.views || 0} views</span>
                <span><i class="fas fa-comment"></i> ${post.commentCount || 0} comments</span>
            </div>
        </div>
    `;

    elements.postDetail.innerHTML = html;

    // Add event listeners for vote buttons
    const upvoteButton = elements.postDetail.querySelector('.upvote');
    const downvoteButton = elements.postDetail.querySelector('.downvote');

    if (upvoteButton) {
        upvoteButton.addEventListener('click', handleVote);
    }

    if (downvoteButton) {
        downvoteButton.addEventListener('click', handleVote);
    }
}

// Render comments
function renderComments(comments) {
    if (!elements.commentsList) return;

    if (comments.length === 0) {
        elements.commentsList.innerHTML = `
            <div class="empty-state">
                <p>No comments yet.</p>
                <p>Be the first to comment on this post!</p>
            </div>
        `;
        return;
    }

    let html = '';

    comments.forEach(comment => {
        const time = formatTimestamp(comment.createdAt);

        html += `
            <div class="comment">
                <div class="comment-header">
                    <div class="comment-author">
                        ${comment.authorPhotoURL ? `<img src="${comment.authorPhotoURL}" alt="${comment.authorName}" class="author-avatar">` : ''}
                        <span class="author-name">${comment.authorName}</span>
                    </div>
                    <div class="comment-time">${time}</div>
                </div>
                <div class="comment-content">
                    ${comment.content}
                </div>
                <div class="comment-actions">
                    <div class="vote-buttons">
                        <button class="vote-button upvote" data-id="${comment.id}" data-type="comment">
                            <i class="fas fa-arrow-up"></i>
                            <span class="vote-count">${comment.upvotes || 0}</span>
                        </button>
                        <button class="vote-button downvote" data-id="${comment.id}" data-type="comment">
                            <i class="fas fa-arrow-down"></i>
                            <span class="vote-count">${comment.downvotes || 0}</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    });

    elements.commentsList.innerHTML = html;

    // Add event listeners for vote buttons
    const voteButtons = elements.commentsList.querySelectorAll('.vote-button');
    voteButtons.forEach(button => {
        button.addEventListener('click', handleVote);
    });
}

// Handle creating a new category
async function handleCreateCategory(e) {
    e.preventDefault();

    if (!state.currentUser) {
        alert('You must be logged in to create a category');
        return;
    }

    const name = elements.categoryName.value.trim();
    const description = elements.categoryDescription.value.trim();

    if (!name || !description) {
        alert('Please fill in all fields');
        return;
    }

    try {
        const result = await forumsModule.createCategory(name, description);

        if (result.success) {
            // Clear form and hide modal
            elements.createCategoryForm.reset();
            elements.createCategoryModal.style.display = 'none';

            // Reload categories
            const categoriesResult = await forumsModule.getCategories();
            if (categoriesResult.success) {
                renderCategories(categoriesResult.categories);
            }

            alert('Category created successfully!');
        } else {
            alert(`Failed to create category: ${result.error}`);
        }
    } catch (error) {
        console.error('Error creating category:', error);
        alert('An error occurred while creating the category');
    }
}

// Handle creating a new post
async function handleCreatePost(e) {
    e.preventDefault();

    if (!state.currentUser) {
        alert('You must be logged in to create a post');
        return;
    }

    const postType = elements.postType.value;
    const title = elements.postTitle.value.trim();
    const content = elements.postContent.value.trim();
    const categoryId = elements.postCategory.value;
    const location = elements.postLocation.value.trim();
    const tagsInput = elements.postTags.value.trim();

    // Parse tags from comma-separated input
    const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

    if (!title || !content || !categoryId) {
        alert('Please fill in all required fields (title, content, and category)');
        return;
    }

    try {
        // Prepare images if any
        const imageFiles = elements.postImage.files;
        let imageUrls = [];

        if (imageFiles && imageFiles.length > 0) {
            // Show loading indicator
            const loadingHtml = '<div class="loading">Uploading images...</div>';
            elements.imagePreview.innerHTML += loadingHtml;

            // Upload images to Firebase Storage
            try {
                imageUrls = await Promise.all(
                    Array.from(imageFiles).map(file => forumsModule.uploadImage(file))
                );
            } catch (uploadError) {
                console.error('Error uploading images:', uploadError);
                alert('Failed to upload one or more images. Your post will be created without images.');
                imageUrls = [];
            } finally {
                // Remove loading indicator
                const loadingElement = elements.imagePreview.querySelector('.loading');
                if (loadingElement) {
                    loadingElement.remove();
                }
            }
        }

        // Create post with all data
        const result = await forumsModule.createPost({
            categoryId,
            title,
            content,
            type: postType,
            location,
            tags,
            images: imageUrls
        });

        if (result.success) {
            // Clear form and hide modal
            elements.createPostForm.reset();
            elements.createPostModal.style.display = 'none';
            elements.imagePreview.innerHTML = '';

            // Reload posts feed
            const postsResult = await forumsModule.getAllPosts();
            if (postsResult.success) {
                renderPostFeed(postsResult.posts);
            }

            alert('Post created successfully!');
        } else {
            alert(`Failed to create post: ${result.error}`);
        }
    } catch (error) {
        console.error('Error creating post:', error);
        alert('An error occurred while creating the post');
    }
}

// Handle submitting a comment
async function handleSubmitComment() {
    if (!state.currentUser) {
        alert('You must be logged in to comment');
        return;
    }

    const content = elements.commentInput.value.trim();

    if (!content) {
        alert('Please enter a comment');
        return;
    }

    try {
        const result = await forumsModule.addComment(state.currentPostId, content);

        if (result.success) {
            // Clear input
            elements.commentInput.value = '';

            // Reload comments
            const commentsResult = await forumsModule.getComments(state.currentPostId);
            if (commentsResult.success) {
                renderComments(commentsResult.comments);
            }
        } else {
            alert(`Failed to add comment: ${result.error}`);
        }
    } catch (error) {
        console.error('Error adding comment:', error);
        alert('An error occurred while adding the comment');
    }
}

// Handle voting (upvote/downvote)
async function handleVote(e) {
    if (!state.currentUser) {
        alert('You must be logged in to vote');
        return;
    }

    const button = e.currentTarget;
    const itemId = button.dataset.id;
    const itemType = button.dataset.type;
    const isUpvote = button.classList.contains('upvote');

    try {
        let result;

        if (isUpvote) {
            result = await forumsModule.upvote(itemId, itemType);
        } else {
            result = await forumsModule.downvote(itemId, itemType);
        }

        if (result.success) {
            // Reload the current page to reflect the updated vote counts
            if (state.currentPage === 'post') {
                await loadPostPageContent();
            }
        } else {
            alert(`Failed to vote: ${result.error}`);
        }
    } catch (error) {
        console.error('Error voting:', error);
        alert('An error occurred while processing your vote');
    }
}

// Handle searching categories
function handleSearchCategories() {
    const searchTerm = elements.forumsSearchInput.value.toLowerCase().trim();
    const categoryCards = elements.categoryList.querySelectorAll('.category-card');

    categoryCards.forEach(card => {
        const title = card.querySelector('h3').textContent.toLowerCase();
        const description = card.querySelector('p').textContent.toLowerCase();

        if (title.includes(searchTerm) || description.includes(searchTerm)) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
}

// Handle searching posts
function handleSearchPosts() {
    const searchTerm = elements.postsSearchInput.value.toLowerCase().trim();
    const postCards = elements.postsList.querySelectorAll('.post-card');

    postCards.forEach(card => {
        const title = card.querySelector('h3').textContent.toLowerCase();

        if (title.includes(searchTerm)) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
}

// Handle sorting comments
async function handleSortComments() {
    if (!elements.commentsSortSelect || !state.currentPostId) return;

    const sortBy = elements.commentsSortSelect.value;

    try {
        const commentsResult = await forumsModule.getComments(state.currentPostId);

        if (commentsResult.success) {
            let comments = commentsResult.comments;

            // Sort comments based on selected option
            switch (sortBy) {
                case 'newest':
                    comments.sort((a, b) => {
                        const timeA = a.createdAt?.seconds || 0;
                        const timeB = b.createdAt?.seconds || 0;
                        return timeB - timeA;
                    });
                    break;
                case 'oldest':
                    comments.sort((a, b) => {
                        const timeA = a.createdAt?.seconds || 0;
                        const timeB = b.createdAt?.seconds || 0;
                        return timeA - timeB;
                    });
                    break;
                case 'votes':
                    comments.sort((a, b) => {
                        const votesA = (a.upvotes || 0) - (a.downvotes || 0);
                        const votesB = (b.upvotes || 0) - (b.downvotes || 0);
                        return votesB - votesA;
                    });
                    break;
            }

            renderComments(comments);
        }
    } catch (error) {
        console.error('Error sorting comments:', error);
    }
}

// Format timestamp for display
function formatTimestamp(timestamp) {
    if (!timestamp) return 'Unknown date';

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) {
        return 'just now';
    } else if (diffMin < 60) {
        return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
    } else if (diffHour < 24) {
        return `${diffHour} hour${diffHour === 1 ? '' : 's'} ago`;
    } else if (diffDay < 7) {
        return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
    } else {
        return date.toLocaleDateString();
    }
}

// Show error message in a container
function showError(container, message) {
    if (!container) return;

    container.innerHTML = `
        <div class="error-message">
            <i class="fas fa-exclamation-circle"></i>
            <p>${message}</p>
        </div>
    `;
}

// Initialize the forums UI when the DOM is loaded
document.addEventListener('DOMContentLoaded', initForumsUI);
