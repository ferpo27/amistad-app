// src/safety.ts
import { BlockedListType } from './types';

const getBlockedList = async (): Promise<BlockedListType[]> => {
  try {
    const response = await fetch('/api/blocked-list');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error al obtener la lista de bloqueados:', error);
    return [];
  }
};

export { getBlockedList };