type SiteEnv = { DB: D1Database; BUCKET: R2Bucket; TEAM_LEADER_PIN?: string };
export function getSiteEnv(): SiteEnv {
  const bindings = (globalThis as typeof globalThis & { __ACM_SITE_ENV__?: SiteEnv }).__ACM_SITE_ENV__;
  if (!bindings?.DB || !bindings?.BUCKET) throw new Error("Site storage bindings are unavailable");
  return bindings;
}
