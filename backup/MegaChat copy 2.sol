// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract MegaChat {
    // Structs
    struct MessageMetadata {
        bytes32 messageId;      // Unique message identifier
        address sender;         // Message sender (session key or main wallet)
        address recipient;      // Message recipient
        string contentHash;     // IPFS hash of the encrypted message content
        uint256 timestamp;      // Message timestamp
        bool exists;           // Message existence flag
        address mainWallet;     // Main wallet address of the sender
    }

    struct Chat {
        bytes32[] messageIds;   // Array of message IDs in this chat
        uint256 lastActivity;   // Timestamp of last activity
        bool exists;           // Chat existence flag
    }

    struct Group {
        string name;
        address[] members;
        bool exists;
        uint256 createdAt;
        address creator;
    }

    struct RecentChat {
        address user;
        string lastMessage;
        uint256 timestamp;
    }

    // State variables
    mapping(address => string) public usernames;
    mapping(bytes32 => Chat) private chats;                    // chatId => Chat
    mapping(bytes32 => MessageMetadata) private messages;      // messageId => MessageMetadata
    mapping(address => bytes32[]) private userChatIds;         // user => array of their chat IDs
    mapping(string => Group) public groups;
    string[] public allGroupIds;

    // Modifiers
    modifier groupExists(string memory groupId) {
        require(groups[groupId].exists, "Group does not exist");
        _;
    }

    modifier onlyGroupMember(string memory groupId) {
        require(isGroupMember(groupId, msg.sender), "Not a group member");
        _;
    }

    // Events
    event MessageSent(
        bytes32 indexed messageId,
        address indexed from,
        address indexed to,
        string contentHash,
        uint256 timestamp,
        address mainWallet
    );

    event ChatCreated(
        bytes32 indexed chatId,
        address indexed creator,
        address indexed participant
    );

    event UsernameSet(address indexed user, string username);

    event GroupMessageSent(string indexed groupId, address indexed from, string content, uint256 timestamp);
    event GroupCreated(string indexed groupId, string name, address creator);

    // Helper functions
    function getChatId(address user1, address user2) public pure returns (bytes32) {
        return user1 < user2 
            ? keccak256(abi.encodePacked(user1, user2))
            : keccak256(abi.encodePacked(user2, user1));
    }

    function generateMessageId(
        address from,
        address to,
        uint256 timestamp,
        string memory contentHash
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(from, to, timestamp, contentHash));
    }

    function isGroupMember(string memory groupId, address user) public view returns (bool) {
        if (!groups[groupId].exists) return false;
        
        for (uint i = 0; i < groups[groupId].members.length; i++) {
            if (groups[groupId].members[i] == user) {
                return true;
            }
        }
        return false;
    }

    // User management
    function setUsername(string memory username) external {
        require(bytes(username).length > 0, "Username cannot be empty");
        require(bytes(username).length <= 32, "Username too long");
        usernames[msg.sender] = username;
        emit UsernameSet(msg.sender, username);
    }

    function getUsernameByAddress(address user) external view returns (string memory) {
        return usernames[user];
    }

    // Chat management
    function createChat(address participant) public returns (bytes32) {
        require(participant != address(0), "Invalid participant address");
        require(participant != msg.sender, "Cannot create chat with yourself");

        bytes32 chatId = getChatId(msg.sender, participant);
        if (!chats[chatId].exists) {
            chats[chatId].exists = true;
            chats[chatId].lastActivity = block.timestamp;
            userChatIds[msg.sender].push(chatId);
            userChatIds[participant].push(chatId);
            
            emit ChatCreated(chatId, msg.sender, participant);
        }
        
        return chatId;
    }

    // Message handling
    function sendMessage(
        address to,
        string memory contentHash,
        address mainWallet
    ) external returns (bytes32) {
        require(to != address(0), "Invalid recipient");
        require(bytes(contentHash).length > 0, "Content hash cannot be empty");
        require(mainWallet != address(0), "Invalid main wallet address");
        
        // Get or create chat
        bytes32 chatId = getChatId(msg.sender, to);
        if (!chats[chatId].exists) {
            createChat(to);
        }

        // Create message metadata
        bytes32 messageId = generateMessageId(msg.sender, to, block.timestamp, contentHash);
        MessageMetadata memory metadata = MessageMetadata({
            messageId: messageId,
            sender: msg.sender,
            recipient: to,
            contentHash: contentHash,
            timestamp: block.timestamp,
            exists: true,
            mainWallet: mainWallet
        });

        // Store message metadata
        messages[messageId] = metadata;
        chats[chatId].messageIds.push(messageId);
        chats[chatId].lastActivity = block.timestamp;

        // Emit event
        emit MessageSent(
            messageId,
            msg.sender,
            to,
            contentHash,
            block.timestamp,
            mainWallet
        );

        return messageId;
    }

    // Getters
    function getChatMessages(bytes32 chatId) public view returns (MessageMetadata[] memory) {
        require(chats[chatId].exists, "Chat does not exist");
        
        bytes32[] memory messageIds = chats[chatId].messageIds;
        MessageMetadata[] memory chatMessages = new MessageMetadata[](messageIds.length);
        
        for (uint i = 0; i < messageIds.length; i++) {
            chatMessages[i] = messages[messageIds[i]];
        }
        
        return chatMessages;
    }

    function getUserChats() external view returns (bytes32[] memory) {
        return userChatIds[msg.sender];
    }

    function getMessageMetadata(bytes32 messageId) external view returns (MessageMetadata memory) {
        require(messages[messageId].exists, "Message does not exist");
        return messages[messageId];
    }

    function getChatMetadata(bytes32 chatId) external view returns (
        uint256 messageCount,
        uint256 lastActivity,
        bool exists
    ) {
        Chat memory chat = chats[chatId];
        return (
            chat.messageIds.length,
            chat.lastActivity,
            chat.exists
        );
    }

    // Group management
    function createGroup(
        string memory groupId,
        string memory name,
        address[] memory initialMembers
    ) external {
        require(!groups[groupId].exists, "Group already exists");
        require(bytes(name).length > 0, "Name cannot be empty");
        
        address[] memory members = new address[](initialMembers.length + 1);
        members[0] = msg.sender;
        for (uint i = 0; i < initialMembers.length; i++) {
            members[i + 1] = initialMembers[i];
        }
        
        groups[groupId] = Group(name, members, true, block.timestamp, msg.sender);
        allGroupIds.push(groupId);
        
        emit GroupCreated(groupId, name, msg.sender);
    }

    function sendGroupMessage(string memory groupId, string memory content) external 
        groupExists(groupId) 
        onlyGroupMember(groupId)
    {
        require(bytes(content).length > 0, "Empty message");
        
        emit GroupMessageSent(groupId, msg.sender, content, block.timestamp);
    }

    function getGroupMessages(string memory groupId) external view 
        groupExists(groupId) 
        onlyGroupMember(groupId) 
        returns (MessageMetadata[] memory) 
    {
        return new MessageMetadata[](0); // Placeholder return
    }

    function getGroupById(string memory groupId) external view 
        groupExists(groupId) 
        returns (
            string memory name,
            address[] memory members,
            uint256 createdAt,
            address creator
        ) 
    {
        Group memory group = groups[groupId];
        return (group.name, group.members, group.createdAt, group.creator);
    }

    function getAllGroups() external view returns (string[] memory) {
        return allGroupIds;
    }

    // Recent chats
    function getRecentChats() external view returns (RecentChat[] memory) {
        bytes32[] memory chatIds = userChatIds[msg.sender];
        RecentChat[] memory recentChats = new RecentChat[](chatIds.length);
        
        for (uint i = 0; i < chatIds.length; i++) {
            bytes32 chatId = chatIds[i];
            MessageMetadata[] memory chatMessages = getChatMessages(chatId);
            
            if (chatMessages.length > 0) {
                MessageMetadata memory lastMessage = chatMessages[chatMessages.length - 1];
                address otherUser = lastMessage.sender == msg.sender ? lastMessage.recipient : lastMessage.sender;
                recentChats[i] = RecentChat(
                    otherUser,
                    lastMessage.contentHash,
                    lastMessage.timestamp
                );
            } else {
                // If no messages, use the other participant from any existing message
                address otherUser = address(0);
                if (chatMessages.length > 0) {
                    otherUser = chatMessages[0].sender == msg.sender ? chatMessages[0].recipient : chatMessages[0].sender;
                }
                recentChats[i] = RecentChat(
                    otherUser,
                    "",
                    0
                );
            }
        }
        
        return recentChats;
    }
}