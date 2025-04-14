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
