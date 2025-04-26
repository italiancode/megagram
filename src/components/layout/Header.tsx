"use client";

import { useAccount, useChainId } from "wagmi";
import Link from "next/link";
import { mainnet } from "viem/chains";
import { useEffect, useState } from "react";
import { UserAccountManager } from "../web3/UserAccountManager";
import { UserAccountModal } from "../web3/UserAccountModal";
import WalletButton from "../web3/WalletButton";
import NetworkSwitcher from "../web3/NetworkSwitcher";
import { useNetwork } from "../../providers/WagmiProvider";


export function Header() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { activeNetwork } = useNetwork();
  const [scrolled, setScrolled] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showNetworkSwitcher, setShowNetworkSwitcher] = useState(false);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    // Initial check
    checkMobile();
    
    // Add resize listener
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Entrance animation
  useEffect(() => {
    setAnimateIn(true);
  }, []);

  // Get chain name
  const getChainName = () => {
    // Use activeNetwork from context if available
    if (activeNetwork) {
      return isMobile ? activeNetwork.name.split(' ')[0] : activeNetwork.name;
    }
    
    // Fallback to chainId if context not available
    if (chainId === 6342) return isMobile ? "MegaETH" : "MegaETH Testnet";
    if (chainId === 84532) return isMobile ? "Base" : "Base Sepolia";
    if (chainId === mainnet.id) return isMobile ? "Mainnet" : mainnet.name;
    return "Unknown";
  };

  // Get network badge color
  const getNetworkColor = () => {
    // Use activeNetwork ID from context
    if (activeNetwork) {
      if (activeNetwork.id === 'megaeth') return "purple-600";
      if (activeNetwork.id === 'base-sepolia') return "blue-500";
    }
    
    // Fallback to chainId
    if (chainId === 6342) return "purple-600";
    if (chainId === 84532) return "blue-500";
    if (chainId === mainnet.id) return "blue-600";
    return "red-600";
  };
  
  // Toggle network switcher visibility
  const toggleNetworkSwitcher = () => {
    setShowNetworkSwitcher(!showNetworkSwitcher);
  };

  return (
    <header
      className={` z-40 bg-gray-800/50 backdrop-blur-sm border-b border-gray-700/50 h-14 sm:h-16 flex items-center transition-colors duration-200 ${
        scrolled ? "bg-gray-800/90" : "bg-gray-800/50"
      } ${animateIn ? "opacity-100" : "opacity-0"}`}
      role="banner"
      aria-label="Site header"
    >
      <div className="w-full mx-auto px-2 sm:px-3 flex justify-between items-center">
        <Link
          href="/"
          className="text-white text-base sm:text-lg font-semibold no-underline flex items-center"
          aria-label="MegaChat home"
        >
          <div className="mr-1.5 sm:mr-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-primary/90 border border-gray-600/50 flex items-center justify-center">
              <span className="text-white text-sm sm:text-base font-bold">M</span>
            </div>
          </div>
          <span className={isMobile ? "text-sm" : ""}>Megagram</span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          {isConnected ? (
            <>
              <div
                className={`bg-gray-700/70 border border-gray-600/50 px-2 sm:px-3 py-1 sm:py-1.5 ${isMobile ? 'flex' : 'hidden sm:flex'} items-center gap-1 sm:gap-1.5 rounded relative cursor-pointer`}
                aria-label="Network status"
                onClick={toggleNetworkSwitcher}
              >
                <div
                  className={`w-1.5 h-1.5 sm:w-2 sm:h-2 bg-${getNetworkColor()} rounded-full`}
                ></div>
                <span className="text-white text-[10px] sm:text-xs text-ellipsis overflow-hidden whitespace-nowrap max-w-[80px] sm:max-w-[120px]">
                  {getChainName()}
                </span>
                {/* Network switcher dropdown */}
                {showNetworkSwitcher && (
                  <div className="absolute top-full right-0 mt-1 z-50">
                    <NetworkSwitcher />
                  </div>
                )}
              </div>

              <UserAccountManager
                variant="compact"
                onOpenModal={() => setShowAccountModal(true)}
              />
            </>
          ) : (
            <WalletButton />
          )}
        </div>
      </div>

      <UserAccountModal
        isOpen={showAccountModal}
        onClose={() => setShowAccountModal(false)}
      />
    </header>
  );
}
