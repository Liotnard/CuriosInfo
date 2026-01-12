import { useState, useEffect } from 'react';

// Simple hook to manage the admin token in localStorage
export function useAdminToken() {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('admin_token');
  });

  const saveToken = (newToken: string) => {
    localStorage.setItem('admin_token', newToken);
    setToken(newToken);
  };

  const removeToken = () => {
    localStorage.removeItem('admin_token');
    setToken(null);
  };

  return { token, saveToken, removeToken };
}
