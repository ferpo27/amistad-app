declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: string;
    API_URL: string;
  }
}

export type RootStackParamList = {
  Home: undefined;
  Chat: { id: string };
  Favorites: undefined;
  Profile: undefined;
  Settings: undefined;
};