# AGENTS.md

## Project Context

This is a Supabase-backed React application (SmartBooks SA). Treat it as user-owned application code, keep changes focused on the user's request, and preserve existing project conventions.

Start with `README.md` for local setup, environment variables, and deployment workflow.

## Key Files

- `src/`: frontend application source.
- `src/api/supabaseClient.js`: Supabase client — exports `supabase` (raw client) and `db` (the app's API layer: `db.entities.*`, `db.auth.*`, `db.integrations.*`, `db.users.*`).
- `vite.config.js`: Vite config (plain React plugin).
- `.env.local`: local-only environment values (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`); never commit secrets.
- `supabase/`: Supabase project config, migrations, and Edge Functions.

## Working Notes

- Run `npm run dev` for local development (Vite dev server).
- The Supabase project is linked; project ref is in `supabase/config.toml`.
- Database schema, RLS policies, and storage bucket are defined in `supabase/migrations/`.
- Edge Functions live in `supabase/functions/` and are deployed via `supabase functions deploy`.
- AI features (InvokeLLM, ExtractDataFromUploadedFile) require a Together AI API key configured in Supabase Edge Functions.
- Run the relevant checks from `package.json` before finishing code changes (`npm run lint`, `npm run build`).
