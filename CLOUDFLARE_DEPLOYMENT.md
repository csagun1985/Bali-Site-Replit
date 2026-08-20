# Cloudflare deployment

This package is configured for Cloudflare Workers with static assets, D1, R2
and the Workers Images binding.

## Important: upload the extracted files

Extract the ZIP first, then upload all files and folders directly to the root
of the GitHub repository. The repository root must immediately contain:

- `package.json`
- `package-lock.json`
- `wrangler.jsonc`
- `app/`
- `public/`
- `worker/`

Do not upload the ZIP itself as a repository file and do not place the extracted
files inside another folder.

## Cloudflare Workers Builds settings

Connect the GitHub repository from **Workers & Pages** and use:

- Production branch: `main`
- Root directory: `/`
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Node.js version: `22.13.0` or later

The build creates the Cloudflare Worker and static assets. Wrangler then uses
the generated deployment configuration automatically. The first deployment can
provision the D1 database and R2 bucket declared in `wrangler.jsonc`.

## Optional Team Leader PIN

To enable Team Leader Mode, add a secret named `TEAM_LEADER_PIN` in the
Worker's Cloudflare settings. Do not commit the PIN to GitHub.

## Local verification

```bash
npm ci
npm test
```

## Local deployment

After signing in to Cloudflare with Wrangler:

```bash
npm run deploy
```
