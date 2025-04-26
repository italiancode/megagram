'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DirectChatPage() {
  const params = useParams();
  const router = useRouter();
  const address = params.address as string;

  // Redirect to home page with query parameter for the selected chat
  useEffect(() => {
    // We're redirecting to the home page which will handle displaying the chat
    router.replace(`/?chat=${address}`);
  }, [address, router]);

  return (
    <div className="h-screen flex items-center justify-center bg-gray-900">
      <div className="animate-pulse text-primary">Loading chat...</div>
    </div>
  );
}
