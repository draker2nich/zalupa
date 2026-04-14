interface PromptContext {
  userName: string;
  personaPrompt: string;
  sessionMode: "morning" | "evening" | "free";
}

export function buildSystemPrompt(ctx: PromptContext): string {
  const modeAddition: Record<string, string> = {
    morning:
      "\n\nСейчас утренняя сессия. Помоги пользователю задать намерение на день.",
    evening:
      "\n\nСейчас вечерняя сессия. Помоги пользователю подвести итоги дня.",
    free: "",
  };

  let prompt = ctx.personaPrompt.replace("{{user_name}}", ctx.userName);

  prompt += modeAddition[ctx.sessionMode] || "";

  prompt += `

ВАЖНО:
- Отвечай ТОЛЬКО на русском языке.
- Не используй эмодзи в ответах.
- Будь кратким: 2-4 предложения, если не просят больше.
- Не давай непрошенных советов.
- Не упоминай, что ты AI, бот или модель.
- Если видишь маркеры тяжёлого состояния (суицидальные мысли, самоповреждение), мягко предложи обратиться к специалисту.`;

  return prompt;
}

export function buildActionPrompt(
  action: "deeper" | "angle" | "summary"
): string {
  const prompts = {
    deeper:
      "Задай один глубокий уточняющий вопрос к тому, что пользователь только что написал. Помоги копнуть глубже. Одно предложение-вопрос.",
    angle:
      "Предложи пользователю посмотреть на ситуацию под другим углом. Одно новое наблюдение или перспектива. 2-3 предложения.",
    summary:
      "Кратко резюмируй всё, что обсуждалось в этом диалоге. 2-3 предложения. Выдели главное.",
  };
  return prompts[action];
}