// Import Firebase services
import { db, storage, auth } from './firebase-config.js';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDoc, getDocs, query, where, orderBy, limit } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js';

// Create a new listing
export async function createListing(listingData, imageFile) {
    try {
        const user = auth.currentUser;
        if (!user) {
            return { 
                success: false, 
                error: 'You must be logged in to create a listing.' 
            };
        }
        
        // Add user information to the listing data
        const enhancedListingData = {
            ...listingData,
            userId: user.uid,
            userName: user.displayName || 'TradeSkills User',
            userEmail: user.email,
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        // If there's an image file, upload it to Firebase Storage
        if (imageFile) {
            const imageUrl = await uploadListingImage(imageFile);
            enhancedListingData.imageUrl = imageUrl;
        }
        
        // Add the listing to Firestore
        const docRef = await addDoc(collection(db, 'listings'), enhancedListingData);
        console.log('Listing created with ID:', docRef.id);
        
        return { 
            success: true, 
            listingId: docRef.id 
        };
    } catch (error) {
        console.error('Error creating listing:', error);
        return { 
            success: false, 
            error: `Failed to create listing: ${error.message}` 
        };
    }
}

// Update an existing listing
export async function updateListing(listingId, listingData, imageFile) {
    try {
        const user = auth.currentUser;
        if (!user) {
            return { 
                success: false, 
                error: 'You must be logged in to update a listing.' 
            };
        }
        
        // Get the current listing to verify ownership
        const listingDoc = await getDoc(doc(db, 'listings', listingId));
        
        if (!listingDoc.exists()) {
            return { 
                success: false, 
                error: 'Listing not found.' 
            };
        }
        
        const listingOwner = listingDoc.data().userId;
        
        // Verify the current user is the listing owner
        if (listingOwner !== user.uid) {
            return { 
                success: false, 
                error: 'You do not have permission to update this listing.' 
            };
        }
        
        // Prepare the update data
        const updateData = {
            ...listingData,
            updatedAt: new Date()
        };
        
        // Handle image upload/update if needed
        if (imageFile) {
            // If the listing already has an image, delete it
            const existingImageUrl = listingDoc.data().imageUrl;
            if (existingImageUrl) {
                try {
                    // Extract the path from the URL
                    const imagePath = existingImageUrl.split('listing-images%2F')[1].split('?')[0];
                    const imageRef = ref(storage, `listing-images/${imagePath}`);
                    await deleteObject(imageRef);
                } catch (error) {
                    console.warn('Error deleting existing image:', error);
                    // Continue anyway
                }
            }
            
            // Upload the new image
            const imageUrl = await uploadListingImage(imageFile);
            updateData.imageUrl = imageUrl;
        }
        
        // Update the listing in Firestore
        await updateDoc(doc(db, 'listings', listingId), updateData);
        console.log('Listing updated successfully:', listingId);
        
        return { success: true };
    } catch (error) {
        console.error('Error updating listing:', error);
        return { 
            success: false, 
            error: `Failed to update listing: ${error.message}` 
        };
    }
}

// Delete a listing
export async function deleteListing(listingId) {
    try {
        const user = auth.currentUser;
        if (!user) {
            return { 
                success: false, 
                error: 'You must be logged in to delete a listing.' 
            };
        }
        
        // Get the listing to verify ownership and retrieve image URL if any
        const listingDoc = await getDoc(doc(db, 'listings', listingId));
        
        if (!listingDoc.exists()) {
            return { 
                success: false, 
                error: 'Listing not found.' 
            };
        }
        
        const listingData = listingDoc.data();
        const listingOwner = listingData.userId;
        
        // Verify the current user is the listing owner
        if (listingOwner !== user.uid) {
            return { 
                success: false, 
                error: 'You do not have permission to delete this listing.' 
            };
        }
        
        // Delete the image from storage if it exists
        if (listingData.imageUrl) {
            try {
                // Extract the path from the URL
                const imagePath = listingData.imageUrl.split('listing-images%2F')[1].split('?')[0];
                const imageRef = ref(storage, `listing-images/${imagePath}`);
                await deleteObject(imageRef);
                console.log('Listing image deleted successfully');
            } catch (error) {
                console.warn('Error deleting listing image:', error);
                // Continue anyway
            }
        }
        
        // Delete the listing from Firestore
        await deleteDoc(doc(db, 'listings', listingId));
        console.log('Listing deleted successfully:', listingId);
        
        return { success: true };
    } catch (error) {
        console.error('Error deleting listing:', error);
        return { 
            success: false, 
            error: `Failed to delete listing: ${error.message}` 
        };
    }
}

// Get a listing by ID
export async function getListing(listingId) {
    try {
        const listingDoc = await getDoc(doc(db, 'listings', listingId));
        
        if (!listingDoc.exists()) {
            return { 
                success: false, 
                error: 'Listing not found.' 
            };
        }
        
        const listingData = listingDoc.data();
        
        return { 
            success: true, 
            listing: {
                id: listingDoc.id,
                ...listingData
            }
        };
    } catch (error) {
        console.error('Error getting listing:', error);
        return { 
            success: false, 
            error: `Failed to get listing: ${error.message}` 
        };
    }
}

// Get listings with optional filters
export async function getListings(filters = {}) {
    try {
        const { userId, category, status, searchTerm, sortBy, limitCount } = filters;
        let listingsQuery = collection(db, 'listings');
        const queryFilters = [];
        
        // Apply filters
        if (userId) {
            queryFilters.push(where('userId', '==', userId));
        }
        
        if (category) {
            queryFilters.push(where('category', '==', category));
        }
        
        if (status) {
            queryFilters.push(where('status', '==', status));
        }
        
        // Apply sorting
        let sortField = 'createdAt';
        let sortDirection = 'desc';
        
        if (sortBy) {
            if (sortBy === 'newest') {
                sortField = 'createdAt';
                sortDirection = 'desc';
            } else if (sortBy === 'oldest') {
                sortField = 'createdAt';
                sortDirection = 'asc';
            } else if (sortBy === 'title-asc') {
                sortField = 'title';
                sortDirection = 'asc';
            } else if (sortBy === 'title-desc') {
                sortField = 'title';
                sortDirection = 'desc';
            }
        }
        
        // Apply query constraints
        if (queryFilters.length > 0) {
            listingsQuery = query(listingsQuery, ...queryFilters, orderBy(sortField, sortDirection));
        } else {
            listingsQuery = query(listingsQuery, orderBy(sortField, sortDirection));
        }
        
        // Apply limit if specified
        if (limitCount) {
            listingsQuery = query(listingsQuery, limit(limitCount));
        }
        
        // Execute query
        const querySnapshot = await getDocs(listingsQuery);
        
        // Process results
        const listings = [];
        querySnapshot.forEach((doc) => {
            listings.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Handle search term filtering (client-side)
        let filteredListings = listings;
        if (searchTerm) {
            const lowerSearchTerm = searchTerm.toLowerCase();
            filteredListings = listings.filter(listing => 
                listing.title.toLowerCase().includes(lowerSearchTerm) || 
                listing.description.toLowerCase().includes(lowerSearchTerm)
            );
        }
        
        return { 
            success: true, 
            listings: filteredListings 
        };
    } catch (error) {
        console.error('Error getting listings:', error);
        return { 
            success: false, 
            error: `Failed to get listings: ${error.message}` 
        };
    }
}

// Upload a listing image to Firebase Storage
async function uploadListingImage(imageFile) {
    try {
        const user = auth.currentUser;
        const timestamp = Date.now();
        const fileName = `${user.uid}_${timestamp}_${imageFile.name}`;
        const storageRef = ref(storage, `listing-images/${fileName}`);
        
        // Upload the file
        const snapshot = await uploadBytes(storageRef, imageFile);
        console.log('Image uploaded successfully');
        
        // Get the download URL
        const downloadURL = await getDownloadURL(snapshot.ref);
        return downloadURL;
    } catch (error) {
        console.error('Error uploading image:', error);
        throw error;
    }
}

// Update listing status
export async function updateListingStatus(listingId, status) {
    try {
        const user = auth.currentUser;
        if (!user) {
            return { 
                success: false, 
                error: 'You must be logged in to update a listing status.' 
            };
        }
        
        // Get the listing to verify ownership
        const listingDoc = await getDoc(doc(db, 'listings', listingId));
        
        if (!listingDoc.exists()) {
            return { 
                success: false, 
                error: 'Listing not found.' 
            };
        }
        
        const listingOwner = listingDoc.data().userId;
        
        // Verify the current user is the listing owner
        if (listingOwner !== user.uid) {
            return { 
                success: false, 
                error: 'You do not have permission to update this listing.' 
            };
        }
        
        // Update the listing status
        await updateDoc(doc(db, 'listings', listingId), {
            status: status,
            updatedAt: new Date()
        });
        
        console.log('Listing status updated successfully:', listingId);
        
        return { success: true };
    } catch (error) {
        console.error('Error updating listing status:', error);
        return { 
            success: false, 
            error: `Failed to update listing status: ${error.message}` 
        };
    }
}