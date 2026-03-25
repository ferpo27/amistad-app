```javascript
import { useEffect, useState, useReducer } from 'react';
import { Alert } from 'react-native';
import { AsyncStorage } from 'react-native';
import api from '../services/api';

interface AuthState {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

const authReducer = (state: AuthState = { token: '', user: { id: '', name: '', email: '' } }, action: any) => {
  switch (action.type) {
    case '@auth/SIGN_IN':
      return { token: action.payload.token, user: action.payload.user };
    case '@auth/SIGN_OUT':
      return { token: '', user: { id: '', name: '', email: '' } };
    default:
      return state;
  }
};

const AuthContext = React.createContext({});

const AuthProvider = ({ children }: any) => {
  const [authState, dispatch] = useReducer(authReducer, { token: '', user: { id: '', name: '', email: '' } });

  useEffect(() => {
    const storedToken = AsyncStorage.getItem('@auth/token');
    if (storedToken) {
      dispatch({ type: '@auth/SIGN_IN', payload: { token: storedToken, user: { id: '', name: '', email: '' } } });
    }
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const response = await api.post('/sessions', { email, password });
      const { token, user } = response.data;
      dispatch({ type: '@auth/SIGN_IN', payload: { token, user } });
      AsyncStorage.setItem('@auth/token', token);
    } catch (error) {
      Alert.alert('Erro ao realizar login', 'Verifique suas credenciais');
    }
  };

  const signOut = () => {
    dispatch({ type: '@auth/SIGN_OUT' });
    AsyncStorage.removeItem('@auth/token');
  };

  return (
    <AuthContext.Provider value={{ authState, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthProvider, AuthContext };```