import { isReplitRuntime } from "../../chatgpt-auth";
import { getSiteEnv } from "../../platform-env";
import { getReplitStore } from "../../replit-store";

const schema = `CREATE TABLE IF NOT EXISTS trip_team_messages (id TEXT PRIMARY KEY, group_id TEXT NOT NULL, author_name TEXT NOT NULL, body TEXT NOT NULL, delete_token TEXT NOT NULL, created_at TEXT NOT NULL)`;

function clean(value: unknown, max: number) {
  return typeof value === "string"
    ? value.trim().replace(/\s+/g, " ").slice(0, max)
    : "";
}

function storage() {
  try {
    return getSiteEnv();
  } catch (error) {
    if (!isReplitRuntime()) throw error;
    return null;
  }
}

function configuredPin() {
  return storage()?.TEAM_LEADER_PIN || process.env.TEAM_LEADER_PIN || "";
}

function isTeamLeader(pin: string) {
  const expected = configuredPin();
  return Boolean(expected && pin && pin === expected);
}

export async function GET(request: Request) {
  const groupId = clean(new URL(request.url).searchParams.get("groupId"), 120);
  if (!groupId) return new Response("Group is required", { status: 400 });
  const deleteToken = request.headers.get("x-message-delete-token") || "";
  const teamLeaderMode = isTeamLeader(
    request.headers.get("x-team-leader-pin") || "",
  );
  const env = storage();

  if (!env) {
    const messages = getReplitStore().messages
      .filter(message => message.groupId === groupId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map(message => ({
        id: message.id,
        author_name: message.authorName,
        body: message.body,
        created_at: message.createdAt,
        canDelete:
          teamLeaderMode ||
          Boolean(deleteToken && deleteToken === message.deleteToken),
      }));
    return Response.json({ teamLeaderMode, messages });
  }

  const { DB } = env;
  await DB.prepare(schema).run();
  const { results } = await DB.prepare(
    "SELECT id, author_name, body, delete_token, created_at FROM trip_team_messages WHERE group_id = ? ORDER BY created_at ASC",
  ).bind(groupId).all<{
    id: string;
    author_name: string;
    body: string;
    delete_token: string;
    created_at: string;
  }>();
  return Response.json({
    teamLeaderMode,
    messages: results.map(({ delete_token, ...message }) => ({
      ...message,
      canDelete:
        teamLeaderMode ||
        Boolean(deleteToken && deleteToken === delete_token),
    })),
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const groupId = clean(body?.groupId, 120);
  const authorName = clean(body?.authorName, 60);
  const message = clean(body?.message, 500);
  const deleteToken = clean(body?.deleteToken, 100);
  const teamLeaderPin = clean(body?.teamLeaderPin, 100);
  if (!groupId || !authorName || !message || !deleteToken) {
    return new Response("Name and message are required", { status: 400 });
  }
  if (groupId === "trip-updates" && !isTeamLeader(teamLeaderPin)) {
    return new Response("Team Leader Mode is required to post trip updates.", {
      status: 403,
    });
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const env = storage();
  if (!env) {
    getReplitStore().messages.push({
      id,
      groupId,
      authorName,
      body: message,
      deleteToken,
      createdAt,
    });
  } else {
    await env.DB.prepare(schema).run();
    await env.DB.prepare(
      "INSERT INTO trip_team_messages (id, group_id, author_name, body, delete_token, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    ).bind(id, groupId, authorName, message, deleteToken, createdAt).run();
  }
  return Response.json({
    message: {
      id,
      author_name: authorName,
      body: message,
      created_at: createdAt,
      canDelete: true,
    },
  });
}

export async function DELETE(request: Request) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const id = clean(body?.id, 100);
  const deleteToken = clean(body?.deleteToken, 100);
  const teamLeaderPin = clean(body?.teamLeaderPin, 100);
  if (!id || (!deleteToken && !teamLeaderPin)) {
    return new Response("Message is required", { status: 400 });
  }

  const leader = isTeamLeader(teamLeaderPin);
  const env = storage();
  if (!env) {
    const store = getReplitStore();
    const index = store.messages.findIndex(
      message =>
        message.id === id && (leader || message.deleteToken === deleteToken),
    );
    if (index < 0) {
      return new Response(
        "Enter the Team Leader PIN or use the device that posted this message.",
        { status: 403 },
      );
    }
    store.messages.splice(index, 1);
    return Response.json({ ok: true });
  }

  await env.DB.prepare(schema).run();
  const result = leader
    ? await env.DB.prepare("DELETE FROM trip_team_messages WHERE id = ?").bind(id).run()
    : await env.DB.prepare(
      "DELETE FROM trip_team_messages WHERE id = ? AND delete_token = ?",
    ).bind(id, deleteToken).run();
  if (!result.meta.changes) {
    return new Response(
      "Enter the Team Leader PIN or use the device that posted this message.",
      { status: 403 },
    );
  }
  return Response.json({ ok: true });
}
