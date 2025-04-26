// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract MegaChat {
    // Structs
    struct MessageMetadata {
        bytes32 messageId;
        address sender;
        address recipient;
        string contentHash;
        uint256 timestamp;
        bool exists;
        address mainWallet;
    }

    struct Chat {
        bytes32[] messageIds;
        uint256 lastActivity;
        bool exists;
    }

    struct Group {
        string name;
        address[] members;
        bool exists;
        uint256 createdAt;
        address creator;
        bytes32[] messageIds;
    }

    struct RecentChat {
        address user;
        string lastMessage;
        uint256 timestamp;
    }

    // State
    mapping(address => string) public usernames;
    mapping(address => string) public publicKeys;
    mapping(bytes32 => Chat) private chats;
    mapping(bytes32 => MessageMetadata) private messages;
    mapping(address => bytes32[]) private userChatIds;
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
    event MessageSent(bytes32 indexed messageId, address indexed from, address indexed to, string contentHash, uint256 timestamp, address mainWallet);
    event ChatCreated(bytes32 indexed chatId, address indexed creator, address indexed participant);
    event UsernameSet(address indexed user, string username);
    event PublicKeySet(address indexed user, string publicKey);
    event GroupMessageSent(string indexed groupId, address indexed from, string content, uint256 timestamp);
    event GroupCreated(string indexed groupId, string name, address creator);

    // Utils
    function getChatId(address user1, address user2) public pure returns (bytes32) {
        return user1 < user2 ? keccak256(abi.encodePacked(user1, user2)) : keccak256(abi.encodePacked(user2, user1));
    }

    function generateMessageId(address from, address to, uint256 timestamp, string memory contentHash) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(from, to, timestamp, contentHash));
    }

    function isGroupMember(string memory groupId, address user) public view returns (bool) {
        address[] memory members = groups[groupId].members;
        for (uint i = 0; i < members.length; i++) {
            if (members[i] == user) return true;
        }
        return false;
    }

    // User
    function setUsername(string memory username) external {
        require(bytes(username).length > 0, "Username cannot be empty");
        usernames[msg.sender] = username;
        emit UsernameSet(msg.sender, username);
    }

    
    function getUsernameByAddress(address user) external view returns (string memory) {
        return usernames[user];
    }

    function setPublicKey(string memory publicKey) external {
        require(bytes(publicKey).length > 0, "Public key cannot be empty");
        publicKeys[msg.sender] = publicKey;
        emit PublicKeySet(msg.sender, publicKey);
    }

    // Chat
    function createChat(address participant) public returns (bytes32) {
        require(participant != address(0) && participant != msg.sender, "Invalid participant");
        bytes32 chatId = getChatId(msg.sender, participant);

        if (!chats[chatId].exists) {
            chats[chatId] = Chat(new bytes32[](0), block.timestamp, true);
            userChatIds[msg.sender].push(chatId);
            userChatIds[participant].push(chatId);
            emit ChatCreated(chatId, msg.sender, participant);
        }

        return chatId;
    }

    function sendMessage(address to, string memory contentHash, address mainWallet) external returns (bytes32) {
        require(to != address(0) && mainWallet != address(0), "Invalid address");
        require(bytes(contentHash).length > 0, "Empty message");

        bytes32 chatId = createChat(to);
        bytes32 messageId = generateMessageId(msg.sender, to, block.timestamp, contentHash);

        messages[messageId] = MessageMetadata(messageId, msg.sender, to, contentHash, block.timestamp, true, mainWallet);
        chats[chatId].messageIds.push(messageId);
        chats[chatId].lastActivity = block.timestamp;

        emit MessageSent(messageId, msg.sender, to, contentHash, block.timestamp, mainWallet);
        return messageId;
    }

    // Group
    function createGroup(string memory groupId, string memory name, address[] memory initialMembers) external {
        require(!groups[groupId].exists, "Group exists");
        require(bytes(name).length > 0, "Invalid name");

        address[] memory members = new address[](initialMembers.length + 1);
        members[0] = msg.sender;
        for (uint i = 0; i < initialMembers.length; i++) {
            members[i + 1] = initialMembers[i];
        }

        groups[groupId] = Group(name, members, true, block.timestamp, msg.sender, new bytes32[](0));
        allGroupIds.push(groupId);
        emit GroupCreated(groupId, name, msg.sender);
    }

    function sendGroupMessage(string memory groupId, string memory content) external groupExists(groupId) onlyGroupMember(groupId) {
        require(bytes(content).length > 0, "Empty content");

        bytes32 messageId = generateMessageId(msg.sender, address(this), block.timestamp, content);
        messages[messageId] = MessageMetadata(messageId, msg.sender, address(this), content, block.timestamp, true, msg.sender);
        groups[groupId].messageIds.push(messageId);

        emit GroupMessageSent(groupId, msg.sender, content, block.timestamp);
    }

    function getGroupMessages(string memory groupId) external view groupExists(groupId) onlyGroupMember(groupId) returns (MessageMetadata[] memory) {
        bytes32[] memory ids = groups[groupId].messageIds;
        MessageMetadata[] memory msgs = new MessageMetadata[](ids.length);
        for (uint i = 0; i < ids.length; i++) {
            msgs[i] = messages[ids[i]];
        }
        return msgs;
    }

    // Getters
    function getChatMessages(bytes32 chatId) public view returns (MessageMetadata[] memory) {
        require(chats[chatId].exists, "Chat not found");

        bytes32[] memory ids = chats[chatId].messageIds;
        MessageMetadata[] memory msgs = new MessageMetadata[](ids.length);
        for (uint i = 0; i < ids.length; i++) {
            msgs[i] = messages[ids[i]];
        }
        return msgs;
    }

    function getUserChats() external view returns (bytes32[] memory) {
        return userChatIds[msg.sender];
    }

    function getRecentChats() external view returns (RecentChat[] memory) {
        bytes32[] memory ids = userChatIds[msg.sender];
        RecentChat[] memory recent = new RecentChat[](ids.length);

        for (uint i = 0; i < ids.length; i++) {
            bytes32 id = ids[i];
            if (chats[id].messageIds.length > 0) {
                bytes32 lastId = chats[id].messageIds[chats[id].messageIds.length - 1];
                MessageMetadata memory msgData = messages[lastId];
                address other = msgData.sender == msg.sender ? msgData.recipient : msgData.sender;
                recent[i] = RecentChat(other, msgData.contentHash, msgData.timestamp);
            } else {
                recent[i] = RecentChat(address(0), "", 0);
            }
        }
        return recent;
    }

    function getGroupById(string memory groupId) external view groupExists(groupId) returns (
        string memory name,
        address[] memory members,
        uint256 createdAt,
        address creator
    ) {
        Group memory g = groups[groupId];
        return (g.name, g.members, g.createdAt, g.creator);
    }

    function getAllGroups() external view returns (string[] memory) {
        return allGroupIds;
    }
}
