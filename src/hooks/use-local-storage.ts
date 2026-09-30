import { useCallback, useEffect, useState } from "react";

/**
 * SSR-safe localStorage state. Server render and first client render both use
 * the initial value; the stored value is read in an effect after hydration.
 */
export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {
      /* ignore corrupt entries */
    }
    setLoaded(true);
  }, [key]);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage may be unavailable */
    }
  }, [key, value, loaded]);

  const reset = useCallback(() => setValue(initial), [initial]);

  return [value, setValue, loaded, reset] as const;
}
