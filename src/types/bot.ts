interface Bot {
  id: number;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

export default Bot;

export type BotResponse = { 
  id: string; 
  text: string; 
  [key: string]: any 
}

export default BotResponse;