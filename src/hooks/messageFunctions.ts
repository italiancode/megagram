"use client";

import { MessageCache, Message } from "../types/chat";

// Constants for dummy data generation
const CACHE_DURATION = 30_000;
const INITIAL_MESSAGE_LOAD = 125;

// Dummy message content for testing
const dummyMessages = [
  "Hey there! How's it going?",
  "I'm working on the MegaChat project right now.",
  "Have you seen the latest updates to the UI?",
  "This is a test message with dummy data.",
  "No blockchain calls are being made right now.",
  "The weather is nice today!",
  "I'm thinking about adding some new features.",
  "What do you think about adding video chat?",
  "Did you check out the new documentation?",
  "Let's meet up to discuss the project roadmap.",
  "I'm having trouble with the smart contract.",
  "Can you help me debug this issue?",
  "The transaction is taking forever to confirm.",
  "I just deployed a new version of the app.",
  "Check out this cool NFT I just minted!",
  "Gas fees are crazy high right now.",
  "I'm thinking about switching to a different blockchain.",
  "What do you think about the new token economics?",
  "I need to optimize the contract to use less gas.",
  "Have you tried the new wallet integration?",
  "This is a very long message that should test the message component's ability to handle long content. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam in dui mauris. Vivamus hendrerit arcu sed erat molestie vehicula. Sed auctor neque eu tellus rhoncus ut eleifend nibh porttitor.",
];

// Interface for message fetch parameters
interface MessageFetchParams {
  chatId: string;
  isGroup: boolean;
  address: `0x${string}` | undefined;
  publicClient: any;
  contractAddress: `0x${string}`;
  contractAbi: any[];
  messageCache: React.MutableRefObject<MessageCache>;
  syncInProgress: React.MutableRefObject<{ [key: string]: boolean }>;
  earliestBlockQueried: React.MutableRefObject<{ [key: string]: bigint }>;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  waitForRateLimit: () => Promise<void>;
}

/**
 * Generates a dummy message
 */
