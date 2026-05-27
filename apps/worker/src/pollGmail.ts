import type { OAuth2Client } from "google-auth-library";
import { google, gmail_v1 } from "googleapis";
import { importInventoryForPublisher } from "./processInventory.js";
import { isSupportedInventoryFile } from "@books/ingestion";

type Attachment = {
  filename: string;
  buffer: Buffer;
};

export async function runGmailPoll(auth: OAuth2Client) {
  const gmail = google.gmail({ version: "v1", auth });
  const query = process.env.GMAIL_QUERY ?? "is:unread has:attachment";
  const list = await gmail.users.messages.list({
    userId: "me",
    q: query,
    maxResults: 25,
  });

  for (const message of list.data.messages ?? []) {
    if (!message.id) continue;
    try {
      const full = await gmail.users.messages.get({
        userId: "me",
        id: message.id,
        format: "full",
      });

      const from = getHeader(full.data.payload?.headers ?? [], "from");
      const publisherEmail = extractEmail(from);
      const publisherName = extractName(from);
      const attachments = await downloadAttachments(gmail, message.id, full.data.payload);

      for (const attachment of attachments.filter((file) => isSupportedInventoryFile(file.filename))) {
        await importInventoryForPublisher({
          publisherEmail,
          publisherName,
          filename: attachment.filename,
          buffer: attachment.buffer,
        });
      }

      await gmail.users.messages.modify({
        userId: "me",
        id: message.id,
        requestBody: { removeLabelIds: ["UNREAD"] },
      });
      console.log(`Processed Gmail message ${message.id}`);
    } catch (error) {
      console.error(`Failed to process Gmail message ${message.id}`, error);
    }
  }
}

async function downloadAttachments(
  gmail: ReturnType<typeof google.gmail>,
  messageId: string,
  payload: gmail_v1.Schema$MessagePart | null | undefined,
) {
  const attachments: Attachment[] = [];
  for (const part of flattenParts(payload)) {
    const filename = part.filename;
    const attachmentId = part.body?.attachmentId;
    if (!filename || !attachmentId) continue;

    const response = await gmail.users.messages.attachments.get({
      userId: "me",
      messageId,
      id: attachmentId,
    });

    if (!response.data.data) continue;
    attachments.push({
      filename,
      buffer: Buffer.from(response.data.data, "base64url"),
    });
  }
  return attachments;
}

function flattenParts(payload: gmail_v1.Schema$MessagePart | null | undefined): gmail_v1.Schema$MessagePart[] {
  if (!payload || typeof payload !== "object") return [];
  return [payload, ...(payload.parts ?? []).flatMap(flattenParts)];
}

function getHeader(headers: Array<{ name?: string | null; value?: string | null }>, name: string) {
  return headers.find((header) => header.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function extractEmail(from: string) {
  return from.match(/<([^>]+)>/)?.[1] ?? from.trim();
}

function extractName(from: string) {
  return from.replace(/<[^>]+>/, "").replace(/"/g, "").trim() || undefined;
}
