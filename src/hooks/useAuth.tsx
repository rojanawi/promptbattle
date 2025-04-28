import React, { createContext, useContext, useState, useEffect } from 'react';
import { ref, set } from 'firebase/database';
import { database } from '../config/firebase';
import type { User } from '../types/battle';

interface AuthContextType {
  userId: string | null;
  displayName: string | null;
  isAuthenticated: boolean;
  login: (displayName: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    // Check for existing session
    const storedUserId = localStorage.getItem('userId');
    const storedDisplayName = localStorage.getItem('displayName');
    if (storedUserId && storedDisplayName) {
      setUserId(storedUserId);
      setDisplayName(storedDisplayName);
    }
  }, []);

  const login = async (newDisplayName: string) => {
    // Generate a unique user ID
    const newUserId = `user_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create user in database
    const user: User = {
      displayName: newDisplayName,
      lastActive: Date.now(),
      battlesHosted: [],
      battlesJoined: [],
    };

    await set(ref(database, `users/${newUserId}`), user);

    // Store in localStorage
    localStorage.setItem('userId', newUserId);
    localStorage.setItem('displayName', newDisplayName);

    setUserId(newUserId);
    setDisplayName(newDisplayName);
  };

  const logout = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('displayName');
    setUserId(null);
    setDisplayName(null);
  };

  return (
    <AuthContext.Provider
      value={{
        userId,
        displayName,
        isAuthenticated: !!userId,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 