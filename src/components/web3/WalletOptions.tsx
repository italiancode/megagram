import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import WalletOptionsModal from './WalletOptionsModal';

interface WalletOptionsProps {
  className?: string;
  label?: string;
  showAddress?: boolean;
}

const WalletOptions = ({
  className = '',
  label = 'Connect Wallet',
  showAddress = false,
}: WalletOptionsProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { address, isConnected } = useAccount();
  const [connectionState, setConnectionState] = useState<'connected' | 'disconnected'>(isConnected ? 'connected' : 'disconnected');

  // Handle connection state changes with a small delay for smooth transitions
  useEffect(() => {
    if (isConnected) {
      setConnectionState('connected');
    } else {
      // Small delay to ensure proper transition
      const timer = setTimeout(() => {
        setConnectionState('disconnected');
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isConnected]);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  // Format address for display
  const formattedAddress = address
    ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
    : '';

  return (
    <>
      <button
        onClick={openModal}
        className={`group relative flex items-center gap-2 rounded-lg font-medium overflow-hidden transition-all duration-300 hover:shadow-lg px-4 py-2.5 ${
          connectionState === 'connected'
            ? 'bg-gray-800/60 border border-gray-700/50 hover:bg-gray-700/70 text-white hover:translate-y-[-2px]' 
            : 'bg-gradient-to-r from-primary to-blue-600 text-white hover:shadow-primary/20 hover:translate-y-[-2px]'
        } ${className}`}
      >
        {connectionState === 'connected' ? (
          <>
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/10 to-blue-600/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            <span className="relative z-10">{showAddress ? formattedAddress : 'Connected'}</span>
          </>
        ) : (
          <>
            <div className="absolute -inset-1 rounded-lg opacity-30 animate-pulse transition-opacity group-hover:opacity-80 z-0 bg-primary"></div>
            <span className="text-lg relative z-10 transition-transform group-hover:scale-110 duration-300">🔌</span>
            <span className="relative z-10">{label}</span>
          </>
        )}
      </button>

      <WalletOptionsModal isOpen={isModalOpen} onClose={closeModal} />
    </>
  );
};

export default WalletOptions; 