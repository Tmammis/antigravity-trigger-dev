import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Ensure environment variables are loaded
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const clientId = process.env.GMAIL_CLIENT_ID || "";
const clientSecret = process.env.GMAIL_CLIENT_SECRET || "";
const refreshToken = process.env.GMAIL_REFRESH_TOKEN || "";
// Defaulting to the known user email or reading from env if needed. For now hardcoded.
const userEmail = "terry.mammis@gmail.com";

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

if (!clientId || !clientSecret || !refreshToken) {
  console.error("Missing OAuth2 credentials in .env.");
  console.error("Make sure GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN are set.");
  process.exit(1);
}

// Initialize Supabase Client
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Nodemailer Transporter with OAuth2
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    type: "OAuth2",
    user: userEmail,
    clientId: clientId,
    clientSecret: clientSecret,
    refreshToken: refreshToken,
  },
});

async function extractAndEmailTranscripts() {
  console.log("Connecting to Supabase to fetch transcripts...");

  try {
    // Query Supabase for transcript and created_at
    // We order by created_at descending to get the latest transcripts first
    // Limiting to 50 for now as an example, but you can remove the limit or paginate as needed.
    const { data: calls, error } = await supabase
      .from("agent_calls")
      .select("transcript, created_at")
      .order("created_at", { ascending: false })
      .limit(50); // Optional: Adjust the limit based on how many records you want to extract at once

    if (error) {
      throw new Error(`Supabase query failed: ${error.message}`);
    }

    if (!calls || calls.length === 0) {
      console.log("No transcripts found in the agent_calls table.");
      process.exit(0);
    }

    console.log(`Successfully fetched ${calls.length} transcripts from Supabase.`);
    console.log("Formatting the data...");

    // Format the queried data
    let emailContent = `# Extracted Call Transcripts\n\n`;
    emailContent += `*Extracted on: ${new Date().toLocaleString()}*\n`;
    emailContent += `---\n\n`;

    calls.forEach((call: any, index: number) => {
      const dateStr = new Date(call.created_at).toLocaleString();
      emailContent += `## Call ${index + 1} - ${dateStr}\n`;

      if (Array.isArray(call.transcript)) {
        call.transcript.forEach((msg: any) => {
          const role = msg.role === 'agent' ? '🤖 Agent' : '👤 User';
          emailContent += `**${role}**: ${msg.message}\n`;
        });
      } else if (call.transcript) {
        // Fallback if transcript isn't stored as an array of message objects
        emailContent += `*Raw Transcript Data:* \n${JSON.stringify(call.transcript, null, 2)}\n`;
      } else {
        emailContent += `*No transcript available for this call.*\n`;
      }
      emailContent += `\n---\n\n`;
    });

    console.log("Sending email via Gmail...");

    // Send the email
    const mailOptions = {
      from: `"Simon AI transkribering" <${userEmail}>`,
      to: userEmail,
      subject: `Call Transcripts Report - ${new Date().toLocaleDateString()}`,
      text: emailContent,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email successfully sent to ${userEmail}! Message ID: ${info.messageId}`);

  } catch (err: any) {
    console.error("An error occurred during extraction or emailing:", err.message);
    process.exit(1);
  }
}

// Run the script
extractAndEmailTranscripts();
