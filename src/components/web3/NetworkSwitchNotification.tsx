"use client";

import { useState, useEffect } from "react";
import { useConfig } from "wagmi";

export function NetworkSwitchNotification() {
  const config = useConfig();
  const [chain, setChain] = useState<any>(null);
  const [showNotification, setShowNotification] = useState(false);
  
  // Get current chain
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      const updateChain = async () => {
        try {
          // Get the current chain ID from ethereum provider
          const chainId = await window.ethereum.request({ method: 'eth_chainId' });
          const chainIdNumber = parseInt(chainId, 16);
          
          // Check if chain is supported in our config
          const isSupported = config.chains.some(c => c.id === chainIdNumber);
          setChain({
            id: chainIdNumber,
            name: getChainName(chainIdNumber),
            unsupported: !isSupported
          });
        } catch (err) {
          console.error("Error getting chain:", err);
        }
      };
      
      updateChain();
      
      // Listen for chain changes
      window.ethereum.on('chainChanged', () => {
        updateChain();
      });
      
      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('chainChanged', updateChain);
        }
      };
    }
  }, [config]);
  
  // If user is on unsupported network, show notification
  useEffect(() => {
    if (chain && !chain.unsupported) {
      setShowNotification(false);
      return;
    }

    if (chain && chain.unsupported) {
      setShowNotification(true);
    }
  }, [chain]);

  // Get chain name helper
  const getChainName = (chainId: number): string => {
    const chain = config.chains.find(c => c.id === chainId);
    return chain ? chain.name : `Chain ${chainId}`;
  };
  
  // Get recommended chain (first in the list)
  const recommendedChain = config.chains.length > 0 ? config.chains[0] : null;

  // Switch network function
  const switchNetwork = async (chainId: number) => {
    if (!window.ethereum) return;
    
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
    } catch (error) {
      console.error('Failed to switch network:', error);
    }
  };

  if (!showNotification) return null;

  return (
    <>
      {showNotification && (
        <div className="fixed bottom-4 right-4 flex flex-col items-start max-w-md bg-gray-800/90 backdrop-blur-sm border border-gray-700 p-4 rounded-lg shadow-xl animate-slideIn z-50">
          <div className="flex items-start gap-3 w-full">
            <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-amber-800/30 rounded-full">
              <span className="text-amber-400 text-lg animate-pulse">⚠️</span>
            </div>
            
            <div className="flex-1">
              <p className="text-white font-semibold mb-1">
                Unsupported Network
              </p>
              <p className="text-gray-300 text-sm">
                {chain?.name ? (
                  <>
                    You're connected to <strong className="text-amber-400">{chain.name}</strong>, which is
                    not supported.
                  </>
                ) : (
                  <>You're connected to an unsupported network.</>
                )}
              </p>
              
              {recommendedChain && (
                <button
                  onClick={() => switchNetwork(recommendedChain.id)}
                  className="mt-3 group relative flex items-center gap-2 bg-gradient-to-r from-primary/90 to-blue-600/90 text-white px-4 py-2 rounded-lg hover:shadow-lg hover:shadow-primary/20 transition-all duration-300 transform hover:translate-y-[-2px] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 text-sm font-medium overflow-hidden"
                >
                  {/* Button background animation */}
                  <div className="absolute inset-0 w-full h-full transform transition-transform group-hover:scale-105 duration-300 ease-in-out"></div>
                  
                  {/* Button text */}
                  <span className="relative z-10 flex items-center gap-2">
                    <span>🔄</span>
                    <span>Switch to {recommendedChain.name}</span>
                  </span>
                </button>
              )}
            </div>
            
            <button
              onClick={() => setShowNotification(false)}
              className="flex-shrink-0 text-gray-400 hover:text-white transition-colors transform hover:rotate-90 duration-300 p-1 rounded-full hover:bg-gray-700/50"
              aria-label="Close notification"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
