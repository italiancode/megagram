# MegaChat: How It Works

## Overview
MegaChat is a decentralized messaging application that lets you chat securely with other users using blockchain technology. Think of it like WhatsApp, but instead of messages being stored on company servers, they're stored securely on the blockchain.

## Key Components

### 1. Your Wallets
You have two special "wallets" when using MegaChat:
- **Main Wallet**: Your regular crypto wallet (like MetaMask) that you use to connect. This is your identity.
- **Session Wallet**: A special wallet created automatically to make chatting easier and cheaper. This handles the technical work.

Think of it like this:
- Main Wallet = Your ID card (who you are)
- Session Wallet = Your messenger (who delivers your message)

The important part: **Even though session wallets send the messages, conversations are organized by main wallet addresses.** This means you always chat with the same person, even if they use different session wallets.

### 2. Message Security
Every message in MegaChat is:
1. Encrypted (scrambled) before being sent
2. Stored on the blockchain
3. Only decrypted (unscrambled) for people who should see it

It's like putting your message in a locked box where only you and the recipient have the key.

## How It Works: Step by Step

### Connecting to MegaChat
1. You click "Connect Wallet" and approve the connection
2. Behind the scenes, MegaChat:
   - Creates your session wallet
   - Generates your encryption keys
   - Stores these safely in your browser
   - Shows your chat interface

### Sending a Message
When you type and send a message:
1. Your message is encrypted using special keys created for your conversation
2. Your main wallet address is attached to the message (this is how people know it's from you)
3. The encrypted message is sent using your session wallet (saving gas fees)
4. The message is stored on the blockchain with this information:
   - The encrypted content
   - Your session wallet (who sent it)
   - The recipient's address
   - Your main wallet (who you really are)
   - A timestamp

### Receiving Messages
When you open a chat with someone:
1. The app searches the blockchain for messages where:
   - Your main wallet sent messages to their main wallet, OR
   - Their main wallet sent messages to your main wallet
2. The app ignores session wallet addresses and focuses on the main wallets
3. Messages are automatically decrypted and shown in time order
4. You see a clean conversation between you and the other person

### What Makes This Special
- **Identity-Based Chats**: You always chat with the same person, even if they use different devices or session wallets
- **Main Wallet Focus**: The app shows conversations based on main wallet identities, not the technical session wallets
- **Automatic Filtering**: When you open a chat with someone, you only see messages between you and them
- **Clean Interface**: The app handles all the technical details behind the scenes

## Technical Magic (In Simple Terms)

### Encryption
- A unique encryption key is created for each conversation between two main wallets
- Messages are encrypted on your device before being sent
- Only the intended recipient can decrypt the message
- Even though messages are public on the blockchain, they look like gibberish to everyone else

### Session Wallets
- Created automatically when you first connect
- Handle the technical work of sending messages
- Save you money on transaction fees
- Your main wallet identity remains attached to all messages

### Message Filtering
- When you open a chat with someone, the app specifically searches for:
  - Messages FROM your main wallet TO their main wallet
  - Messages FROM their main wallet TO your main wallet
- This ensures you only see relevant conversations
- The app displays the main wallet addresses in the chat header, not session addresses

### Smart Message Organization
- Messages are displayed chronologically, regardless of which session wallet sent them
- The app shows who a message is from based on main wallet addresses
- Sender information is clearly displayed with message bubbles
- Your messages appear on the right, others' on the left

## Privacy and Security
- Nobody except you and your chat partner can read the messages
- All encryption happens on your device
- Your encryption keys never leave your browser
- Messages can't be altered or deleted once sent

## Tips for Users
1. Fund your session wallet with a small amount of ETH for cheaper messaging
2. Always share your main wallet address when telling people how to contact you
3. When opening a chat with someone, use their main wallet address
4. Your messages are always secure, regardless of which wallet address someone uses to contact you

Remember: MegaChat makes complex blockchain technology feel simple by:
- Organizing conversations by your real identity (main wallet)
- Handling the technical details automatically
- Showing you clean, easy-to-follow conversations
- Keeping everything securely encrypted 