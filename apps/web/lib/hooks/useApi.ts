"use client";

import { useState, useEffect, useCallback } from "react";

// Re-export types for use in page.tsx
export type { Profile, EntryListItem, EntryDetail, HabitItem, IntentionItem };

// Generic fetch helper
async function apiFetch<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "API error");
  }
  return res.json();
}

// ============================================
// Profile
// ============================================
interface Profile {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  plan: string;
  onboardingCompleted: boolean;
  goals: string[];
  preferredTime: string | null;
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<Profile>("/api/profile");
      setProfile(data);
    } catch {
      // Not logged in or error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const update = async (data: Record<string, unknown>) => {
    const updated = await apiFetch<Partial<Profile>>("/api/profile", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    setProfile((prev) => prev ? { ...prev, ...updated } : null);
    return updated;
  };

  const completeOnboarding = async (data: { name: string; goals: string[]; preferredTime: string }) => {
    const result = await apiFetch<{ id: string; name: string; onboardingCompleted: boolean }>("/api/onboarding", {
      method: "POST",
      body: JSON.stringify(data),
    });
    setProfile((prev) => prev ? { ...prev, ...result } : null);
    return result;
  };

  return { profile, loading, update, completeOnboarding, reload: load };
}

// ============================================
// Entries
// ============================================
interface EntryListItem {
  id: string;
  entryDate: string;
  title: string | null;
  moodLabel: string | null;
  moodScore: number | null;
  tags: string[];
  sessionMode: string;
  personaId: string;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
  messages?: Array<{ id: string; role: string; content: string; createdAt: string }>;
}

interface EntryDetail extends EntryListItem {
  messages: Array<{
    id: string;
    entryId: string;
    role: string;
    content: string;
    modelUsed: string | null;
    tokensIn: number | null;
    tokensOut: number | null;
    responseTimeMs: number | null;
    createdAt: string;
  }>;
}

export function useEntries() {
  const [entries, setEntries] = useState<EntryListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<{ entries: EntryListItem[] }>("/api/entries?limit=30");
      setEntries(data.entries);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const createEntry = async (sessionMode: string, personaId: string): Promise<EntryListItem> => {
    const entry = await apiFetch<EntryListItem>("/api/entries", {
      method: "POST",
      body: JSON.stringify({ sessionMode, personaId }),
    });
    return entry;
  };

  const updateEntry = async (id: string, data: Record<string, unknown>): Promise<EntryListItem> => {
    const updated = await apiFetch<EntryListItem>(`/api/entries/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...updated } : e)));
    return updated;
  };

  const deleteEntry = async (id: string) => {
    await apiFetch(`/api/entries/${id}`, { method: "DELETE" });
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const getEntry = async (id: string): Promise<EntryDetail> => {
    return apiFetch<EntryDetail>(`/api/entries/${id}`);
  };

  return { entries, loading, createEntry, updateEntry, deleteEntry, getEntry, reload: load };
}

// ============================================
// Habits
// ============================================
interface HabitItem {
  id: string;
  name: string;
  emoji: string;
  sortOrder: number;
  done: boolean;
}

export function useHabits() {
  const [habits, setHabits] = useState<HabitItem[]>([]);
  const [loading, setLoading] = useState(true);

  const todayStr = new Date().toISOString().slice(0, 10);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<HabitItem[]>(`/api/habits?date=${todayStr}`);
      setHabits(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [todayStr]);

  useEffect(() => { load(); }, [load]);

  const create = async (name: string, emoji = "✅") => {
    const habit = await apiFetch<HabitItem>("/api/habits", {
      method: "POST",
      body: JSON.stringify({ name, emoji }),
    });
    setHabits((prev) => [...prev, { ...habit, done: false }]);
    return habit;
  };

  const toggle = async (habitId: string) => {
    const result = await apiFetch<{ done: boolean }>("/api/habits/toggle", {
      method: "POST",
      body: JSON.stringify({ habitId, date: todayStr }),
    });
    setHabits((prev) =>
      prev.map((h) => (h.id === habitId ? { ...h, done: result.done } : h))
    );
  };

  const remove = async (id: string) => {
    await apiFetch(`/api/habits/${id}`, { method: "DELETE" });
    setHabits((prev) => prev.filter((h) => h.id !== id));
  };

  return { habits, loading, create, toggle, remove, reload: load };
}

// ============================================
// Intentions
// ============================================
interface IntentionItem {
  id: string;
  emoji: string;
  title: string;
  sortOrder: number;
}

export function useIntentions() {
  const [intentions, setIntentions] = useState<IntentionItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<IntentionItem[]>("/api/intentions");
      setIntentions(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async (title: string, emoji = "🎯") => {
    const intention = await apiFetch<IntentionItem>("/api/intentions", {
      method: "POST",
      body: JSON.stringify({ title, emoji }),
    });
    setIntentions((prev) => [...prev, intention]);
    return intention;
  };

  const remove = async (id: string) => {
    await apiFetch(`/api/intentions/${id}`, { method: "DELETE" });
    setIntentions((prev) => prev.filter((i) => i.id !== id));
  };

  return { intentions, loading, create, remove, reload: load };
}

// ============================================
// Feedback
// ============================================
export async function sendFeedback(messageId: string, feedback: "up" | "down") {
  return apiFetch("/api/feedback", {
    method: "POST",
    body: JSON.stringify({ messageId, feedback }),
  });
}

// ============================================
// User message save
// ============================================
interface SavedMessage {
  id: string;
  entryId: string;
  role: string;
  content: string;
  createdAt: string;
}

export async function saveUserMessage(entryId: string, content: string): Promise<SavedMessage> {
  return apiFetch<SavedMessage>(`/api/entries/${entryId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}