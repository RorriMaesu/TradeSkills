// Import Firebase services from config
import {
    auth,
    db,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    updateProfile,
    sendPasswordResetEmail,
    GoogleAuthProvider,
    signInWithPopup,
    doc
} from './firebase-config.js';
import { setDoc } from './firebase-helpers.js';

// Import database functions
import { createUserProfile } from './init-database.js';

// Register a new user with email and password
export async function registerUser(email, password, displayName) {
    try {
        // Create the user account
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Update the user's profile with display name
        await updateProfile(user, {
            displayName: displayName
        });

        // Create a user profile in Firestore
        try {
            await setDoc(doc(db, 'users', user.uid), {
                uid: user.uid,
                email: user.email,
                displayName: displayName,
                photoURL: user.photoURL || null,
                createdAt: new Date(),
                lastLogin: new Date()
            });
            console.log('User profile created in Firestore');
        } catch (profileError) {
            console.error('Error creating user profile:', profileError);
            // Continue even if profile creation fails
        }

        console.log('User registered successfully:', user);
        return { success: true, user };
    } catch (error) {
        console.error('Error registering user:', error);
        return {
            success: false,
            error: `Registration failed: ${error.message}`
        };
    }
}

// Login an existing user with email and password
export async function loginUser(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        console.log('User logged in successfully:', user);
        return { success: true, user };
    } catch (error) {
        console.error('Error logging in:', error);
        return {
            success: false,
            error: `Login failed: ${error.message}`
        };
    }
}

// Login with Google
export async function loginWithGoogle() {
    try {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        // Check if user profile exists, if not create one
        try {
            await setDoc(doc(db, 'users', user.uid), {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || 'Google User',
                photoURL: user.photoURL || null,
                createdAt: new Date(),
                lastLogin: new Date()
            }, { merge: true }); // Use merge to update existing profiles
            console.log('User profile updated in Firestore');
        } catch (profileError) {
            console.error('Error updating user profile:', profileError);
            // Continue even if profile update fails
        }

        console.log('User logged in with Google successfully:', user);
        return { success: true, user };
    } catch (error) {
        console.error('Error logging in with Google:', error);
        return {
            success: false,
            error: `Google login failed: ${error.message}`
        };
    }
}

// Logout the current user
export async function logoutUser() {
    try {
        await signOut(auth);
        console.log('User logged out successfully');
        return { success: true };
    } catch (error) {
        console.error('Error logging out:', error);
        return {
            success: false,
            error: `Logout failed: ${error.message}`
        };
    }
}

// Send a password reset email
export async function resetPassword(email) {
    try {
        await sendPasswordResetEmail(auth, email);
        console.log('Password reset email sent to:', email);
        return {
            success: true,
            message: `Password reset email sent to ${email}. Please check your inbox and spam folders.`
        };
    } catch (error) {
        console.error('Error sending password reset:', error);
        return {
            success: false,
            error: `Failed to send password reset: ${error.message}`
        };
    }
}

// Update user profile information
export async function updateUserProfile(displayName, photoURL = null) {
    try {
        const user = auth.currentUser;
        if (!user) {
            return {
                success: false,
                error: 'No authenticated user found. Please log in again.'
            };
        }

        const profileUpdates = {
            displayName: displayName
        };

        if (photoURL) {
            profileUpdates.photoURL = photoURL;
        }

        await updateProfile(user, profileUpdates);
        console.log('User profile updated successfully');
        return { success: true };
    } catch (error) {
        console.error('Error updating profile:', error);
        return {
            success: false,
            error: `Failed to update profile: ${error.message}`
        };
    }
}

// Get current user
export function getCurrentUser() {
    const user = auth.currentUser;
    if (user) {
        return {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || 'TradeSkills User',
            photoURL: user.photoURL,
            emailVerified: user.emailVerified
        };
    }
    return null;
}