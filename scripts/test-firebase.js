// Import Firebase services
import { auth, db, collection, getDocs } from './firebase-config.js';

// Test Firebase connection
export async function testFirebaseConnection() {
    console.log('Testing Firebase connection...');
    
    try {
        // Test authentication
        console.log('Testing authentication...');
        const currentUser = auth.currentUser;
        console.log('Current user:', currentUser ? currentUser.email : 'No user signed in');
        
        // Test Firestore
        console.log('Testing Firestore...');
        const usersSnapshot = await getDocs(collection(db, 'users'));
        console.log(`Found ${usersSnapshot.size} users in the database`);
        
        return {
            success: true,
            message: 'Firebase connection successful',
            authStatus: currentUser ? 'Authenticated' : 'Not authenticated',
            firestoreStatus: 'Connected',
            userCount: usersSnapshot.size
        };
    } catch (error) {
        console.error('Firebase connection test failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}
