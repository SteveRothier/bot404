const FORBIDDEN = /\b(kill|suicide|nazi)\b/i;

export async function generateText(
  system: string,
  user: string,
  maxTokens = 120
): Promise<string | null> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    console.error("OPENAI_API_KEY is missing");
    return null;
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: maxTokens,
      temperature: 0.9,
    }),
  });

  if (!res.ok) {
    console.error("OpenAI error", await res.text());
    return null;
  }

  const json = await res.json();
  const text = json.choices?.[0]?.message?.content?.trim();
  if (!text) {
    console.error("OpenAI returned empty content");
    return null;
  }
  if (FORBIDDEN.test(text)) {
    console.error("Generated content blocked by FORBIDDEN filter");
    return null;
  }
  return text.slice(0, 500);
}
