// Import Firebase services
import { db, auth } from './firebase-config.js';
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
    deleteDoc
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

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
export async function createPost(categoryId, title, content) {
    try {
        const user = auth.currentUser;
        if (!user) {
            return {
                success: false,
                error: 'You must be logged in to create a post.'
            };
        }

        // Check if category exists
        const categoryDoc = await getDoc(doc(db, 'forumCategories', categoryId));
        if (!categoryDoc.exists()) {
            return {
                success: false,
                error: 'Category not found.'
            };
        }

        const postData = {
            categoryId: categoryId,
            title: title,
            content: content,
            authorId: user.uid,
            authorName: user.displayName || 'TradeSkills User',
            authorPhotoURL: user.photoURL || null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            commentCount: 0,
            upvotes: 0,
            downvotes: 0,
            views: 0
        };

        const docRef = await addDoc(collection(db, 'forumPosts'), postData);

        // Update post count in category
        await updateDoc(doc(db, 'forumCategories', categoryId), {
            postCount: increment(1),
            updatedAt: serverTimestamp()
        });

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
