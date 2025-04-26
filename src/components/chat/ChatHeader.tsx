'use client';

import Link from 'next/link';
import { useAccount } from 'wagmi';
import { useChat } from '@/hooks/useChat';
import { useEffect, useState } from 'react';

interface ChatHeaderProps {
  title: string;
  subtitle?: string;
  address?: string;
  mainWalletAddress?: string;
  isGroup?: boolean;
  isOnline?: boolean;
  onBack?: () => void;
}

export function ChatHeader({ title, subtitle, address, mainWalletAddress, isGroup, isOnline, onBack }: ChatHeaderProps) {
  const { address: userAddress } = useAccount();
  const { fetchUsername } = useChat();
  const [username, setUsername] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const displayAddress = mainWalletAddress || address;

  // Detect mobile devices
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Reset username when address changes and fetch new username
  useEffect(() => {
    // Reset username state when address changes
    setUsername(null);
    
    if (displayAddress && !isGroup) {
      console.log('ChatHeader: Fetching username for', displayAddress);
      
      // Try to get from localStorage first for immediate display
      const cacheKey = `username_${displayAddress.toLowerCase()}`;
      const cachedUsername = localStorage.getItem(cacheKey);
      if (cachedUsername) {
        try {
          const cacheData = JSON.parse(cachedUsername);
          if (Date.now() - cacheData.timestamp < 60 * 60 * 1000) { // 1 hour cache
            setUsername(cacheData.username);
          }
        } catch (e) {
          console.error('Error parsing cached username', e);
        }
      }
      
      // Still fetch from contract to ensure we have latest
      fetchUsername(displayAddress as `0x${string}`)
        .then(name => {
          if (name) {
            console.log('ChatHeader: Username fetched', name);
            setUsername(name);
          } else {
            // If no name is returned, use shortened address
            const shortAddress = `${displayAddress.slice(0, 6)}...${displayAddress.slice(-4)}`;
            setUsername(shortAddress);
          }
        })
        .catch(error => {
          console.error('ChatHeader: Error fetching username', error);
          // In case of error, fallback to shortened address
          const shortAddress = `${displayAddress.slice(0, 6)}...${displayAddress.slice(-4)}`;
          setUsername(shortAddress);
        });
    }
  }, [displayAddress, isGroup, fetchUsername]);

  const viewOnExplorer = () => {
    if (!displayAddress) return;
    window.open(`https://megaexplorer.xyz/address/${displayAddress}`, '_blank');
  };

  const shortenAddress = (address: string) => {
    return isMobile 
      ? `${address.slice(0, 4)}...${address.slice(-4)}`
      : `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="flex items-center justify-between p-3 sm:p-4 bg-gray-800/90 backdrop-blur-sm border-b border-gray-700/60 h-16 sm:h-18 sticky top-0 z-20 w-full">
      <div className="flex items-center gap-3">
        {onBack && (
          <button 
            onClick={onBack}
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full bg-gray-700/70 hover:bg-gray-600/80 transition-all text-white"
            aria-label="Back to chat list"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width={isMobile ? "16" : "18"} height={isMobile ? "16" : "18"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center font-medium text-white text-base
              ${isGroup 
                ? 'bg-gradient-to-br from-indigo-600/80 to-purple-600/70' 
                : 'bg-gradient-to-br from-gray-600/80 to-gray-700/70'}`}
            >
              {(username || title).charAt(0).toUpperCase()}
            </div>
            
            {isOnline && !isGroup && (
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800"></div>
            )}
          </div>
          
          <div className="max-w-[calc(100vw-130px)] sm:max-w-[calc(100vw-180px)]">
            <div className="flex items-center gap-1.5">
              <h2 className="font-semibold text-sm sm:text-base text-white truncate">
                {isGroup ? (
                  <>
                    <span className="inline-flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 mr-1.5 bg-indigo-700/50 rounded-full">
                      <svg xmlns="http://www.w3.org/2000/svg" width={isMobile ? "11" : "12"} height={isMobile ? "11" : "12"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                      </svg>
                    </span>
                    {title}
                  </>
                ) : (
                  username || title
                )}
              </h2>
            </div>
            
            {displayAddress && !isGroup && (
              <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-400">
                <button 
                  onClick={viewOnExplorer}
                  className="font-mono hover:text-primary transition-colors flex items-center gap-1 bg-gray-700/50 px-2 py-1 rounded-lg group truncate max-w-[200px]"
                  title="View on blockchain explorer"
                >
                  <span>{shortenAddress(displayAddress)}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
                  </svg>
                </button>
                {isOnline && (
                  <span className="px-1.5 py-0.5 bg-green-900/20 text-green-400 rounded-full hidden sm:inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                    Online
                  </span>
                )}
              </div>
            )}
            
            {subtitle && (
              <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-400">
                <span className="truncate">{subtitle}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {isGroup && (
          <button className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full bg-gray-700/70 hover:bg-gray-600/80 transition-all text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width={isMobile ? "16" : "18"} height={isMobile ? "16" : "18"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="1"></circle>
              <circle cx="12" cy="6" r="1"></circle>
              <circle cx="12" cy="18" r="1"></circle>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
