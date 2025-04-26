// Direct deployment script using ethers without Hardhat
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuration
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const RPC_URL = 'https://carrot.megaeth.com/rpc';
const CONTRACT_PATH = path.join(
  __dirname,
  '../artifacts/evm-contracts/contracts/MegaChat.sol/MegaChat.json'
);

// Helper function to update .env file
function updateEnvFile(contractAddress) {
  const envPath = path.resolve(process.cwd(), '.env');
  let envContent = fs.readFileSync(envPath, 'utf8');
  envContent = envContent.replace(
    /NEXT_PUBLIC_CONTRACT_ADDRESS=.*/,
    `NEXT_PUBLIC_CONTRACT_ADDRESS=${contractAddress}`
  );
  fs.writeFileSync(envPath, envContent);
  console.log('Contract address saved to .env file');
}

async function main() {
  try {
    console.log('Starting direct deployment to MegaETH...');
    
    // Read contract artifacts
    const contractJson = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));
    const abi = contractJson.abi;
    const bytecode = contractJson.bytecode;
    
    // Create provider and wallet
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    
    // Get network information
    try {
      const network = await provider.getNetwork();
      console.log(`Connected to network: ${network.name} (Chain ID: ${network.chainId})`);
    } catch (error) {
      console.log('Unable to get network information, but continuing anyway');
    }
    
    // Create wallet
    let wallet;
    if (PRIVATE_KEY.startsWith('0x')) {
      wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    } else {
      wallet = new ethers.Wallet(`0x${PRIVATE_KEY}`, provider); 
    }
    
    const deployerAddress = wallet.address;
    console.log(`Deploying with account: ${deployerAddress}`);
    
    // Get balance
    try {
      const balance = await provider.getBalance(deployerAddress);
      console.log(`Deployer balance: ${ethers.formatEther(balance)} ETH`);
    } catch (error) {
      console.log('Unable to get balance, but continuing anyway');
    }
    
    // Create contract factory
    const factory = new ethers.ContractFactory(abi, bytecode, wallet);
    
    // Deploy with explicit gas settings
    const deploymentOptions = {
      gasLimit: 1000000,  // 1M gas
      gasPrice: ethers.parseUnits('2', 'gwei'),
      nonce: await provider.getTransactionCount(deployerAddress)
    };
    
    console.log('Deploying contract with options:', deploymentOptions);
    const contract = await factory.deploy(deploymentOptions);
    
    // Wait for deployment
    console.log(`Transaction hash: ${contract.deploymentTransaction().hash}`);
    console.log('Waiting for deployment transaction to be mined...');
    
    const deployedContract = await contract.waitForDeployment();
    const contractAddress = await deployedContract.getAddress();
    
    console.log(`MegaChat deployed to: ${contractAddress}`);
    
    // Update .env file
    updateEnvFile(contractAddress);
    
    console.log('Deployment successful!');
  } catch (error) {
    console.error('Deployment failed:', error);
    process.exit(1);
  }
}

// Run the deployment
main();
