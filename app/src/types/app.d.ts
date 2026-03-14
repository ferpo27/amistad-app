// app/src/types/app.d.ts
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


// tsconfig.json
{
  "compilerOptions": {
    "target": "esnext",
    "module": "esnext",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["app/src/*"]
    }
  },
  "include": [
    "app/src/**/*.ts",
    "app/src/**/*.tsx",
    "app/src/**/*.js",
    "app/src/types/**/*.d.ts"
  ],
  "exclude": ["node_modules", "babel.config.js"]
}