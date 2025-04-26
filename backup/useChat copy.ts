"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import CryptoJS from "crypto-js";
import contractArtifact from "../evm-contracts/artifacts/evm-contracts/contracts/MegaChat.sol/MegaChat.json";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import type { Account } from "viem";
import { AbiEvent } from "viem";
// import { megaEth } from "../src/config/chains";

const contractAbi = contractArtifact.abi;

const SESSION_PRIVATE_KEY_PREFIX = "megaethChatSessionPrivateKey_";
const ENCRYPTION_PRIVATE_KEY_PREFIX = "megaethChatPrivateKey_";

interface Message {
  messageId: string;
  sender: string;
  recipient: string;
  content: string;
  timestamp: number;
  mainWallet?: string;
  txHash?: string;
  status: 'pending' | 'delivered';
}

interface RecentChat {
  user: string;
  lastMessage: string;
  timestamp: number;
}

const CACHE_DURATION = 30_000; // Cache for 30 seconds
const POLL_INTERVAL = 30_000; // Poll every 30 seconds
const RATE_LIMIT_DELAY = 1_000; // 1 second between RPC requests
const RETRY_DELAYS = [1_000, 2_000, 5_000, 10_000]; // Retry delays
const INITIAL_MESSAGE_LOAD = 25; // Initial messages to load
const BLOCKS_PER_DAY = 7_200; // Approximate blocks per day (12s block time)
const MAX_BLOCK_RANGE = BLOCKS_PER_DAY * 7; // Look back up to 7 days
const LOAD_MORE_BLOCKS = BLOCKS_PER_DAY; // Blocks to fetch per "load more"

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface MessageCache {
  [key: string]: CacheEntry<Message[]>;
}

interface ChatHookReturn {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  currentUserUsername: string | null;
  setCurrentUserUsername: React.Dispatch<React.SetStateAction<string | null>>;
  isLoadingUsername: boolean;
  setIsLoadingUsername: React.Dispatch<React.SetStateAction<boolean>>;
  recentChats: RecentChat[];
  setRecentChats: React.Dispatch<React.SetStateAction<RecentChat[]>>;
  encryptMessage: (message: string, key: string) => string;
  decryptMessage: (encrypted: string, key: string) => string;
  getSessionAccount: () => Account | null;
  syncMessages: (chatId: string, isGroup?: boolean) => Promise<void>;
  fetchUsername: (userAddress: `0x${string}`) => Promise<string | null>;
  setUsername: (newUsername: string) => Promise<`0x${string}`>;
  sendMessage: (
    content: string,
    recipient: string,
    isGroup: boolean
  ) => Promise<string>;
  fetchMessages: (chatId: string, isGroup: boolean) => Promise<void>;
  fetchOlderMessages: (chatId: string, isGroup: boolean, beforeTimestamp: number) => Promise<Message[]>;
  loadMoreMessages: (chatId: string, isGroup: boolean) => Promise<void>;
}

