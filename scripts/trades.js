// Import Firebase services
import { db, auth } from './firebase-config.js';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDoc, getDocs, query, where, orderBy } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// Create a new trade proposal
export async function proposeTradeOffer(receiverUserId, offeredListingId, requestedListingId, message) {
    try {
        const user = auth.currentUser;
        if (!user) {
            return {
                success: false,
                error: 'You must be logged in to propose a trade.'
            };
        }

        // Verify the listings exist and are available
        const offeredListing = await getDoc(doc(db, 'listings', offeredListingId));
        const requestedListing = await getDoc(doc(db, 'listings', requestedListingId));

        if (!offeredListing.exists()) {
            return {
                success: false,
                error: 'The listing you are offering does not exist.'
            };
        }

        if (!requestedListing.exists()) {
            return {
                success: false,
                error: 'The listing you are requesting does not exist.'
            };
        }

        // Verify the offered listing belongs to the current user
        const offeredListingData = offeredListing.data();
        if (offeredListingData.userId !== user.uid) {
            return {
                success: false,
                error: 'You can only offer listings that belong to you.'
            };
        }

        // Verify the requested listing belongs to the receiver
        const requestedListingData = requestedListing.data();
        if (requestedListingData.userId !== receiverUserId) {
            return {
                success: false,
                error: 'The requested listing does not belong to the receiver.'
            };
        }

        // Verify both listings are active
        if (offeredListingData.status !== 'active') {
            return {
                success: false,
                error: 'The listing you are offering is not active.'
            };
        }

        if (requestedListingData.status !== 'active') {
            return {
                success: false,
                error: 'The requested listing is not active.'
            };
        }

        // Create the trade proposal
        const tradeData = {
            proposerId: user.uid,
            proposerName: user.displayName || 'TradeSkills User',
            proposerEmail: user.email,
            receiverId: receiverUserId,
            receiverName: requestedListingData.userName,
            receiverEmail: requestedListingData.userEmail,
            offeredListingId: offeredListingId,
            offeredListingTitle: offeredListingData.title,
            offeredListingImage: offeredListingData.imageUrl || null,
            requestedListingId: requestedListingId,
            requestedListingTitle: requestedListingData.title,
            requestedListingImage: requestedListingData.imageUrl || null,
            message: message,
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date(),
            completedAt: null
        };

        // Add the trade proposal to Firestore
        const docRef = await addDoc(collection(db, 'trades'), tradeData);
        console.log('Trade proposal created with ID:', docRef.id);

        return {
            success: true,
            tradeId: docRef.id
        };
    } catch (error) {
        console.error('Error proposing trade:', error);
        return {
            success: false,
            error: `Failed to propose trade: ${error.message}`
        };
    }
}

// Get trade proposals based on user role
export async function getTradeProposals(options = {}) {
    try {
        const user = auth.currentUser;
        if (!user) {
            return {
                success: true,
                trades: [],
                error: 'You must be logged in to view trade proposals.'
            };
        }

        const { role = 'both', status } = options;

        // Handle different query scenarios to avoid index requirements
        if (role === 'both') {
            // For 'both', we'll make two separate queries without sorting
            // and then sort the combined results client-side
            try {
                const proposerQuery = query(
                    collection(db, 'trades'),
                    where('proposerId', '==', user.uid)
                );

                const receiverQuery = query(
                    collection(db, 'trades'),
                    where('receiverId', '==', user.uid)
                );

                const [proposerSnapshot, receiverSnapshot] = await Promise.all([
                    getDocs(proposerQuery),
                    getDocs(receiverQuery)
                ]);

                const trades = [];

                proposerSnapshot.forEach((doc) => {
                    trades.push({
                        id: doc.id,
                        ...doc.data(),
                        role: 'proposer'
                    });
                });

                receiverSnapshot.forEach((doc) => {
                    trades.push({
                        id: doc.id,
                        ...doc.data(),
                        role: 'receiver'
                    });
                });

                // Sort by created date (descending)
                trades.sort((a, b) => {
                    const dateA = a.createdAt?.seconds || 0;
                    const dateB = b.createdAt?.seconds || 0;
                    return dateB - dateA;
                });

                // Filter by status if specified
                const filteredTrades = status ? trades.filter(trade => trade.status === status) : trades;

                return {
                    success: true,
                    trades: filteredTrades
                };
            } catch (error) {
                console.error('Error getting combined trade proposals:', error);
                return {
                    success: true,
                    trades: [],
                    error: `Failed to get combined trade proposals: ${error.message}`
                };
            }
        }

        // For single role queries (proposer or receiver)
        let tradesQuery;
        if (role === 'proposer') {
            tradesQuery = query(
                collection(db, 'trades'),
                where('proposerId', '==', user.uid)
            );
        } else { // role === 'receiver'
            tradesQuery = query(
                collection(db, 'trades'),
                where('receiverId', '==', user.uid)
            );
        }

        // Execute query
        const snapshot = await getDocs(tradesQuery);

        // Process results
        const trades = [];
        snapshot.forEach((doc) => {
            trades.push({
                id: doc.id,
                ...doc.data(),
                role: role
            });
        });

        // Sort by created date (descending) - client-side
        trades.sort((a, b) => {
            const dateA = a.createdAt?.seconds || 0;
            const dateB = b.createdAt?.seconds || 0;
            return dateB - dateA;
        });

        // Filter by status if specified
        const filteredTrades = status ? trades.filter(trade => trade.status === status) : trades;

        return {
            success: true,
            trades: filteredTrades
        };
    } catch (error) {
        console.error('Error getting trade proposals:', error);
        // Return empty trades array instead of error to avoid breaking the UI
        return {
            success: true,
            trades: [],
            error: `Failed to get trade proposals: ${error.message}`
        };
    }
}

