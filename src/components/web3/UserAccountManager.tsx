'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useChat } from '@/hooks/useChat';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';

interface UserAccountManagerProps {
  variant?: 'header' | 'compact' | 'modal';
  onOpenModal?: () => void;
}

export function UserAccountManager({ variant = 'header', onOpenModal }: UserAccountManagerProps) {
  const { address } = useAccount();
  const { currentUserUsername, isLoadingUsername, fetchUsername } = useChat();
  const [isCopied, setIsCopied] = useState(false);
  const [theme, setTheme] = useState('dark');

  // Log username for debugging
  useEffect(() => {
    console.log('UserAccountManager - currentUserUsername:', currentUserUsername);
    console.log('UserAccountManager - isLoadingUsername:', isLoadingUsername);
  }, [currentUserUsername, isLoadingUsername]);

  // Refresh username when component mounts or when address changes
  useEffect(() => {
    if (address) {
      // Use a more effective caching strategy with timestamps
      const fetchKey = `username-last-fetched-${address}`;
      const lastFetched = localStorage.getItem(fetchKey);
      const now = Date.now();
      
      // Check if we should fetch (if never fetched or fetched more than 5 minutes ago)
      if (!lastFetched || now - parseInt(lastFetched) > 5 * 60 * 1000) {
        // Update the last fetched timestamp
        localStorage.setItem(fetchKey, now.toString());
        console.log('UserAccountManager - Fetching username for address:', address);
        fetchUsername(address);
      }
    }
  }, [address, fetchUsername]);

  // Force username refresh when we detect component remounts or currentUserUsername changes
  useEffect(() => {
    if (address && currentUserUsername) {
      console.log('UserAccountManager - Username updated:', currentUserUsername);
    }
  }, [address, currentUserUsername]);

  // Reset copy state
  useEffect(() => {
    if (isCopied) {
      const timer = setTimeout(() => setIsCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isCopied]);

  // Memoize derived values to prevent unnecessary re-renders
  const avatarInitials = useMemo(() => {
    return currentUserUsername
      ? currentUserUsername[0].toUpperCase()
      : address ? address.slice(2, 4).toUpperCase() : '';
  }, [currentUserUsername, address]);
  
  const displayName = useMemo(() => {
    return currentUserUsername || (address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '');
  }, [currentUserUsername, address]);

  const joinDate = useMemo(() => {
    return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, []);

  const handleClick = () => {
    if (onOpenModal) {
      onOpenModal();
    }
  };

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setIsCopied(true);
    }
  };

  const viewOnExplorer = () => {
    if (address) {
      window.open(`https://megaexplorer.xyz/address/${address}`, '_blank');
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.classList.toggle('light', newTheme === 'light');
  };

  if (!address) return null;

  if (variant === 'compact') {
    return (
      <button
        onClick={handleClick}
        disabled={isLoadingUsername}
        className="flex items-center gap-2 rounded-full p-1.5 pr-4 transition-all duration-300 hover:bg-gray-800/60 disabled:opacity-60 disabled:cursor-not-allowed group"
        aria-label="Manage profile"
        data-tooltip-id="profile-tooltip"
        data-tooltip-content="Manage your profile"
      >
        <div className="relative w-9 h-9">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
            <span className="text-white font-semibold text-sm">{avatarInitials}</span>
          </div>
          {isLoadingUsername && (
            <div className="absolute inset-0 bg-gray-900/50 rounded-full flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border border-gray-900" />
        </div>
        <div className="text-left min-w-20">
          <div className="font-semibold text-white text-sm leading-tight group-hover:text-blue-200 transition-colors">
            {displayName}
          </div>
          <div className="h-4">
            {!currentUserUsername && !isLoadingUsername && (
              <div className="text-xs text-blue-400 hover:text-blue-300 transition-colors leading-tight mt-0.5">
                Set username
              </div>
            )}
            {currentUserUsername && !isLoadingUsername && (
              <div className="text-xs text-gray-400 transition-colors leading-tight mt-0.5">
                {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''}
              </div>
            )}
          </div>
        </div>
        <Tooltip id="profile-tooltip" place="bottom" />
      </button>
    );
  }

  return (
    <div className="bg-gray-900/80 backdrop-blur-md border-b border-gray-800 rounded-xl overflow-hidden shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Profile Info */}
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="relative">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-shadow duration-300">
                <span className="text-white font-bold text-lg">{avatarInitials}</span>
              </div>
              {isLoadingUsername && (
                <div className="absolute inset-0 bg-gray-900/60 rounded-full flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
              <div
                className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-gray-900"
                data-tooltip-id="online-tooltip"
                data-tooltip-content="Online"
              />
              <Tooltip id="online-tooltip" place="right" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-white font-semibold text-lg sm:text-xl">{displayName}</h3>
                {currentUserUsername && (
                  <span className="text-xs px-2.5 py-1 bg-blue-600/20 text-blue-300 rounded-full animate-fade-in">
                    Verified
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-400 font-mono mt-1">{address}</p>
              <p className="text-xs text-gray-500 mt-0.5">Joined {joinDate}</p>
              <div className="h-7 mt-1">
                {!currentUserUsername && !isLoadingUsername && (
                  <button
                    onClick={handleClick}
                    className="mt-1 text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1.5 transition-colors animate-fade-in"
                    aria-label="Set username"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    Set your username
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {currentUserUsername && (
              <button
                onClick={handleClick}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-200 rounded-lg transition-all duration-300 shadow-sm hover:shadow-md"
                aria-label="Edit username"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                Edit Profile
              </button>
            )}
            <button
              onClick={copyAddress}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700/50 hover:bg-gray-700 text-gray-200 rounded-lg transition-all duration-300 shadow-sm hover:shadow-md"
              aria-label={isCopied ? 'Address copied' : 'Copy address'}
              data-tooltip-id="copy-tooltip"
              data-tooltip-content={isCopied ? 'Copied!' : 'Copy address'}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              {isCopied ? 'Copied' : 'Copy'}
            </button>
            <button
              onClick={viewOnExplorer}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700/50 hover:bg-gray-700 text-gray-200 rounded-lg transition-all duration-300 shadow-sm hover:shadow-md"
              aria-label="View on explorer"
              data-tooltip-id="explorer-tooltip"
              data-tooltip-content="View on MegaETH explorer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              Explorer
            </button>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700/50 hover:bg-gray-700 text-gray-200 rounded-lg transition-all duration-300 shadow-sm hover:shadow-md"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              data-tooltip-id="theme-tooltip"
              data-tooltip-content={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {theme === 'dark' ? (
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                ) : (
                  <circle cx="12" cy="12" r="5">
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </circle>
                )}
              </svg>
              {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
            <Tooltip id="copy-tooltip" place="bottom" />
            <Tooltip id="explorer-tooltip" place="bottom" />
            <Tooltip id="theme-tooltip" place="bottom" />
          </div>
        </div>
      </div>
    </div>
  );
}
