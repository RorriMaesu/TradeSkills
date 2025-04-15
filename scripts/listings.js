// Import Firebase services
import { db, storage, auth } from './firebase-config.js';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDoc, getDocs, query, where, orderBy, limit } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js';

// Create a new listing
export async function createListing(listingData, imageFile) {
    try {
        console.log('Creating new listing...');
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

        // If there's an image file, try to upload it to Firebase Storage
        if (imageFile) {
            try {
                console.log('Image file provided, attempting to upload...');
                const uploadResult = await uploadListingImage(imageFile);

                if (uploadResult.success) {
                    enhancedListingData.imageUrl = uploadResult.imageUrl;
                    console.log('Image uploaded successfully, URL set:', uploadResult.imageUrl);
                } else {
                    // Upload failed but we have a fallback image
                    enhancedListingData.imageUrl = uploadResult.imageUrl;

                    // Add a note about the image upload failure to the listing
                    if (uploadResult.isGitHubPagesError || uploadResult.isCorsError) {
                        enhancedListingData.imageUploadNote = 'Image could not be uploaded due to CORS restrictions on GitHub Pages';
                    } else {
                        enhancedListingData.imageUploadNote = uploadResult.error || 'Image upload failed';
                    }

                    console.warn('Using placeholder image due to upload failure:', uploadResult.error);
                }
            } catch (imageError) {
                console.warn('Unexpected error during image upload, using placeholder:', imageError);
                // Continue with the listing creation even if image upload fails
                enhancedListingData.imageUrl = './assets/images/placeholder.png';
                enhancedListingData.imageUploadNote = 'Image upload failed due to an unexpected error';
            }
        } else {
            console.log('No image file provided, using placeholder');
            enhancedListingData.imageUrl = './assets/images/placeholder.png';
        }

        // Add the listing to Firestore
        console.log('Adding listing to Firestore...');
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
            try {
                console.log('Image file provided for update, attempting to handle...');
                // If the listing already has an image and it's not a placeholder, try to delete it
                const existingImageUrl = listingDoc.data().imageUrl;
                if (existingImageUrl && !existingImageUrl.includes('placeholder.png')) {
                    try {
                        // Extract the path from the URL
                        const imagePath = existingImageUrl.split('listing-images%2F')[1].split('?')[0];
                        const imageRef = ref(storage, `listing-images/${imagePath}`);
                        await deleteObject(imageRef);
                        console.log('Existing image deleted successfully');
                    } catch (deleteError) {
                        console.warn('Error deleting existing image:', deleteError);
                        // Continue anyway
                    }
                }

                // Upload the new image
                console.log('Uploading new image...');
                const uploadResult = await uploadListingImage(imageFile);

                if (uploadResult.success) {
                    updateData.imageUrl = uploadResult.imageUrl;
                    // Remove any previous image upload note if it exists
                    if (listingDoc.data().imageUploadNote) {
                        updateData.imageUploadNote = null; // This will remove the field in Firestore
                    }
                    console.log('New image uploaded successfully, URL set:', uploadResult.imageUrl);
                } else {
                    // Upload failed but we have a fallback image
                    updateData.imageUrl = uploadResult.imageUrl;

                    // Add a note about the image upload failure to the listing
                    if (uploadResult.isGitHubPagesError || uploadResult.isCorsError) {
                        updateData.imageUploadNote = 'Image could not be uploaded due to CORS restrictions on GitHub Pages';
                    } else {
                        updateData.imageUploadNote = uploadResult.error || 'Image upload failed';
                    }

                    console.warn('Using placeholder image due to upload failure:', uploadResult.error);
                }
            } catch (imageError) {
                console.warn('Unexpected error during image update, using placeholder:', imageError);
                // Continue with the listing update even if image handling fails
                updateData.imageUrl = './assets/images/placeholder.png';
                updateData.imageUploadNote = 'Image upload failed due to an unexpected error';
            }
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

        // IMPORTANT: Avoid using orderBy with where clauses to prevent index requirements
        // We'll do all sorting client-side instead
        if (userId) {
            // Simple query with just the userId filter
            listingsQuery = query(listingsQuery, where('userId', '==', userId));
        } else if (category) {
            // Simple query with just the category filter
            listingsQuery = query(listingsQuery, where('category', '==', category));
        } else if (status) {
            // Simple query with just the status filter
            listingsQuery = query(listingsQuery, where('status', '==', status));
        } else {
            // No filters, use a simple collection reference
            // We'll sort client-side
            listingsQuery = collection(db, 'listings');
        }

        // Apply limit if specified
        if (limitCount) {
            listingsQuery = query(listingsQuery, limit(limitCount));
        }

        // Execute query
        const querySnapshot = await getDocs(listingsQuery);

        // Process results
        let listings = [];
        querySnapshot.forEach((doc) => {
            listings.push({
                id: doc.id,
                ...doc.data()
            });
        });

        // Apply client-side sorting if needed
        if (sortBy || userId) {
            // Determine sort field and direction
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

            // Sort the listings client-side
            listings.sort((a, b) => {
                const valueA = sortField === 'createdAt' ?
                    (a[sortField]?.seconds || 0) :
                    (a[sortField] || '');

                const valueB = sortField === 'createdAt' ?
                    (b[sortField]?.seconds || 0) :
                    (b[sortField] || '');

                if (sortDirection === 'asc') {
                    return valueA > valueB ? 1 : -1;
                } else {
                    return valueA < valueB ? 1 : -1;
                }
            });
        }

        // Handle search term filtering (client-side)
        if (searchTerm) {
            const lowerSearchTerm = searchTerm.toLowerCase();
            listings = listings.filter(listing =>
                listing.title.toLowerCase().includes(lowerSearchTerm) ||
                listing.description.toLowerCase().includes(lowerSearchTerm)
            );
        }

        return {
            success: true,
            listings: listings
        };
    } catch (error) {
        console.error('Error getting listings:', error);
        // Return empty listings array instead of error to avoid breaking the UI
        return {
            success: true,
            listings: [],
            error: `Failed to get listings: ${error.message}`
        };
    }
}

