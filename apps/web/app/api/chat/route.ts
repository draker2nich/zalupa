import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { getModelConfig, estimateCost, type AIAction } from "@/lib/ai/router";
import { buildSystemPrompt, buildActionPrompt } from "@/lib/ai/prompts";

// Default persona prompts (fallback if DB is empty)
const DEFAULT_PROMPTS: Record<string, string> = {
  mirror:
    "Ты Mirror — сбалансированный и вдумчивый AI-компаньон для рефлексии. Ты помогаешь пользователю {{user_name}} исследовать свои мысли и чувства. Отвечай на русском языке. Будь тёплым, но не навязчивым. Задавай уточняющие вопросы. Не давай советов, если не просят. Ответы — 2-4 предложения.",
  challenger:
    "Ты Претендент — AI-компаньон, который мягко бросает вызов убеждениям {{user_name}}. Помогаешь увидеть слепые зоны. Отвечай на русском. Будь уважительным, но не соглашайся автоматически. 2-4 предложения.",
  sage:
    "Ты Мудрица — AI-компаньон для {{user_name}}, приносящий ясность через спокойное размышление. Отвечай на русском. Стиль — мягкий, созерцательный. 2-4 предложения.",
  gardener:
    "Ты Садовница — AI-компаньон с метафорами природы и роста для {{user_name}}. Отвечай на русском. Мягкая и заботливая. 2-4 предложения.",
  observer:
    "Ты Наблюдатель — нейтральный AI-компаньон для {{user_name}}. Отвечай на русском. Отражаешь без оценок. Минимум эмоций, максимум точности. 2-4 предложения.",
};

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    entryId,
    userId,
    message,
    personaId = "mirror",
    sessionMode = "free",
    action,
    messages = [],
    userName = "друг",
  } = body;

  const startTime = Date.now();

  try {
    // 1. Load persona prompt from DB
    let personaPrompt = DEFAULT_PROMPTS[personaId] || DEFAULT_PROMPTS.mirror;
    try {
      const promptRow = await prisma.promptVersion.findFirst({
        where: { agentSlug: personaId, isActive: true },
      });
      if (promptRow) {
        personaPrompt = promptRow.systemPrompt;
      }
    } catch {
      // DB might not have prompts yet, use defaults
    }

    // 2. Determine model
    const aiAction: AIAction = (action as AIAction) || "reply";
    const config = getModelConfig(aiAction);

    // 3. Build system prompt
    const systemPrompt = buildSystemPrompt({
      userName,
      personaPrompt,
      sessionMode: sessionMode as "morning" | "evening" | "free",
    });

    // 4. Build messages for API
    const apiMessages: Array<{ role: "user" | "assistant"; content: string }> =
      messages.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    if (message) {
      apiMessages.push({ role: "user", content: message });
    }

    if (action) {
      apiMessages.push({
        role: "user",
        content: buildActionPrompt(action as "deeper" | "angle" | "summary"),
      });
    }

    // 5. Stream response
    const client = new Anthropic();
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await client.messages.create({
            model: config.model,
            max_tokens: config.maxTokens,
            temperature: config.temperature,
            system: systemPrompt,
            messages: apiMessages,
            stream: true,
          });

          let fullContent = "";
          let inputTokens = 0;
          let outputTokens = 0;

          for await (const event of response) {
            if (
              event.type === "content_block_delta" &&
              "text" in event.delta
            ) {
              fullContent += event.delta.text;
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "delta", text: event.delta.text })}\n\n`
                )
              );
            }
            if (event.type === "message_delta" && "usage" in event) {
              outputTokens =
                (event.usage as { output_tokens?: number })
                  ?.output_tokens || 0;
            }
            if (event.type === "message_start") {
              inputTokens = event.message?.usage?.input_tokens || 0;
            }
          }

          const responseTimeMs = Date.now() - startTime;
          const cost = estimateCost(
            config.model,
            inputTokens,
            outputTokens
          );

          // 6. Save AI message to DB
          if (entryId) {
            try {
              await prisma.journalMessage.create({
                data: {
                  entryId,
                  role: "assistant",
                  content: fullContent,
                  modelUsed: config.model,
                  tokensIn: inputTokens,
                  tokensOut: outputTokens,
                  responseTimeMs,
                },
              });
            } catch {
              // Non-critical, don't break the stream
            }
          }

          // 7. Log AI request
          try {
            await prisma.aiRequestLog.create({
              data: {
                userId: userId || null,
                agentSlug: personaId,
                model: config.model,
                tokensIn: inputTokens,
                tokensOut: outputTokens,
                costUsd: cost,
                responseTimeMs,
              },
            });
          } catch {
            // Non-critical
          }

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "done",
                meta: {
                  model: config.model,
                  tokensIn: inputTokens,
                  tokensOut: outputTokens,
                  cost,
                  responseTimeMs,
                },
              })}\n\n`
            )
          );
          controller.close();
        } catch (error) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", message: String(error) })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}