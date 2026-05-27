import "dotenv/config";
import { google } from "googleapis";
import { runGmailPoll } from "./pollGmail.js";
const intervalMs = Number(process.env.GMAIL_POLL_INTERVAL_MS ?? 300_000);
const auth = new google.auth.OAuth2(requireEnv("GMAIL_CLIENT_ID"), requireEnv("GMAIL_CLIENT_SECRET"), process.env.GMAIL_REDIRECT_URI);
auth.setCredentials({ refresh_token: requireEnv("GMAIL_REFRESH_TOKEN") });
async function tick() {
    try {
        await runGmailPoll(auth);
    }
    catch (error) {
        console.error("Gmail poll failed", error);
    }
}
await tick();
setInterval(tick, intervalMs);
console.log(`Inventory worker polling Gmail every ${Math.round(intervalMs / 1000)}s`);
function requireEnv(name) {
    const value = process.env[name];
    if (!value)
        throw new Error(`Missing required environment variable: ${name}`);
    return value;
}
