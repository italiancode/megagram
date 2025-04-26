export interface Message {
  content: string;
  sender: string;
  timestamp: number;
  txHash?: string;
  status: 'pending' | 'delivered';
  senderName?: string;
  mainWallet?: string;
  recipient: string;
  messageId: string;
}

export interface Group {
  id: number;
  name: string;
  creator: string;
  members: string[];
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export interface MessageCache {
  [key: string]: CacheEntry<Message[]>;
}
