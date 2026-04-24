import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import initialSnapshot from './initialTournament.json';

function defaultFromSnapshot(key: string): unknown | undefined {
  if (Object.prototype.hasOwnProperty.call(initialSnapshot, key)) {
    return (initialSnapshot as Record<string, unknown>)[key];
  }
  return undefined;
}

export function useLocalState<T>(key: string, fallback: T): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw != null) return JSON.parse(raw) as T;
    } catch {
      /* ignore */
    }
    const d = defaultFromSnapshot(key);
    return (d !== undefined ? d : fallback) as T;
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      /* quota */
    }
  }, [key, state]);

  return [state, setState];
}
