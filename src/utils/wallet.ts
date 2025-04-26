// Utility functions for wallet connection and display

/**
 * Utility functions for wallet handling
 */

/**
 * Get the appropriate icon for a wallet connector
 * @param connector The wallet connector object
 * @returns The path to the wallet icon
 */
export function getWalletIcon(connector: { id?: string; name?: string }): string {
  if (!connector) return '/icons/wallet-default.svg';
  
  // Map of connector IDs to icon paths
  const connectorIcons: Record<string, string> = {
    metaMask: '/icons/metamask.svg',
    coinbaseWallet: '/icons/coinbase.svg',
    walletConnect: '/icons/walletconnect.svg',
    trustWallet: '/icons/trustwallet.svg',
    ledger: '/icons/ledger.svg',
    safe: '/icons/safe.svg',
    brave: '/icons/brave-wallet.svg',
    okx: '/icons/okx-wallet.svg',
    tokenpocket: '/icons/tokenpocket.svg',
    bitkeep: '/icons/bitkeep.svg',
    injected: '/icons/injected.svg',
  };

  // Check for connector ID match first
  if (connector.id && connectorIcons[connector.id]) {
    console.log(`Found icon for connector ID: ${connector.id}`);
    return connectorIcons[connector.id];
  }

  // Check for connector name match if ID doesn't match
  const nameLower = connector.name?.toLowerCase() || '';
  console.log(`Checking name match for: ${nameLower}`);
  
  if (nameLower.includes('metamask')) {
    return '/icons/metamask.svg';
  }
  
  if (nameLower.includes('coinbase')) {
    return '/icons/coinbase.svg';
  }
  
  if (nameLower.includes('wallet connect') || nameLower.includes('walletconnect')) {
    return '/icons/walletconnect.svg';
  }
  
  if (nameLower.includes('trust')) {
    return '/icons/trustwallet.svg';
  }
  
  if (nameLower.includes('ledger')) {
    return '/icons/ledger.svg';
  }
  
  if (nameLower.includes('safe')) {
    return '/icons/safe.svg';
  }

  if (nameLower.includes('brave')) {
    return '/icons/brave-wallet.svg';
  }

  if (nameLower.includes('okx')) {
    return '/icons/okx-wallet.svg';
  }

  if (nameLower.includes('tokenpocket')) {
    return '/icons/tokenpocket.svg';
  }

  if (nameLower.includes('bitkeep')) {
    return '/icons/bitkeep.svg';
  }

  // Log if no matching wallet was found
  console.log(`No matching wallet icon found for connector: ${connector.id} (${connector.name})`);
  
  // Default icon for unknown wallets
  return '/icons/wallet-default.svg';
}

/**
 * Check if MetaMask is installed in the browser
 * @returns Boolean indicating if MetaMask is installed
 */
export function isMetaMaskInstalled(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  
  const { ethereum } = window as any;
  return Boolean(ethereum && ethereum.isMetaMask);
} 