import { getSiteEnv } from "../../platform-env";
import { isReplitRuntime } from "../../chatgpt-auth";
import { getReplitStore } from "../../replit-store";

const messagesSchema = `CREATE TABLE IF NOT EXISTS trip_team_messages (id TEXT PRIMARY KEY, group_id TEXT NOT NULL, author_name TEXT NOT NULL, body TEXT NOT NULL, delete_token TEXT NOT NULL, created_at TEXT NOT NULL)`;
const memoriesSchema = `CREATE TABLE IF NOT EXISTS trip_memories (id TEXT PRIMARY KEY, object_key TEXT NOT NULL, caption TEXT NOT NULL DEFAULT '', uploader TEXT NOT NULL, created_at TEXT NOT NULL)`;

type MessageRow = {
  id: string;
  group_id: string;
  author_name: string;
  body: string;
  created_at: string;
};

type MemoryRow = {
  id: string;
  caption: string;
  uploader: string;
  created_at: string;
};

export async function GET() {
  let DB: D1Database;
  try {
    ({ DB } = getSiteEnv());
  } catch (error) {
    if (!isReplitRuntime()) throw error;
    const store = getReplitStore();
    const activity = [
      ...store.messages.map(message => ({
        id: `message:${message.id}`,
        kind: message.groupId === "trip-updates"
          ? "update"
          : message.groupId === "trip-wall"
            ? "group-message"
            : "team-message",
        groupId: message.groupId,
        author: message.authorName,
        text: message.body,
        createdAt: message.createdAt,
      })),
      ...store.memories.map(memory => ({
        id: `memory:${memory.id}`,
        kind: "photo",
        author: memory.uploader,
        text: memory.caption || "Shared a new trip photo.",
        createdAt: memory.createdAt,
      })),
    ].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 40);
    return Response.json({ activity });
  }
  await DB.batch([
    DB.prepare(messagesSchema),
    DB.prepare(memoriesSchema),
  ]);

  const [{ results: messages }, { results: memories }] = await Promise.all([
    DB.prepare(
      "SELECT id, group_id, author_name, body, created_at FROM trip_team_messages ORDER BY created_at DESC LIMIT 30",
    ).all<MessageRow>(),
    DB.prepare(
      "SELECT id, caption, uploader, created_at FROM trip_memories ORDER BY created_at DESC LIMIT 20",
    ).all<MemoryRow>(),
  ]);

  const activity = [
    ...messages.map((message) => ({
      id: `message:${message.id}`,
      kind: message.group_id === "trip-updates"
        ? "update"
        : message.group_id === "trip-wall"
          ? "group-message"
          : "team-message",
      groupId: message.group_id,
      author: message.author_name,
      text: message.body,
      createdAt: message.created_at,
    })),
    ...memories.map((memory) => ({
      id: `memory:${memory.id}`,
      kind: "photo",
      author: memory.uploader,
      text: memory.caption || "Shared a new trip photo.",
      createdAt: memory.created_at,
    })),
  ]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 40);

  return Response.json({ activity });
}
