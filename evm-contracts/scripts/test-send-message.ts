import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Testing with account:", deployer.address);

  // Get the contract address from .env
  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  if (!contractAddress) {
    throw new Error("Contract address not found in .env file");
  }

  // Get the contract
  const MegaChat = await ethers.getContractFactory("MegaChat");
  const chat = MegaChat.attach(contractAddress);

  // Test recipient address (replace with a real address you want to test with)
  const testRecipient = "0x604271D00E99EB218b29AA24714d05cec83984a6"; // Your connected wallet address

  try {
    console.log("Sending test message...");
    const tx = await chat.sendDirectMessage(testRecipient, "Hello! This is a test message from the contract.");
    await tx.wait();
    console.log("Message sent successfully!");

    console.log("Fetching recent chats...");
    const recentChats = await chat.getRecentChats();
    console.log("Recent chats:", recentChats);

  } catch (error) {
    console.error("Error:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 