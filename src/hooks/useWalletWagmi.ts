"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount, useConnect, useDisconnect, usePublicClient } from "wagmi";
// import { InjectedConnector } from '@wagmi/core/connectors/injected';

import CryptoJS from "crypto-js";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { formatEther } from "viem";

// Key names prefix in local storage
const ENCRYPTION_PRIVATE_KEY_PREFIX = "megaethChatPrivateKey_"; // Key for encrypting/decrypting messages
const SESSION_PRIVATE_KEY_PREFIX = "megaethChatSessionPrivateKey_"; // Key for signing transactions

export function useWalletWagmi() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient(); // Get public client instance
  const { disconnect: disconnectWagmi, status: disconnectStatus } =
    useDisconnect();
  const { connect, connectors, status: connectStatus } = useConnect();

  const [encryptionPrivateKey, setEncryptionPrivateKey] = useState<string>("");
  const [sessionAddress, setSessionAddress] = useState<`0x${string}` | null>(
    null
  );
  const [sessionBalance, setSessionBalance] = useState<string>("0"); // Store balance as formatted string
  const [isFetchingBalance, setIsFetchingBalance] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);

  // Combine connect and disconnect statuses for a general pending state
  const isPending =
    connectStatus === "pending" || disconnectStatus === "pending";

  // Function to fetch session key balance
  const fetchSessionBalance = useCallback(
    async (sAddress: `0x${string}`) => {
      if (!publicClient) return;
      setIsFetchingBalance(true);
      try {
        const balanceWei = await publicClient.getBalance({ address: sAddress });
        const balanceEth = formatEther(balanceWei);
        setSessionBalance(balanceEth);
        console.log(`Session key (${sAddress}) balance: ${balanceEth} ETH`);
      } catch (err) {
        console.error("Failed to fetch session key balance:", err);
        setSessionBalance("0"); // Reset to 0 on error
        setError("Could not fetch session key balance.");
      } finally {
        setIsFetchingBalance(false);
      }
    },
    [publicClient]
  );

  // Function to open wallet connection modal
  const openConnectModal = () => {
    setError(null);
    setShowModal(true);
  };

  // Function to close wallet connection modal
  const closeConnectModal = () => {
    setShowModal(false);
  };

  // Handle wallet connection
  const connectWithConnector = async (connector: any) => {
    setError(null);

    try {
      // Connect using the selected connector
      connect({ connector });
      // Note: The rest of the logic (key generation) happens in the useEffect below
      // based on the 'isConnected' state change from Wagmi.
      setShowModal(false);
    } catch (err: any) {
      setError(err.message || "Failed to connect wallet");
      console.error("Failed to connect wallet:", err);
    }
  };

  // Handle disconnect wallet
  const disconnectWallet = () => {
    try {
      disconnectWagmi();
      // Session key is NOT cleared from localStorage here to allow persistence
      // Local state will clear in the useEffect when isConnected becomes false
    } catch (err: any) {
      setError(err.message || "Failed to disconnect wallet");
      console.error("Failed to disconnect wallet:", err);
    }
  };

  // Effect to handle key generation and balance fetching based on connection & address
  useEffect(() => {
    if (isConnected && address && publicClient) {
      // Ensure publicClient is available too
      const encryptionKeyName = `${ENCRYPTION_PRIVATE_KEY_PREFIX}${address}`;
      const sessionKeyName = `${SESSION_PRIVATE_KEY_PREFIX}${address}`;

      // Get/Set Encryption Key (scoped to main address)
      let storedEncryptionKey = localStorage.getItem(encryptionKeyName);
      if (!storedEncryptionKey) {
        storedEncryptionKey = CryptoJS.lib.WordArray.random(32).toString();
        localStorage.setItem(encryptionKeyName, storedEncryptionKey);
        console.log(`Generated new encryption key for ${address}.`);
      }
      setEncryptionPrivateKey(storedEncryptionKey);

      // Get/Set Session Key (scoped to main address)
      let sessionPrivateKey = localStorage.getItem(sessionKeyName);
      let currentSessionAddress: `0x${string}` | null = null;
      if (!sessionPrivateKey) {
        sessionPrivateKey = generatePrivateKey();
        localStorage.setItem(sessionKeyName, sessionPrivateKey);
        console.log(`Generated new session key for ${address}.`);
      }

      try {
        const sessionAccount = privateKeyToAccount(
          sessionPrivateKey as `0x${string}`
        );
        currentSessionAddress = sessionAccount.address;
        setSessionAddress(currentSessionAddress);
        console.log(
          `Using session key ${currentSessionAddress} for ${address}.`
        );
        fetchSessionBalance(currentSessionAddress);
      } catch (e) {
        console.error("Failed to derive session address:", e);
        localStorage.removeItem(sessionKeyName); // Remove invalid key for this address
        setSessionAddress(null);
        setSessionBalance("0");
        setError(
          "Failed to initialize session key. Please disconnect and reconnect."
        );
      }
    } else {
      // Clear local state if disconnected or address missing
      setSessionAddress(null);
      setSessionBalance("0");
      setEncryptionPrivateKey("");
    }
    // Dependency on publicClient needed for fetchSessionBalance inside effect chain
  }, [isConnected, address, fetchSessionBalance, publicClient]);

  // Add a function to get the session key for backup purposes
  const getSessionKey = useCallback((): string | null => {
    if (!address) return null;
    const keyName = `megaethChatSessionPrivateKey_${address}`;
    const sessionKey = localStorage.getItem(keyName);
    return sessionKey;
  }, [address]);

  const refetchSessionBalance = useCallback(async () => {
    if (!sessionAddress || !publicClient) return;

    try {
      setIsFetchingBalance(true);
      const balance = await publicClient.getBalance({
        address: sessionAddress,
      });
      setSessionBalance(formatEther(balance));
    } catch (error) {
      console.error("Error fetching session balance:", error);
    } finally {
      setIsFetchingBalance(false);
    }
  }, [sessionAddress, publicClient]);

  return {
    account: address || "",
    encryptionPrivateKey, // For message encryption/decryption
    sessionAddress, // Public address of the session key
    sessionBalance, // Expose the balance
    isFetchingBalance, // Expose loading state for balance
    isPending, // Use this derived pending state
    status: connectStatus, // Keep original connect status if needed elsewhere
    error,
    isConnected,
    showModal,
    openConnectModal,
    closeConnectModal,
    connectors: connectors.filter((c) => c.ready),
    connectWithConnector,
    disconnect: disconnectWallet,
    refetchSessionBalance,
    getSessionKey,
  };
}
