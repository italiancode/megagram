'use client';

import React, { createContext, useState, useContext, ReactNode } from 'react';

type ConnectionStatus = 'idle' | 'connecting' | 'success' | 'error';

interface WalletModalContextType {
  isModalOpen: boolean;
  setIsModalOpen: (isOpen: boolean) => void;
  connectionStatus: ConnectionStatus;
  setConnectionStatus: (status: ConnectionStatus) => void;
  selectedConnector: string | null;
  setSelectedConnector: (connector: string | null) => void;
}

const WalletModalContext = createContext<WalletModalContextType>({
  isModalOpen: false,
  setIsModalOpen: () => {},
  connectionStatus: 'idle',
  setConnectionStatus: () => {},
  selectedConnector: null,
  setSelectedConnector: () => {},
});

export function WalletModalProvider({ children }: { children: ReactNode }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
  const [selectedConnector, setSelectedConnector] = useState<string | null>(null);

  return (
    <WalletModalContext.Provider
      value={{
        isModalOpen,
        setIsModalOpen,
        connectionStatus,
        setConnectionStatus,
        selectedConnector,
        setSelectedConnector,
      }}
    >
      {children}
    </WalletModalContext.Provider>
  );
}

export function useWalletModal() {
  return useContext(WalletModalContext);
} 