export function useChat(): ChatHookReturn {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUserUsername, setCurrentUserUsername] = useState<string | null>(
    null
  );
  const [isLoadingUsername, setIsLoadingUsername] = useState(false);
  const [recentChats, setRecentChats] = useState<RecentChat[]>([]);
  const messageCache = useRef<MessageCache>({});
  const lastSyncRef = useRef<{ [key: string]: number }>({});
  const syncInProgress = useRef<{ [key: string]: boolean }>({});
  const lastRequestTime = useRef<number>(0);
  const earliestBlockQueried = useRef<{ [key: string]: bigint }>({});

  const contractAddress = process.env
    .NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;

  const contract = useCallback(() => {
    if (!contractAddress || !publicClient) {
      throw new Error("Contract address or public client is not available");
    }

    return {
      address: contractAddress,
      abi: contractAbi,
      publicClient,
      walletClient,
    };
  }, [contractAddress, publicClient, walletClient]);

  const getEncryptionPrivateKey = useCallback(
    (sender: string, recipient: string) => {
      if (!address) throw new Error("User address not available");
      const sorted = [sender.toLowerCase(), recipient.toLowerCase()].sort();
      const keyName = `${ENCRYPTION_PRIVATE_KEY_PREFIX}${sorted.join("_")}`;
      let key = localStorage.getItem(keyName);
      if (!key) {
        key = CryptoJS.SHA256(sorted.join("")).toString();
        localStorage.setItem(keyName, key);
      }
      return key;
    },
    [address]
  );

  const encryptMessage = useCallback((message: string, key: string) => {
    try {
      return CryptoJS.AES.encrypt(message, key).toString();
    } catch (err) {
      console.error("Encryption failed:", err);
      throw new Error("Encryption failed");
    }
  }, []);

  const decryptMessage = useCallback((encrypted: string, key: string) => {
    try {
      const bytes = CryptoJS.AES.decrypt(encrypted, key);
      const decoded = bytes.toString(CryptoJS.enc.Utf8);
      return decoded || "";
    } catch (err) {
      console.error("Decryption failed:", err);
      return "";
    }
  }, []);

  const getSessionAccount = useCallback((): Account | null => {
    if (!address) return null;
    const keyName = `${SESSION_PRIVATE_KEY_PREFIX}${address}`;
    let sessionKey = localStorage.getItem(keyName);
    if (!sessionKey) {
      sessionKey = generatePrivateKey();
      localStorage.setItem(keyName, sessionKey);
    }
    try {
      return privateKeyToAccount(sessionKey as `0x${string}`);
    } catch (e) {
      localStorage.removeItem(keyName);
      return null;
    }
  }, [address]);

  const waitForRateLimit = useCallback(async () => {
    const now = Date.now();
    const diff = now - lastRequestTime.current;
    if (diff < RATE_LIMIT_DELAY) {
      await new Promise((res) => setTimeout(res, RATE_LIMIT_DELAY - diff));
    }
    lastRequestTime.current = Date.now();
  }, []);

  const withRetry = useCallback(
    async <T>(fn: () => Promise<T>, label: string): Promise<T> => {
      for (let i = 0; i < RETRY_DELAYS.length; i++) {
        try {
          return await fn();
        } catch (err) {
          if (i === RETRY_DELAYS.length - 1) throw new Error(`${label} failed: ${err}`);
          await new Promise((res) => setTimeout(res, RETRY_DELAYS[i]));
        }
      }
      throw new Error(`${label} failed`);
    },
    []
  );

  const fetchUsername = useCallback(
    async (userAddress: `0x${string}`) => {
      if (address && userAddress.toLowerCase() === address.toLowerCase()) {
        setIsLoadingUsername(true);
      }
      
      const c = contract();
      try {
        const username = await c.publicClient.readContract({
          address: c.address,
          abi: c.abi,
          functionName: "getUsernameByAddress",
          args: [userAddress],
        });
        
        if (address && userAddress.toLowerCase() === address.toLowerCase()) {
          setCurrentUserUsername(username as string);
          setIsLoadingUsername(false);
        }
        
        return username as string;
      } catch (error) {
        console.error("Error fetching username:", error);
        if (address && userAddress.toLowerCase() === address.toLowerCase()) {
          setIsLoadingUsername(false);
        }
        return null;
      }
    },
    [contract, address, setCurrentUserUsername, setIsLoadingUsername]
  );

  const setUsername = useCallback(
    async (newUsername: string) => {
      setIsLoadingUsername(true);
      const c = contract();
      
      if (!c.walletClient) {
        setIsLoadingUsername(false);
        throw new Error("Wallet not connected");
      }

      try {
        const tx = await c.walletClient.writeContract({
          address: c.address,
          abi: c.abi,
          functionName: "setUsername",
          args: [newUsername],
        });
        
        await c.publicClient.waitForTransactionReceipt({
          hash: tx,
          confirmations: 1,
        });
        
        setCurrentUserUsername(newUsername);
        setIsLoadingUsername(false);
        return tx;
      } catch (error) {
        console.error("Error setting username:", error);
        setIsLoadingUsername(false);
        throw error;
      }
    },
    [contract, setCurrentUserUsername, setIsLoadingUsername]
  );

  const sendMessage = useCallback(
    async (content: string, recipient: string, isGroup: boolean) => {
      const c = contract();
      if (!c.walletClient || !address) {
        throw new Error("Wallet not connected");
      }

      const sessionAccount = getSessionAccount();
      if (!sessionAccount) {
        throw new Error("Session account not available");
      }

      const key = getEncryptionPrivateKey(address, recipient);
      const encryptedContent = encryptMessage(content, key);

      try {
        const tx = await c.walletClient.writeContract({
          address: c.address,
          abi: c.abi,
          functionName: isGroup ? "sendGroupMessage" : "sendMessage",
          args: isGroup
            ? [recipient, encryptedContent]
            : [recipient, encryptedContent, address],
          account: sessionAccount,
        });

        setTimeout(async () => {
          try {
            const receipt = await c.publicClient.waitForTransactionReceipt({
              hash: tx,
              confirmations: 1,
            });
            
            setMessages(prev => 
              prev.map(msg => {
                if (msg.status === 'pending' && 
                    msg.sender.toLowerCase() === sessionAccount.address.toLowerCase()) {
                  return {
                    ...msg,
                    txHash: tx,
                    status: 'delivered' as const
                  };
                }
                return msg;
              })
            );
          } catch (error) {
            console.error("Error waiting for confirmation:", error);
          }
        }, 100);
        
        return tx;
      } catch (error) {
        console.error("Error sending message:", error);
        throw error;
      }
    },
    [
      contract,
      address,
      getSessionAccount,
      getEncryptionPrivateKey,
      encryptMessage,
      setMessages
    ]
  );

  const syncMessages = useCallback(
    async (chatId: string, isGroup: boolean = false) => {
      const c = contract();
      if (!address || syncInProgress.current[chatId]) return;

      syncInProgress.current[chatId] = true;

      const now = Date.now();
      const cached = messageCache.current[chatId];
      if (cached && now - cached.timestamp < CACHE_DURATION) {
        setMessages(cached.data.slice(-INITIAL_MESSAGE_LOAD));
        syncInProgress.current[chatId] = false;
        return;
      }

      await waitForRateLimit();
      const latestBlock = await withRetry(
        () => c.publicClient.getBlockNumber(),
        "Get block number"
      );
      
      const fromBlock = BigInt(Math.max(Number(latestBlock) - MAX_BLOCK_RANGE, 0));
      earliestBlockQueried.current[chatId] = fromBlock;

      const messageEvent = c.abi.find(
        (x) => x.name === (isGroup ? "GroupMessageSent" : "MessageSent") && x.type === "event"
      ) as AbiEvent;

      const logs = await withRetry(
        () =>
          c.publicClient.getLogs({
            address: c.address,
            event: messageEvent,
            fromBlock,
            toBlock: latestBlock,
          }),
        "Fetch message logs"
      );

      const result: Message[] = [];
      const seen = new Set<string>();

      for (const log of logs) {
        const args = log.args as any;
        const { messageId, from, to, contentHash, timestamp, mainWallet } = args;

        if (isGroup) {
          if (to.toLowerCase() !== chatId.toLowerCase()) continue;
        } else {
          const messageSenderMainWallet = mainWallet.toLowerCase();
          const messageRecipient = to.toLowerCase();
          const userAddress = address?.toLowerCase();
          const partnerAddress = chatId.toLowerCase();

          const isFromUserToPartner = 
            messageSenderMainWallet === userAddress && 
            messageRecipient === partnerAddress;
          const isFromPartnerToUser = 
            messageSenderMainWallet === partnerAddress && 
            messageRecipient === userAddress;
          
          if (!isFromUserToPartner && !isFromPartnerToUser) continue;
        }

        if (seen.has(messageId)) continue;
        seen.add(messageId);

        const key = getEncryptionPrivateKey(isGroup ? address : from, to);
        let content = decryptMessage(contentHash, key);
        if (!content && !isGroup) {
          const altKey = getEncryptionPrivateKey(to, from);
          content = decryptMessage(contentHash, altKey) || contentHash;
        }

        result.push({
          messageId,
          sender: from.toLowerCase(),
          recipient: to.toLowerCase(),
          content,
          timestamp: Number(timestamp),
          mainWallet: mainWallet?.toLowerCase(),
          status: 'delivered' as const,
          txHash: log.transactionHash
        });
      }

      const sorted = result.sort((a, b) => a.timestamp - b.timestamp);
      messageCache.current[chatId] = { data: sorted, timestamp: now };
      setMessages(sorted.slice(-INITIAL_MESSAGE_LOAD));
      syncInProgress.current[chatId] = false;
    },
    [address, contract, getEncryptionPrivateKey, decryptMessage, withRetry, setMessages, waitForRateLimit]
  );

  const fetchMessages = useCallback(
    async (chatId: string, isGroup: boolean) => {
      await syncMessages(chatId, isGroup);
    },
    [syncMessages]
  );

  const loadMoreMessages = useCallback(
    async (chatId: string, isGroup: boolean) => {
      if (!address) throw new Error("User address not available");
      if (syncInProgress.current[chatId]) return;

      syncInProgress.current[chatId] = true;
      const c = contract();

      try {
        await waitForRateLimit();
        const latestBlock = await withRetry(
          () => c.publicClient.getBlockNumber(),
          "Get block number for load more"
        );

        const currentEarliestBlock = earliestBlockQueried.current[chatId] || latestBlock;
        const newEarliestBlock = BigInt(Math.max(Number(currentEarliestBlock) - LOAD_MORE_BLOCKS, 0));

        const messageEvent = c.abi.find(
          (x) => x.name === (isGroup ? "GroupMessageSent" : "MessageSent") && x.type === "event"
        ) as AbiEvent;

        const logs = await withRetry(
          () =>
            c.publicClient.getLogs({
              address: c.address,
              event: messageEvent,
              fromBlock: newEarliestBlock,
              toBlock: currentEarliestBlock - BigInt(1),
            }),
          "Fetch older message logs"
        );

        const result: Message[] = [];
        const seen = new Set<string>(messages.map(m => m.messageId));

        for (const log of logs) {
          const args = log.args as any;
          const { messageId, from, to, contentHash, timestamp, mainWallet } = args;

          if (isGroup) {
            if (to.toLowerCase() !== chatId.toLowerCase()) continue;
          } else {
            const messageSenderMainWallet = mainWallet.toLowerCase();
            const messageRecipient = to.toLowerCase();
            const userAddress = address?.toLowerCase();
            const partnerAddress = chatId.toLowerCase();

            const isFromUserToPartner = 
              messageSenderMainWallet === userAddress && 
              messageRecipient === partnerAddress;
            const isFromPartnerToUser = 
              messageSenderMainWallet === partnerAddress && 
              messageRecipient === userAddress;
            
            if (!isFromUserToPartner && !isFromPartnerToUser) continue;
          }

          if (seen.has(messageId)) continue;
          seen.add(messageId);

          const key = getEncryptionPrivateKey(isGroup ? address : from, to);
          let content = decryptMessage(contentHash, key);
          if (!content && !isGroup) {
            const altKey = getEncryptionPrivateKey(to, from);
            content = decryptMessage(contentHash, altKey) || contentHash;
          }

          result.push({
            messageId,
            sender: from.toLowerCase(),
            recipient: to.toLowerCase(),
            content,
            timestamp: Number(timestamp),
            mainWallet: mainWallet?.toLowerCase(),
            status: 'delivered' as const,
            txHash: log.transactionHash
          });
        }

        const sorted = result.sort((a, b) => a.timestamp - b.timestamp);
        const updatedMessages = [...sorted, ...messages].sort((a, b) => a.timestamp - b.timestamp);
        
        messageCache.current[chatId] = { 
          data: updatedMessages, 
          timestamp: Date.now() 
        };
        setMessages(updatedMessages);
        earliestBlockQueried.current[chatId] = newEarliestBlock;
      } catch (error) {
        console.error("Error loading more messages:", error);
      } finally {
        syncInProgress.current[chatId] = false;
      }
    },
    [address, contract, messages, getEncryptionPrivateKey, decryptMessage, withRetry, setMessages, waitForRateLimit]
  );

  const fetchOlderMessages = useCallback(
    async (chatId: string, isGroup: boolean, beforeTimestamp: number) => {
      if (!address) throw new Error("User address not available");

      const now = Date.now();
      const cachedKey = `${chatId}_before_${beforeTimestamp}`;
      const cached = messageCache.current[cachedKey];
      if (cached && now - cached.timestamp < CACHE_DURATION) {
        return cached.data;
      }

      const c = contract();
      await waitForRateLimit();

      try {
        const latestBlock = await withRetry(
          () => c.publicClient.getBlockNumber(),
          "Get block number for older messages"
        );
        
        const fromBlock = BigInt(Math.max(Number(latestBlock) - MAX_BLOCK_RANGE, 0));
        
        const messageEvent = c.abi.find(
          (x) => x.name === (isGroup ? "GroupMessageSent" : "MessageSent") && x.type === "event"
        ) as AbiEvent;

        const logs = await withRetry(
          () =>
            c.publicClient.getLogs({
              address: c.address,
              event: messageEvent,
              fromBlock,
              toBlock: latestBlock,
            }),
          "Fetch older message logs"
        );

        const result: Message[] = [];
        const seen = new Set<string>();

        for (const message of messages) {
          if (message.timestamp < beforeTimestamp && !seen.has(message.messageId)) {
            seen.add(message.messageId);
            result.push(message);
          }
        }

        for (const log of logs) {
          const args = log.args as any;
          const { messageId, from, to, contentHash, timestamp, mainWallet } = args;
          
          if (Number(timestamp) >= beforeTimestamp) continue;
          
          if (isGroup) {
            if (to.toLowerCase() !== chatId.toLowerCase()) continue;
          } else {
            const messageSenderMainWallet = mainWallet.toLowerCase();
            const messageRecipient = to.toLowerCase();
            const userAddress = address?.toLowerCase();
            const partnerAddress = chatId.toLowerCase();

            const isFromUserToPartner = 
              messageSenderMainWallet === userAddress && 
              messageRecipient === partnerAddress;
            const isFromPartnerToUser = 
              messageSenderMainWallet === partnerAddress && 
              messageRecipient === userAddress;
            
            if (!isFromUserToPartner && !isFromPartnerToUser) continue;
          }

          if (seen.has(messageId)) continue;
          seen.add(messageId);

          const key = getEncryptionPrivateKey(isGroup ? address : from, to);
          let content = decryptMessage(contentHash, key);
          if (!content && !isGroup) {
            const altKey = getEncryptionPrivateKey(to, from);
            content = decryptMessage(contentHash, altKey) || contentHash;
          }

          result.push({
            messageId,
            sender: from.toLowerCase(),
            recipient: to.toLowerCase(),
            content,
            timestamp: Number(timestamp),
            mainWallet: mainWallet?.toLowerCase(),
            status: 'delivered' as const,
            txHash: log.transactionHash
          });
        }

        const sorted = result.sort((a, b) => a.timestamp - b.timestamp);
        const updatedMessages = [...sorted, ...messages.filter(m => m.timestamp >= beforeTimestamp)]
          .sort((a, b) => a.timestamp - b.timestamp);
        
        messageCache.current[cachedKey] = { data: sorted, timestamp: now };
        messageCache.current[chatId] = { data: updatedMessages, timestamp: now };
        setMessages(updatedMessages);

        return sorted;
      } catch (error) {
        console.error("Error fetching older messages:", error);
        return [];
      }
    },
    [address, messages, contract, waitForRateLimit, withRetry, getEncryptionPrivateKey, decryptMessage, setMessages]
  );

  return {
    messages,
    setMessages,
    currentUserUsername,
    setCurrentUserUsername,
    isLoadingUsername,
    setIsLoadingUsername,
    recentChats,
    setRecentChats,
    encryptMessage,
    decryptMessage,
    getSessionAccount,
    syncMessages,
    fetchUsername,
    setUsername,
    sendMessage,
    fetchMessages,
    fetchOlderMessages,
    loadMoreMessages,
  };
}