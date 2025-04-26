import { ethers } from "hardhat";

// Import ABI from contract artifacts
const abi = [
  {
    type: "event",
    name: "DirectMessageSent",
    inputs: [
      { type: "address", name: "from", indexed: true },
      { type: "address", name: "to", indexed: true },
      { type: "string", name: "content", indexed: false },
      { type: "uint256", name: "timestamp", indexed: false },
    ],
  },
  {
    type: "function",
    name: "sendDirectMessage",
    inputs: [
      { type: "address", name: "to" },
      { type: "string", name: "content" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "sendGroupMessage",
    inputs: [
      { type: "string", name: "groupId" },
      { type: "string", name: "content" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "createGroup",
    inputs: [
      { type: "string", name: "groupId" },
      { type: "string", name: "name" },
      { type: "address[]", name: "members" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setUsername",
    inputs: [{ type: "string", name: "username" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getDirectMessages",
    inputs: [{ type: "address", name: "with" }],
    outputs: [
      {
        type: "tuple[]",
        components: [
          { type: "address", name: "sender" },
          { type: "string", name: "content" },
          { type: "uint256", name: "timestamp" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getGroupMessages",
    inputs: [{ type: "string", name: "groupId" }],
    outputs: [
      {
        type: "tuple[]",
        components: [
          { type: "address", name: "sender" },
          { type: "string", name: "content" },
          { type: "uint256", name: "timestamp" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getRecentChats",
    inputs: [],
    outputs: [
      {
        type: "tuple[]",
        components: [
          { type: "address", name: "user" },
          { type: "string", name: "lastMessage" },
          { type: "uint256", name: "timestamp" },
        ],
      },
    ],
    stateMutability: "view",
  },
];

async function main() {
  // Get signers
  const signers = await ethers.getSigners();
  if (signers.length < 2) {
    throw new Error("Not enough signers available. Need at least 2 accounts.");
  }

  const [deployer, recipient] = signers;
  console.log("Testing with deployer account:", deployer.address);
  console.log("Testing with recipient account:", recipient.address);

  // Get the contract address from .env
  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  if (!contractAddress) {
    throw new Error("Contract address not found in .env file");
  }

  // Get the contract with ABI
  const chat = new ethers.Contract(contractAddress, abi, deployer);

  try {
    // Test 1: Set username
    console.log("\n1. Testing setUsername...");
    const username = "TestUser";
    let tx = await chat.setUsername(username);
    await tx.wait();
    console.log("Username set successfully to:", username);

    // Test 2: Send direct message
    console.log("\n2. Testing sendDirectMessage...");
    const message = "Hello! This is a test message.";
    console.log(`Sending message "${message}" to ${recipient.address}`);
    tx = await chat.sendDirectMessage(recipient.address, message);
    await tx.wait();
    console.log("Direct message sent successfully to:", recipient.address);

    // Test 3: Create group
    console.log("\n3. Testing createGroup...");
    const groupId = "test-group-1";
    const groupName = "Test Group";
    const members = [recipient.address];
    tx = await chat.createGroup(groupId, groupName, members);
    await tx.wait();
    console.log("Group created successfully:", groupName);

    // Test 4: Send group message
    console.log("\n4. Testing sendGroupMessage...");
    tx = await chat.sendGroupMessage(groupId, "Hello group members!");
    await tx.wait();
    console.log("Group message sent successfully to group:", groupId);

    // Test 5: Fetch recent chats
    console.log("\n5. Testing getRecentChats...");
    const recentChats = await chat.getRecentChats();
    console.log("Recent chats:", recentChats);

    // Test 6: Fetch direct messages
    console.log("\n6. Testing getDirectMessages...");
    const messages = await chat.getDirectMessages(recipient.address);
    console.log("Direct messages with", recipient.address + ":", messages);

    // Test 7: Fetch group messages
    console.log("\n7. Testing getGroupMessages...");
    const groupMessages = await chat.getGroupMessages(groupId);
    console.log("Group messages for group", groupId + ":", groupMessages);

    console.log("\nAll tests completed successfully!");

  } catch (error: any) {
    console.error("\nTest failed with error:", error);
    if (error.reason) {
      console.error("Reason:", error.reason);
    }
    if (error.data) {
      console.error("Error data:", error.data);
    }
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 