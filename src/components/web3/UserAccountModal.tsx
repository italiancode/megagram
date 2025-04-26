'use client';

import { useState, useEffect } from 'react';
import { useChat } from '@/hooks/useChat';
import { createPortal } from 'react-dom';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { useWalletWagmi } from '@/hooks/useWalletWagmi';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';

interface UserAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserAccountModal({ isOpen, onClose }: UserAccountModalProps) {
  // State management
  const [newUsername, setNewUsername] = useState('');
  const [isSettingUsername, setIsSettingUsername] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [copySuccessMain, setCopySuccessMain] = useState(false);
  const [copySuccessSession, setCopySuccessSession] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [copySuccessKey, setCopySuccessKey] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(0);

  // Hooks
  const { currentUserUsername, setUsername, isLoadingUsername, fetchUsername } = useChat();
  const { address } = useAccount();
  const {
    disconnect,
    sessionAddress,
    sessionBalance,
    isFetchingBalance,
    refetchSessionBalance,
    getSessionKey
  } = useWalletWagmi();

  // Lifecycle
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Debug logging
  useEffect(() => {
    console.log('Modal - currentUserUsername:', currentUserUsername);
    console.log('Modal - isLoadingUsername:', isLoadingUsername);
  }, [currentUserUsername, isLoadingUsername]);

  // Fetch username when modal opens with caching to prevent excessive RPC calls
  useEffect(() => {
    if (isOpen && address) {
      // Add a smart caching mechanism to prevent too many RPC requests
      const cacheKey = `username-modal-cache-${address}`;
      const cachedData = localStorage.getItem(cacheKey);
      const now = Date.now();
      
      // Only fetch if cache is expired (30 seconds) or username isn't loaded yet
      if (!cachedData || now - JSON.parse(cachedData).timestamp > 30000 || !currentUserUsername) {
        console.log('Modal - Fetching username for address:', address);
        fetchUsername(address);
        
        // Update cache with timestamp
        localStorage.setItem(cacheKey, JSON.stringify({ 
          timestamp: now,
          username: currentUserUsername 
        }));
      } else {
        console.log('Modal - Using cached username data');
      }
    }
  }, [isOpen, address, fetchUsername, currentUserUsername]);
  
  // Monitor username changes
  useEffect(() => {
    if (isOpen && address && currentUserUsername) {
      console.log('Modal - Username updated:', currentUserUsername);
      // Update newUsername state when currentUserUsername changes
      setNewUsername(currentUserUsername);
    }
  }, [isOpen, address, currentUserUsername]);

  // Initialize form when modal opens
  useEffect(() => {
    if (isOpen) {
      setNewUsername(currentUserUsername || '');
      setCopySuccessMain(false);
      setCopySuccessSession(false);
      setCopySuccessKey(false);
      setShowPrivateKey(false);
    }
  }, [isOpen, currentUserUsername]);
  
  // Throttle session balance fetching to prevent excessive refreshes
  useEffect(() => {
    if (isOpen && sessionAddress) {
      const now = Date.now();
      // Only fetch if we haven't fetched in the last 30 seconds
      if (now - lastFetchTime > 30000) {
        setLastFetchTime(now);
        refetchSessionBalance();
      }
    }
  }, [isOpen, sessionAddress, refetchSessionBalance, lastFetchTime]);

