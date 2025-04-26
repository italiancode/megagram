'use client';

import React, { createContext, useContext, useState } from 'react';
import { createConfig, WagmiProvider } from 'wagmi';
import { WalletModalProvider, useWalletModal } from '../context/WalletModalContext';
import WalletOptionsModal from '../components/web3/WalletOptionsModal';
import { http } from 'viem';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { injected } from 'wagmi/connectors';
import { walletConnect } from 'wagmi/connectors';
import { baseSepolia } from 'viem/chains';
import { AVAILABLE_NETWORKS, getActiveNetwork, setActiveNetwork } from '../config/chains';

// Type declarations for wallet providers
interface EthereumProvider {
  isMetaMask?: boolean;
  isCoinbaseWallet?: boolean;
  request?: (...args: any[]) => Promise<any>;
  on?: (...args: any[]) => void;
  removeListener?: (...args: any[]) => void;
}

// Access ethereum without modifying the Window interface
type WindowWithEthereum = Window & { ethereum?: EthereumProvider };
function getEthereumProvider(): EthereumProvider | undefined {
  return typeof window !== 'undefined' 
    ? (window as WindowWithEthereum).ethereum 
    : undefined;
}

// Get project ID from environment variable
const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '';

// Create network context for switching networks
type NetworkContextType = {
  activeNetwork: typeof AVAILABLE_NETWORKS[0];
  switchNetwork: (networkId: string) => void;
};

export const NetworkContext = createContext<NetworkContextType>({
  activeNetwork: AVAILABLE_NETWORKS[0],
  switchNetwork: () => {},
});

export const useNetwork = () => useContext(NetworkContext);

// Create WagmiProvider component
export function Providers({ children }: { children: React.ReactNode }) {
  // State for active network
  const [activeNetwork, setActiveNetworkState] = useState(() => getActiveNetwork());

  // Function to switch networks
  const switchNetwork = (networkId: string) => {
    const newNetwork = setActiveNetwork(networkId);
    setActiveNetworkState(newNetwork);
  };

  // Set up network context value
  const networkContextValue = {
    activeNetwork,
    switchNetwork,
  };
  
  // Create wagmi config with the active network chain
  const config = createConfig({
    chains: [activeNetwork.chain],
    transports: {
      [activeNetwork.chain.id]: http(activeNetwork.chain.rpcUrls.default.http[0]),
    },
    connectors: [
      injected({
        target: 'metaMask',
      }),
      ...(walletConnectProjectId && walletConnectProjectId !== 'default-project-id'
        ? [
            walletConnect({
              projectId: walletConnectProjectId,
              showQrModal: true,
            })
          ]
        : [])
    ],
  });

  // Create a query client
  const queryClient = new QueryClient();

  return (
    <NetworkContext.Provider value={networkContextValue}>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <WalletModalProvider>
            {children}
            <WalletModalWrapper />
          </WalletModalProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </NetworkContext.Provider>
  );
}

// Wrapper component to handle the modal
function WalletModalWrapper() {
  const { isModalOpen, setIsModalOpen } = useWalletModal();   
  return (
    <WalletOptionsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
  );
}