function generateDummyMessage(index: number, userAddress: string, recipientAddress: string, isFromUser: boolean): Message {
  const now = Math.floor(Date.now() / 1000);
  // Create timestamps with some variance (messages from the past few hours)
  const timestamp = now - (Math.floor(Math.random() * 8) * 3600) - (index * 120);
  
  return {
    messageId: `dummy-${isFromUser ? 'sent' : 'received'}-${index}`,
    sender: isFromUser ? userAddress : recipientAddress,
    recipient: isFromUser ? recipientAddress : userAddress,
    content: dummyMessages[index % dummyMessages.length],
    timestamp: timestamp,
    mainWallet: isFromUser ? userAddress : recipientAddress,
    status: 'delivered',
    txHash: `0x${Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
    senderName: isFromUser ? 'You' : `User-${recipientAddress.substring(2, 6)}`
  };
}

/**
 * Generates a set of dummy messages for testing
 */
function generateDummyMessageSet(userAddress: string, chatId: string, isGroup: boolean): Message[] {
  if (!userAddress) return [];
  
  // Number of messages to generate (between 10-20)
  const count = Math.floor(Math.random() * 11) + 10;
  const result: Message[] = [];
  
  for (let i = 0; i < count; i++) {
    // Alternate between sent and received messages with some randomness
    const isFromUser = i % 2 === 0 ? true : Math.random() > 0.3;
    result.push(generateDummyMessage(i, userAddress, chatId, isFromUser));
  }
  
  // Sort messages by timestamp
  return result.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Adds a single new message to the existing conversation
 * This simulates receiving a new message during polling
 */
async function addNewDummyMessage(
  chatId: string,
  isGroup: boolean,
  address: `0x${string}` | undefined,
  messageCache: React.MutableRefObject<MessageCache>,
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
): Promise<void> {
  if (!address) return;
  
  // Get current messages
  const currentMessages = messageCache.current[chatId]?.data || [];
  
  // Usually generate a message from the other person (recipient), not from the user
  const isFromUser = Math.random() < 0.15; // Only 15% chance it's from user
  
  // Create a new message with current timestamp
  const now = Math.floor(Date.now() / 1000);
  const newMessage: Message = {
    messageId: `dummy-new-${now}-${Math.random().toString(36).substring(2, 9)}`,
    sender: isFromUser ? address : chatId,
    recipient: isFromUser ? chatId : address,
    content: dummyMessages[Math.floor(Math.random() * dummyMessages.length)],
    timestamp: now,
    mainWallet: isFromUser ? address : chatId,
    status: 'delivered',
    txHash: `0x${Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
    senderName: isFromUser ? 'You' : `User-${chatId.substring(2, 6)}`
  };
  
  // Add to existing messages and update state
  const updatedMessages = [...currentMessages, newMessage];
  messageCache.current[chatId] = { 
    data: updatedMessages, 
    timestamp: Date.now() 
  };
  
  // Simulate a tiny delay
  await new Promise(resolve => setTimeout(resolve, 50));
  
  // Update state with new message added
  setMessages(updatedMessages);
  
  console.log(`📱 [DEV] Added new message from ${isFromUser ? 'you' : 'recipient'} during polling`);
  
  // Also save to localStorage to keep persistence
  try {
    const storageKey = `${DUMMY_MESSAGES_KEY_PREFIX}${address}_${chatId}`;
    localStorage.setItem(storageKey, JSON.stringify(updatedMessages));
  } catch (e) {
    console.error('Error updating stored messages:', e);
  }
}

// Store generated dummy messages persistently in localStorage
const DUMMY_MESSAGES_KEY_PREFIX = 'megaChat_dummyMessages_';

/**
 * Loads persisted dummy messages from localStorage or generates new ones if none exist
 */
function getOrCreateDummyMessages(address: string, chatId: string, isGroup: boolean): Message[] {
  const storageKey = `${DUMMY_MESSAGES_KEY_PREFIX}${address}_${chatId}`;
  const storedMessages = localStorage.getItem(storageKey);
  
  if (storedMessages) {
    try {
      const parsed = JSON.parse(storedMessages);
      console.log(`📱 [DEV] Loaded ${parsed.length} persisted dummy messages from storage`);
      return parsed;
    } catch (e) {
      console.error('Error parsing stored dummy messages:', e);
    }
  }
  
  // If no stored messages or error parsing, generate new ones
  const newMessages = generateDummyMessageSet(address, chatId, isGroup);
  
  // Save to localStorage for future use
  try {
    localStorage.setItem(storageKey, JSON.stringify(newMessages));
    console.log(`📱 [DEV] Generated and stored ${newMessages.length} new dummy messages`);
  } catch (e) {
    console.error('Error storing dummy messages:', e);
  }
  
  return newMessages;
}

/**
 * Flags to track initial load status
 */
const initialLoadComplete: Record<string, boolean> = {};

/**
 * Fetches dummy messages for a direct chat or group chat (no blockchain calls)
 * @param params Message fetch parameters
 * @param isPolling Whether this is an automatic polling refresh (affects behavior)
 */
export async function fetchMessages({
  chatId,
  isGroup,
  address,
  messageCache,
  setMessages,
}: MessageFetchParams, isPolling = false): Promise<void> {
  if (!address) {
    console.warn("Cannot fetch messages: No user address available");
    return;
  }
  
  // Get cache key for this chat
  const chatCacheKey = `${address}_${chatId}`;

  // For polling, only get new messages (if any) without full reload visible to user
  if (isPolling && initialLoadComplete[chatCacheKey]) {
    // Add a small random chance to add a new message during polling (for demo purposes)
    const shouldAddNewMessage = Math.random() < 0.2; // 20% chance of new message when polling
    
    if (shouldAddNewMessage) {
      await addNewDummyMessage(chatId, isGroup, address, messageCache, setMessages);
      return;
    }
    
    // Just touch the timestamp to avoid full reloads during future polling
    if (messageCache.current[chatId]) {
      messageCache.current[chatId].timestamp = Date.now();
    }
    
    // Don't update messages at all if we're polling and there are no new ones
    return;
  }
  
  // Simulate a small delay like a real API call would have (only for initial load)
  if (!initialLoadComplete[chatCacheKey]) {
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  // Check if we have cached messages that are still valid in memory
  const now = Date.now();
  const cached = messageCache.current[chatId];
  if (cached && now - cached.timestamp < CACHE_DURATION) {
    if (!initialLoadComplete[chatCacheKey]) {
      console.log('📱 [DEV] Using cached dummy messages from memory');
      setMessages(cached.data);
      initialLoadComplete[chatCacheKey] = true;
    }
    return;
  }

  // Load or create persisted dummy messages
  const dummyData = getOrCreateDummyMessages(address, chatId, isGroup);
  
  // Update cache and state
  messageCache.current[chatId] = { data: dummyData, timestamp: now };
  setMessages(dummyData);
  initialLoadComplete[chatCacheKey] = true;
}

/**
 * Loads more dummy messages (simulates loading history)
 */
export async function loadMoreMessages({
  chatId,
  isGroup,
  address,
  messageCache,
  setMessages,
}: MessageFetchParams): Promise<boolean> {
  console.log('📱 [DEV] Loading more dummy messages');
  
  if (!address) {
    return false;
  }

  // Simulate a delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Get existing messages from cache
  const existingMessages = messageCache.current[chatId]?.data || [];
  
  // Get the storage key for this chat
  const storageKey = `${DUMMY_MESSAGES_KEY_PREFIX}${address}_${chatId}_history`;
  let olderMessages: Message[] = [];
  
  // Check if we have already generated history messages for this chat
  const storedHistoryMessages = localStorage.getItem(storageKey);
  
  if (storedHistoryMessages) {
    try {
      olderMessages = JSON.parse(storedHistoryMessages);
      console.log(`📱 [DEV] Loaded ${olderMessages.length} persisted history messages from storage`);
    } catch (e) {
      console.error('Error parsing stored history messages:', e);
      // If error, we'll generate new ones below
      olderMessages = [];
    }
  }
  
  // If no stored history messages or empty array, generate new ones
  if (olderMessages.length === 0) {
    // Generate some older messages (5-10 more)
    const olderCount = Math.floor(Math.random() * 6) + 5;
    
    // Find the oldest message timestamp
    const oldestTimestamp = existingMessages.length > 0 ? 
      Math.min(...existingMessages.map(m => m.timestamp)) : Math.floor(Date.now() / 1000);
    
    for (let i = 0; i < olderCount; i++) {
      const isFromUser = Math.random() > 0.5;
      // Each message is 1-3 hours older than the previous oldest
      const timestamp = oldestTimestamp - (3600 * (i + 1) * Math.random() * 3);
      
      olderMessages.push({
        messageId: `dummy-history-${i}-${Date.now()}`,
        sender: isFromUser ? address : chatId,
        recipient: isFromUser ? chatId : address,
        content: dummyMessages[(i + 7) % dummyMessages.length], // Use different messages than initial set
        timestamp: timestamp,
        mainWallet: isFromUser ? address : chatId,
        status: 'delivered',
        txHash: `0x${Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
        senderName: isFromUser ? 'You' : `User-${chatId.substring(2, 6)}`
      });
    }
    
    // Save to localStorage for future use
    try {
      localStorage.setItem(storageKey, JSON.stringify(olderMessages));
      console.log(`📱 [DEV] Generated and stored ${olderMessages.length} new history messages`);
    } catch (e) {
      console.error('Error storing history messages:', e);
    }
  }
  
  // Combine and sort all messages
  const combinedMessages = [...olderMessages, ...existingMessages].sort(
    (a, b) => a.timestamp - b.timestamp
  );
  
  // Update cache and state
  messageCache.current[chatId] = {
    data: combinedMessages,
    timestamp: Date.now(),
  };
  
  setMessages(combinedMessages);
  
  // Return true to indicate there could be more messages to load (even though we're using the same set)
  return true;
}
