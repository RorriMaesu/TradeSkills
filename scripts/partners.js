// Import Firebase services
import { db, auth } from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    doc, 
    getDoc, 
    getDocs, 
    query, 
    where, 
    orderBy,
    Timestamp,
    limit,
    startAfter,
    serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// Send a partner request
export async function sendPartnerRequest(recipientId) {
    try {
        const user = auth.currentUser;
        if (!user) {
            return {
                success: false,
                error: 'You must be logged in to send a partner request.'
            };
        }

        // Check if recipient exists
        const recipientDoc = await getDoc(doc(db, 'users', recipientId));
        if (!recipientDoc.exists()) {
            return {
                success: false,
                error: 'User not found.'
            };
        }

        // Check if there's already a relationship
        const existingRelationship = await checkPartnerRelationship(user.uid, recipientId);
        
        if (existingRelationship.exists) {
            return {
                success: false,
                error: `A partner relationship already exists: ${existingRelationship.status}`
            };
        }

        // Get user details
        const senderDetails = await getDoc(doc(db, 'users', user.uid));
        const senderData = senderDetails.data();
        const recipientData = recipientDoc.data();

        // Create partnership request document
        const partnershipData = {
            senderId: user.uid,
            senderName: senderData.displayName || 'TradeSkills User',
            senderPhoto: senderData.photoURL || null,
            recipientId: recipientId,
            recipientName: recipientData.displayName || 'TradeSkills User',
            recipientPhoto: recipientData.photoURL || null,
            status: 'pending',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        // Add to partnerships collection
        const docRef = await addDoc(collection(db, 'partnerships'), partnershipData);
        
        return {
            success: true,
            partnershipId: docRef.id
        };
    } catch (error) {
        console.error('Error sending partner request:', error);
        return {
            success: false,
            error: `Failed to send partner request: ${error.message}`
        };
    }
}

// Accept a partner request
export async function acceptPartnerRequest(partnershipId) {
    try {
        const user = auth.currentUser;
        if (!user) {
            return {
                success: false,
                error: 'You must be logged in to accept a partner request.'
            };
        }

        // Get the partnership document
        const partnershipRef = doc(db, 'partnerships', partnershipId);
        const partnershipDoc = await getDoc(partnershipRef);
        
        if (!partnershipDoc.exists()) {
            return {
                success: false,
                error: 'Partnership request not found.'
            };
        }

        const partnershipData = partnershipDoc.data();

        // Verify the user is the recipient of the request
        if (partnershipData.recipientId !== user.uid) {
            return {
                success: false,
                error: 'You can only accept partner requests sent to you.'
            };
        }

        // Verify the request is pending
        if (partnershipData.status !== 'pending') {
            return {
                success: false,
                error: `This request cannot be accepted because its status is ${partnershipData.status}.`
            };
        }

        // Update the partnership status
        await updateDoc(partnershipRef, {
            status: 'accepted',
            updatedAt: serverTimestamp(),
            acceptedAt: serverTimestamp()
        });

        return {
            success: true,
            message: 'Partner request accepted successfully.'
        };
    } catch (error) {
        console.error('Error accepting partner request:', error);
        return {
            success: false,
            error: `Failed to accept partner request: ${error.message}`
        };
    }
}

// Decline a partner request
export async function declinePartnerRequest(partnershipId) {
    try {
        const user = auth.currentUser;
        if (!user) {
            return {
                success: false,
                error: 'You must be logged in to decline a partner request.'
            };
        }

        // Get the partnership document
        const partnershipRef = doc(db, 'partnerships', partnershipId);
        const partnershipDoc = await getDoc(partnershipRef);
        
        if (!partnershipDoc.exists()) {
            return {
                success: false,
                error: 'Partnership request not found.'
            };
        }

        const partnershipData = partnershipDoc.data();

        // Verify the user is the recipient of the request
        if (partnershipData.recipientId !== user.uid) {
            return {
                success: false,
                error: 'You can only decline partner requests sent to you.'
            };
        }

        // Verify the request is pending
        if (partnershipData.status !== 'pending') {
            return {
                success: false,
                error: `This request cannot be declined because its status is ${partnershipData.status}.`
            };
        }

        // Update the partnership status
        await updateDoc(partnershipRef, {
            status: 'declined',
            updatedAt: serverTimestamp()
        });

        return {
            success: true,
            message: 'Partner request declined successfully.'
        };
    } catch (error) {
        console.error('Error declining partner request:', error);
        return {
            success: false,
            error: `Failed to decline partner request: ${error.message}`
        };
    }
}

// Cancel a partner request that you sent
export async function cancelPartnerRequest(partnershipId) {
    try {
        const user = auth.currentUser;
        if (!user) {
            return {
                success: false,
                error: 'You must be logged in to cancel a partner request.'
            };
        }

        // Get the partnership document
        const partnershipRef = doc(db, 'partnerships', partnershipId);
        const partnershipDoc = await getDoc(partnershipRef);
        
        if (!partnershipDoc.exists()) {
            return {
                success: false,
                error: 'Partnership request not found.'
            };
        }

        const partnershipData = partnershipDoc.data();

        // Verify the user is the sender of the request
        if (partnershipData.senderId !== user.uid) {
            return {
                success: false,
                error: 'You can only cancel partner requests that you sent.'
            };
        }

        // Verify the request is pending
        if (partnershipData.status !== 'pending') {
            return {
                success: false,
                error: `This request cannot be cancelled because its status is ${partnershipData.status}.`
            };
        }

        // Delete the partnership document
        await deleteDoc(partnershipRef);

        return {
            success: true,
            message: 'Partner request cancelled successfully.'
        };
    } catch (error) {
        console.error('Error cancelling partner request:', error);
        return {
            success: false,
            error: `Failed to cancel partner request: ${error.message}`
        };
    }
}

// Remove a partner (delete an accepted partnership)
export async function removePartner(partnershipId) {
    try {
        const user = auth.currentUser;
        if (!user) {
            return {
                success: false,
                error: 'You must be logged in to remove a partner.'
            };
        }

        // Get the partnership document
        const partnershipRef = doc(db, 'partnerships', partnershipId);
        const partnershipDoc = await getDoc(partnershipRef);
        
        if (!partnershipDoc.exists()) {
            return {
                success: false,
                error: 'Partnership not found.'
            };
        }

        const partnershipData = partnershipDoc.data();

        // Verify the user is part of the partnership
        if (partnershipData.senderId !== user.uid && partnershipData.recipientId !== user.uid) {
            return {
                success: false,
                error: 'You are not part of this partnership.'
            };
        }

        // Verify the partnership is accepted
        if (partnershipData.status !== 'accepted') {
            return {
                success: false,
                error: `This partnership cannot be removed because its status is ${partnershipData.status}.`
            };
        }

        // Delete the partnership document
        await deleteDoc(partnershipRef);

        return {
            success: true,
            message: 'Partner removed successfully.'
        };
    } catch (error) {
        console.error('Error removing partner:', error);
        return {
            success: false,
            error: `Failed to remove partner: ${error.message}`
        };
    }
}

// Get a user's partners
export async function getPartners(options = {}) {
    try {
        const user = auth.currentUser;
        if (!user) {
            return {
                success: false,
                error: 'You must be logged in to view partners.'
            };
        }

        const { pageSize = 20, lastDoc = null } = options;
        
        // Query for partnerships where user is either sender or recipient and status is accepted
        let senderQuery = query(
            collection(db, 'partnerships'),
            where('senderId', '==', user.uid),
            where('status', '==', 'accepted'),
            orderBy('updatedAt', 'desc')
        );
        
        let recipientQuery = query(
            collection(db, 'partnerships'),
            where('recipientId', '==', user.uid),
            where('status', '==', 'accepted'),
            orderBy('updatedAt', 'desc')
        );
        
        // Apply pagination if lastDoc is provided
        if (lastDoc) {
            senderQuery = query(senderQuery, startAfter(lastDoc), limit(pageSize));
            recipientQuery = query(recipientQuery, startAfter(lastDoc), limit(pageSize));
        } else {
            senderQuery = query(senderQuery, limit(pageSize));
            recipientQuery = query(recipientQuery, limit(pageSize));
        }
        
        // Execute queries
        const [senderSnapshot, recipientSnapshot] = await Promise.all([
            getDocs(senderQuery),
            getDocs(recipientQuery)
        ]);
        
        // Process results
        const partners = [];
        
        senderSnapshot.forEach(doc => {
            const data = doc.data();
            partners.push({
                id: doc.id,
                ...data,
                userRole: 'sender',
                partnerName: data.recipientName,
                partnerPhoto: data.recipientPhoto,
                partnerId: data.recipientId
            });
        });
        
        recipientSnapshot.forEach(doc => {
            const data = doc.data();
            partners.push({
                id: doc.id,
                ...data,
                userRole: 'recipient',
                partnerName: data.senderName,
                partnerPhoto: data.senderPhoto,
                partnerId: data.senderId
            });
        });
        
        // Sort by updatedAt (descending)
        partners.sort((a, b) => {
            const dateA = a.updatedAt?.seconds || 0;
            const dateB = b.updatedAt?.seconds || 0;
            return dateB - dateA;
        });
        
        // Limit to pageSize
        const limitedPartners = partners.slice(0, pageSize);
        
        // Get the last document for pagination
        const lastVisible = limitedPartners.length > 0 ? 
            limitedPartners[limitedPartners.length - 1] : null;
        
        return {
            success: true,
            partners: limitedPartners,
            lastVisible,
            hasMore: partners.length > pageSize
        };
    } catch (error) {
        console.error('Error getting partners:', error);
        return {
            success: false,
            error: `Failed to get partners: ${error.message}`
        };
    }
}

// Get pending partner requests sent to the user
export async function getPartnerRequests() {
    try {
        const user = auth.currentUser;
        if (!user) {
            return {
                success: false,
                error: 'You must be logged in to view partner requests.'
            };
        }
        
        // Query for pending requests where user is the recipient
        const requestsQuery = query(
            collection(db, 'partnerships'),
            where('recipientId', '==', user.uid),
            where('status', '==', 'pending'),
            orderBy('createdAt', 'desc')
        );
        
        // Execute query
        const snapshot = await getDocs(requestsQuery);
        
        // Process results
        const requests = [];
        snapshot.forEach(doc => {
            requests.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return {
            success: true,
            requests
        };
    } catch (error) {
        console.error('Error getting partner requests:', error);
        return {
            success: false,
            error: `Failed to get partner requests: ${error.message}`
        };
    }
}

// Get pending partner requests sent by the user
export async function getSentPartnerRequests() {
    try {
        const user = auth.currentUser;
        if (!user) {
            return {
                success: false,
                error: 'You must be logged in to view sent partner requests.'
            };
        }
        
        // Query for pending requests where user is the sender
        const requestsQuery = query(
            collection(db, 'partnerships'),
            where('senderId', '==', user.uid),
            where('status', '==', 'pending'),
            orderBy('createdAt', 'desc')
        );
        
        // Execute query
        const snapshot = await getDocs(requestsQuery);
        
        // Process results
        const requests = [];
        snapshot.forEach(doc => {
            requests.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return {
            success: true,
            requests
        };
    } catch (error) {
        console.error('Error getting sent partner requests:', error);
        return {
            success: false,
            error: `Failed to get sent partner requests: ${error.message}`
        };
    }
}

// Search for users to add as partners
export async function searchUsers(searchTerm, limitCount = 10) {
    try {
        const user = auth.currentUser;
        if (!user) {
            return {
                success: false,
                error: 'You must be logged in to search for users.'
            };
        }
        
        if (!searchTerm || searchTerm.trim().length < 2) {
            return {
                success: true,
                users: []
            };
        }
        
        searchTerm = searchTerm.trim().toLowerCase();
        
        // Query for users where displayName or email contains the search term
        // Note: This is a simple implementation. In a production app, you might want to use
        // a more sophisticated search mechanism or a third-party search service.
        const usersQuery = query(
            collection(db, 'users'),
            orderBy('displayName'),
            limit(limitCount * 3) // Get more than we need to filter
        );
        
        // Execute query
        const snapshot = await getDocs(usersQuery);
        
        // Process results and filter client-side (Firestore doesn't support LIKE queries)
        const users = [];
        snapshot.forEach(doc => {
            if (doc.id !== user.uid) { // Exclude current user
                const userData = doc.data();
                const displayName = (userData.displayName || '').toLowerCase();
                const email = (userData.email || '').toLowerCase();
                
                if (displayName.includes(searchTerm) || email.includes(searchTerm)) {
                    users.push({
                        id: doc.id,
                        displayName: userData.displayName || 'TradeSkills User',
                        email: userData.email || 'No Email',
                        photoURL: userData.photoURL || null
                    });
                }
            }
        });
        
        // Limit results
        const limitedUsers = users.slice(0, limitCount);
        
        return {
            success: true,
            users: limitedUsers
        };
    } catch (error) {
        console.error('Error searching users:', error);
        return {
            success: false,
            error: `Failed to search users: ${error.message}`
        };
    }
}

// Check if a partner relationship exists between two users
export async function checkPartnerRelationship(userId1, userId2) {
    try {
        // Query for partnerships where users are sender and recipient or vice versa
        const query1 = query(
            collection(db, 'partnerships'),
            where('senderId', '==', userId1),
            where('recipientId', '==', userId2)
        );
        
        const query2 = query(
            collection(db, 'partnerships'),
            where('senderId', '==', userId2),
            where('recipientId', '==', userId1)
        );
        
        // Execute queries
        const [snapshot1, snapshot2] = await Promise.all([
            getDocs(query1),
            getDocs(query2)
        ]);
        
        // Check results
        if (!snapshot1.empty) {
            const doc = snapshot1.docs[0];
            return {
                exists: true,
                id: doc.id,
                status: doc.data().status,
                userRole: 'sender'
            };
        }
        
        if (!snapshot2.empty) {
            const doc = snapshot2.docs[0];
            return {
                exists: true,
                id: doc.id,
                status: doc.data().status,
                userRole: 'recipient'
            };
        }
        
        return {
            exists: false
        };
    } catch (error) {
        console.error('Error checking partner relationship:', error);
        return {
            exists: false,
            error: error.message
        };
    }
}

// Get partner status with another user
export async function getPartnerStatus(userId) {
    try {
        const user = auth.currentUser;
        if (!user) {
            return {
                success: false,
                error: 'You must be logged in to check partner status.'
            };
        }
        
        const relationship = await checkPartnerRelationship(user.uid, userId);
        
        return {
            success: true,
            ...relationship
        };
    } catch (error) {
        console.error('Error getting partner status:', error);
        return {
            success: false,
            error: `Failed to get partner status: ${error.message}`
        };
    }
}

// Get count of pending partner requests
export async function getPendingRequestCount() {
    try {
        const user = auth.currentUser;
        if (!user) {
            return {
                success: false,
                error: 'You must be logged in to view request count.'
            };
        }
        
        // Query for pending requests where user is the recipient
        const requestsQuery = query(
            collection(db, 'partnerships'),
            where('recipientId', '==', user.uid),
            where('status', '==', 'pending')
        );
        
        // Execute query
        const snapshot = await getDocs(requestsQuery);
        
        return {
            success: true,
            count: snapshot.size
        };
    } catch (error) {
        console.error('Error getting pending request count:', error);
        return {
            success: false,
            error: `Failed to get pending request count: ${error.message}`,
            count: 0
        };
    }
}
