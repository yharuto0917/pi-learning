// 学習の進捗をブラウザーに保存する。保存できない環境でも動作は続ける

export const PROGRESS_KEY = "pi-learning:progress:v1";

export interface ProgressData {
  completed: string[];
}

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function parseProgress(raw: string | null): ProgressData {
  if (!raw) return { completed: [] };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null && Array.isArray((parsed as ProgressData).completed)) {
      return {
        completed: (parsed as ProgressData).completed.filter((id): id is string => typeof id === "string"),
      };
    }
  } catch {
    // 壊れたデータは無視して最初からにする
  }
  return { completed: [] };
}

export function loadProgress(store: KeyValueStore | undefined): ProgressData {
  try {
    return parseProgress(store?.getItem(PROGRESS_KEY) ?? null);
  } catch {
    return { completed: [] };
  }
}

export function saveProgress(store: KeyValueStore | undefined, data: ProgressData): void {
  try {
    store?.setItem(PROGRESS_KEY, JSON.stringify(data));
  } catch {
    // プライベートウィンドウなどでは保存できないが、表示は続ける
  }
}

export function toggleCompleted(data: ProgressData, lessonId: string, done: boolean): ProgressData {
  const set = new Set(data.completed);
  if (done) set.add(lessonId);
  else set.delete(lessonId);
  return { completed: [...set] };
}
