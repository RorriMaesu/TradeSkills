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

        // If there's an image file, try to upload it to Firebase Storage or store locally
        if (imageFile) {
            try {
                console.log('Image file provided, attempting to upload...');
                const uploadResult = await uploadListingImage(imageFile);

                if (uploadResult.success) {
                    // Handle both Firebase URLs and local Base64 images
                    enhancedListingData.imageUrl = uploadResult.imageUrl;

                    // If it's a local image, store the imageId for retrieval
                    if (uploadResult.isLocalImage) {
                        enhancedListingData.imageId = uploadResult.imageId;
                        enhancedListingData.isLocalImage = true;
                        enhancedListingData.imageUploadNote = 'Image stored locally in your browser';
                        console.log('Local image ID stored:', uploadResult.imageId);
                    } else {
                        console.log('Image uploaded successfully to Firebase, URL set:', uploadResult.imageUrl);
                    }
                } else {
                    // Upload failed but we have a fallback image
                    enhancedListingData.imageUrl = uploadResult.imageUrl;

                    // Add a note about the image upload failure to the listing
                    if (uploadResult.isGitHubPagesError || uploadResult.isCorsError) {
                        enhancedListingData.imageUploadNote = 'Image could not be uploaded due to CORS restrictions';
                    } else if (uploadResult.isLocalStorageError) {
                        enhancedListingData.imageUploadNote = 'Image could not be stored locally (too large or storage limit exceeded)';
                    } else {
                        enhancedListingData.imageUploadNote = uploadResult.error || 'Image upload failed';
                    }

                    console.warn('Using placeholder image due to upload/storage failure:', uploadResult.error);
                }
            } catch (imageError) {
                console.warn('Unexpected error during image handling, using placeholder:', imageError);
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
                const existingImageId = listingDoc.data().imageId;
                const isExistingLocalImage = listingDoc.data().isLocalImage;

                // Handle cleanup of previous image
                if (existingImageUrl) {
                    if (isExistingLocalImage && existingImageId) {
                        // Clean up local storage image
                        try {
                            localStorage.removeItem(`tradeskills_image_${existingImageId}`);

                            // Update metadata
                            const imagesMetadata = JSON.parse(localStorage.getItem('tradeskills_images_metadata') || '{}');
                            if (imagesMetadata[existingImageId]) {
                                delete imagesMetadata[existingImageId];
                                localStorage.setItem('tradeskills_images_metadata', JSON.stringify(imagesMetadata));
                            }

                            console.log('Existing local image cleaned up successfully');
                        } catch (localStorageError) {
                            console.warn('Error cleaning up local image:', localStorageError);
                            // Continue anyway
                        }
                    } else if (existingImageUrl.includes('firebasestorage') && !existingImageUrl.includes('placeholder.png')) {
                        // Clean up Firebase Storage image
                        try {
                            // Extract the path from the URL
                            const imagePath = existingImageUrl.split('listing-images%2F')[1].split('?')[0];
                            const imageRef = ref(storage, `listing-images/${imagePath}`);
                            await deleteObject(imageRef);
                            console.log('Existing Firebase image deleted successfully');
                        } catch (deleteError) {
                            console.warn('Error deleting existing Firebase image:', deleteError);
                            // Continue anyway
                        }
                    }
                }

                // Upload/store the new image
                console.log('Processing new image...');
                const uploadResult = await uploadListingImage(imageFile);

                if (uploadResult.success) {
                    // Set the new image URL
                    updateData.imageUrl = uploadResult.imageUrl;

                    // Handle local image metadata if applicable
                    if (uploadResult.isLocalImage) {
                        updateData.imageId = uploadResult.imageId;
                        updateData.isLocalImage = true;
                        updateData.imageUploadNote = 'Image stored locally in your browser';
                        console.log('Local image ID stored for update:', uploadResult.imageId);
                    } else {
                        // If switching from local to Firebase, clean up local image metadata
                        updateData.imageId = null;
                        updateData.isLocalImage = false;
                        // Remove any previous image upload note
                        if (listingDoc.data().imageUploadNote) {
                            updateData.imageUploadNote = null; // This will remove the field in Firestore
                        }
                        console.log('New image uploaded successfully to Firebase, URL set:', uploadResult.imageUrl);
                    }
                } else {
                    // Upload failed but we have a fallback image
                    updateData.imageUrl = uploadResult.imageUrl;
                    // Clean up any existing local image metadata
                    updateData.imageId = null;
                    updateData.isLocalImage = false;

                    // Add a note about the image upload failure to the listing
                    if (uploadResult.isGitHubPagesError || uploadResult.isCorsError) {
                        updateData.imageUploadNote = 'Image could not be uploaded due to CORS restrictions';
                    } else if (uploadResult.isLocalStorageError) {
                        updateData.imageUploadNote = 'Image could not be stored locally (too large or storage limit exceeded)';
                    } else {
                        updateData.imageUploadNote = uploadResult.error || 'Image upload failed';
                    }

                    console.warn('Using placeholder image due to upload/storage failure:', uploadResult.error);
                }
            } catch (imageError) {
                console.warn('Unexpected error during image update, using placeholder:', imageError);
                // Continue with the listing update even if image handling fails
                updateData.imageUrl = './assets/images/placeholder.png';
                updateData.imageId = null;
                updateData.isLocalImage = false;
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

        // Delete the image if it exists
        if (listingData.imageUrl) {
            // Handle local image deletion
            if (listingData.isLocalImage && listingData.imageId) {
                try {
                    // Remove from localStorage
                    localStorage.removeItem(`tradeskills_image_${listingData.imageId}`);

                    // Update metadata
                    const imagesMetadata = JSON.parse(localStorage.getItem('tradeskills_images_metadata') || '{}');
                    if (imagesMetadata[listingData.imageId]) {
                        delete imagesMetadata[listingData.imageId];
                        localStorage.setItem('tradeskills_images_metadata', JSON.stringify(imagesMetadata));
                    }

                    console.log('Local listing image deleted successfully');
                } catch (localError) {
                    console.warn('Error deleting local listing image:', localError);
                    // Continue anyway
                }
            }
            // Handle Firebase Storage image deletion
            else if (listingData.imageUrl.includes('firebasestorage') && !listingData.imageUrl.includes('placeholder.png')) {
                try {
                    // Extract the path from the URL
                    const imagePath = listingData.imageUrl.split('listing-images%2F')[1].split('?')[0];
                    const imageRef = ref(storage, `listing-images/${imagePath}`);
                    await deleteObject(imageRef);
                    console.log('Firebase listing image deleted successfully');
                } catch (error) {
                    console.warn('Error deleting Firebase listing image:', error);
                    // Continue anyway
                }
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

// Process and store image locally for GitHub Pages
async function processImageForGitHubPages(imageFile, userId) {
    return new Promise((resolve, reject) => {
        try {
            console.log('Processing image for GitHub Pages storage...');
            const reader = new FileReader();

            reader.onload = function(event) {
                try {
                    const base64String = event.target.result;
                    const timestamp = Date.now();
                    const imageId = `${userId}_${timestamp}_${imageFile.name.replace(/[^a-zA-Z0-9]/g, '_')}`;

                    // Store in localStorage with a size check
                    if (base64String.length > 5000000) { // ~5MB limit
                        console.warn('Image too large for localStorage, using compressed version');
                        // We'll use a canvas to compress the image
                        const img = new Image();
                        img.onload = function() {
                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d');

                            // Calculate new dimensions (max 800px width/height)
                            const { width: originalWidth, height: originalHeight } = img;
                            let width = originalWidth;
                            let height = originalHeight;
                            const maxSize = 800;

                            if (width > height && width > maxSize) {
                                height = Math.round(height * (maxSize / width));
                                width = maxSize;
                            } else if (height > maxSize) {
                                width = Math.round(width * (maxSize / height));
                                height = maxSize;
                            }

                            canvas.width = width;
                            canvas.height = height;

                            // Draw and compress
                            ctx.drawImage(img, 0, 0, width, height);
                            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7); // 70% quality JPEG

                            // Store the compressed image
                            try {
                                // Store image metadata in a separate object to save space
                                const imagesMetadata = JSON.parse(localStorage.getItem('tradeskills_images_metadata') || '{}');
                                imagesMetadata[imageId] = {
                                    name: imageFile.name,
                                    type: imageFile.type,
                                    size: compressedBase64.length,
                                    timestamp: timestamp,
                                    userId: userId
                                };
                                localStorage.setItem('tradeskills_images_metadata', JSON.stringify(imagesMetadata));

                                // Store the actual image data
                                localStorage.setItem(`tradeskills_image_${imageId}`, compressedBase64);

                                console.log('Compressed image stored in localStorage, size:', compressedBase64.length);
                                resolve({
                                    success: true,
                                    imageId: imageId,
                                    imageUrl: `data:image/jpeg;base64,${compressedBase64.split(',')[1]}`,
                                    isLocalImage: true
                                });
                            } catch (storageError) {
                                console.error('Error storing compressed image in localStorage:', storageError);
                                resolve({
                                    success: false,
                                    imageUrl: './assets/images/placeholder.png',
                                    error: 'Failed to store image: Storage limit exceeded',
                                    isLocalStorageError: true
                                });
                            }
                        };
                        img.src = base64String;
                    } else {
                        // Image is small enough to store directly
                        try {
                            // Store image metadata
                            const imagesMetadata = JSON.parse(localStorage.getItem('tradeskills_images_metadata') || '{}');
                            imagesMetadata[imageId] = {
                                name: imageFile.name,
                                type: imageFile.type,
                                size: base64String.length,
                                timestamp: timestamp,
                                userId: userId
                            };
                            localStorage.setItem('tradeskills_images_metadata', JSON.stringify(imagesMetadata));

                            // Store the actual image data
                            localStorage.setItem(`tradeskills_image_${imageId}`, base64String);

                            console.log('Image stored in localStorage, size:', base64String.length);
                            resolve({
                                success: true,
                                imageId: imageId,
                                imageUrl: base64String,
                                isLocalImage: true
                            });
                        } catch (storageError) {
                            console.error('Error storing image in localStorage:', storageError);
                            resolve({
                                success: false,
                                imageUrl: './assets/images/placeholder.png',
                                error: 'Failed to store image: Storage limit exceeded',
                                isLocalStorageError: true
                            });
                        }
                    }
                } catch (processError) {
                    console.error('Error processing image data:', processError);
                    reject(processError);
                }
            };

            reader.onerror = function(error) {
                console.error('Error reading file:', error);
                reject(error);
            };

            // Read the image file as a data URL (base64)
            reader.readAsDataURL(imageFile);

        } catch (error) {
            console.error('Error in processImageForGitHubPages:', error);
            reject(error);
        }
    });
}

// Get image from localStorage by ID
export function getLocalImage(imageId) {
    try {
        const imageData = localStorage.getItem(`tradeskills_image_${imageId}`);
        if (!imageData) {
            console.warn(`Image with ID ${imageId} not found in localStorage`);
            return null;
        }
        return imageData;
    } catch (error) {
        console.error('Error retrieving image from localStorage:', error);
        return null;
    }
}

// Upload a listing image to Firebase Storage or store locally for GitHub Pages
async function uploadListingImage(imageFile) {
    // Early warning for GitHub Pages environment
    if (isGitHubPages()) {
        console.warn('Running on GitHub Pages - using local storage for images instead of Firebase');
    }

    try {
        const user = auth.currentUser;

        // If we're on GitHub Pages, use the local storage approach
        if (isGitHubPages()) {
            console.log('Using GitHub Pages image storage workaround');
            try {
                return await processImageForGitHubPages(imageFile, user.uid);
            } catch (localStorageError) {
                console.error('Error with GitHub Pages image storage:', localStorageError);
                return {
                    success: false,
                    imageUrl: './assets/images/placeholder.png',
                    error: 'Failed to store image locally: ' + (localStorageError.message || 'Unknown error'),
                    isLocalStorageError: true
                };
            }
        }

        // For non-GitHub Pages environments, use Firebase Storage
        const timestamp = Date.now();
        const fileName = `${user.uid}_${timestamp}_${imageFile.name}`;
        const storageRef = ref(storage, `listing-images/${fileName}`);

        console.log('Attempting to upload image to Firebase Storage...');

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
                // Try the GitHub Pages approach as fallback
                try {
                    console.log('Trying GitHub Pages approach as fallback...');
                    return await processImageForGitHubPages(imageFile, user.uid);
                } catch (fallbackError) {
                    console.error('Fallback to GitHub Pages approach also failed:', fallbackError);
                    return {
                        success: false,
                        imageUrl: './assets/images/placeholder.png',
                        error: 'Image upload failed with both methods',
                        isCorsError: true
                    };
                }
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