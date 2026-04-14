"use client";

import { useState, useCallback, useRef } from "react";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  persona?: string;
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
      // Add user message to state
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

        // Add placeholder AI message
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "",
            timestamp: Date.now(),
            persona: personaId,
          },
        ]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk
            .split("\n")
            .filter((l) => l.startsWith("data: "));

          for (const line of lines) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === "delta") {
                aiContent += data.text;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    content: aiContent,
                  };
                  return updated;
                });
              }
            } catch {
              // Skip malformed chunks
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