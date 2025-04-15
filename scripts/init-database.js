// Import Firebase services
import { db, collection, doc } from './firebase-config.js';
import { setDoc } from './firebase-helpers.js';

// Initialize database with required collections
export async function initializeDatabase() {
    try {
        console.log('Initializing database...');

        // Create users collection with a placeholder document
        const usersRef = collection(db, 'users');
        await setDoc(doc(usersRef, 'placeholder'), {
            createdAt: new Date(),
            note: 'This is a placeholder document to initialize the users collection'
        });

        // Create listings collection with a placeholder document
        const listingsRef = collection(db, 'listings');
        await setDoc(doc(listingsRef, 'placeholder'), {
            createdAt: new Date(),
            note: 'This is a placeholder document to initialize the listings collection'
        });

        // Create trades collection with a placeholder document
        const tradesRef = collection(db, 'trades');
        await setDoc(doc(tradesRef, 'placeholder'), {
            createdAt: new Date(),
            note: 'This is a placeholder document to initialize the trades collection'
        });

        // Create messages collection with a placeholder document
        const messagesRef = collection(db, 'messages');
        await setDoc(doc(messagesRef, 'placeholder'), {
            createdAt: new Date(),
            note: 'This is a placeholder document to initialize the messages collection'
        });

        // Create conversations collection with a placeholder document
        const conversationsRef = collection(db, 'conversations');
        await setDoc(doc(conversationsRef, 'placeholder'), {
            createdAt: new Date(),
            note: 'This is a placeholder document to initialize the conversations collection'
        });

        // Create forum categories collection with a placeholder document
        const forumCategoriesRef = collection(db, 'forumCategories');
        await setDoc(doc(forumCategoriesRef, 'placeholder'), {
            createdAt: new Date(),
            note: 'This is a placeholder document to initialize the forum categories collection'
        });

        // Create forum posts collection with a placeholder document
        const forumPostsRef = collection(db, 'forumPosts');
        await setDoc(doc(forumPostsRef, 'placeholder'), {
            createdAt: new Date(),
            note: 'This is a placeholder document to initialize the forum posts collection'
        });

        // Create forum comments collection with a placeholder document
        const forumCommentsRef = collection(db, 'forumComments');
        await setDoc(doc(forumCommentsRef, 'placeholder'), {
            createdAt: new Date(),
            note: 'This is a placeholder document to initialize the forum comments collection'
        });

        // Create forum votes collection with a placeholder document
        const forumVotesRef = collection(db, 'forumVotes');
        await setDoc(doc(forumVotesRef, 'placeholder'), {
            createdAt: new Date(),
            note: 'This is a placeholder document to initialize the forum votes collection'
        });

        console.log('Database initialized successfully!');
        return { success: true };
    } catch (error) {
        console.error('Error initializing database:', error);
        return {
            success: false,
            error: `Failed to initialize database: ${error.message}`
        };
    }
}

// Function to create a user profile after registration
export async function createUserProfile(userId, userData) {
    try {
        const userRef = doc(db, 'users', userId);
        await setDoc(userRef, {
            ...userData,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        console.log('User profile created successfully!');
        return { success: true };
    } catch (error) {
        console.error('Error creating user profile:', error);
        return {
            success: false,
            error: `Failed to create user profile: ${error.message}`
        };
    }
}
