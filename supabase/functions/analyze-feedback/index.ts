import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { entries } = await req.json();

    if (!entries || entries.length === 0) {
      return new Response(JSON.stringify({ error: "No entries to analyze" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Process in batches of 10
    const batchSize = 10;
    const allResults: any[] = [];

    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);
      const feedbackList = batch.map((e: any, idx: number) => 
        `[${i + idx}] (source: ${e.source}, language: ${e.language}, region: ${e.region || 'unknown'}): "${e.translatedText}"`
      ).join("\n");

      const prompt = `Analyze each customer feedback entry below. For EACH entry, return a JSON object in an array with:
- "index": the entry index number
- "sentiment": exactly one of "Positive", "Negative", or "Neutral"
- "sentimentScore": a number from -1.0 (very negative) to +1.0 (very positive), with 0 being neutral
- "topic": the main topic category (one of: "Product Quality", "Customer Service", "Pricing", "Delivery", "User Experience", "Features", "Billing", "Technical Issues", "General")
- "keywords": array of 3-5 important keywords from the feedback (keep emojis if present)

Feedback entries:
${feedbackList}

Return ONLY a valid JSON array, no markdown, no explanation.`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "You are a sentiment analysis engine. Always respond with valid JSON arrays only. Be precise with sentiment scores." },
            { role: "user", content: prompt },
          ],
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limited, please try again later." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "Payment required, please add credits." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error(`AI gateway error: ${response.status}`);
      }

      const aiData = await response.json();
      const content = aiData.choices?.[0]?.message?.content || '[]';
      
      try {
        const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(cleaned);
        allResults.push(...(Array.isArray(parsed) ? parsed : [parsed]));
      } catch {
        console.error("Failed to parse batch response:", content);
      }
    }

    // Generate insights
    const analyzedEntries = entries.map((entry: any, idx: number) => {
      const result = allResults.find((r: any) => r.index === idx) || {};
      return {
        ...entry,
        sentiment: result.sentiment || 'Neutral',
        sentimentScore: result.sentimentScore ?? 0,
        topic: result.topic || 'General',
        keywords: result.keywords || [],
      };
    });

    // Generate actionable insights
    const insightPrompt = `Based on this analyzed customer feedback data, generate actionable business insights.

Summary:
- Total entries: ${analyzedEntries.length}
- Positive: ${analyzedEntries.filter((e: any) => e.sentiment === 'Positive').length}
- Negative: ${analyzedEntries.filter((e: any) => e.sentiment === 'Negative').length}
- Neutral: ${analyzedEntries.filter((e: any) => e.sentiment === 'Neutral').length}

Top negative feedback samples:
${analyzedEntries.filter((e: any) => e.sentimentScore < -0.3).slice(0, 5).map((e: any) => `- [${e.topic}] [${e.region || 'unknown'}] "${e.translatedText}"`).join("\n")}

Top positive feedback samples:
${analyzedEntries.filter((e: any) => e.sentimentScore > 0.3).slice(0, 5).map((e: any) => `- [${e.topic}] [${e.region || 'unknown'}] "${e.translatedText}"`).join("\n")}

Topics distribution:
${Object.entries(analyzedEntries.reduce((acc: any, e: any) => { acc[e.topic] = (acc[e.topic] || 0) + 1; return acc; }, {})).map(([t, c]) => `- ${t}: ${c}`).join("\n")}

Return a JSON object with:
- "topComplaints": array of 5 most common complaint themes (short descriptions)
- "topPraises": array of 5 most common praise themes (short descriptions)
- "actionableInsights": array of 5-7 specific, actionable business recommendations based on the data patterns. Include region-specific insights if patterns exist.

Return ONLY valid JSON, no markdown.`;

    const insightResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a business intelligence analyst. Respond with valid JSON only." },
          { role: "user", content: insightPrompt },
        ],
      }),
    });

    let insights = { topComplaints: [], topPraises: [], actionableInsights: [] };
    if (insightResponse.ok) {
      const insightData = await insightResponse.json();
      const insightContent = insightData.choices?.[0]?.message?.content || '{}';
      try {
        const cleaned = insightContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        insights = JSON.parse(cleaned);
      } catch {
        console.error("Failed to parse insights");
      }
    }

    return new Response(JSON.stringify({
      analyzedEntries,
      insights,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-feedback error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
