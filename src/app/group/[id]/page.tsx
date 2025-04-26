"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function GroupChatPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;

  // Redirect to home page with query parameter for the selected group
  useEffect(() => {
    // We're redirecting to the home page which will handle displaying the group chat
    router.replace(`/?group=${groupId}`);
  }, [groupId, router]);

  return (
    <div className="h-screen flex items-center justify-center bg-gray-900">
      <div className="animate-pulse text-indigo-500">Loading group chat...</div>
    </div>
  );
}
