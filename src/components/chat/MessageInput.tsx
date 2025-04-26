'use client';

import { ChangeEvent, FormEvent, KeyboardEvent, useState, useEffect, useRef } from 'react';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  maxLength?: number;
  className?: string;
}

export function MessageInput({
  onSendMessage,
  value,
  onChange,
  placeholder = 'Type a message...',
  disabled = false,
  isLoading = false,
  maxLength = 1000,
  className = '',
}: MessageInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [showCount, setShowCount] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Detect mobile devices
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Track character count
  useEffect(() => {
    setCharCount(value.length);
    // Show character count when getting close to limit
    setShowCount(value.length > maxLength * 0.8);
  }, [value, maxLength]);

  // Focus the input when component mounts
  useEffect(() => {
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 300);
  }, []);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (value.trim() && !disabled && !isLoading) {
      onSendMessage(value);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && value.trim() && !disabled && !isLoading) {
      e.preventDefault();
      onSendMessage(value);
    }
  };

  return (
    <div
      className="bg-transparent w-full z-40 pb-4 sm:pb-6"
      role="region"
      aria-label="Message input area"
    >
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 max-w-4xl mx-auto"
      >
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={onChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            maxLength={maxLength}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            className={`
              w-full px-4 sm:px-5 py-2.5 sm:py-3 bg-gray-700/80 
              border ${isFocused ? 'border-primary/60' : 'border-gray-600/50'} 
              rounded-full text-white placeholder-gray-400
              focus:outline-none focus:ring-2 focus:ring-primary/40 
              transition-all duration-200 disabled:bg-gray-600/50 
              disabled:cursor-not-allowed text-sm
            `}
            aria-label="Message input"
            aria-disabled={disabled}
          />
          {showCount && (
            <div className={`absolute ${isMobile ? 'right-14' : 'right-16'} top-1/2 transform -translate-y-1/2 text-[10px] sm:text-xs ${
              charCount > maxLength * 0.9 ? 'text-amber-400' : 'text-gray-400'
            }`}>
              {charCount}/{maxLength}
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={!value.trim() || disabled || isLoading}
          className={`
            w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center 
            rounded-full transition-all duration-200 
            ${
              !value.trim() || disabled || isLoading
                ? 'bg-gray-700/60 text-gray-400 cursor-not-allowed'
                : 'bg-primary hover:bg-primary/90 text-white shadow-lg hover:shadow-primary/20'
            }
          `}
          aria-label="Send message"
        >
          {isLoading ? (
            <div
              className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-t-transparent border-white rounded-full animate-spin"
              role="status"
              aria-label="Loading"
            />
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={isMobile ? "18" : "20"}
              height={isMobile ? "18" : "20"}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transform rotate-45"
            >
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          )}
        </button>
      </form>
    </div>
  );
}