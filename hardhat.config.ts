import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-ethers";
import "dotenv/config";

// Ensure the private key is properly formatted
const PRIVATE_KEY = process.env.PRIVATE_KEY?.startsWith("0x")
  ? process.env.PRIVATE_KEY.slice(2)
  : process.env.PRIVATE_KEY;

if (!PRIVATE_KEY) {
  console.warn("⚠️  Please set PRIVATE_KEY in your .env file!");
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },

  paths: {
    sources: "./evm-contracts/contracts",
    tests: "./evm-contracts/test",
    cache: "./evm-contracts/cache",
    artifacts: "./evm-contracts/artifacts",
  },

  networks: {
    megaeth: {
      url: "https://carrot.megaeth.com/rpc",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 6342,
      timeout: 180000, // 3 minute timeout
      gas: 3000000,     // 3M gas limit to safely cover the ~2.5M used in your successful deployment
      gasPrice: 3500000, // 0.0035 Gwei - matching your successful deployment
      gasMultiplier: 1.1 // Slight multiplier for safety
    },
    base_sepolia: {
      url: "https://sepolia.base.org",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 84532,
      gasPrice: 'auto',
      timeout: 120000 // 2 minute timeout
    },
    hardhat: {
      chainId: 31337,
    },
  },

  etherscan: {
    apiKey: {
      megaeth: process.env.MEGAETH_API_KEY || "",
    },
    customChains: [
      {
        network: "megaeth",
        chainId: 6342,
        urls: {
          apiURL: "https://www.megaexplorer.xyz/api",
          browserURL: "https://www.megaexplorer.xyz",
        },
      },
    ],
  },

  mocha: {
    timeout: 40000, // 40 seconds for running tests
  },

  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  },
};

export default config;
