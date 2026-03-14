import dotenv from 'dotenv';
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

import { Env } from '../types/global';

export const env: Env = {
  NODE_ENV: process.env.NODE_ENV as Env['NODE_ENV'],
  API_URL: process.env.API_URL ?? '',
  PORT: process.env.PORT ? Number(process.env.PORT) : undefined,
  // Agrega aquí el resto de variables de entorno definidas en Env
};

export default env;