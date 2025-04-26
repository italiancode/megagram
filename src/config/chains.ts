import { defineChain } from 'viem';
import { base, baseSepolia } from 'viem/chains';

// Using rewrite URL to avoid CORS issues
// This gets rewritten to the actual RPC endpoint via next.config.ts
export const megaEth = defineChain({
  id: 6342,
  name: 'MegaETH Testnet',
  network: 'megaeth-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'MegaETH',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['/api/rpc'] },
    public: { http: ['/api/rpc'] },
  },
  blockExplorers: {
    default: { name: 'MegaETH Explorer', url: 'https://www.megaexplorer.xyz' },
  },
  testnet: true,
  contracts: {
    megaChat: {
      address: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_MEGAETH || '',
    },
  },
});

// Define the Base Sepolia testnet chain with our deployed contract
export const baseSepoliaExtended = {
  ...baseSepolia,
  contracts: {
    megaChat: {
      address: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_BASE || process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '',
    },
  },
};

// Network configuration type
export type NetworkConfig = {
  id: string;
  name: string;
  chain: any;
  contractAddress: string;
  enabled: boolean;
};

// Available networks in the application
export const AVAILABLE_NETWORKS: NetworkConfig[] = [
  {
    id: 'megaeth',
    name: 'MegaETH Testnet',
    chain: megaEth,
    contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_MEGAETH || process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '',
    enabled: true,
  },
  {
    id: 'base-sepolia',
    name: 'Base Sepolia',
    chain: baseSepoliaExtended,
    contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_BASE || process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '',
    enabled: true,
  },
];

// Get current active network from localStorage or default to Base Sepolia
export function getActiveNetwork(): NetworkConfig {
  if (typeof window === 'undefined') {
    return AVAILABLE_NETWORKS.find(n => n.id === 'base-sepolia') || AVAILABLE_NETWORKS[0];
  }
  
  const savedNetworkId = localStorage.getItem('megachat-active-network');
  const network = AVAILABLE_NETWORKS.find(n => n.id === savedNetworkId);
  
  return network || AVAILABLE_NETWORKS.find(n => n.id === 'base-sepolia') || AVAILABLE_NETWORKS[0];
}

// Set active network in localStorage
export function setActiveNetwork(networkId: string): NetworkConfig {
  if (typeof window !== 'undefined') {
    localStorage.setItem('megachat-active-network', networkId);
  }
  
  const network = AVAILABLE_NETWORKS.find(n => n.id === networkId);
  return network || getActiveNetwork();
}