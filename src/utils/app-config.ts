/**
 * Returns the appropriate wallet icon based on the connector
 */
export function getWalletIcon(connector: any): string {
  if (!connector) return '/icons/wallet-default.svg';
  
  const name = connector.name?.toLowerCase() || '';
  
  if (name.includes('metamask') || connector.id === 'metaMask') {
    return '/icons/metamask.svg';
  } else if (name.includes('brave')) {
    return '/icons/brave-wallet.svg';
  } else if (name.includes('coinbase')) {
    return '/icons/coinbase-wallet.svg';
  } else if (name.includes('trust')) {
    return '/icons/trust-wallet.svg';
  } else if (name.includes('okx')) {
    return '/icons/okx-wallet.svg';
  } else if (name.includes('wallet connect') || name.includes('walletconnect')) {
    return '/icons/walletconnect.svg';
  } else if (name.includes('tokenpocket')) {
    return '/icons/tokenpocket.svg';
  } else if (name.includes('bitkeep')) {
    return '/icons/bitkeep.svg';
  }
  
  return '/icons/wallet-default.svg';
} 