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
    onSnapshot,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// Send a direct message to another user
export async function sendDirectMessage(recipientId, messageText, attachmentUrl = null) {
    try {
        const user = auth.currentUser;
        if (!user) {
            return {
                success: false,
                error: 'You must be logged in to send a message.'
            };
        }

        // Create the message object
        const messageData = {
            senderId: user.uid,
            senderName: user.displayName || 'TradeSkills User',
            senderPhotoURL: user.photoURL || null,
            recipientId: recipientId,
            text: messageText,
            attachmentUrl: attachmentUrl,
            read: false,
            createdAt: serverTimestamp(),
            conversationId: generateConversationId(user.uid, recipientId)
        };

        // Add the message to Firestore
        const docRef = await addDoc(collection(db, 'messages'), messageData);
        
        // Update or create the conversation document
        await updateConversation(user.uid, recipientId, messageText);

        console.log('Message sent with ID:', docRef.id);
        return {
            success: true,
            messageId: docRef.id
        };
    } catch (error) {
        console.error('Error sending message:', error);
        return {
            success: false,
            error: `Failed to send message: ${error.message}`
        };
    }
}

// Generate a consistent conversation ID for two users
function generateConversationId(userId1, userId2) {
    // Sort the IDs to ensure the same conversation ID regardless of who initiates
    const sortedIds = [userId1, userId2].sort();
    return `${sortedIds[0]}_${sortedIds[1]}`;
}

// Update or create a conversation document
async function updateConversation(userId1, userId2, lastMessage) {
    try {
        const conversationId = generateConversationId(userId1, userId2);
        
        // Get user data for both participants
        const user1Doc = await getDoc(doc(db, 'users', userId1));
        const user2Doc = await getDoc(doc(db, 'users', userId2));
        
        if (!user1Doc.exists() || !user2Doc.exists()) {
            console.error('One or both users do not exist');
            return false;
        }
        
        const user1Data = user1Doc.data();
        const user2Data = user2Doc.data();
        
        // Create or update the conversation document
        const conversationData = {
            participants: [userId1, userId2],
            participantNames: {
                [userId1]: user1Data.displayName || 'TradeSkills User',
                [userId2]: user2Data.displayName || 'TradeSkills User'
            },
            participantPhotos: {
                [userId1]: user1Data.photoURL || null,
                [userId2]: user2Data.photoURL || null
            },
            lastMessage: lastMessage,
            lastMessageTime: serverTimestamp(),
            lastMessageSenderId: userId1
        };
        
        // Check if conversation already exists
        const conversationsRef = collection(db, 'conversations');
        const q = query(conversationsRef, where('participants', 'array-contains', userId1));
        const querySnapshot = await getDocs(q);
        
        let conversationExists = false;
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.participants.includes(userId2)) {
                // Update existing conversation
                updateDoc(doc.ref, {
                    lastMessage: lastMessage,
                    lastMessageTime: serverTimestamp(),
                    lastMessageSenderId: userId1
                });
                conversationExists = true;
            }
        });
        
        if (!conversationExists) {
            // Create new conversation
            await addDoc(collection(db, 'conversations'), conversationData);
        }
        
        return true;
    } catch (error) {
        console.error('Error updating conversation:', error);
        return false;
    }
}

// Get all conversations for the current user
export async function getConversations() {
    try {
        const user = auth.currentUser;
        if (!user) {
            return {
                success: false,
                error: 'You must be logged in to view conversations.'
            };
        }
        
        const conversationsRef = collection(db, 'conversations');
        const q = query(
            conversationsRef, 
            where('participants', 'array-contains', user.uid),
            orderBy('lastMessageTime', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        const conversations = [];
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            // Find the other participant (not the current user)
            const otherParticipantId = data.participants.find(id => id !== user.uid);
            
            conversations.push({
                id: doc.id,
                otherParticipantId: otherParticipantId,
                otherParticipantName: data.participantNames[otherParticipantId],
                otherParticipantPhoto: data.participantPhotos[otherParticipantId],
                lastMessage: data.lastMessage,
                lastMessageTime: data.lastMessageTime,
                isFromMe: data.lastMessageSenderId === user.uid
            });
        });
        
        return {
            success: true,
            conversations: conversations
        };
    } catch (error) {
        console.error('Error getting conversations:', error);
        return {
            success: false,
            error: `Failed to get conversations: ${error.message}`
        };
    }
}

