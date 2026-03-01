import { useState, useEffect, useCallback } from 'react';
import { HistoryItem } from '../types';

const HISTORY_STORAGE_key = 'ai-image-studio-history';

export const useHistory = () => {
    const [history, setHistory] = useState<HistoryItem[]>([]);

    useEffect(() => {
        try {
            const storedHistory = localStorage.getItem(HISTORY_STORAGE_key);
            if (storedHistory) {
                setHistory(JSON.parse(storedHistory));
            }
        } catch (error) {
            console.error("Failed to load history from localStorage:", error);
            setHistory([]);
        }
    }, []);

    const updateLocalStorage = (newHistory: HistoryItem[]) => {
        try {
            localStorage.setItem(HISTORY_STORAGE_key, JSON.stringify(newHistory));
        } catch (error) {
            console.error("Failed to save history to localStorage:", error);
        }
    };

    const addToHistory = useCallback((item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
        const newItem: HistoryItem = {
            ...item,
            id: crypto.randomUUID(),
            timestamp: Date.now(),
        } as HistoryItem;

        setHistory(prevHistory => {
            const newHistory = [newItem, ...prevHistory];
            updateLocalStorage(newHistory);
            return newHistory;
        });
    }, []);

    const clearHistory = useCallback(() => {
        setHistory([]);
        try {
            localStorage.removeItem(HISTORY_STORAGE_key);
        } catch (error) {
            console.error("Failed to clear history from localStorage:", error);
        }
    }, []);

    return { history, addToHistory, clearHistory };
};
