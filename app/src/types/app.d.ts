export interface Interest {
  id: string;
  name: string;
}

export interface User {
  id: string;
  name: string;
  avatarUrl?: string;
  language?: string;
  interests?: Interest[];
  // Add other fields as needed throughout the project
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string; // ISO string
  // Add other fields if the project uses them
}

// You can extend these interfaces in other files if necessary
export type PartialUser = Partial<User>;
export type PartialMessage = Partial<Message>;