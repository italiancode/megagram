import { ethers } from "hardhat";

async function main() {
  console.log("Deploying MegaChat contract...");

  const MegaChat = await ethers.getContractFactory("MegaChat");
  const megaChat = await MegaChat.deploy();

  await megaChat.waitForDeployment();
  const address = await megaChat.getAddress();

  console.log(`MegaChat deployed to: ${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 