// Get messages for a specific conversation
export async function getMessages(otherUserId, limitCount = 50) {
    try {
        const user = auth.currentUser;
        if (!user) {
            return {
                success: false,
                error: 'You must be logged in to view messages.'
            };
        }
        
        const conversationId = generateConversationId(user.uid, otherUserId);
        const messagesRef = collection(db, 'messages');
        const q = query(
            messagesRef,
            where('conversationId', '==', conversationId),
            orderBy('createdAt', 'desc'),
            limit(limitCount)
        );
        
        const querySnapshot = await getDocs(q);
        const messages = [];
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            messages.push({
                id: doc.id,
                senderId: data.senderId,
                senderName: data.senderName,
                senderPhotoURL: data.senderPhotoURL,
                text: data.text,
                attachmentUrl: data.attachmentUrl,
                read: data.read,
                createdAt: data.createdAt,
                isFromMe: data.senderId === user.uid
            });
        });
        
        // Mark unread messages as read
        const unreadMessages = messages.filter(msg => !msg.read && msg.senderId !== user.uid);
        for (const message of unreadMessages) {
            await updateDoc(doc(db, 'messages', message.id), {
                read: true
            });
        }
        
        // Return messages in chronological order (oldest first)
        return {
            success: true,
            messages: messages.reverse()
        };
    } catch (error) {
        console.error('Error getting messages:', error);
        return {
            success: false,
            error: `Failed to get messages: ${error.message}`
        };
    }
}

// Set up a real-time listener for new messages in a conversation
export function subscribeToMessages(otherUserId, callback) {
    const user = auth.currentUser;
    if (!user) {
        callback({
            success: false,
            error: 'You must be logged in to subscribe to messages.'
        });
        return null;
    }
    
    const conversationId = generateConversationId(user.uid, otherUserId);
    const messagesRef = collection(db, 'messages');
    const q = query(
        messagesRef,
        where('conversationId', '==', conversationId),
        orderBy('createdAt', 'desc'),
        limit(50)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const messages = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            messages.push({
                id: doc.id,
                senderId: data.senderId,
                senderName: data.senderName,
                senderPhotoURL: data.senderPhotoURL,
                text: data.text,
                attachmentUrl: data.attachmentUrl,
                read: data.read,
                createdAt: data.createdAt,
                isFromMe: data.senderId === user.uid
            });
            
            // Mark message as read if it's not from the current user
            if (!data.read && data.senderId !== user.uid) {
                updateDoc(doc(db, 'messages', doc.id), {
                    read: true
                });
            }
        });
        
        callback({
            success: true,
            messages: messages.reverse() // Return in chronological order
        });
    }, (error) => {
        console.error('Error subscribing to messages:', error);
        callback({
            success: false,
            error: `Failed to subscribe to messages: ${error.message}`
        });
    });
    
    return unsubscribe;
}

// Get user details for messaging
export async function getUserDetails(userId) {
    try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        
        if (!userDoc.exists()) {
            return {
                success: false,
                error: 'User not found.'
            };
        }
        
        const userData = userDoc.data();
        
        return {
            success: true,
            user: {
                id: userDoc.id,
                displayName: userData.displayName || 'TradeSkills User',
                photoURL: userData.photoURL || null,
                email: userData.email
            }
        };
    } catch (error) {
        console.error('Error getting user details:', error);
        return {
            success: false,
            error: `Failed to get user details: ${error.message}`
        };
    }
}

// Search for users to message
export async function searchUsers(searchTerm, limitCount = 10) {
    try {
        const user = auth.currentUser;
        if (!user) {
            return {
                success: false,
                error: 'You must be logged in to search users.'
            };
        }
        
        const usersRef = collection(db, 'users');
        const querySnapshot = await getDocs(usersRef);
        
        let users = [];
        querySnapshot.forEach((doc) => {
            // Don't include the current user in search results
            if (doc.id !== user.uid && doc.id !== 'placeholder') {
                const data = doc.data();
                users.push({
                    id: doc.id,
                    displayName: data.displayName || 'TradeSkills User',
                    photoURL: data.photoURL || null,
                    email: data.email
                });
            }
        });
        
        // Filter by search term if provided
        if (searchTerm) {
            const lowerSearchTerm = searchTerm.toLowerCase();
            users = users.filter(user => 
                user.displayName.toLowerCase().includes(lowerSearchTerm) ||
                user.email.toLowerCase().includes(lowerSearchTerm)
            );
        }
        
        // Limit results
        users = users.slice(0, limitCount);
        
        return {
            success: true,
            users: users
        };
    } catch (error) {
        console.error('Error searching users:', error);
        return {
            success: false,
            error: `Failed to search users: ${error.message}`
        };
    }
}
