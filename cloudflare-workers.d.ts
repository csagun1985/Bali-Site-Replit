declare module "cloudflare:workers" {
  export const env: {
    DB: D1Database;
    BUCKET: R2Bucket;
  };
}
interface Fetcher { fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> }
interface D1Result { meta: { changes: number } }
interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  run(): Promise<D1Result>;
  first<T=unknown>(): Promise<T|null>;
  all<T=Record<string, unknown>>(): Promise<{ results: T[] }>;
}
interface D1Database {
  prepare(query:string): D1PreparedStatement;
  batch<T = unknown>(statements:D1PreparedStatement[]): Promise<T[]>;
}
interface R2ObjectBody { body: ReadableStream; writeHttpMetadata(headers:Headers):void }
interface R2Bucket {
  put(key:string,value:ArrayBuffer,options?:unknown):Promise<unknown>;
  get(key:string):Promise<R2ObjectBody|null>;
  delete(key:string):Promise<void>;
}
