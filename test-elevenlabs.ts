import * as dotenv from "dotenv";
dotenv.config();

import { elevenLabsSupabaseTask } from "./src/trigger/elevenlabs";

async function test() {
    console.log("Starting test...");
    try {
        // Manually calling the underlying task method
        // In trigger.dev v3, the config passed to task/schemaTask
        // is often stored in some internal property, or we can just 
        // test the raw supabase logic.

        const { createClient } = require("@supabase/supabase-js");

        const supabaseUrl = process.env.SUPABASE_URL || "";
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

        if (!supabaseUrl || !supabaseKey) {
            console.error("Missing SUPABASE variables!");
            process.exit(1);
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        const payload = {
            summary: "This is a test summary from the script.",
            transcript: { "mock": "This is a test transcript from the script." },
            phone_number_id: "+1234567890",
            call_date: new Date().toISOString(),
        };

        console.log("Inserting test data into supabase...", payload);

        const { data, error } = await supabase
            .from("agent_calls")
            .insert([{
                phone_number_id: payload.phone_number_id,
                transcript: payload.transcript,
                summary: payload.summary,
                call_date: payload.call_date ? new Date(payload.call_date) : undefined,
            }])
            .select();

        if (error) {
            console.error("Error inserting data:", error);
        } else {
            console.log("Success! Inserted row:", data);
        }

    } catch (err) {
        console.error("Failed test:", err);
    }
}

test();
