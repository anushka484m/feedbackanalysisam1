import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FILLER_PATTERNS = /^(thanks|thank you|ok|okay|hi|hello|bye|goodbye|yes|no|sure|fine|good|great|nice|cool|alright|hmm|hm|um|uh|yeah|yep|nope|right)\s*[.!?]*$/i;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, source, existingTexts = [] } = await req.json();

    if (!text || text.trim().length === 0) {
      return new Response(JSON.stringify({
        translatedText: '',
        language: 'unknown',
        region: null,
        isDuplicate: false,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check for filler content
    if (FILLER_PATTERNS.test(text.trim())) {
      return new Response(JSON.stringify({
        translatedText: text.trim(),
        language: 'en',
        region: null,
        isDuplicate: false,
        isFiller: true,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const prompt = `Analyze this customer feedback and return a JSON object with these exact fields:
- "language": the ISO 639-1 code of the original language (e.g., "en", "hi", "mr", "gu", "es", etc.)
- "translatedText": if the text is not in English, translate it to English while preserving meaning, context, emojis and special characters. If already English, return the original text cleaned up slightly.
- "region": infer the likely geographic region from language/content clues, or null if unknown
- "isDuplicate": true if the text is semantically very similar to any of these existing texts: ${JSON.stringify(existingTexts.slice(-50))}

The feedback text is:
"""
${text}
"""

Source: ${source}

Return ONLY valid JSON, no markdown, no explanation.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a multilingual text analysis engine. Always respond with valid JSON only." },
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
    const content = aiData.choices?.[0]?.message?.content || '{}';

    // Parse JSON, handling potential markdown wrapping
    let parsed;
    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = {
        language: 'en',
        translatedText: text,
        region: null,
        isDuplicate: false,
      };
    }

    return new Response(JSON.stringify({
      translatedText: parsed.translatedText || text,
      language: parsed.language || 'en',
      region: parsed.region || null,
      isDuplicate: parsed.isDuplicate || false,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("process-feedback error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
