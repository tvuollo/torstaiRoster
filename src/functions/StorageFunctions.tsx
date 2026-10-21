// Remembers the paste and corrections in this browser only. Storage can be
// blocked (private mode), so every access falls back quietly.
export const LoadStored = <T,>(Key: string, Fallback: T): T => {
    try {
        const stored = localStorage.getItem(Key);
        return stored === null ? Fallback : JSON.parse(stored) as T;
    }
    catch {
        return Fallback;
    }
};

export const SaveStored = (Key: string, Value: unknown) => {
    try {
        localStorage.setItem(Key, JSON.stringify(Value));
    }
    catch {
        // Not saved; the page still works.
    }
};
