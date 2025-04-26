"use client";

import React, { useState, useEffect, useRef, memo } from "react";
import { Message } from "../../types/chat";
import { useAccount } from "wagmi";
import { Tooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";

interface ChatMessageProps {
  message: Message;
  isLastMessage?: boolean;
  isFirstInGroup?: boolean;
  isOwnMessage?: boolean;
  showSender?: boolean;
}

export const ChatMessage = memo(
  ({
    message,
    isLastMessage = false,
    isFirstInGroup = false,
    isOwnMessage: externalIsOwnMessage,
    showSender = false,
  }: ChatMessageProps) => {
    const { address } = useAccount();
    // Messages with 'local' in the ID should be visible immediately
    const isLocalMessage = message.messageId.startsWith('local-');
    const [isVisible, setIsVisible] = useState(isLocalMessage);
    const [isHovered, setIsHovered] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const messageRef = useRef<HTMLDivElement>(null);
    const isOwnMessage =
      externalIsOwnMessage !== undefined
        ? externalIsOwnMessage
        : message.mainWallet
        ? message.mainWallet.toLowerCase() === address?.toLowerCase()
        : message.sender.toLowerCase() === address?.toLowerCase();
    const messageTimestamp = message.timestamp || Math.floor(Date.now() / 1000);
    const maxMessageLength = 200;

    useEffect(() => {
      if (isLocalMessage) return; // Skip animation for local messages
      
      const timer = setTimeout(() => setIsVisible(true), 50);
      return () => clearTimeout(timer);
    }, [isLocalMessage]);

    useEffect(() => {
      if (isLastMessage && messageRef.current) {
        messageRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
      }
    }, [isLastMessage]);

    useEffect(() => {
      if (isCopied) {
        const timer = setTimeout(() => setIsCopied(false), 2000);
        return () => clearTimeout(timer);
      }
    }, [isCopied]);

    const getSenderInitials = () => {
      if (isOwnMessage) return "You";
      return (
        message.senderName?.slice(0, 2).toUpperCase() ||
        (message.mainWallet
          ? message.mainWallet.slice(2, 4).toUpperCase()
          : message.sender.slice(2, 4).toUpperCase())
      );
    };

    const getSenderColor = () => {
      if (isOwnMessage) return "from-blue-500 to-blue-600"; // Consistent blue gradient for owner
      const colors = [
        "from-indigo-500 to-purple-600",
        "from-teal-500 to-emerald-600",
        "from-amber-500 to-orange-600",
        "from-cyan-500 to-blue-600",
        "from-rose-500 to-red-600",
      ];
      const addressSum = message.sender
        .split("")
        .reduce((sum, char) => sum + char.charCodeAt(0), 0);
      return colors[addressSum % colors.length];
    };

    const formatTimestamp = (timestamp: number) => {
      const date = new Date(timestamp * 1000);
      const hours = date.getHours().toString().padStart(2, "0");
      const minutes = date.getMinutes().toString().padStart(2, "0");
      return `${hours}:${minutes}`;
    };

    const shortenAddress = (address: string) => {
      return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    const viewOnExplorer = () => {
      if (!message.txHash) return;
      window.open(`https://megaexplorer.xyz/tx/${message.txHash}`, "_blank");
    };

    const copyMessage = () => {
      navigator.clipboard.writeText(message.content);
      setIsCopied(true);
    };

    const isLongMessage = message.content.length > maxMessageLength;
    const displayedContent =
      isLongMessage && !isExpanded
        ? `${message.content.slice(0, maxMessageLength)}...`
        : message.content;

    // Different transition classes based on message type
    const transitionClass = isLocalMessage ? "" : "transition-opacity duration-300";
    const opacityClass = isLocalMessage || isVisible ? "opacity-100" : "opacity-0";
    
    return (
      <div
        ref={messageRef}
        className={`flex items-end gap-2 mb-1 w-full px-2 md:px-3 ${transitionClass}
          ${isOwnMessage ? "justify-end" : "justify-start"}
          ${opacityClass}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        role="article"
        data-message-id={message.messageId}
      >
        {/* Avatar */}
        {!isOwnMessage && (isFirstInGroup || showSender) && (
          <div className="flex-shrink-0 w-9 h-9 rounded-full overflow-hidden self-end mb-1">
            <div
              className={`w-full h-full bg-gradient-to-br ${getSenderColor()} flex items-center justify-center`}
            >
              <span className="text-white font-medium text-sm">
                {getSenderInitials()}
              </span>
            </div>
          </div>
        )}

        {/* Message content */}
        <div
          className={`flex flex-col ${isOwnMessage ? "items-end" : "items-start"} max-w-[85%]`}
        >
          {/* Sender info */}
          {!isOwnMessage && (isFirstInGroup || showSender) && (
            <div className="text-xs font-medium text-gray-400 mb-1 px-1">
              {message.senderName ||
                (message.mainWallet
                  ? shortenAddress(message.mainWallet)
                  : shortenAddress(message.sender))}
            </div>
          )}

          {/* Message bubble */}
          <div
            className={`relative px-3 py-2.5 rounded-lg transition-all duration-200 min-w-[80px] max-w-full
              ${
                isOwnMessage
                  ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-tr-none shadow-sm"
                  : "bg-gray-700/90 text-gray-100 rounded-tl-none shadow-sm"
              }
              ${isHovered ? "shadow-md" : ""}
              ${message.status === 'pending' ? "animate-pulse" : ""}`}
          >
            {/* Message text with padding for timestamp */}
            <div className="pb-4 pr-8">
              <p className="text-sm break-words whitespace-pre-wrap leading-5">{displayedContent}</p>
              {isLongMessage && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-xs text-blue-300 hover:text-blue-100 mt-1.5 underline"
                >
                  {isExpanded ? "Show Less" : "Show More"}
                </button>
              )}
            </div>

            {/* Timestamp and status - now properly positioned */}
            <div
              className={`absolute bottom-1 right-2 flex items-center gap-1 text-[10px] ${
                isOwnMessage ? "text-blue-100/80" : "text-gray-400"
              }`}
              data-tooltip-id={`timestamp-${message.messageId}`}
              data-tooltip-content={new Date(
                messageTimestamp * 1000
              ).toLocaleString()}
            >
              <span>{formatTimestamp(messageTimestamp)}</span>
              {isOwnMessage && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={message.status === "pending" ? "animate-pulse" : ""}
                >
                  {message.status === "pending" ? (
                    <>
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </>
                  ) : message.status === "delivered" || message.txHash ? (
                    <>
                      <path d="m5 9 4 4 10-10" />
                      <path d="m5 15 4 4 10-10" />
                    </>
                  ) : (
                    <path d="M20 6 9 17l-5-5" />
                  )}
                </svg>
              )}
            </div>
            <Tooltip id={`timestamp-${message.messageId}`} />

            {/* Action buttons */}
            {isHovered && (
              <div className="absolute -top-7 right-0 flex gap-1 bg-gray-800/80 backdrop-blur-sm py-1 px-1.5 rounded-lg shadow-lg border border-gray-700/50">
                <button
                  onClick={copyMessage}
                  className="p-1.5 rounded-full bg-gray-700/80 text-gray-300 hover:bg-gray-600 transition-colors"
                  aria-label={isCopied ? "Copied" : "Copy"}
                >
                  {isCopied ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  )}
                </button>
                {message.txHash && (
                  <button
                    onClick={viewOnExplorer}
                    className="p-1.5 rounded-full bg-gray-700/80 text-gray-300 hover:bg-gray-600 transition-colors"
                    aria-label="View transaction"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // More detailed comparison to prevent unnecessary re-renders
    // and fix issues with duplicate messages
    if (prevProps.message.messageId !== nextProps.message.messageId) return false;
    if (prevProps.message.status !== nextProps.message.status) return false;
    if (prevProps.message.txHash !== nextProps.message.txHash) return false;
    if (prevProps.isLastMessage !== nextProps.isLastMessage) return false;
    if (prevProps.isFirstInGroup !== nextProps.isFirstInGroup) return false;
    if (prevProps.isOwnMessage !== nextProps.isOwnMessage) return false;
    if (prevProps.showSender !== nextProps.showSender) return false;
    return true;
  }
);