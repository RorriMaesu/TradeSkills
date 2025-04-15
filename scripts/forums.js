// Import Firebase services
import { db, auth, storage } from './firebase-config.js';
import {
    collection,
    addDoc,
    updateDoc,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    increment,
    serverTimestamp,
    deleteDoc,
    collectionGroup
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import {
    ref,
    uploadBytes,
    getDownloadURL
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js';

// Create a new forum category (admin only)
export async function createCategory(name, description) {
    try {
        const user = auth.currentUser;
        if (!user) {
            return {
                success: false,
                error: 'You must be logged in to create a category.'
            };
        }

        // Check if user is an admin (you'll need to implement admin roles)
        // For now, we'll allow any authenticated user to create categories

        const categoryData = {
            name: name,
            description: description,
            createdBy: user.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            postCount: 0
        };

        const docRef = await addDoc(collection(db, 'forumCategories'), categoryData);

        return {
            success: true,
            categoryId: docRef.id
        };
    } catch (error) {
        console.error('Error creating category:', error);
        return {
            success: false,
            error: `Failed to create category: ${error.message}`
        };
    }
}

// Get all forum categories
export async function getCategories() {
    try {
        const categoriesRef = collection(db, 'forumCategories');
        const q = query(categoriesRef, orderBy('name', 'asc'));
        const querySnapshot = await getDocs(q);

        const categories = [];
        querySnapshot.forEach((doc) => {
            categories.push({
                id: doc.id,
                ...doc.data()
            });
        });

        return {
            success: true,
            categories: categories
        };
    } catch (error) {
        console.error('Error getting categories:', error);
        return {
            success: false,
            error: `Failed to get categories: ${error.message}`
        };
    }
}

// Get a specific category by ID
export async function getCategory(categoryId) {
    try {
        const categoryDoc = await getDoc(doc(db, 'forumCategories', categoryId));

        if (!categoryDoc.exists()) {
            return {
                success: false,
                error: 'Category not found.'
            };
        }

        return {
            success: true,
            category: {
                id: categoryDoc.id,
                ...categoryDoc.data()
            }
        };
    } catch (error) {
        console.error('Error getting category:', error);
        return {
            success: false,
            error: `Failed to get category: ${error.message}`
        };
    }
}

// Create a new forum post
export async function createPost(postData) {
    try {
        const user = auth.currentUser;
        if (!user) {
            return {
                success: false,
                error: 'You must be logged in to create a post.'
            };
        }

        // Handle both old and new function signature
        let processedData = {};

        if (typeof postData === 'string') {
            // Old signature: createPost(categoryId, title, content)
            const categoryId = arguments[0];
            const title = arguments[1];
            const content = arguments[2];

            processedData = {
                categoryId,
                title,
                content,
                type: 'offering', // Default type
                tags: [],
                images: []
            };
        } else {
            // New signature: createPost({ categoryId, title, content, type, location, tags, images })
            processedData = postData;
        }

        // Check if category exists
        const categoryDoc = await getDoc(doc(db, 'forumCategories', processedData.categoryId));
        if (!categoryDoc.exists()) {
            return {
                success: false,
                error: 'Category not found.'
            };
        }

        // Get category name for easier filtering/display
        const categoryName = categoryDoc.data().name;

        const newPostData = {
            categoryId: processedData.categoryId,
            categoryName: categoryName,
            title: processedData.title,
            content: processedData.content,
            type: processedData.type || 'offering',
            location: processedData.location || '',
            tags: processedData.tags || [],
            images: processedData.images || [],
            authorId: user.uid,
            authorName: user.displayName || 'TradeSkills User',
            authorPhotoURL: user.photoURL || null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            commentCount: 0,
            likes: 0,
            views: 0
        };

        const docRef = await addDoc(collection(db, 'forumPosts'), newPostData);

        // Update post count in category
        await updateDoc(doc(db, 'forumCategories', processedData.categoryId), {
            postCount: increment(1),
            updatedAt: serverTimestamp()
        });

        // Add tags to the tags collection for tracking popular tags
        if (processedData.tags && processedData.tags.length > 0) {
            for (const tag of processedData.tags) {
                // Check if tag exists
                const tagsRef = collection(db, 'forumTags');
                const q = query(tagsRef, where('name', '==', tag));
                const querySnapshot = await getDocs(q);

                if (querySnapshot.empty) {
                    // Create new tag
                    await addDoc(tagsRef, {
                        name: tag,
                        count: 1,
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp()
                    });
                } else {
                    // Update existing tag count
                    await updateDoc(querySnapshot.docs[0].ref, {
                        count: increment(1),
                        updatedAt: serverTimestamp()
                    });
                }
            }
        }

        return {
            success: true,
            postId: docRef.id
        };
    } catch (error) {
        console.error('Error creating post:', error);
        return {
            success: false,
            error: `Failed to create post: ${error.message}`
        };
    }
}

// Get posts for a specific category
export async function getPosts(categoryId, limitCount = 20) {
    try {
        const postsRef = collection(db, 'forumPosts');
        const q = query(
            postsRef,
            where('categoryId', '==', categoryId),
            orderBy('createdAt', 'desc'),
            limit(limitCount)
        );

        const querySnapshot = await getDocs(q);

        const posts = [];
        querySnapshot.forEach((doc) => {
            posts.push({
                id: doc.id,
                ...doc.data()
            });
        });

        return {
            success: true,
            posts: posts
        };
    } catch (error) {
        console.error('Error getting posts:', error);
        return {
            success: false,
            error: `Failed to get posts: ${error.message}`
        };
    }
}

// Get a specific post by ID
export async function getPost(postId) {
    try {
        const postDoc = await getDoc(doc(db, 'forumPosts', postId));

        if (!postDoc.exists()) {
            return {
                success: false,
                error: 'Post not found.'
            };
        }

        const postData = postDoc.data();

        // Increment view count
        await updateDoc(doc(db, 'forumPosts', postId), {
            views: increment(1)
        });

        return {
            success: true,
            post: {
                id: postDoc.id,
                ...postData
            }
        };
    } catch (error) {
        console.error('Error getting post:', error);
        return {
            success: false,
            error: `Failed to get post: ${error.message}`
        };
    }
}

// Add a comment to a post
export async function addComment(postId, content) {
    try {
        const user = auth.currentUser;
        if (!user) {
            return {
                success: false,
                error: 'You must be logged in to comment.'
            };
        }

        // Check if post exists
        const postDoc = await getDoc(doc(db, 'forumPosts', postId));
        if (!postDoc.exists()) {
            return {
                success: false,
                error: 'Post not found.'
            };
        }

        const commentData = {
            postId: postId,
            content: content,
            authorId: user.uid,
            authorName: user.displayName || 'TradeSkills User',
            authorPhotoURL: user.photoURL || null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            upvotes: 0,
            downvotes: 0
        };

        const docRef = await addDoc(collection(db, 'forumComments'), commentData);

        // Update comment count in post
        await updateDoc(doc(db, 'forumPosts', postId), {
            commentCount: increment(1),
            updatedAt: serverTimestamp()
        });

        return {
            success: true,
            commentId: docRef.id
        };
    } catch (error) {
        console.error('Error adding comment:', error);
        return {
            success: false,
            error: `Failed to add comment: ${error.message}`
        };
    }
}

// Get comments for a specific post
export async function getComments(postId, limitCount = 50) {
    try {
        const commentsRef = collection(db, 'forumComments');
        const q = query(
            commentsRef,
            where('postId', '==', postId),
            orderBy('createdAt', 'asc'),
            limit(limitCount)
        );

        const querySnapshot = await getDocs(q);

        const comments = [];
        querySnapshot.forEach((doc) => {
            comments.push({
                id: doc.id,
                ...doc.data()
            });
        });

        return {
            success: true,
            comments: comments
        };
    } catch (error) {
        console.error('Error getting comments:', error);
        return {
            success: false,
            error: `Failed to get comments: ${error.message}`
        };
    }
}

// Upvote a post or comment
export async function upvote(itemId, itemType) {
    try {
        const user = auth.currentUser;
        if (!user) {
            return {
                success: false,
                error: 'You must be logged in to upvote.'
            };
        }

        // Check if the item exists
        const itemRef = doc(db, itemType === 'post' ? 'forumPosts' : 'forumComments', itemId);
        const itemDoc = await getDoc(itemRef);

        if (!itemDoc.exists()) {
            return {
                success: false,
                error: `${itemType === 'post' ? 'Post' : 'Comment'} not found.`
            };
        }

        // Check if user has already voted
        const votesRef = collection(db, 'forumVotes');
        const q = query(
            votesRef,
            where('itemId', '==', itemId),
            where('userId', '==', user.uid)
        );

        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            // User has already voted, update their vote
            const voteDoc = querySnapshot.docs[0];
            const voteData = voteDoc.data();

            if (voteData.voteType === 'upvote') {
                // User already upvoted, remove their vote
                await deleteDoc(voteDoc.ref);

                // Decrement upvote count
                await updateDoc(itemRef, {
                    upvotes: increment(-1)
                });

                return {
                    success: true,
                    message: 'Upvote removed.'
                };
            } else {
                // User previously downvoted, change to upvote
                await updateDoc(voteDoc.ref, {
                    voteType: 'upvote',
                    updatedAt: serverTimestamp()
                });

                // Increment upvote count and decrement downvote count
                await updateDoc(itemRef, {
                    upvotes: increment(1),
                    downvotes: increment(-1)
                });

                return {
                    success: true,
                    message: 'Vote changed to upvote.'
                };
            }
        } else {
            // User hasn't voted yet, add new vote
            await addDoc(collection(db, 'forumVotes'), {
                itemId: itemId,
                itemType: itemType,
                userId: user.uid,
                voteType: 'upvote',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            // Increment upvote count
            await updateDoc(itemRef, {
                upvotes: increment(1)
            });

            return {
                success: true,
                message: 'Upvote added.'
            };
        }
    } catch (error) {
        console.error('Error upvoting:', error);
        return {
            success: false,
            error: `Failed to upvote: ${error.message}`
        };
    }
}

// Downvote a post or comment
export async function downvote(itemId, itemType) {
    try {
        const user = auth.currentUser;
        if (!user) {
            return {
                success: false,
                error: 'You must be logged in to downvote.'
            };
        }

        // Check if the item exists
        const itemRef = doc(db, itemType === 'post' ? 'forumPosts' : 'forumComments', itemId);
        const itemDoc = await getDoc(itemRef);

        if (!itemDoc.exists()) {
            return {
                success: false,
                error: `${itemType === 'post' ? 'Post' : 'Comment'} not found.`
            };
        }

        // Check if user has already voted
        const votesRef = collection(db, 'forumVotes');
        const q = query(
            votesRef,
            where('itemId', '==', itemId),
            where('userId', '==', user.uid)
        );

        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            // User has already voted, update their vote
            const voteDoc = querySnapshot.docs[0];
            const voteData = voteDoc.data();

            if (voteData.voteType === 'downvote') {
                // User already downvoted, remove their vote
                await deleteDoc(voteDoc.ref);

                // Decrement downvote count
                await updateDoc(itemRef, {
                    downvotes: increment(-1)
                });

                return {
                    success: true,
                    message: 'Downvote removed.'
                };
            } else {
                // User previously upvoted, change to downvote
                await updateDoc(voteDoc.ref, {
                    voteType: 'downvote',
                    updatedAt: serverTimestamp()
                });

                // Increment downvote count and decrement upvote count
                await updateDoc(itemRef, {
                    downvotes: increment(1),
                    upvotes: increment(-1)
                });

                return {
                    success: true,
                    message: 'Vote changed to downvote.'
                };
            }
        } else {
            // User hasn't voted yet, add new vote
            await addDoc(collection(db, 'forumVotes'), {
                itemId: itemId,
                itemType: itemType,
                userId: user.uid,
                voteType: 'downvote',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            // Increment downvote count
            await updateDoc(itemRef, {
                downvotes: increment(1)
            });

            return {
                success: true,
                message: 'Downvote added.'
            };
        }
    } catch (error) {
        console.error('Error downvoting:', error);
        return {
            success: false,
            error: `Failed to downvote: ${error.message}`
        };
    }
}

// Get recent forum activity
export async function getRecentActivity(limitCount = 10) {
    try {
        // Get recent posts
        const postsRef = collection(db, 'forumPosts');
        const postsQuery = query(
            postsRef,
            orderBy('createdAt', 'desc'),
            limit(limitCount)
        );

        const postsSnapshot = await getDocs(postsQuery);

        const recentActivity = [];
        postsSnapshot.forEach((doc) => {
            const data = doc.data();
            recentActivity.push({
                id: doc.id,
                type: 'post',
                title: data.title,
                authorName: data.authorName,
                authorId: data.authorId,
                categoryId: data.categoryId,
                createdAt: data.createdAt,
                commentCount: data.commentCount
            });
        });

        // Get recent comments
        const commentsRef = collection(db, 'forumComments');
        const commentsQuery = query(
            commentsRef,
            orderBy('createdAt', 'desc'),
            limit(limitCount)
        );

        const commentsSnapshot = await getDocs(commentsQuery);

        // For each comment, get the associated post title
        const commentPromises = [];
        commentsSnapshot.forEach((doc) => {
            const data = doc.data();
            const promise = getDoc(doc(db, 'forumPosts', data.postId)).then(postDoc => {
                if (postDoc.exists()) {
                    const postData = postDoc.data();
                    recentActivity.push({
                        id: doc.id,
                        type: 'comment',
                        postId: data.postId,
                        postTitle: postData.title,
                        content: data.content.substring(0, 100) + (data.content.length > 100 ? '...' : ''),
                        authorName: data.authorName,
                        authorId: data.authorId,
                        categoryId: postData.categoryId,
                        createdAt: data.createdAt
                    });
                }
            });
            commentPromises.push(promise);
        });

        await Promise.all(commentPromises);

        // Sort by createdAt (newest first)
        recentActivity.sort((a, b) => {
            const timeA = a.createdAt?.seconds || 0;
            const timeB = b.createdAt?.seconds || 0;
            return timeB - timeA;
        });

        // Limit to requested count
        const limitedActivity = recentActivity.slice(0, limitCount);

        return {
            success: true,
            activity: limitedActivity
        };
    } catch (error) {
        console.error('Error getting recent activity:', error);
        return {
            success: false,
            error: `Failed to get recent activity: ${error.message}`
        };
    }
}

// Get all posts for the newsfeed
export async function getAllPosts(limitCount = 20) {
    try {
        const postsRef = collection(db, 'forumPosts');
        const q = query(
            postsRef,
            orderBy('createdAt', 'desc'),
            limit(limitCount)
        );

        const querySnapshot = await getDocs(q);

        const posts = [];
        querySnapshot.forEach((doc) => {
            posts.push({
                id: doc.id,
                ...doc.data()
            });
        });

        return {
            success: true,
            posts: posts
        };
    } catch (error) {
        console.error('Error getting all posts:', error);
        return {
            success: false,
            error: `Failed to get posts: ${error.message}`
        };
    }
}

// Get popular tags
export async function getPopularTags(limitCount = 10) {
    try {
        const tagsRef = collection(db, 'forumTags');
        const q = query(
            tagsRef,
            orderBy('count', 'desc'),
            limit(limitCount)
        );

        const querySnapshot = await getDocs(q);

        const tags = [];
        querySnapshot.forEach((doc) => {
            tags.push({
                id: doc.id,
                ...doc.data()
            });
        });

        return {
            success: true,
            tags: tags
        };
    } catch (error) {
        console.error('Error getting popular tags:', error);
        return {
            success: false,
            error: `Failed to get tags: ${error.message}`
        };
    }
}

// Get top contributors
export async function getTopContributors(limitCount = 5) {
    try {
        // This is a simplified implementation
        // In a real app, you would track user contributions more accurately
        const postsRef = collection(db, 'forumPosts');
        const q = query(postsRef, orderBy('createdAt', 'desc'), limit(100));
        const querySnapshot = await getDocs(q);

        // Count posts by author
        const authorCounts = {};
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const authorId = data.authorId;

            if (!authorCounts[authorId]) {
                authorCounts[authorId] = {
                    id: authorId,
                    name: data.authorName,
                    photoURL: data.authorPhotoURL,
                    postCount: 0,
                    commentCount: 0
                };
            }

            authorCounts[authorId].postCount++;
        });

        // Get comment counts
        const commentsRef = collection(db, 'forumComments');
        const commentsQuery = query(commentsRef, orderBy('createdAt', 'desc'), limit(100));
        const commentsSnapshot = await getDocs(commentsQuery);

        commentsSnapshot.forEach((doc) => {
            const data = doc.data();
            const authorId = data.authorId;

            if (!authorCounts[authorId]) {
                authorCounts[authorId] = {
                    id: authorId,
                    name: data.authorName,
                    photoURL: data.authorPhotoURL,
                    postCount: 0,
                    commentCount: 0
                };
            }

            authorCounts[authorId].commentCount++;
        });

        // Convert to array and sort by total contributions
        const contributors = Object.values(authorCounts)
            .sort((a, b) => (b.postCount + b.commentCount) - (a.postCount + a.commentCount))
            .slice(0, limitCount);

        return {
            success: true,
            contributors: contributors
        };
    } catch (error) {
        console.error('Error getting top contributors:', error);
        return {
            success: false,
            error: `Failed to get contributors: ${error.message}`
        };
    }
}

// Upload an image to Firebase Storage
export async function uploadImage(file) {
    try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error('You must be logged in to upload images.');
        }

        // Create a unique filename
        const timestamp = new Date().getTime();
        const fileName = `${user.uid}_${timestamp}_${file.name}`;
        const storageRef = ref(storage, `forum_images/${fileName}`);

        // Upload the file
        const snapshot = await uploadBytes(storageRef, file);

        // Get the download URL
        const downloadURL = await getDownloadURL(snapshot.ref);

        return downloadURL;
    } catch (error) {
        console.error('Error uploading image:', error);
        throw error;
    }
}

