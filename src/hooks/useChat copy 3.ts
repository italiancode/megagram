"use client";

import React, { useState, useCallback, useRef } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import contractArtifact from "../../evm-contracts/artifacts/evm-contracts/contracts/MegaChat.sol/MegaChat.json";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import type { Account } from "viem";
import { AbiEvent } from "viem";
import { megaEth } from "../config/chains";

const contractAbi = contractArtifact.abi;
const SESSION_PRIVATE_KEY_PREFIX = "megaethChatSessionPrivateKey_";
const CACHE_DURATION = 30_000;
const RATE_LIMIT_DELAY = 1_000;
const INITIAL_MESSAGE_LOAD = 125;
const MAX_BLOCK_RANGE = 7_200 * 7;
const LOAD_MORE_BLOCKS = 7_200;

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
  const earliestBlockQueried = useRef<{ [key: string]: bigint }>({});
  const syncInProgress = useRef<{ [key: string]: boolean }>({});

  const contractAddress = process.env
    .NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;

  const contract = {
    address: contractAddress,
    abi: contractAbi,
    publicClient,
    walletClient,
  };

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
    } catch {
      localStorage.removeItem(keyName);
      return null;
    }
  }, [address]);

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
        return;
      }

      if (!contract.publicClient) {
        console.warn("Cannot fetch messages: No public client available");
        return;
      }

      // Prevent concurrent fetches for the same chat
      if (syncInProgress.current[chatId]) {
        return;
      }

      syncInProgress.current[chatId] = true;

      try {
        // Check if we have cached messages that are still valid
        const now = Date.now();
        const cached = messageCache.current[chatId];
        if (cached && now - cached.timestamp < CACHE_DURATION) {
          setMessages(cached.data.slice(-INITIAL_MESSAGE_LOAD));
          return;
        }

        // Rate limit our blockchain calls
        await waitForRateLimit();

        // Get the latest block number
        const latestBlock = await contract.publicClient.getBlockNumber();

        // Calculate from which block to start querying
        const fromBlock = BigInt(
          Math.max(Number(latestBlock) - MAX_BLOCK_RANGE, 0)
        );
        earliestBlockQueried.current[chatId] = fromBlock;

        // Find the appropriate event in the ABI
        const messageEvent = contract.abi.find(
          (x) =>
            x.name === (isGroup ? "GroupMessageSent" : "MessageSent") &&
            x.type === "event"
        ) as AbiEvent;

        if (!messageEvent) {
          throw new Error(
            `Event ${
              isGroup ? "GroupMessageSent" : "MessageSent"
            } not found in ABI`
          );
        }

        // Fetch the logs from the blockchain
        const logs = await contract.publicClient.getLogs({
          address: contract.address,
          event: messageEvent,
          fromBlock,
          toBlock: latestBlock,
        });

        // Process the logs into messages
        const result: Message[] = [];
        const seen = new Set<string>();

        for (const log of logs) {
          const { messageId, from, to, contentHash, timestamp, mainWallet } =
            log.args as any;

          // For group chats, filter by group ID
          if (isGroup) {
            if (to.toLowerCase() !== chatId.toLowerCase()) continue;
          }
          // For direct chats, ensure message is between the current user and chat partner
          else {
            const isRelevant =
              (mainWallet.toLowerCase() === address.toLowerCase() &&
                to.toLowerCase() === chatId.toLowerCase()) ||
              (mainWallet.toLowerCase() === chatId.toLowerCase() &&
                to.toLowerCase() === address.toLowerCase());
            if (!isRelevant) continue;
          }

          // Skip duplicates
          if (seen.has(messageId)) continue;
          seen.add(messageId);

          // Add the message to our result set
          result.push({
            messageId,
            sender: from.toLowerCase(),
            recipient: to.toLowerCase(),
            content: contentHash,
            timestamp: Number(timestamp),
            mainWallet: mainWallet?.toLowerCase(),
            status: "delivered",
            txHash: log.transactionHash,
          });
        }

        // Sort messages by timestamp
        const sorted = result.sort((a, b) => a.timestamp - b.timestamp);

        // Update cache and state
        messageCache.current[chatId] = { data: sorted, timestamp: now };
        setMessages(sorted.slice(-INITIAL_MESSAGE_LOAD));
      } catch (error) {
        console.error("Error fetching messages:", error);
        throw error; // Rethrow for the component to handle
      } finally {
        syncInProgress.current[chatId] = false;
      }
    },
    [
      address,
      contract.publicClient,
      contract.address,
      contract.abi,
      waitForRateLimit,
    ]
  );

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
  };
}
