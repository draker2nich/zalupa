"use client";

import { useState, useCallback, useRef } from "react";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  persona?: string;
}

function parseSSEChunk(chunk: string): Array<{ type: string; text?: string }> {
  return chunk
    .split("\n")
    .filter((l) => l.startsWith("data: "))
    .map((line) => {
      try {
        return JSON.parse(line.slice(6));
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function updateLastMessage(
  prev: ChatMessage[],
  content: string
): ChatMessage[] {
  const updated = [...prev];
  const last = updated.at(-1);
  if (last) {
    updated[updated.length - 1] = { ...last, content };
  }
  return updated;
}

export function useChat(
  personaId: string,
  sessionMode: string,
  userName: string
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(
    async (text: string, action?: string) => {
      if (text && !action) {
        const userMsg: ChatMessage = {
          role: "user",
          content: text,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, userMsg]);
      }

      setIsStreaming(true);
      abortRef.current = new AbortController();

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text || undefined,
            personaId,
            sessionMode,
            action,
            userName,
            messages: messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
          signal: abortRef.current.signal,
        });

        if (!response.body) throw new Error("No response body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let aiContent = "";

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "",
            timestamp: Date.now(),
            persona: personaId,
          },
        ]);

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;

          const events = parseSSEChunk(decoder.decode(value));
          for (const evt of events) {
            if (evt.type === "delta" && evt.text) {
              aiContent += evt.text;
              setMessages((prev) => updateLastMessage(prev, aiContent));
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Chat error:", err);
        }
      } finally {
        setIsStreaming(false);
      }
    },
    [personaId, sessionMode, userName, messages]
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    setMessages([]);
  }, []);

  return { messages, isStreaming, send, stop, reset };
}