'use client';

import { useAccount } from 'wagmi';
import { useWalletWagmi } from '../../hooks/useWalletWagmi';
import { useWalletModal } from '../../context/WalletModalContext';

export default function WalletButton() {
  const { address, isConnected } = useAccount();
  const { 
    disconnect, 
    isPending: isWagmiPending,
  } = useWalletWagmi();
  const { setIsModalOpen } = useWalletModal();

  const displayAddress = address
    ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
    : '';

  const handleConnect = () => {
    if (isWagmiPending) return;
    setIsModalOpen(true);
  };

  const handleDisconnect = () => {
    if (isWagmiPending) return;
    disconnect();
  };

  const isLoading = isWagmiPending;

  return (
    <div className="relative group z-10">
      {isConnected ? (
        <button 
          onClick={handleDisconnect}
          disabled={isLoading}
          className="flex items-center gap-2 px-3.5 py-2 bg-gray-800/80 hover:bg-gray-700/90 text-white rounded-xl backdrop-blur-sm border border-gray-700/50 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
          )}
          <span className="text-sm font-medium text-gray-100">
            {isLoading ? 'Processing...' : displayAddress}
          </span>
          {!isLoading && (
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          )}
        </button>
      ) : (
        <button 
          onClick={handleConnect}
          disabled={isLoading}
          className="flex items-center gap-2 px-3.5 py-2 bg-primary/90 hover:bg-primary text-white rounded-xl shadow-md shadow-primary/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="5" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="2" y1="10" x2="22" y2="10"></line>
            </svg>
          )}
          <span className="text-sm font-medium">
            {isLoading ? 'Processing...' : 'Connect Wallet'}
          </span>
        </button>
      )}
    </div>
  );
}

 