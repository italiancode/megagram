import { ethers } from "hardhat";
import { writeFileSync, readFileSync } from "fs";
import { resolve } from "path";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import * as hre from "hardhat";

async function main() {
  console.log("Deploying MegaChat contract...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  // Check deployer balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", ethers.formatEther(balance), "ETH");

  const MegaChat = await ethers.getContractFactory("MegaChat");
  const megaChat = await MegaChat.deploy();

  console.log("Waiting for deployment...");
  await megaChat.waitForDeployment();
  const address = await megaChat.getAddress();

  console.log(`MegaChat deployed to: ${address}`);
  
  // Save the contract address to .env file
  const envPath = resolve(process.cwd(), '.env');
  let envContent = readFileSync(envPath, 'utf8');
  envContent = envContent.replace(
    /NEXT_PUBLIC_CONTRACT_ADDRESS=.*/,
    `NEXT_PUBLIC_CONTRACT_ADDRESS=${address}`
  );
  writeFileSync(envPath, envContent);
  
  console.log('Contract address saved to .env file');

  // Verify the contract on the explorer (if API key is set)
  if (process.env.MEGAETH_API_KEY) {
    console.log('Waiting for deployment transactions to be mined...');
    const deployTx = await megaChat.deploymentTransaction();
    if (deployTx) {
      await deployTx.wait(5); // Wait for 5 block confirmations
    }

    console.log('Verifying contract on MegaETH Explorer...');
    try {
      await hre.run("verify:verify", {
        address: address,
        constructorArguments: [],
      });
      console.log('Contract verified successfully');
    } catch (error) {
      console.error('Error verifying contract:', error);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });