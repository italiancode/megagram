import type { Message } from '../types/chat';

/**
 * Get the appropriate icon name based on message status
 * @param message The message object
 * @returns Icon name to use for the message status
 */
export const getStatusIcon = (message: Message): string => {
  switch (message.status) {
    case 'pending':
      return 'clock';
    case 'delivered':
      return 'check';
    default:
      return '';
  }
};

/**
 * Get the status text description for a message
 * @param message The message object
 * @returns Human-readable status description
 */
export const getStatusText = (message: Message): string => {
  switch (message.status) {
    case 'pending':
      return 'Sending...';
    case 'delivered':
      return 'Delivered';
    default:
      return '';
  }
};

/**
 * Determine if a message is in progress/pending
 * @param message The message object
 * @returns True if the message is still being processed
 */
export const isMessagePending = (message: Message): boolean => {
  return message.status === 'pending';
};

/**
 * Generate the appropriate blockchain explorer URL for a transaction
 * @param txHash The transaction hash
 * @param chainId The chain ID (optional)
 * @returns Explorer URL for the transaction
 */
export const getExplorerUrl = (txHash: string, chainId?: number): string => {
  // Default to Ethereum mainnet
  if (!chainId) chainId = 1;
  
  // Map of chain IDs to explorer URL templates
  const explorers: Record<number, string> = {
    1: 'https://etherscan.io/tx/',
    5: 'https://goerli.etherscan.io/tx/',
    137: 'https://polygonscan.com/tx/',
    80001: 'https://mumbai.polygonscan.com/tx/',
    // Add more chains as needed
  };
  
  const baseUrl = explorers[chainId] || explorers[1]; // Default to Ethereum
  return `${baseUrl}${txHash}`;
}; 