// Like a post
export async function likePost(postId) {
    try {
        const user = auth.currentUser;
        if (!user) {
            return {
                success: false,
                error: 'You must be logged in to like a post.'
            };
        }

        // Check if post exists
        const postRef = doc(db, 'forumPosts', postId);
        const postDoc = await getDoc(postRef);

        if (!postDoc.exists()) {
            return {
                success: false,
                error: 'Post not found.'
            };
        }

        // Check if user has already liked the post
        const likesRef = collection(db, 'forumLikes');
        const q = query(
            likesRef,
            where('postId', '==', postId),
            where('userId', '==', user.uid)
        );

        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            // User has already liked the post, remove the like
            await deleteDoc(querySnapshot.docs[0].ref);

            // Decrement like count
            await updateDoc(postRef, {
                likes: increment(-1)
            });

            return {
                success: true,
                message: 'Like removed.'
            };
        } else {
            // User hasn't liked the post yet, add a like
            await addDoc(likesRef, {
                postId: postId,
                userId: user.uid,
                createdAt: serverTimestamp()
            });

            // Increment like count
            await updateDoc(postRef, {
                likes: increment(1)
            });

            return {
                success: true,
                message: 'Post liked.'
            };
        }
    } catch (error) {
        console.error('Error liking post:', error);
        return {
            success: false,
            error: `Failed to like post: ${error.message}`
        };
    }
}