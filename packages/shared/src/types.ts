// ============================================
// Core domain types shared between web & mobile
// ============================================

export type Plan = "free" | "paid";
export type SessionMode = "morning" | "evening" | "free";
export type MessageRole = "user" | "assistant";
export type AITier = "fast" | "medium" | "pro";
export type AIAction = "reply" | "deeper" | "angle" | "summary" | "analysis" | "patterns" | "weekly_report";
export type FeedbackType = "up" | "down";

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  plan: Plan;
  onboardingCompleted: boolean;
  goals: string[];
  preferredTime: string | null;
}

export interface JournalEntry {
  id: string;
  userId: string;
  entryDate: string; // ISO date string
  title: string | null;
  moodLabel: string | null;
  moodScore: number | null;
  tags: string[];
  sessionMode: SessionMode;
  personaId: string;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
  messages?: JournalMessage[];
}

export interface JournalMessage {
  id: string;
  entryId: string;
  role: MessageRole;
  content: string;
  modelUsed: string | null;
  tokensIn: number | null;
  tokensOut: number | null;
  responseTimeMs: number | null;
  createdAt: string;
}

export interface Habit {
  id: string;
  userId: string;
  name: string;
  emoji: string;
  sortOrder: number;
  done?: boolean; // computed from logs for a given date
}

export interface HabitLog {
  id: string;
  habitId: string;
  logDate: string;
}

export interface Intention {
  id: string;
  userId: string;
  emoji: string;
  title: string;
  sortOrder: number;
}

export interface Mood {
  label: string;
  score: number;
  color: string;
}

export interface Persona {
  id: string;
  name: string;
  style: string;
  icon: string; // emoji or icon identifier
}

export interface ChatStreamEvent {
  type: "delta" | "done" | "error";
  text?: string;
  message?: string;
  meta?: {
    model: string;
    tokensIn: number;
    tokensOut: number;
    cost: number;
    responseTimeMs: number;
  };
}

export interface WeekDay {
  dayNum: number;
  label: string;
  hasEntry: boolean;
  isToday: boolean;
  isFuture: boolean;
}