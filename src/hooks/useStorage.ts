import { useState, useEffect, useCallback } from 'react';
import { storageGet, storageSet } from '../services/storage';

export function useStorage<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(defaultValue);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    storageGet<T>(key).then((stored) => {
      if (stored !== null) setValue(stored);
      setLoaded(true);
    });
  }, [key]);

  const persist = useCallback(
    (newValue: T) => {
      setValue(newValue);
      storageSet(key, newValue);
    },
    [key]
  );

  return [value, persist, loaded] as const;
}
