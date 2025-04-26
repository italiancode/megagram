'use client';

import React from 'react';
import { useNetwork } from '../../providers/WagmiProvider';
import { AVAILABLE_NETWORKS } from '../../config/chains';

export default function NetworkSwitcher() {
  const { activeNetwork, switchNetwork } = useNetwork();

  return (
    <div className="flex flex-col bg-gray-800 rounded-lg p-3 shadow-md">
      <div className="text-sm font-medium text-gray-300 mb-2">Current Network</div>
      <div className="flex space-x-2">
        {AVAILABLE_NETWORKS.map((network) => (
          <button
            key={network.id}
            onClick={() => switchNetwork(network.id)}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${activeNetwork.id === network.id
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
          >
            {network.name}
          </button>
        ))}
      </div>
    </div>
  );
}
