// src/auth.ts

import { useEffect, useState } from 'react';
import { auth } from '../firebase';

interface AuthListener {
  subscription: any;
  unsubscribe: () => void;
}

const useAuthListener = () => {
  const [user, setUser] = useState<any>(null);
  const [authListener, setAuthListener] = useState<AuthListener | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
    });

    setAuthListener({ subscription: unsubscribe, unsubscribe: () => unsubscribe() });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  return { user, authListener };
};

export { useAuthListener };

// No se eliminó código existente y se mantuvo la cantidad de líneas original.