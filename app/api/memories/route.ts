import { getChatGPTUser } from "../../chatgpt-auth";
import { getSiteEnv } from "../../platform-env";

const schema = `CREATE TABLE IF NOT EXISTS trip_memories (id TEXT PRIMARY KEY, object_key TEXT NOT NULL, caption TEXT NOT NULL DEFAULT '', uploader TEXT NOT NULL, created_at TEXT NOT NULL)`;
const likesSchema = `CREATE TABLE IF NOT EXISTS trip_memory_likes (memory_id TEXT NOT NULL, user_email TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY (memory_id, user_email))`;

export async function GET() {
  const { DB } = getSiteEnv();
  await DB.prepare(schema).run(); await DB.prepare(likesSchema).run();
  const { results } = await DB.prepare("SELECT id, object_key, caption, uploader, created_at FROM trip_memories ORDER BY created_at DESC").all<{ id:string; object_key:string; caption:string; uploader:string; created_at:string }>();
  const { results: likeRows } = await DB.prepare("SELECT memory_id, COUNT(*) AS total FROM trip_memory_likes GROUP BY memory_id").all<{ memory_id:string; total:number }>();
  const user = await getChatGPTUser();
  const { results: userLikes } = user ? await DB.prepare("SELECT memory_id FROM trip_memory_likes WHERE user_email = ?").bind(user.email).all<{ memory_id:string }>() : { results: [] as {memory_id:string}[] };
  const counts = new Map(likeRows.map(row => [row.memory_id, Number(row.total)])); const liked = new Set(userLikes.map(row => row.memory_id));
  return Response.json({ memories: results.map(memory => ({ id:memory.id, url:`/api/images/${memory.object_key.split("/").map(encodeURIComponent).join("/")}`, caption:memory.caption, uploader:memory.uploader, createdAt:memory.created_at, likes:counts.get(memory.id) || 0, liked:liked.has(memory.id) })) });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return new Response("Staff access is required to upload photos.", { status: 401 });
  const form = await request.formData(); const file = form.get("file");
  if (!(file instanceof File)) return new Response("Photo required", { status: 400 });
  if (!file.type.startsWith("image/") || file.size > 20_000_000) return new Response("Please use an image under 20MB.", { status: 400 });
  const { DB, BUCKET } = getSiteEnv(); await DB.prepare(schema).run(); await DB.prepare(likesSchema).run();
  const id = crypto.randomUUID(); const ext = (file.name.split(".").pop() || "jpg").replace(/[^a-z0-9]/gi, "").toLowerCase(); const objectKey = `memories/${id}.${ext || "jpg"}`;
  await BUCKET.put(objectKey, await file.arrayBuffer(), { httpMetadata:{ contentType:file.type } });
  await DB.prepare("INSERT INTO trip_memories (id, object_key, caption, uploader, created_at) VALUES (?, ?, '', ?, ?)").bind(id, objectKey, user.displayName, new Date().toISOString()).run();
  return Response.json({ ok:true });
}

export async function DELETE(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return new Response("Staff access is required to remove photos.", { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return new Response("Photo id required", { status: 400 });
  const { DB, BUCKET } = getSiteEnv(); await DB.prepare(schema).run(); await DB.prepare(likesSchema).run();
  const memory = await DB.prepare("SELECT object_key FROM trip_memories WHERE id = ?").bind(id).first<{ object_key:string }>();
  if (!memory) return new Response("Photo not found", { status: 404 });
  await DB.prepare("DELETE FROM trip_memories WHERE id = ?").bind(id).run();
  await DB.prepare("DELETE FROM trip_memory_likes WHERE memory_id = ?").bind(id).run();
  try { await BUCKET.delete(memory.object_key); } catch { /* The gallery entry is already removed; asset cleanup can safely be retried. */ }
  return Response.json({ ok:true });
}

export async function PUT(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return new Response("Staff access is required to like photos.", { status: 401 });
  const { id } = await request.json() as { id?: string };
  if (!id) return new Response("Photo id required", { status: 400 });
  const { DB } = getSiteEnv(); await DB.prepare(schema).run(); await DB.prepare(likesSchema).run();
  const memory = await DB.prepare("SELECT id FROM trip_memories WHERE id = ?").bind(id).first();
  if (!memory) return new Response("Photo not found", { status: 404 });
  const existing = await DB.prepare("SELECT memory_id FROM trip_memory_likes WHERE memory_id = ? AND user_email = ?").bind(id, user.email).first();
  if (existing) await DB.prepare("DELETE FROM trip_memory_likes WHERE memory_id = ? AND user_email = ?").bind(id, user.email).run();
  else await DB.prepare("INSERT INTO trip_memory_likes (memory_id, user_email, created_at) VALUES (?, ?, ?)").bind(id, user.email, new Date().toISOString()).run();
  const count = await DB.prepare("SELECT COUNT(*) AS total FROM trip_memory_likes WHERE memory_id = ?").bind(id).first<{ total:number }>();
  return Response.json({ id, likes:Number(count?.total || 0), liked:!existing });
}
