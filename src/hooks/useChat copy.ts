"use client";

import React, { useState, useCallback, useRef } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import contractArtifact from "../../evm-contracts/artifacts/evm-contracts/contracts/MegaChat.sol/MegaChat.json";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import type { Account } from "viem";
import { AbiEvent } from "viem";
import { megaEth } from "../config/chains";
import { fetchMessages as fetchMessagesFromChain, loadMoreMessages } from "./messageFunctions";
import { Message, MessageCache, CacheEntry } from "../types/chat";

const contractAbi = contractArtifact.abi;
const SESSION_PRIVATE_KEY_PREFIX = "megaethChatSessionPrivateKey_";
const RATE_LIMIT_DELAY = 1_000;



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
  fetchMessages: (chatId: string, isGroup: boolean, isPolling?: boolean) => Promise<void>;
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
        console.log("Message details:", {
          content,
          recipient,
          sender: address,
          senderSession: sessionAccount.address,
          isGroup,
          functionToCall: isGroup ? "sendGroupMessage" : "sendMessage",
          contractAddress: contract.address,
          arguments: isGroup ? [recipient, content] : [recipient, content, address]
        });

        const tx = await contract.walletClient.writeContract({
          address: contract.address,
          abi: contract.abi,
          functionName: isGroup ? "sendGroupMessage" : "sendMessage",
          args: isGroup ? [recipient, content] : [recipient, content, address],
          account: sessionAccount,
        });

        console.log("Transaction details:", {
          transactionHash: tx,
          messageContent: content,
          recipientAddress: recipient,
          timestamp: new Date().toISOString()
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
    async (chatId: string, isGroup: boolean, isPolling = false) => {
      await fetchMessagesFromChain({
        chatId,
        isGroup,
        address,
        // Only pass the parameters required for dummy messages
        // Other parameters are kept in the object to maintain interface compatibility
        publicClient: contract.publicClient,
        contractAddress: contract.address,
        contractAbi: contract.abi,
        messageCache,
        syncInProgress,
        earliestBlockQueried,
        setMessages,
        waitForRateLimit
      }, isPolling);
      
      if (!isPolling) {
        console.log('🔔 Messages fetched from dummy data - blockchain calls disabled');
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
  };
}
