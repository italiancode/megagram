'use client';

import { useConnect, useAccount, useDisconnect } from 'wagmi'
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { getWalletIcon } from '../../utils/wallet';

// Helper function to sanitize error messages
const sanitizeErrorMessage = (error: Error | null): string => {
  if (!error) return ''
  
  const message = error.message || 'An unknown error occurred'
  
  // Handle common wallet connection errors
  if (message.includes('User rejected')) {
    return 'Connection rejected. Please try again.'
  }
  
  if (message.includes('Already processing')) {
    return 'A connection is already in progress.'
  }
  
  return message.length > 100 ? `${message.substring(0, 100)}...` : message
}

interface WalletOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WalletOptionsModal = ({ isOpen, onClose }: WalletOptionsModalProps) => {
  const { connectors, connect, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const [hasBrowserWallet, setHasBrowserWallet] = useState(false);
  const [connectingTo, setConnectingTo] = useState<string | null>(null);

  useEffect(() => {
    // Check if any ethereum provider exists in the window object
    const hasEthereumProvider = typeof window !== 'undefined' && !!window.ethereum;
    setHasBrowserWallet(hasEthereumProvider);
    
    // Debug available connectors
    console.log('Available connectors:', connectors.map(c => ({ id: c.id, name: c.name })));
  }, [connectors]);

  // If there was an error, log it
  useEffect(() => {
    if (error) {
      console.error('Wallet connection error:', error);
    }
  }, [error]);

  if (!isOpen) return null;

  // Make sure we show each distinct wallet option exactly once
  // Use a Set to track seen connector types
  const seenConnectorTypes = new Set<string>();
  const filteredConnectors = connectors.filter(connector => {
    // Skip if we've already seen this wallet type
    if (seenConnectorTypes.has(connector.name)) {
      return false;
    }
    
    // Add to seen set
    seenConnectorTypes.add(connector.name);
    return true;
  });
  
  const handleConnect = async (connector: any) => {
    setConnectingTo(connector.id);
    try {
      await connect({ connector });
      onClose();
    } catch (err) {
      console.error('Connection error:', err);
    }
    setConnectingTo(null);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4 animate-fadeIn" onClick={onClose}>
      <div 
        className="modal-content bg-gray-800 border border-gray-700 rounded-xl max-w-md w-full shadow-2xl transform transition-all animate-fadeIn animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center px-5 py-4 border-b border-gray-700">
          <h3 className="text-xl font-bold relative">
            <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              Connect Wallet
            </span>
            <div className="absolute -bottom-2 left-0 h-1 w-16 bg-gradient-to-r from-primary to-blue-600 rounded-full"></div>
          </h3>
          <button 
            className="text-gray-400 hover:text-white transition-colors transform hover:rotate-90 duration-300 p-1 rounded-full hover:bg-gray-700/50"
            onClick={onClose}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div className="p-5 flex flex-col gap-3">
          {error && (
            <div className="p-3 mb-2 bg-red-900/20 border border-red-800/30 rounded-lg">
              <p className="text-sm text-red-200">
                {sanitizeErrorMessage(error)}
              </p>
            </div>
          )}

          {filteredConnectors.length === 0 ? (
            <div className="p-4 bg-gray-700/50 rounded-lg text-center">
              <p className="text-gray-300">No wallet options available</p>
            </div>
          ) : (
            filteredConnectors.map((connector) => {
              // Custom connector name handling
              let displayName = connector.name;
              
              // Get wallet icon path
              const iconPath = getWalletIcon(connector);
              
              // Check if this connector is actively connecting
              const isConnecting = isPending && connectingTo === connector.id;

              return (
                <button
                  key={connector.id}
                  onClick={() => handleConnect(connector)}
                  className="group relative flex items-center p-4 bg-gray-700/50 border border-gray-600/50 rounded-lg hover:bg-gray-700/70 hover:-translate-y-1 transition-all text-left w-full disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 hover:shadow-lg hover:shadow-primary/10"
                  disabled={isPending}
                >
                  {/* Hover effect */}
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-primary/20 to-blue-600/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  
                  <span className="font-medium text-white relative z-10 flex items-center gap-3">
                    <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full overflow-hidden">
                      {isConnecting ? (
                        <span className="animate-spin text-primary">↻</span>
                      ) : (
                        <div className="relative w-6 h-6">
                          <Image 
                            src={iconPath}
                            alt={`${displayName} logo`}
                            width={24}
                            height={24}
                            className="object-contain"
                            onError={(e) => {
                              // Fallback to default icon if the image fails to load
                              e.currentTarget.src = '/icons/wallet-default.svg';
                            }}
                          />
                        </div>
                      )}
                    </span>
                    <span>
                      {displayName}
                      {connector.id === 'walletConnect' && ' (Mobile)'}
                      {isConnecting && ' (connecting...)'}
                    </span>
                  </span>
                </button>
              );
            })
          )}
          
          {!hasBrowserWallet && (
            <div className="mt-3 p-4 bg-amber-900/20 border border-amber-800/30 rounded-lg">
              <p className="text-sm text-amber-200">
                No browser wallet detected. Please install a wallet like MetaMask to connect.
              </p>
              <a 
                href="https://metamask.io/download/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-primary hover:text-blue-400 hover:underline mt-2 inline-block transition-colors"
              >
                Install MetaMask →
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WalletOptionsModal; 