// Check if we're running on GitHub Pages
function isGitHubPages() {
    return window.location.hostname.includes('github.io');
}

// Upload a listing image to Firebase Storage
async function uploadListingImage(imageFile) {
    // Early warning for GitHub Pages environment
    if (isGitHubPages()) {
        console.warn('Running on GitHub Pages - image uploads may fail due to CORS restrictions');
    }

    try {
        const user = auth.currentUser;
        const timestamp = Date.now();
        const fileName = `${user.uid}_${timestamp}_${imageFile.name}`;
        const storageRef = ref(storage, `listing-images/${fileName}`);

        console.log('Attempting to upload image to Firebase Storage...');

        // If we're on GitHub Pages, don't even try to upload (known to fail)
        if (isGitHubPages()) {
            console.warn('Skipping actual upload attempt on GitHub Pages to avoid CORS errors');
            return {
                success: false,
                imageUrl: './assets/images/placeholder.png',
                error: 'Image uploads are not supported on GitHub Pages due to CORS restrictions',
                isGitHubPagesError: true
            };
        }

        try {
            // Upload the file
            const snapshot = await uploadBytes(storageRef, imageFile);
            console.log('Image uploaded successfully');

            // Get the download URL
            const downloadURL = await getDownloadURL(snapshot.ref);
            return {
                success: true,
                imageUrl: downloadURL
            };
        } catch (uploadError) {
            // Check if it's a CORS error
            const isCorsError = uploadError.message && (
                uploadError.message.includes('CORS') ||
                uploadError.message.includes('access control check') ||
                uploadError.message.includes('network error') ||
                uploadError.message.includes('Failed to fetch') ||
                uploadError.code === 'storage/unauthorized'
            );

            if (isCorsError) {
                console.warn('CORS error detected when uploading to Firebase Storage:', uploadError);
                return {
                    success: false,
                    imageUrl: './assets/images/placeholder.png',
                    error: 'Image upload failed due to CORS restrictions',
                    isCorsError: true
                };
            } else {
                console.error('Non-CORS upload error:', uploadError);
                return {
                    success: false,
                    imageUrl: './assets/images/placeholder.png',
                    error: `Upload failed: ${uploadError.message || 'Unknown error'}`
                };
            }
        }
    } catch (error) {
        console.error('Error in uploadListingImage:', error);
        // Return a placeholder image instead of failing completely
        return {
            success: false,
            imageUrl: './assets/images/placeholder.png',
            error: `Error preparing upload: ${error.message || 'Unknown error'}`
        };
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