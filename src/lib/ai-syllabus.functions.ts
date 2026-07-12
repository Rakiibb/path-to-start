import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  syllabus: z.string().trim().min(100).max(20000),
});

export type SyllabusSummary = {
  summary: string[];
  importantTopics: string[];
  estimatedStudyTime: string;
  repeatedTopics: string[];
};

export const summarizeSyllabus = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<SyllabusSummary> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI service is not configured.");

    const systemPrompt = [
      "You are an exam prep assistant.",
      "Read the syllabus and remove unnecessary information.",
      "Keep only important exam topics.",
      "Use easy English. Maximum 10 bullet points in summary.",
      "Estimate realistic study time based on content depth.",
      "List any important topic that appears multiple times.",
      'Return ONLY valid JSON matching this shape: {"summary": string[], "importantTopics": string[], "estimatedStudyTime": string, "repeatedTopics": string[]}',
    ].join(" ");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: data.syllabus },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 429) throw new Error("Rate limit reached. Please try again in a moment.");
      if (res.status === 402) throw new Error("AI credits exhausted. Please add credits to continue.");
      throw new Error(`AI request failed (${res.status}): ${body.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = json.choices?.[0]?.message?.content ?? "";
    let parsed: SyllabusSummary;
    try {
      const raw = JSON.parse(text);
      parsed = {
        summary: Array.isArray(raw.summary) ? raw.summary.slice(0, 10).map(String) : [],
        importantTopics: Array.isArray(raw.importantTopics)
          ? raw.importantTopics.map(String)
          : [],
        estimatedStudyTime:
          typeof raw.estimatedStudyTime === "string" ? raw.estimatedStudyTime : "—",
        repeatedTopics: Array.isArray(raw.repeatedTopics)
          ? raw.repeatedTopics.map(String)
          : [],
      };
    } catch {
      throw new Error("AI returned an unexpected response.");
    }
    return parsed;
  });