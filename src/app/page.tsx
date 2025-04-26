"use client";

import React, { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import WalletButton from "@/components/web3/WalletButton";
import { useRouter } from "next/navigation";

import { DirectChat } from "@/components/chat/DirectChat";
import { GroupChat } from "@/components/chat/GroupChat";
import { ChatHeader } from "@/components/chat/ChatHeader";

// Define interfaces for our chat data
interface ChatItem {
  address: string;
  name: string;
  online?: boolean;
  lastMessage?: string;
  lastMessageTime?: string;
}

interface GroupItem {
  id: string;
  name: string;
  members?: string[];
  lastMessage?: string;
  lastMessageTime?: string;
}

export default function Home() {
  const router = useRouter();
  const { isConnected, address } = useAccount();
  const [activeTab, setActiveTab] = useState<"direct" | "groups">("direct");
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [isMobileView, setIsMobileView] = useState(false);
  const [showChatOnMobile, setShowChatOnMobile] = useState(false);
  const [newChatAddress, setNewChatAddress] = useState("");

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Check URL query parameters and window size
  useEffect(() => {
      const params = new URLSearchParams(window.location.search);
      const chatParam = params.get("chat");
      const groupParam = params.get("group");

      if (chatParam) {
        setSelectedChat(chatParam);
        setSelectedGroup(null);
        setActiveTab("direct");
        setShowChatOnMobile(true);
      } else if (groupParam) {
        setSelectedGroup(groupParam);
        setSelectedChat(null);
        setActiveTab("groups");
        setShowChatOnMobile(true);
      }

    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Chat data
  const [recentChats, setRecentChats] = useState<ChatItem[]>([]);

  // Initialize with dummy chat data
  useEffect(() => {
    const dummyChats: ChatItem[] = [
      {
        address: "0x604271D00E99EB218b29AA24714d05cec83984a6",
        name: "Big Dream Web3",
        online: true,
        lastMessage: "Hey, have you seen the latest proposal?",
        lastMessageTime: "10:25 AM"
      },
      {
        address: "0x6454b6501e22D762Ac4059f866af01c943881296",
        name: "Big Dreamz",
        online: true,
        lastMessage: "Working on the merge, talk later",
        lastMessageTime: "Yesterday"
      },
      {
        address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        name: "Crypto Dave",
        online: false,
        lastMessage: "Did you check out that new NFT collection?",
        lastMessageTime: "2 days ago"
      },
      {
        address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        name: "Alice Blockchain",
        online: false,
        lastMessage: "Let's meet at the hackathon this weekend",
        lastMessageTime: "Last week"
      },
      {
        address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
        name: "Bob DeFi",
        online: true,
        lastMessage: "I just deployed my new smart contract!",
        lastMessageTime: "3:45 PM"
      }
    ];
    
    setRecentChats(dummyChats);
  }, []);

  // Group data
  const [groups, setGroups] = useState<GroupItem[]>([]);

  // Close modal on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (showNewChatModal && !target.closest(".modal-content")) {
        setShowNewChatModal(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showNewChatModal]);

  // Filter chats
  const filteredDirectChats = recentChats.filter(
    (chat) =>
      chat.name.toLowerCase().includes(searchInput.toLowerCase()) ||
      chat.address.toLowerCase().includes(searchInput.toLowerCase())
  );

  const filteredGroups = groups.filter(
    (group) =>
      group.name.toLowerCase().includes(searchInput.toLowerCase()) ||
      group.id.toLowerCase().includes(searchInput.toLowerCase())
  );

  // Handle chat selection
  const handleChatSelect = (address: string) => {
    setSelectedChat(address);
    setSelectedGroup(null);
    const url = new URL(window.location.href);
    url.searchParams.set("chat", address);
    url.searchParams.delete("group");
    window.history.pushState({}, "", url);
    if (isMobileView) setShowChatOnMobile(true);
  };

  // Handle group selection
  const handleGroupSelect = (id: string) => {
    setSelectedGroup(id);
    setSelectedChat(null);
    const url = new URL(window.location.href);
    url.searchParams.set("group", id);
    url.searchParams.delete("chat");
    window.history.pushState({}, "", url);
    if (isMobileView) setShowChatOnMobile(true);
  };

  // Handle back on mobile
  const handleBackToList = () => {
    setShowChatOnMobile(false);
    const url = new URL(window.location.href);
    url.searchParams.delete("chat");
    url.searchParams.delete("group");
    window.history.pushState({}, "", url);
  };

  const handleStartChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatAddress) return;
    try {
      const formattedAddress = newChatAddress as `0x${string}`;
      handleChatSelect(formattedAddress);
      setShowNewChatModal(false);
      setNewChatAddress("");
    } catch (error) {
      console.error("Invalid address format:", error);
    }
  };

  // Render chat area
  const renderChatArea = () => {
    if (selectedChat) {
      return (
        <div className="flex flex-col h-full">
          {isMobileView && (
            <ChatHeader
              title={recentChats.find((chat) => chat.address === selectedChat)?.name || shortenAddress(selectedChat)}
              address={selectedChat}
              mainWalletAddress={selectedChat}
              isOnline={recentChats.find((chat) => chat.address === selectedChat)?.online}
              onBack={handleBackToList}
            />
          )}
            <DirectChat
              recipientAddress={selectedChat}
              hideHeader={isMobileView}
            />
        </div>
      );
    } else if (selectedGroup) {
      return (
        <div className="flex flex-col h-full">
          {isMobileView && (
            <ChatHeader
              title={groups.find((group) => group.id === selectedGroup)?.name || selectedGroup}
              subtitle={`${groups.find((group) => group.id === selectedGroup)?.members} members`}
              isGroup={true}
              onBack={handleBackToList}
            />
          )}
            <GroupChat groupId={selectedGroup} hideHeader={isMobileView} />
        </div>
      );
    } else {
      return (
        <div className="h-full flex items-center justify-center bg-gray-800/50 border border-gray-700">
          <div className="text-center p-8">
            <div className="w-16 h-16 mx-auto bg-gray-700/50 flex items-center justify-center text-gray-400 mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">
              Select a conversation
            </h3>
            <p className="text-gray-400 text-sm">
              Choose a chat or group to start messaging
            </p>
          </div>
        </div>
      );
    }
  };

  // Render content
  const renderContent = () => {
    if (isMobileView && (selectedChat || selectedGroup) && showChatOnMobile) {
      return (
        <div className="h-[calc(100vh-64px)] flex flex-col">
          {renderChatArea()}
        </div>
      );
    } else {
      return (
        <div className="flex h-[calc(100vh-64px)]">
          {/* Sidebar */}
          <div className="w-full md:w-80 border-r border-gray-700 bg-gray-800/50 flex flex-col">
            {/* Header */}
            <div className="h-24 p-3 border-b border-gray-700 flex flex-col gap-2">
              <div className="flex bg-gray-700/50 p-1">
                <button
                  onClick={() => setActiveTab("direct")}
                  className={`flex-1 py-2 text-sm font-medium ${
                    activeTab === "direct"
                      ? "bg-gray-600/90 text-white"
                      : "text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  Direct
                </button>
                <button
                  onClick={() => setActiveTab("groups")}
                  className={`flex-1 py-2 text-sm font-medium ${
                    activeTab === "groups"
                      ? "bg-indigo-600/90 text-white"
                      : "text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  Groups
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder={`Search ${
                    activeTab === "direct" ? "chats" : "groups"
                  }...`}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full bg-gray-700/70 text-white border border-gray-600/50 py-2 pl-8 pr-3 text-sm focus:outline-none focus:border-primary/60"
                />
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 absolute left-2 top-2.5 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>
            {/* New Chat Button */}
            <div className="p-3 border-b border-gray-700/50">
              <button
                onClick={() => setShowNewChatModal(true)}
                className={`w-full py-2 text-sm font-medium text-white ${
                  activeTab === "direct" ? "bg-gray-600/90" : "bg-indigo-600/90"
                } hover:bg-opacity-80`}
              >
                {activeTab === "direct" ? "New Chat" : "New Group"}
              </button>
            </div>
            {/* Chat List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {activeTab === "direct" ? (
                filteredDirectChats.length > 0 ? (
                  filteredDirectChats.map((chat) => (
                    <div
                      key={chat.address}
                      onClick={() => handleChatSelect(chat.address)}
                      className={`flex items-center p-3 rounded hover:bg-gray-700/50 cursor-pointer ${
                        selectedChat === chat.address ? "bg-gray-700/50" : ""
                      }`}
                    >
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center text-white">
                          {chat.name.charAt(0)}
                        </div>
                        {chat.online && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800"></div>
                        )}
                      </div>
                      <div className="ml-3 flex-1 overflow-hidden">
                        <div className="flex justify-between items-center">
                          <h3 className="text-white font-medium truncate">{chat.name}</h3>
                          <span className="text-xs text-gray-400">{chat.lastMessageTime}</span>
                        </div>
                        <p className="text-gray-400 text-sm truncate">{chat.lastMessage}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <p className="mb-4">No chats yet</p>
                    <p className="text-sm">Click "New Chat" to start a conversation</p>
                  </div>
                )
              ) : (
                filteredGroups.length > 0 ? (
                  filteredGroups.map((group) => (
                    <div
                      key={group.id}
                      onClick={() => handleGroupSelect(group.id)}
                      className={`flex items-center p-3 rounded hover:bg-gray-700/50 cursor-pointer ${
                        selectedGroup === group.id ? "bg-indigo-600/30" : ""
                      }`}
                    >
                      <div className="w-12 h-12 rounded-full bg-indigo-600/50 flex items-center justify-center text-white">
                        {group.name.charAt(0)}
                      </div>
                      <div className="ml-3 flex-1 overflow-hidden">
                        <div className="flex justify-between items-center">
                          <h3 className="text-white font-medium truncate">{group.name}</h3>
                          <span className="text-xs text-gray-400">{group.lastMessageTime}</span>
                        </div>
                        <p className="text-gray-400 text-sm truncate">{group.lastMessage}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <p className="mb-4">No groups yet</p>
                    <p className="text-sm">Click "New Group" to create a group</p>
                  </div>
                )
              )}
            </div>
          </div>
          {/* Chat Area */}
          {!isMobileView && (
            <div className="flex-1 h-full bg-gray-900">{renderChatArea()}</div>
          )}
        </div>
      );
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] bg-gray-900 flex flex-col">
      {isConnected ? (
        <div className="flex-1 flex h-full overflow-hidden">
          <div className="flex-grow bg-gray-800/50 border border-gray-700 overflow-hidden">
            {renderContent()}
          </div>
          {showNewChatModal && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
              <div className="modal-content bg-gray-800 border border-gray-700 max-w-md w-full p-5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-white">
                    {activeTab === "direct"
                      ? "Start New Chat"
                      : "Create New Group"}
                    </h3>
                    <button
                      onClick={() => setShowNewChatModal(false)}
                    className="text-gray-400 hover:text-white"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                  {activeTab === "direct" ? (
                      <form onSubmit={handleStartChat}>
                          <input
                            type="text"
                            placeholder="0x..."
                            value={newChatAddress}
                            onChange={(e) => setNewChatAddress(e.target.value)}
                      className="w-full bg-gray-700/70 text-white border border-gray-600/50 py-2 px-3 mb-4 focus:outline-none focus:border-primary/60"
                    />
                        <div className="flex justify-end">
                          <button 
                            type="submit"
                        className="bg-gray-600/90 text-white py-2 px-4 font-medium hover:bg-primary disabled:bg-gray-700/60"
                            disabled={!newChatAddress}
                          >
                              Start Chat
                          </button>
                        </div>
                      </form>
                  ) : (
                    <div>
                        <input
                          type="text"
                      placeholder="Group name..."
                      className="w-full bg-gray-700/70 text-white border border-gray-600/50 py-2 px-3 mb-4 focus:outline-none focus:border-indigo-600/60"
                    />
                        <textarea
                          placeholder="0x1234..., 0x5678..."
                      className="w-full bg-gray-700/70 text-white border border-gray-600/50 py-2 px-3 mb-4 focus:outline-none focus:border-indigo-600/60 min-h-[80px] resize-none"
                    />
                      <div className="flex justify-end">
                      <button className="bg-indigo-600/90 text-white py-2 px-4 font-medium hover:bg-indigo-600">
                            Create Group
                        </button>
                      </div>
                    </div>
                  )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[80vh] text-center p-4">
          <div className="w-16 h-16 bg-primary/20 flex items-center justify-center text-primary mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="9" y1="3" x2="9" y2="21"></line>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Megagram</h1>
          <p className="text-gray-400 max-w-md text-sm mb-4">
            Connect your wallet to access secure, decentralized messaging.
          </p>
            <WalletButton />
        </div>
      )}
    </div>
  );
}
