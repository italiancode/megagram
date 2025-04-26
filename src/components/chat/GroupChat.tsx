"use client";

import { ChatHeader } from "@/components/chat/ChatHeader";

interface GroupChatProps {
  groupId: string;
  hideHeader?: boolean;
  onBack?: () => void;
}

export function GroupChat({ groupId, hideHeader = false, onBack }: GroupChatProps) {
  return (
    <div className="h-full flex flex-col bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 w-full relative">
      {!hideHeader && (
        <div className="sticky top-0 z-20 w-full">
          <ChatHeader
            title="Group Chat"
            subtitle="Feature coming soon"
            isGroup
            onBack={onBack}
          />
        </div>
      )}

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center p-8 bg-gray-700/30 rounded-lg border border-gray-600/50 max-w-md">
          <h3 className="text-xl font-medium text-white mb-2">Feature Coming Soon</h3>
          <p className="text-gray-300">Group chat functionality is currently under development and will be available in a future update.</p>
        </div>
      </div>
    </div>
  );
}
