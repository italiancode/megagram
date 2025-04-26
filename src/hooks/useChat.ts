"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { keccak256, encodeAbiParameters, parseAbiParameters } from "viem";
import contractArtifact from "../../evm-contracts/artifacts/evm-contracts/contracts/MegaChat.sol/MegaChat.json";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import type { Account } from "viem";
import { useNetwork } from "../providers/WagmiProvider";

const contractAbi = contractArtifact.abi;
const SESSION_PRIVATE_KEY_PREFIX = "megaethChatSessionPrivateKey_";
const SESSION_AUTH_FLAG_PREFIX = "megaethChatSessionAuthorized_";
const CACHE_DURATION = 30_000;
const RATE_LIMIT_DELAY = 1_000;

interface Message {
  messageId: string;
  sender: string;
  recipient: string;
  content: string;
  timestamp: number;
  mainWallet?: string;
  txHash?: string;
  status: "pending" | "delivered";
}

interface RecentChat {
  user: string;
  lastMessage: string;
  timestamp: number;
}

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
  getSessionAccount: () => Account | null;
  fetchUsername: (userAddress: `0x${string}`) => Promise<string | null>;
  setUsername: (newUsername: string) => Promise<`0x${string}`>;
  sendMessage: (
    content: string,
    recipient: string,
    isGroup: boolean
  ) => Promise<string>;
  fetchMessages: (chatId: string, isGroup: boolean) => Promise<void>;
  recentChats: RecentChat[];
  fetchUserChats: () => Promise<void>;
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
  const lastRequestTime = useRef<number>(0);
  const syncInProgress = useRef<{ [key: string]: boolean }>({});

  // Get the current network's contract address
  let contractAddress: string;
  let previousContractAddress = useRef<string>("");
  try {
    const networkContext = useNetwork();
    contractAddress =
      networkContext?.activeNetwork?.contractAddress ||
      process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
      "";
  } catch (e) {
    contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";
  }

  const contract = {
    address: contractAddress as `0x${string}`,
    abi: contractAbi,
    publicClient,
    walletClient,
  };

  // Check if session wallet is authorized on-chain
  const isSessionAuthorized = useCallback(
    async (sessionAddress: `0x${string}`): Promise<boolean> => {
      if (!address || !contract.publicClient) return false;

      try {
        return await contract.publicClient.readContract({
          address: contract.address,
          abi: contract.abi,
          functionName: "sessionWallets",
          args: [address, sessionAddress],
        });
      } catch (error) {
        console.error("Error checking session authorization:", error);
        return false;
      }
    },
    [address, contract.publicClient, contract.address, contract.abi]
  );

  // Session account management with authorization tracking
  const getSessionAccount = useCallback((): Account | null => {
    if (!address) return null;
    
    const keyName = `${SESSION_PRIVATE_KEY_PREFIX}${address}`;
    const authFlagName = `${SESSION_AUTH_FLAG_PREFIX}${address}_${contractAddress}`;
    
    let sessionKey = localStorage.getItem(keyName);
    if (!sessionKey) {
      sessionKey = generatePrivateKey();
      localStorage.setItem(keyName, sessionKey);
      localStorage.removeItem(authFlagName); // Clear auth flag when generating new key
    }
    
    try {
      return privateKeyToAccount(sessionKey as `0x${string}`);
    } catch {
      localStorage.removeItem(keyName);
      localStorage.removeItem(authFlagName);
      return null;
    }
  }, [address, contractAddress]);

  // Track contract address changes (network switching)
  useEffect(() => {
    const handleNetworkChange = async () => {
      if (
        !address ||
        !contract.walletClient ||
        !contractAddress ||
        contractAddress === previousContractAddress.current
      ) {
        return;
      }

      previousContractAddress.current = contractAddress;

      const sessionAccount = getSessionAccount();
      if (!sessionAccount) return;

      try {
        const authFlagName = `${SESSION_AUTH_FLAG_PREFIX}${address}_${contractAddress}`;
        const isAuthorizedLocally = localStorage.getItem(authFlagName) === 'true';
        
        if (isAuthorizedLocally) {
          // Double check on-chain if we have publicClient
          if (contract.publicClient) {
            const isAuthorizedOnChain = await isSessionAuthorized(sessionAccount.address);
            if (!isAuthorizedOnChain) {
              localStorage.removeItem(authFlagName);
            } else {
              console.log(`Session wallet ${sessionAccount.address} already authorized`);
              return;
            }
          } else {
            console.log(`Assuming session wallet ${sessionAccount.address} is authorized (local storage)`);
            return;
          }
        }

        console.log(`Authorizing session wallet ${sessionAccount.address} on contract ${contractAddress}`);

        const tx = await contract.walletClient.writeContract({
          address: contract.address,
          abi: contract.abi,
          functionName: "authorizeSessionWallet",
          args: [sessionAccount.address],
        });

        if (contract.publicClient) {
          await contract.publicClient.waitForTransactionReceipt({
            hash: tx,
            confirmations: 1,
          });
        }

        // Mark as authorized in local storage
        localStorage.setItem(authFlagName, 'true');
        console.log(`Session wallet authorized: ${tx}`);
      } catch (error) {
        console.error("Error authorizing session wallet:", error);
      }
    };

    handleNetworkChange();
  }, [
    address,
    contractAddress,
    contract.walletClient,
    contract.publicClient,
    contract.address,
    contract.abi,
    getSessionAccount,
    isSessionAuthorized,
  ]);

  const waitForRateLimit = useCallback(async () => {
    const now = Date.now();
    const diff = RATE_LIMIT_DELAY - (now - lastRequestTime.current);
    if (diff > 0) {
      await new Promise((resolve) => setTimeout(resolve, diff));
    }
    lastRequestTime.current = Date.now();
  }, []);

  const fetchUsername = useCallback(
    async (userAddress: `0x${string}`) => {
      const isCurrentUser =
        address && userAddress.toLowerCase() === address.toLowerCase();
      if (isCurrentUser) setIsLoadingUsername(true);

      try {
        if (!contract.publicClient)
          throw new Error("Public client not available");

        const username = (await contract.publicClient.readContract({
          address: contract.address,
          abi: contract.abi,
          functionName: "getUsernameByAddress",
          args: [userAddress],
        })) as string;

        if (isCurrentUser) {
          setCurrentUserUsername(username);
          setIsLoadingUsername(false);
        }
        return username;
      } catch (error) {
        console.error("Error fetching username:", error);
        if (isCurrentUser) setIsLoadingUsername(false);
        return null;
      }
    },
    [address, contract.publicClient, contract.address, contract.abi]
  );

  const setUsername = useCallback(
    async (newUsername: string) => {
      if (!contract.walletClient) throw new Error("Wallet not connected");
      if (!contract.publicClient)
        throw new Error("Public client not available");

      setIsLoadingUsername(true);

      try {
        const tx = await contract.walletClient.writeContract({
          address: contract.address,
          abi: contract.abi,
          functionName: "setUsername",
          args: [newUsername],
        });

        await contract.publicClient.waitForTransactionReceipt({
          hash: tx,
          confirmations: 1,
        });

        if (address) {
          localStorage.removeItem(`username-last-fetched-${address}`);
        }

        setCurrentUserUsername(newUsername);
        return tx;
      } catch (error) {
        console.error("Error setting username:", error);
        throw error;
      } finally {
        setIsLoadingUsername(false);
      }
    },
    [
      address,
      contract.walletClient,
      contract.publicClient,
      contract.address,
      contract.abi,
    ]
  );

  const getChatId = useCallback((user1: string, user2: string): string => {
    const [lower, higher] = [user1.toLowerCase(), user2.toLowerCase()].sort();
    const encoded = encodeAbiParameters(
      parseAbiParameters("address, address"),
      [lower as `0x${string}`, higher as `0x${string}`]
    );
    return keccak256(encoded);
  }, []);

  const sendMessage = useCallback(
    async (content: string, recipient: string, isGroup: boolean) => {
      if (!contract.walletClient || !address)
        throw new Error("Wallet not connected");
      if (!contract.publicClient)
        throw new Error("Public client not available");

      const sessionAccount = getSessionAccount();
      if (!sessionAccount) throw new Error("Session account not available");

      try {
        const tx = await contract.walletClient.writeContract({
          address: contract.address,
          abi: contract.abi,
          functionName: isGroup ? "sendGroupMessage" : "sendMessage",
          args: isGroup ? [recipient, content] : [recipient, content, address],
          account: sessionAccount,
        });

        delete messageCache.current[recipient.toLowerCase()];
        delete messageCache.current[getChatId(address, recipient)];

        setTimeout(async () => {
          try {
            if (!contract.publicClient) {
              console.error("Public client not available for confirmation");
              return;
            }

            const receipt =
              await contract.publicClient.waitForTransactionReceipt({
                hash: tx,
                confirmations: 1,
              });
            setMessages((prev) =>
              prev.map((msg) =>
                msg.status === "pending" &&
                msg.sender.toLowerCase() ===
                  sessionAccount.address.toLowerCase()
                  ? { ...msg, txHash: tx, status: "delivered" }
                  : msg
              )
            );
          } catch (error) {
            console.error("Error confirming transaction:", error);
          }
        }, 100);

        return tx;
      } catch (error) {
        console.error("Error sending message:", error);
        throw error;
      }
    },
    [
      address,
      contract.walletClient,
      contract.publicClient,
      contract.address,
      contract.abi,
      getSessionAccount,
    ]
  );

  const fetchMessages = useCallback(
    async (chatId: string, isGroup: boolean) => {
      if (!address) {
        console.warn("Cannot fetch messages: No user address available");
        throw new Error("Wallet not connected");
      }
  
      if (!contract.publicClient) {
        console.warn("Cannot fetch messages: No public client available");
        throw new Error("Public client not available");
      }
  
      if (!chatId) {
        console.warn("Cannot fetch messages: Chat ID is empty");
        throw new Error("Chat ID is required");
      }
  
      if (syncInProgress.current[chatId]) {
        console.log(`Sync in progress for chat ${chatId}, skipping...`);
        return;
      }
  
      syncInProgress.current[chatId] = true;
  
      try {
        const now = Date.now();
        const cached = messageCache.current[chatId];
        if (cached && now - cached.timestamp < CACHE_DURATION) {
          console.log(`Using cached messages for chat ${chatId}`);
          setMessages(cached.data);
          return;
        }
  
        await waitForRateLimit();
  
        let rawMessages: any[];
        let computedChatId: string;
  
        if (isGroup) {
          console.log(`Fetching group messages for groupId: ${chatId}`);
          rawMessages = (await contract.publicClient.readContract({
            address: contract.address,
            abi: contract.abi,
            functionName: "getGroupMessages",
            args: [chatId],
          })) as any[];
          computedChatId = chatId;
        } else {
          computedChatId = getChatId(address, chatId);
          console.log(`Fetching chat messages for chatId: ${computedChatId}`);
          rawMessages = (await contract.publicClient.readContract({
            address: contract.address,
            abi: contract.abi,
            functionName: "getChatMessages",
            args: [computedChatId],
          })) as any[];
        }
  
        const result: Message[] = [];
        const seen = new Set<string>();
  
        for (const msg of rawMessages) {
          const { messageId, sender, recipient, contentHash, timestamp, mainWallet } = msg;
  
          if (!msg.exists || seen.has(messageId)) continue;
          seen.add(messageId);
  
          result.push({
            messageId,
            sender: sender.toLowerCase(),
            recipient: recipient.toLowerCase(),
            content: contentHash,
            timestamp: Number(timestamp),
            mainWallet: mainWallet?.toLowerCase(),
            status: "delivered",
            txHash: undefined,
          });
        }
  
        const sorted = result.sort((a, b) => a.timestamp - b.timestamp);
  
        messageCache.current[chatId] = { data: sorted, timestamp: now };
        setMessages(sorted);
        console.log(`Fetched ${sorted.length} messages for chat ${computedChatId}`);
      } catch (error) {
        console.error(`Error fetching messages for chat ${chatId}:`, error);
        throw error;
      } finally {
        syncInProgress.current[chatId] = false;
      }
    },
    [address, contract.publicClient, contract.address, contract.abi, waitForRateLimit, getChatId]
  );

  const fetchUserChats = useCallback(async () => {
    if (!address) {
      console.warn("Cannot fetch user chats: No user address available");
      return;
    }

    if (!contract.publicClient) {
      console.warn("Cannot fetch user chats: No public client available");
      return;
    }

    try {
      await waitForRateLimit();

      console.log(`Fetching recent chats for user: ${address}`);
      const recentChatsRaw = (await contract.publicClient.readContract({
        address: contract.address,
        abi: contract.abi,
        functionName: "getRecentChats",
      })) as any[];

      const recent: RecentChat[] = recentChatsRaw
        .filter(
          (chat) => chat.user !== "0x0000000000000000000000000000000000000000"
        )
        .map((chat) => ({
          user: chat.user.toLowerCase(),
          lastMessage: chat.lastMessage,
          timestamp: Number(chat.timestamp),
        }));

      setRecentChats(recent);
      console.log(`Fetched ${recent.length} recent chats for user ${address}`);
    } catch (error) {
      console.error("Error fetching user chats:", error);
      throw error;
    }
  }, [
    address,
    contract.publicClient,
    contract.address,
    contract.abi,
    waitForRateLimit,
  ]);

  return {
    messages,
    setMessages,
    currentUserUsername,
    setCurrentUserUsername,
    isLoadingUsername,
    setIsLoadingUsername,
    getSessionAccount,
    fetchUsername,
    setUsername,
    sendMessage,
    fetchMessages,
    recentChats,
    fetchUserChats,
  };
}