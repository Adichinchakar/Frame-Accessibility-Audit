+# Secret Management and Best Practices

This document explains how to keep secrets (API keys, tokens, private keys) out of your Git repository and how to securely provide them for local development and CI.

## Why keep secrets out of Git
- Repositories may be public or shared; committing secrets risks leaking credentials.
- Even if you delete a secret later, it may remain in Git history.
- Use environment variables or secret stores instead.

## Files added
- `.env.example` — Example environment file with placeholders. Copy to `.env` and fill in values locally.
- `.gitignore` updated to ignore `.env`, `.env.*`, `.secrets`, and private keys.

## Local development (Node / backend)
For Node-based code (backend/server.js), use the `dotenv` package to load environment variables from a local `.env` file (only for development):

1. Install dotenv (if you haven't):
```bash
npm install dotenv --save-dev
```

2. At the top of your server entry (e.g., `server.js`):
```js
require('dotenv').config();
// Now access via process.env.MY_SECRET
const figmaKey = process.env.FIGMA_API_KEY;
```

3. Create a `.env` file at repository root (DO NOT commit it). Use `.env.example` as a template.

### Windows PowerShell - set env for current session
```powershell
$env:FIGMA_API_KEY = "your-figma-key-here"
# This only applies to the current PowerShell session.
```

### Windows PowerShell - set env permanently for current user
```powershell
[Environment]::SetEnvironmentVariable('FIGMA_API_KEY','your-figma-key-here','User')
# Restart terminals for changes to take effect.
```

## CI / GitHub Actions
Store secrets in GitHub repository settings and reference them in workflows.

1. Go to GitHub → Repository → Settings → Secrets and variables → Actions → New repository secret.
2. Add a secret, e.g., `SUPABASE_KEY`.
3. Use it in a GitHub Actions workflow:

```yaml
name: Build and Deploy
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Use Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install
        run: npm ci
      - name: Build
        run: npm run build
        env:
          SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}
```

## SSH keys
- Never commit private SSH keys. Add `.ssh/` and private key files (e.g., `id_ed25519`) to `.gitignore`.
- Add your public key (`id_ed25519.pub`) to GitHub → Settings → SSH and GPG keys.

## If you accidentally committed a secret
1. Remove the file and commit the removal:
```bash
git rm --cached .env
git commit -m "Remove .env with secrets"
```
2. Rotate the compromised keys immediately (regenerate tokens in the provider dashboard).
3. To fully remove from history, use the `bfg` tool or `git filter-repo` (advanced). Seek help if unsure.

## Quick checklist
- [ ] Add secrets to `.env` locally using `.env.example` as a template
- [ ] Do not commit `.env`
- [ ] Add secrets to GitHub Secrets for workflows
- [ ] Do not commit private keys; add to `.gitignore`
- [ ] Rotate any keys accidentally committed

If you want, I can:
- Add `dotenv` usage to your backend `server.js` or `server` code.
- Remove any existing secrets from the repo (I can help detect and redact), but note this is a sensitive operation.

