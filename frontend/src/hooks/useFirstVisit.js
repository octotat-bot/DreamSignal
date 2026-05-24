import { useState, useCallback } from 'react';

export const useFirstVisit = () => {
  const [isFirstVisit, setIsFirstVisit] = useState(() => {
    // Only access localStorage in browser environment
    if (typeof window !== 'undefined') {
      return localStorage.getItem('dreamsignal_first_visit') === '1';
    }
    return false;
  });

  const clearFirstVisit = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('dreamsignal_first_visit');
      setIsFirstVisit(false);
    }
  }, []);

  return { isFirstVisit, clearFirstVisit };
};
