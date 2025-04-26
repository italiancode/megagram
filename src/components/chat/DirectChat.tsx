'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount } from 'wagmi';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { MessageInput } from '@/components/chat/MessageInput';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { useChat } from '@/hooks/useChat';
import { useWalletWagmi } from '@/hooks/useWalletWagmi';
import { Message } from '@/types/chat';

interface DirectChatProps {
  recipientAddress: string;
  hideHeader?: boolean;
  onBack?: () => void;
}

export function DirectChat({ recipientAddress, hideHeader = false, onBack }: DirectChatProps) {
  const { address } = useAccount();
  const { sessionAddress } = useWalletWagmi();
  const { messages, sendMessage, fetchMessages, fetchUsername, setMessages } = useChat();
  const [recipientName, setRecipientName] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [messageInput, setMessageInput] = useState<string>('');
  const [transactionPending, setTransactionPending] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const isOwnMessage = useCallback((sender: string, mainWallet?: string) => {
    if (mainWallet) {
      return mainWallet.toLowerCase() === address?.toLowerCase();
    }
    const senderLower = sender.toLowerCase();
    return senderLower === address?.toLowerCase() || 
           senderLower === sessionAddress?.toLowerCase();
  }, [address, sessionAddress]);

  // Function for initial message load - fetches messages and username
  const loadMessages = useCallback(async (isPolling = false) => {
    if (!recipientAddress) return;
    
    try {
      // Only show loading state for initial load, not for polling
      if (!isPolling) {
        setIsLoading(true);
      }
      
      // Pass isPolling flag to fetchMessages to handle differently
      await fetchMessages(recipientAddress, false);
      
      // Only fetch username info during initial load, not during polling
      if (!isPolling) {
        // Try to get username from localStorage first for immediate display
        const cacheKey = `username_${recipientAddress.toLowerCase()}`;
        const cachedUsername = localStorage.getItem(cacheKey);
        if (cachedUsername) {
          try {
            const cacheData = JSON.parse(cachedUsername);
            if (Date.now() - cacheData.timestamp < 60 * 60 * 1000) { // 1 hour cache
              setRecipientName(cacheData.username);
            }
          } catch (e) {
            console.error('Error parsing cached username', e);
          }
        }
        
        // Fetch username from contract
        try {
          const username = await fetchUsername(recipientAddress as `0x${string}`);
          if (username) {
            setRecipientName(username);
          } else {
            // Fallback to shortened address if no username
            const shortAddress = `${recipientAddress.slice(0, 6)}...${recipientAddress.slice(-4)}`;
            setRecipientName(shortAddress);
          }
        } catch (usernameError) {
          console.error('Error fetching username in DirectChat:', usernameError);
          // Fallback to shortened address in case of error
          const shortAddress = `${recipientAddress.slice(0, 6)}...${recipientAddress.slice(-4)}`;
          setRecipientName(shortAddress);
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      if (!isPolling) {
        setIsLoading(false);
      }
    }
  }, [recipientAddress, fetchMessages, fetchUsername]);
  
  // Function for polling updates - specifically for background refresh
  const pollForMessages = useCallback(() => {
    loadMessages(true); // Pass true to indicate this is a polling update
  }, [loadMessages]);
  
  // Initial load and setup polling when recipient changes
  useEffect(() => {
    if (recipientAddress) {
      console.log('Fetching messages for recipient:', recipientAddress);
      
      // Initial load
      loadMessages(false);

      // Setup polling with the specialized polling function
      const pollInterval = setInterval(pollForMessages, 10000);

      return () => {
        clearInterval(pollInterval);
      };
    }
  }, [recipientAddress, loadMessages, pollForMessages]); // Add pollForMessages as dependency

  // We don't need to auto-scroll on message changes per user's request
  useEffect(() => {
    console.log('Current messages state:', messages);
  }, [messages]);

  // Chat will always start from the bottom as requested by user
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView();
    }
  };

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };
  
  // Group messages by date
  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { [date: string]: Message[] } = {};
    
    messages.forEach(message => {
      const date = new Date(message.timestamp * 1000).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      if (!groups[date]) {
        groups[date] = [];
      }
      
      groups[date].push(message);
    });
    
    return Object.entries(groups).map(([date, messages]) => ({
      date,
      messages
    }));
  };
  
  // Check if a date is today
  const isToday = (date: string) => {
    const today = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    return date === today;
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || transactionPending) return;

    if (!address) {
      console.error('Wallet not connected');
      alert('Please connect your wallet to send messages.');
      return;
    }

    try {
      setTransactionPending(true);
      
      const pendingMessage = {
        messageId: `pending-${Date.now()}`,
        content: content.trim(),
        sender: address as string,
        recipient: recipientAddress,
        timestamp: Math.floor(Date.now() / 1000),
        mainWallet: address as string,
        status: 'pending' as const
      };
      
      setMessages(prev => [...prev, pendingMessage]);
      // No auto-scroll when sending messages
      
      await sendMessage(content, recipientAddress, false);
      
      setMessages(prev => 
        prev.map(msg => 
          msg.messageId === pendingMessage.messageId 
            ? {...msg, status: 'delivered' as const} 
            : msg
        )
      );
      
      setMessageInput('');
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.filter(msg => msg.messageId !== `pending-${Date.now()}`));
    } finally {
      setTransactionPending(false);
    }
  };

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      {!hideHeader && (
        <div className="sticky top-0 z-20 w-full">
          <ChatHeader
            title={recipientName || shortenAddress(recipientAddress)}
            address={recipientAddress}
            mainWalletAddress={recipientAddress}
            isOnline={true}
            onBack={onBack}
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-3" ref={messagesContainerRef}>
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="flex flex-col items-center space-y-2">
              <div className="w-6 h-6 sm:w-8 sm:h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-400 text-xs sm:text-sm">Loading conversation...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center px-3 sm:px-4 min-h-[300px]">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/20 rounded-full flex items-center justify-center text-primary mb-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4 sm:w-5 sm:h-5"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h3 className="text-white text-sm sm:text-base font-medium mb-2">No messages yet</h3>
            <p className="text-gray-400 text-xs sm:text-sm max-w-[90%] sm:max-w-xs">
              This is the beginning of your encrypted conversation with{' '}
              {recipientName || shortenAddress(recipientAddress)}. All messages are stored on the
              MegaETH blockchain.
            </p>
          </div>
        ) : (
          <div className="space-y-4 pb-16">
            {groupMessagesByDate(messages).map(({ date, messages: dateMessages }) => (
              <div key={date} className="space-y-2">
                <div className="flex justify-center mb-3">
                  <div className="px-3 py-1 rounded-full bg-gray-700/50 backdrop-blur-sm text-gray-300 text-xs shadow-sm">
                    {isToday(date) ? 'Today' : date}
                  </div>
                </div>
                {dateMessages.map((msg, index) => (
                  <ChatMessage
                    key={msg.messageId || index}
                    message={{
                      ...msg, 
                      messageId: msg.messageId || `msg-${index}-${msg.timestamp}`,
                      recipient: msg.recipient || recipientAddress
                    }}
                    isOwnMessage={isOwnMessage(msg.sender, msg.mainWallet)}
                    isLastMessage={index === dateMessages.length - 1 && 
                                index === messages.indexOf(dateMessages[dateMessages.length - 1])}
                    showSender={true}
                  />
                ))}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {transactionPending && (
        <div className="fixed bottom-20 sm:bottom-24 left-0 right-0 text-xs sm:text-sm text-center z-50">
          <div className="inline-flex items-center px-2 sm:px-3 py-1 bg-gray-800/95 text-gray-300 rounded-full border border-gray-700/50 shadow-sm">
            <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-1.5"></div>
            Transaction in progress...
          </div>
        </div>
      )}
      
      <div className="sticky bottom-0 left-0 right-0 border-t border-gray-700/50 bg-gray-800/95 backdrop-blur-sm z-10">
        <MessageInput
          onSendMessage={handleSendMessage}
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          isLoading={transactionPending}
          disabled={!address || transactionPending}
          placeholder={transactionPending ? 'Transaction pending...' : 'Type your message...'}
        />
      </div>
    </div>
  );
}