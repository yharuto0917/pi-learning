import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { loadProgress, type ProgressData, saveProgress, toggleCompleted } from "../lib/progress";

interface ProgressContextValue {
  completed: Set<string>;
  isCompleted: (lessonId: string) => boolean;
  setCompleted: (lessonId: string, done: boolean) => void;
  reset: () => void;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

function getStore() {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<ProgressData>(() => loadProgress(getStore()));

  const update = useCallback((next: ProgressData) => {
    setData(next);
    saveProgress(getStore(), next);
  }, []);

  const value = useMemo<ProgressContextValue>(() => {
    const completed = new Set(data.completed);
    return {
      completed,
      isCompleted: (id) => completed.has(id),
      setCompleted: (id, done) => update(toggleCompleted(data, id, done)),
      reset: () => update({ completed: [] }),
    };
  }, [data, update]);

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress(): ProgressContextValue {
  const value = useContext(ProgressContext);
  if (!value) throw new Error("useProgress must be used inside ProgressProvider");
  return value;
}
