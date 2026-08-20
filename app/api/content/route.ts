import { getSiteEnv } from "../../platform-env";

const schema = `CREATE TABLE IF NOT EXISTS site_content (id INTEGER PRIMARY KEY CHECK (id = 1), content TEXT NOT NULL, updated_by TEXT, updated_at TEXT NOT NULL)`;
export async function GET(){ const {DB}=getSiteEnv(); await DB.prepare(schema).run(); const row = await DB.prepare("SELECT content FROM site_content WHERE id = 1").first<{content:string}>(); return Response.json({content:row?JSON.parse(row.content):null}); }
