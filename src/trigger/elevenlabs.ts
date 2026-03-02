import { schemaTask, logger } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

import { GoogleGenerativeAI } from "@google/generative-ai";

export const elevenLabsSupabaseTask = schemaTask({
  id: "elevenlabs-transcript-processor",
  schema: z.any(),
  run: async (payload: any) => {
    logger.info("Received ElevenLabs transcript webhook", { payload });

    // Ensure environment variables are evaluated at runtime
    const supabaseUrl = process.env.SUPABASE_URL || "";
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    const geminiApiKey = process.env.GEMINI_API_KEY || "";

    if (!supabaseUrl || !supabaseKey) {
      logger.error("Missing Supabase environment variables.");
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Intelligently extract ElevenLabs properties whether they are at the root or nested under 'data'
    const payloadData = payload.data || payload;
    let extractedSummary = payloadData.analysis?.transcript_summary || payloadData.analysis?.summary || payloadData.summary || null;
    const rawTranscript = payloadData.transcript || null;
    const extractedUserId = payloadData.user_id || payloadData.conversation_initiation_client_data?.user_id || payloadData.client_id || null;

    // Filter Transcript to only keep agent and user messages
    let formattedTranscript = null;
    if (Array.isArray(rawTranscript)) {
      formattedTranscript = rawTranscript
        .filter((t) => t.role === "agent" || t.role === "user")
        .map((t) => ({
          role: t.role,
          message: t.message,
          time_in_call_secs: t.time_in_call_secs,
        }));
    }

    // Translate summary to Swedish using Gemini
    logger.info("Attempting Swedish Translation Step", { extractedSummary, geminiApiKeyProvided: !!geminiApiKey });
    if (extractedSummary && geminiApiKey) {
      try {
        const genAI = new GoogleGenerativeAI(geminiApiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const prompt = `Translate the following phone call summary to professional Swedish. Output ONLY the translated summary directly. Do not provide options, explanations, or conversational filler. Be concise and direct.

Summary to translate:
${extractedSummary}`;

        logger.info("Sending prompt to Gemini API", { prompt });
        const result = await model.generateContent(prompt);

        logger.info("Raw Gemini Result Object Received", { result });
        const responseText = result.response.text();

        logger.info("Gemini Extracted Text Response", { responseText });
        if (responseText) {
          extractedSummary = responseText.trim();
          logger.info("Successfully set summary to Swedish", { extractedSummary });
        } else {
          logger.warn("Gemini returned empty text, keeping English summary");
        }
      } catch (e) {
        logger.error("Failed to translate summary to Swedish, using original", { error: e });
      }
    }

    const { data, error } = await supabase
      .from("agent_calls")
      .insert([
        {
          user_id: extractedUserId,
          transcript: formattedTranscript,
          summary: extractedSummary,
        },
      ])
      .select();

    if (error) {
      logger.error("Failed to insert transcript into Supabase", { error });
      throw new Error(`Supabase insert error: ${error.message}`);
    }

    logger.info("Successfully inserted transcript into Supabase", { data });

    return {
      success: true,
      insertedRows: data,
    };
  },
});
