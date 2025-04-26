// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MegaChat {
    // Struct for a message
    struct Message {
        bytes32 messageId; // Unique ID for the message
        address sender; // Sender's address (session account)
        address recipient; // Recipient's address or group ID
        string contentHash; // Content of the message (stored as hash or string)
        uint256 timestamp; // Timestamp of the message
        address mainWallet; // Main wallet associated with the sender (for direct messages)
        bool exists; // Flag to indicate valid message
    }

    // Struct for recent chat tracking
    struct RecentChat {
        address user; // Other user in the chat
        string lastMessage; // Last message content
        uint256 timestamp; // Timestamp of last message
    }

    // Mappings
    mapping(address => string) private usernames; // Address to username
    mapping(address => mapping(address => bool)) private sessionWallets; // Main wallet to session wallet authorization
    mapping(bytes32 => Message[]) private chatMessages; // Chat ID to messages (direct messages)
    mapping(bytes32 => Message[]) private groupMessages; // Group ID to messages
    mapping(address => RecentChat[]) private userRecentChats; // User to their recent chats
    mapping(bytes32 => bool) private chatExists; // Track existence of chat IDs (direct and group)
    bytes32[] private allChatIds; // Store all chat IDs (direct and group)

    // Events
    event UsernameSet(address indexed user, string username);
    event MessageSent(
        bytes32 indexed chatId,
        bytes32 messageId,
        address indexed sender,
        address recipient,
        string contentHash,
        uint256 timestamp,
        address mainWallet
    );
    event GroupMessageSent(
        bytes32 indexed groupId,
        bytes32 messageId,
        address indexed sender,
        string contentHash,
        uint256 timestamp
    );
    event ChatIdCreated(bytes32 indexed chatId, bool isGroup); // New event for chat ID creation

    // Modifiers
    modifier onlyAuthorized(address mainWallet) {
        require(
            msg.sender == mainWallet || sessionWallets[mainWallet][msg.sender],
            "Unauthorized session wallet"
        );
        _;
    }

    // Set username for the caller
    function setUsername(string calldata username) external {
        require(bytes(username).length > 0, "Username cannot be empty");
        require(bytes(username).length <= 32, "Username too long");
        usernames[msg.sender] = username;
        emit UsernameSet(msg.sender, username);
    }

    // Get username by address
    function getUsernameByAddress(address user) external view returns (string memory) {
        return usernames[user];
    }

    // Authorize a session wallet
    function authorizeSessionWallet(address sessionWallet) external {
        require(sessionWallet != address(0), "Invalid session wallet");
        sessionWallets[msg.sender][sessionWallet] = true;
    }

    // Revoke a session wallet
    function revokeSessionWallet(address sessionWallet) external {
        sessionWallets[msg.sender][sessionWallet] = false;
    }

    // Compute chat ID for two users
    function getChatId(address user1, address user2) public pure returns (bytes32) {
        (address lower, address higher) = user1 < user2 ? (user1, user2) : (user2, user1);
        return keccak256(abi.encodePacked(lower, higher));
    }

    // Send a direct message
    function sendMessage(
        address recipient,
        string calldata contentHash,
        address mainWallet
    ) external onlyAuthorized(mainWallet) {
        require(recipient != address(0), "Invalid recipient");
        require(bytes(contentHash).length > 0, "Content cannot be empty");

        bytes32 chatId = getChatId(mainWallet, recipient);
        bytes32 messageId = keccak256(
            abi.encodePacked(msg.sender, recipient, contentHash, block.timestamp)
        );

        // Track chat ID if new
        if (!chatExists[chatId]) {
            chatExists[chatId] = true;
            allChatIds.push(chatId);
            emit ChatIdCreated(chatId, false);
        }

        Message memory newMessage = Message({
            messageId: messageId,
            sender: msg.sender,
            recipient: recipient,
            contentHash: contentHash,
            timestamp: block.timestamp,
            mainWallet: mainWallet,
            exists: true
        });

        chatMessages[chatId].push(newMessage);

        // Update recent chats for both users
        _updateRecentChats(mainWallet, recipient, contentHash);
        _updateRecentChats(recipient, mainWallet, contentHash);

        emit MessageSent(
            chatId,
            messageId,
            msg.sender,
            recipient,
            contentHash,
            block.timestamp,
            mainWallet
        );
    }

    // Send a group message
    function sendGroupMessage(bytes32 groupId, string calldata contentHash) external {
        require(groupId != bytes32(0), "Invalid group ID");
        require(bytes(contentHash).length > 0, "Content cannot be empty");

        // Track group ID if new
        if (!chatExists[groupId]) {
            chatExists[groupId] = true;
            allChatIds.push(groupId);
            emit ChatIdCreated(groupId, true);
        }

        bytes32 messageId = keccak256(
            abi.encodePacked(msg.sender, groupId, contentHash, block.timestamp)
        );

        Message memory newMessage = Message({
            messageId: messageId,
            sender: msg.sender,
            recipient: address(0),
            contentHash: contentHash,
            timestamp: block.timestamp,
            mainWallet: address(0),
            exists: true
        });

        groupMessages[groupId].push(newMessage);

        emit GroupMessageSent(groupId, messageId, msg.sender, contentHash, block.timestamp);
    }

    // Fetch direct chat messages
    function getChatMessages(bytes32 chatId) external view returns (Message[] memory) {
        return chatMessages[chatId];
    }

    // Fetch group messages
    function getGroupMessages(bytes32 groupId) external view returns (Message[] memory) {
        return groupMessages[groupId];
    }

    // Fetch recent chats for the caller
    function getRecentChats() external view returns (RecentChat[] memory) {
        return userRecentChats[msg.sender];
    }

    // Check if a chat ID exists
    function doesChatIdExist(bytes32 chatId) external view returns (bool) {
        return chatExists[chatId];
    }

    // Get all chat IDs
    function getAllChatIds() external view returns (bytes32[] memory) {
        return allChatIds;
    }

    // Internal function to update recent chats
    function _updateRecentChats(address user, address otherUser, string memory lastMessage) internal {
        RecentChat[] storage chats = userRecentChats[user];
        bool found = false;

        for (uint256 i = 0; i < chats.length; i++) {
            if (chats[i].user == otherUser) {
                chats[i].lastMessage = lastMessage;
                chats[i].timestamp = block.timestamp;
                found = true;
                break;
            }
        }

        if (!found) {
            chats.push(
                RecentChat({
                    user: otherUser,
                    lastMessage: lastMessage,
                    timestamp: block.timestamp
                })
            );
        }
    }
}