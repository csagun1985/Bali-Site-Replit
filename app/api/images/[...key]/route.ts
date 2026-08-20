import { getSiteEnv } from "../../../platform-env";
import { isReplitRuntime } from "../../../chatgpt-auth";
import { getReplitStore } from "../../../replit-store";

export async function GET(_:Request,{params}:{params:Promise<{key:string[]}>}) {
  const { key } = await params;
  const objectKey = key.join("/");
  try {
    const object = await getSiteEnv().BUCKET.get(objectKey);
    if (!object) return new Response("Not found", { status:404 });
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("cache-control", "public,max-age=31536000,immutable");
    return new Response(object.body, { headers });
  } catch (error) {
    if (!isReplitRuntime()) throw error;
    const memory = getReplitStore().memories.find(item => item.objectKey === objectKey);
    if (!memory) return new Response("Not found", { status:404 });
    const body = new Uint8Array(memory.bytes.byteLength);
    body.set(memory.bytes);
    return new Response(body.buffer, {
      headers: {
        "content-type": memory.contentType,
        "cache-control": "private,max-age=3600",
      },
    });
  }
}
