interface Bot {
  id: number;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

export type BotResponse = { 
  id: string; 
  text: string; 
  reply: string;
  [key: string]: any 
}