// Get a single trade by ID
export async function getTrade(tradeId) {
    try {
        const user = auth.currentUser;
        if (!user) {
            return {
                success: false,
                error: 'You must be logged in to view trade details.'
            };
        }

        const tradeDoc = await getDoc(doc(db, 'trades', tradeId));

        if (!tradeDoc.exists()) {
            return {
                success: false,
                error: 'Trade not found.'
            };
        }

        const tradeData = tradeDoc.data();

        // Check if the current user is involved in the trade
        if (tradeData.proposerId !== user.uid && tradeData.receiverId !== user.uid) {
            return {
                success: false,
                error: 'You do not have permission to view this trade.'
            };
        }

        // Determine the user's role in the trade
        const role = tradeData.proposerId === user.uid ? 'proposer' : 'receiver';

        return {
            success: true,
            trade: {
                id: tradeDoc.id,
                ...tradeData,
                role: role
            }
        };
    } catch (error) {
        console.error('Error getting trade:', error);
        return {
            success: false,
            error: `Failed to get trade: ${error.message}`
        };
    }
}

// Update a trade status
export async function updateTradeStatus(tradeId, status, message = '') {
    try {
        const user = auth.currentUser;
        if (!user) {
            return {
                success: false,
                error: 'You must be logged in to update a trade.'
            };
        }

        // Get the trade to verify permissions
        const tradeDoc = await getDoc(doc(db, 'trades', tradeId));

        if (!tradeDoc.exists()) {
            return {
                success: false,
                error: 'Trade not found.'
            };
        }

        const tradeData = tradeDoc.data();

        // Check if the current user is involved in the trade
        if (tradeData.proposerId !== user.uid && tradeData.receiverId !== user.uid) {
            return {
                success: false,
                error: 'You do not have permission to update this trade.'
            };
        }

        // Validate the requested status change based on the user's role and the current status
        const isProposer = tradeData.proposerId === user.uid;
        const isReceiver = tradeData.receiverId === user.uid;
        const currentStatus = tradeData.status;

        let statusChangeAllowed = false;

        if (currentStatus === 'pending') {
            if (isProposer && (status === 'cancelled')) {
                statusChangeAllowed = true;
            } else if (isReceiver && (status === 'accepted' || status === 'declined')) {
                statusChangeAllowed = true;
            }
        } else if (currentStatus === 'accepted') {
            if ((isProposer || isReceiver) && status === 'completed') {
                statusChangeAllowed = true;
            }
        }

        if (!statusChangeAllowed) {
            return {
                success: false,
                error: `You cannot change the trade status from '${currentStatus}' to '${status}' as the ${isProposer ? 'proposer' : 'receiver'}.`
            };
        }

        // Update the trade status
        const updateData = {
            status: status,
            updatedAt: new Date()
        };

        // Add completed timestamp if status is completed
        if (status === 'completed') {
            updateData.completedAt = new Date();
        }

        // Add status change message if provided
        if (message) {
            const messageField = isProposer ? 'proposerMessage' : 'receiverMessage';
            updateData[messageField] = message;
        }

        // Update the trade in Firestore
        await updateDoc(doc(db, 'trades', tradeId), updateData);
        console.log('Trade status updated successfully:', tradeId);

        // If trade is completed, update the listing statuses
        if (status === 'completed') {
            try {
                await updateDoc(doc(db, 'listings', tradeData.offeredListingId), {
                    status: 'traded',
                    updatedAt: new Date()
                });

                await updateDoc(doc(db, 'listings', tradeData.requestedListingId), {
                    status: 'traded',
                    updatedAt: new Date()
                });

                console.log('Listing statuses updated to traded');
            } catch (error) {
                console.error('Error updating listing statuses:', error);
                // Continue anyway, the trade is still completed
            }
        }

        return { success: true };
    } catch (error) {
        console.error('Error updating trade status:', error);
        return {
            success: false,
            error: `Failed to update trade status: ${error.message}`
        };
    }
}

// Add message to a trade
export async function addTradeMessage(tradeId, message) {
    try {
        const user = auth.currentUser;
        if (!user) {
            return {
                success: false,
                error: 'You must be logged in to send a message.'
            };
        }

        // Get the trade to verify permissions
        const tradeDoc = await getDoc(doc(db, 'trades', tradeId));

        if (!tradeDoc.exists()) {
            return {
                success: false,
                error: 'Trade not found.'
            };
        }

        const tradeData = tradeDoc.data();

        // Check if the current user is involved in the trade
        if (tradeData.proposerId !== user.uid && tradeData.receiverId !== user.uid) {
            return {
                success: false,
                error: 'You do not have permission to send a message in this trade.'
            };
        }

        // Determine the sender role
        const isProposer = tradeData.proposerId === user.uid;

        // Create the message object
        const messageObj = {
            senderId: user.uid,
            senderName: user.displayName || 'TradeSkills User',
            senderRole: isProposer ? 'proposer' : 'receiver',
            text: message,
            timestamp: new Date()
        };

        // Get existing messages or initialize an empty array
        let messages = tradeData.messages || [];
        messages.push(messageObj);

        // Update the trade with the new message
        await updateDoc(doc(db, 'trades', tradeId), {
            messages: messages,
            updatedAt: new Date()
        });

        console.log('Message added to trade:', tradeId);

        return {
            success: true,
            message: messageObj
        };
    } catch (error) {
        console.error('Error adding message to trade:', error);
        return {
            success: false,
            error: `Failed to add message: ${error.message}`
        };
    }
}