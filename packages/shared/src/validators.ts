import { z } from "zod";

// ============================================
// API request/response validators
// ============================================

// --- Auth / Onboarding ---
export const onboardingSchema = z.object({
  name: z.string().min(1).max(100),
  goals: z.array(z.string()).min(1),
  preferredTime: z.enum(["morning", "evening", "anytime"]),
});

// --- Journal Entry ---
export const createEntrySchema = z.object({
  sessionMode: z.enum(["morning", "evening", "free"]).default("free"),
  personaId: z.string().default("mirror"),
});

export const updateEntrySchema = z.object({
  title: z.string().max(200).optional(),
  moodLabel: z.string().max(50).optional(),
  moodScore: z.number().int().min(1).max(5).optional(),
  tags: z.array(z.string()).optional(),
  isCompleted: z.boolean().optional(),
});

// --- Chat ---
export const chatRequestSchema = z.object({
  entryId: z.string().uuid(),
  message: z.string().max(10000).optional(),
  personaId: z.string().default("mirror"),
  sessionMode: z.enum(["morning", "evening", "free"]).default("free"),
  action: z.enum(["deeper", "angle", "summary"]).optional(),
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string(),
  })).default([]),
});

// --- Feedback ---
export const feedbackSchema = z.object({
  messageId: z.string().uuid(),
  feedback: z.enum(["up", "down"]),
});

// --- Habits ---
export const createHabitSchema = z.object({
  name: z.string().min(1).max(200),
  emoji: z.string().max(10).default("✅"),
});

export const toggleHabitSchema = z.object({
  habitId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
});

// --- Intentions ---
export const createIntentionSchema = z.object({
  title: z.string().min(1).max(200),
  emoji: z.string().max(10).default("🎯"),
});

// --- User profile ---
export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  goals: z.array(z.string()).optional(),
  preferredTime: z.enum(["morning", "evening", "anytime"]).optional(),
});

// Type exports from validators
export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type CreateEntryInput = z.infer<typeof createEntrySchema>;
export type UpdateEntryInput = z.infer<typeof updateEntrySchema>;
export type ChatRequestInput = z.infer<typeof chatRequestSchema>;
export type FeedbackInput = z.infer<typeof feedbackSchema>;
export type CreateHabitInput = z.infer<typeof createHabitSchema>;
export type ToggleHabitInput = z.infer<typeof toggleHabitSchema>;
export type CreateIntentionInput = z.infer<typeof createIntentionSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;