  // Event handlers
  const handleSetUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || isSettingUsername) return;

    setIsSettingUsername(true);
    try {
      await setUsername(newUsername);
    } catch (error) {
      console.error("Failed to set username:", error);
    } finally {
      setIsSettingUsername(false);
    }
  };

  const handleLogout = () => {
    disconnect();
    onClose();
  };

  const copyAddress = async (addr: string | null, type: 'main' | 'session') => {
    if (addr) {
      try {
        await navigator.clipboard.writeText(addr);
        if (type === 'main') setCopySuccessMain(true);
        if (type === 'session') setCopySuccessSession(true);
        setTimeout(() => {
          setCopySuccessMain(false);
          setCopySuccessSession(false);
        }, 2000);
      } catch (err) {
        console.error('Failed to copy address:', err);
      }
    }
  };

  const toggleShowPrivateKey = () => {
    setShowPrivateKey(!showPrivateKey);
  };

  const copyPrivateKey = async () => {
    const key = getSessionKey();
    if (key) {
      try {
        await navigator.clipboard.writeText(key);
        setCopySuccessKey(true);
        setTimeout(() => {
          setCopySuccessKey(false);
        }, 2000);
      } catch (err) {
        console.error('Failed to copy private key:', err);
      }
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleRefreshBalance = () => {
    const now = Date.now();
    setLastFetchTime(now);
    refetchSessionBalance();
  };

  if (!isOpen || !mounted) return null;

  // Only check for funding if we have a valid balance (not while loading)
  const needsFunding = sessionAddress && !isFetchingBalance && parseFloat(sessionBalance) === 0;

  const modalContent = (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-xl max-w-lg w-full shadow-2xl animate-[fadeIn_0.2s_ease-in-out] relative transform scale-100">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xl font-bold text-white">
                {currentUserUsername ? currentUserUsername : 'Account Settings'}
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                {currentUserUsername ? 'Manage your profile and wallet settings' : 'Set a username and manage your wallet settings'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors transform hover:rotate-90 duration-300"
              aria-label="Close modal"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          {/* Wallet Section */}
          <div className="mb-6 p-4 bg-gray-900/50 rounded-lg border border-gray-700 space-y-4">
            {/* Main Wallet */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm text-gray-400">Connected Wallet</span>
              <button
                onClick={handleLogout}
                className="text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                Disconnect
              </button>
            </div>
            <button 
                onClick={() => copyAddress(address ?? null, 'main')}
                className="w-full text-left px-3 py-2 bg-gray-800/50 rounded-lg hover:bg-gray-700/50 transition-colors group relative"
                title="Click to copy main wallet address"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm text-gray-300">
                    {address ? formatAddress(address) : 'No address connected'}
                  </span>
                  <div className="flex items-center gap-2">
                    {copySuccessMain && (
                      <span className="text-xs text-green-400 animate-pulse-once">Copied!</span>
                    )}
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 group-hover:text-primary transition-colors">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  </div>
                </div>
              </button>
            </div>

            {/* Session Key */}
            {sessionAddress && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-gray-400 flex items-center gap-1.5">
                     Session Key
                     <span data-tooltip-id="session-key-tooltip" data-tooltip-content="Used for gasless transactions after initial setup.">
                       <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="16" x2="12" y2="12"></line>
                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                      </svg>
                     </span>
                  </span>
                  <div className="h-5 flex items-center gap-2">
                    <button 
                      onClick={handleRefreshBalance}
                      className={`text-xs ${isFetchingBalance ? 'text-gray-500' : 'text-blue-400 hover:text-blue-300'} transition-colors`}
                      disabled={isFetchingBalance}
                    >
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        width="12" 
                        height="12" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                        className={`${isFetchingBalance ? 'animate-spin' : ''}`}
                      >
                        <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                      </svg>
                    </button>
                    <span className={`text-xs ${isFetchingBalance ? 'text-gray-500' : 'text-gray-300'}`}>
                      Balance: {isFetchingBalance ? 'Loading...' : `${parseFloat(sessionBalance).toFixed(4)} ETH`}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => copyAddress(sessionAddress, 'session')}
                  className={`w-full text-left px-3 py-2 bg-gray-800/50 rounded-lg hover:bg-gray-700/50 transition-colors group relative border ${needsFunding ? 'border-amber-500/50' : 'border-transparent'}`}
                  title="Click to copy session key address"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm text-gray-300">
                      {formatAddress(sessionAddress)}
                    </span>
                    <div className="flex items-center gap-2">
                      {copySuccessSession && (
                        <span className="text-xs text-green-400 animate-pulse-once">Copied!</span>
                      )}
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 group-hover:text-primary transition-colors">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                    </div>
                  </div>
                </button>

                {/* Session Key Backup Section */}
                <div className="mt-2 p-3 bg-gray-800/80 border border-gray-700/60 rounded-lg text-xs">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-300 font-medium">Backup Private Key</span>
                    <button
                      onClick={toggleShowPrivateKey}
                      className="text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      {showPrivateKey ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  
                  {showPrivateKey ? (
                    <div className="relative">
                      <div className="p-2 bg-gray-900 rounded border border-gray-700 font-mono text-xs break-all text-gray-300 max-h-20 overflow-y-auto">
                        {getSessionKey() || 'No key available'}
                      </div>
                      <button
                        onClick={copyPrivateKey}
                        className="absolute top-2 right-2 text-gray-400 hover:text-white p-1 bg-gray-800/70 rounded transition-colors"
                        title="Copy private key"
                      >
                        {copySuccessKey ? (
                          <span className="text-green-400">✓</span>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                          </svg>
                        )}
                      </button>
                    </div>
                  ) : (
                    <p className="text-amber-300 flex items-start gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                      </svg>
                      <span>Store this key safely to recover your session wallet. Never share it with anyone!</span>
                    </p>
                  )}
                </div>
                
                {needsFunding && (
                  <div className="mt-2 p-3 bg-amber-900/30 border border-amber-800/40 rounded-lg text-xs text-amber-200 flex items-start gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5 text-amber-400">
                      <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                    <span>Your session key needs ETH to send transactions. Copy the address above and send a small amount (e.g., 0.001 ETH) from your main wallet or a faucet.</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Username Section */}
          <form onSubmit={handleSetUsername} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="username" className="block text-sm font-medium text-gray-300">
                  Username
                </label>
                <div className="h-5">
                  {currentUserUsername && !isLoadingUsername && (
                    <div className="text-xs text-blue-400 flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path>
                        <path d="m9 12 2 2 4-4"></path>
                      </svg>
                      <span>Current: {currentUserUsername}</span>
                    </div>
                  )}
                  {isLoadingUsername && (
                    <div className="text-xs text-gray-400 flex items-center gap-1">
                      <div className="w-3 h-3 border-2 border-t-transparent border-blue-400 rounded-full animate-spin"></div>
                      <span>Loading...</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-blue-600/20 rounded-lg blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                <input
                  type="text"
                  id="username"
                  placeholder={currentUserUsername ? "Enter new username to update..." : "Enter username..."}
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  disabled={isSettingUsername}
                  className="relative w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-300 disabled:opacity-50 pr-16"
                  maxLength={32}
                />
                {/* Minimalistic update button inside input */}
                {newUsername.trim() && !isSettingUsername && (!currentUserUsername || (currentUserUsername && newUsername !== currentUserUsername)) && (
                  <button
                    type="submit"
                    className="absolute top-1/2 right-3 transform -translate-y-1/2 h-8 w-8 bg-blue-600 hover:bg-blue-500 rounded-full flex items-center justify-center transition-colors"
                    title={currentUserUsername ? "Update username" : "Set username"}
                  >
                    {currentUserUsername ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5"/>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    )}
                  </button>
                )}
                
                {isSettingUsername && (
                  <div className="absolute top-1/2 right-3 transform -translate-y-1/2 h-8 w-8 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-t-transparent border-blue-400 rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
              <p className="mt-2 text-xs text-gray-400 flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                {currentUserUsername 
                  ? "Update your username or leave unchanged to keep current" 
                  : "Your username will be publicly visible and stored on-chain"}
              </p>
            </div>
          </form>
        </div>
        <Tooltip id="session-key-tooltip" place="top" />
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
} 