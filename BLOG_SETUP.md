# Blog setup and operation

The React portfolio now includes `/blog`, `/blog/:slug`, and a private `/admin/blog` workspace. All draft access and publishing decisions are checked by the server. Recurring generation can only be enabled after a successful generation-and-email trial; it is currently paused.

## Deployment status — 15 November 2026

The blog is deployed at https://portfolio-website-three-ruby-50.vercel.app/blog. The owner approved replacing Google Search grounding with Tavily research and using `gemini-3.5-flash-lite` for text generation. The first complete trial researched “Why human review matters in AI-assisted blogging”, saved a private draft, and sent its full contents and sources through Gmail to `ajsengundar@gmail.com`. The saved draft ID is `e1cc9717-1b3e-4ef3-a394-d65f3b78e973`; version 2 is now published. Recurring generation was left disabled after the trial and can be controlled separately in the editor.

The initial trial was shorter than requested. Revision 2 expanded it to roughly 650 words using the same saved research and was emailed successfully. Review the latest v2 email; v1 cannot approve the changed draft. The generator now validates length before emailing and allows one bounded repair attempt.

Verification: 21 automated tests pass, including free-credit checks, Tavily errors, citation validation, bounded draft-length repair, draft/email sequencing, and the existing database approval gates. Lint and the production build pass. Mobile navigation/category controls and the editor sign-in screen were checked previously. The email approval screen was checked for current, outdated, missing, failed-email, and already-published drafts; opening it never invokes publication. The image-upload flow still needs a complete interactive check. Openverse was unavailable during the earlier live image-search check; uploads remain available.

## Provisioned database

- Supabase project: `anuj-portfolio-blog`
- Project reference: `xfuhffadzahpwivvsxxf`
- Region: Mumbai (`ap-south-1`)
- API URL: `https://xfuhffadzahpwivvsxxf.supabase.co`
- Migration: `supabase/migrations/001_blog.sql` (already applied to this project).
- Images live in the private `blog-images` bucket. No public or authenticated-role access is granted to the blog tables or bucket. The server uses a private service credential and exposes only published snapshots.

For another Supabase project, apply the SQL once through the SQL editor or the migration tooling. Do not reapply it to the existing project.

## Required account setup

1. In Google Cloud, create a web OAuth client for Supabase Google sign-in. Set its callback to `https://xfuhffadzahpwivvsxxf.supabase.co/auth/v1/callback`. Add `ajsengundar@gmail.com` as the test user if the OAuth application is in testing mode.
2. Enable Google in Supabase Authentication → Providers using that client's credentials. Set the Auth site URL to your production portfolio URL. Allow `/admin/blog` redirects, including the draft/revision query parameters, and `http://127.0.0.1:5175/admin/blog**` only for local development.
3. The only editor account permitted by the server is the confirmed Google identity `ajsengundar@gmail.com`. After its first sign-in, disable new-user signups in Supabase. Other accounts receive no access to blog data even before signups are disabled. Do not enable anonymous sign-in.
4. Create a Gemini API key in a project with **billing disabled**. Verify `gemini-3.5-flash-lite` text generation works on that project's free tier. No Google Search tool is sent to Gemini. Model availability and allowances can change. The app never changes models automatically and stops on quota/provider errors. `GEMINI_FREE_TIER_CONFIRMED` is an operator acknowledgement, not a billing API check. Do not set it true for a billed project.
5. On `ajsengundar@gmail.com`, enable Google two-step verification and create a Gmail app password. Enter it directly in Vercel's private environment settings; never paste it into source control or chat. Accounts that disallow app passwords need a separately configured mail provider before activation.
6. Create a free Tavily Researcher account at https://app.tavily.com. Keep pay-as-you-go disabled. Save `TAVILY_API_KEY` as a server secret and set `TAVILY_FREE_TIER_CONFIRMED=true` only after checking billing. The owner confirmed billing is off for the current key. The usage API reports a free Researcher plan, 1,000 monthly credits, and no paid usage. A null `paygo_limit` is not proof that billing is disabled, so the operator confirmation is required too.

## Vercel settings

**Release order requested by the owner:** commit the tested website changes to Git and push them to `origin/main` first. Then deploy that exact Git commit to Vercel, using its repository integration. Do not deploy uncommitted workspace files directly. Verify the live deployment's commit matches the pushed commit.

Add the keys in `.env.example` to the existing portfolio project's production environment. Service credentials must **never** have a `VITE_` prefix.

| Variable | Value |
| --- | --- |
| `SITE_URL` | Your exact HTTPS production origin, without a trailing path |
| `SUPABASE_URL` | The API URL above |
| `SUPABASE_ANON_KEY` | Supabase publishable key (browser-safe; name retained for compatibility) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase secret/service-role key; server only |
| `GEMINI_API_KEY` | Free-tier Gemini project key; server only |
| `GEMINI_MODEL` | `gemini-3.5-flash-lite` |
| `GEMINI_FREE_TIER_CONFIRMED` | `true` only after verifying the free-tier project |
| `TAVILY_API_KEY` | Tavily Researcher key; server only |
| `TAVILY_FREE_TIER_CONFIRMED` | `true` only after confirming pay-as-you-go is disabled |
| `GMAIL_USER` | `ajsengundar@gmail.com` |
| `GMAIL_APP_PASSWORD` | Gmail app password; server only |
| `CRON_SECRET` | A random value of at least 32 bytes; server only |

Use Node.js 22 or newer and Fluid Compute. The single API function allows 300 seconds. `vercel.json` includes SPA deep-link rewrites and the daily `03:30 UTC` cron, corresponding to the 9–10 a.m. India time window on Hobby. The database decides whether a draft is due. No separate workflow service is needed.

Deploy the source after these settings are present. Cron does nothing while `schedule_enabled` is false. There is no automatic payment upgrade or model fallback. Provider free-tier limits, inactive Supabase projects, and outages can interrupt the schedule; the editor shows errors and provides manual retries.

Each topic uses two bounded Tavily basic searches, normally two credits in total. Before each search, the server verifies the current free plan, remaining credits, and absence of paid usage or a positive PAYGO cap. It stops if the balance cannot cover the remaining searches. Only the title is submitted to Tavily; personal notes go to Gemini with the selected topic. Up to eight deduplicated HTTPS sources and excerpts are retained privately as research. This is search-excerpt research, not a claim to have read entire articles or watched videos. Gemini must cite at least two source numbers, which the server converts into the actual researched URLs. Drafts outside 650–1,100 words get one repair attempt, then fail without email if still outside the range. No failed research or generation run publishes anything.

## First trial and activation

1. Visit `/admin/blog`, sign in with the approved Google account, and add one real topic with sources or notes.
2. Select **Create draft**. Research citations and the draft are stored privately, then the full draft is emailed to `ajsengundar@gmail.com`.
3. Review the full email. **Approve & publish vN** opens a focused confirmation page for that emailed version. Sign in with the owner account if needed, then select **Confirm & publish vN**. The email also includes **Edit this draft first**. The confirmation screen blocks outdated or unconfirmed emails and shows when the version is already published. Opening a link, including an email scanner opening it, never publishes.
4. To edit text or choose images, open the editor. **Save & email changes** creates a new revision and emails it. If delivery fails, retry with **Send full draft by email**. Open the latest email before approving the revised version.
5. The editor's **Approve vN & publish** remains available and uses the same server checks. Neither the trial nor the schedule publishes automatically.
6. Once the trial has succeeded, select **Enable schedule**. Its first eligible run is the next India calendar day, then every two days. An empty queue advances the due date without making up a topic. On-demand drafts do not alter the schedule.

A published article remains a separate snapshot when you edit its draft. **Unpublish** removes that snapshot and makes its images private again. Keep the stored content and assets unchanged outside the editor to preserve revision guarantees.

## Topic and image inputs

- Export YouTube watch history from Google Takeout as JSON or HTML. Unzip locally and select the watch-history file, not the ZIP. Imports up to 25 MB are parsed only in your browser. Select at most 50 entries at a time; only these titles/links are saved. Repeated videos are deduplicated, including repeated imports.
- A history export is not live synchronization, and a video title is not its transcript. Tavily finds sources about the topic and Gemini writes from their excerpts; it must not pretend to have watched inaccessible video content.
- Enter any topic and HTTPS links manually. Choose article or review and add personal notes. Gemini defaults to English, about 800 words, and spoiler-free coverage, and must not invent personal experiences.
- Upload JPEG/PNG/WebP under 3 MB, or search Openverse for CC0, public-domain, CC BY, and CC BY-SA images. Check the original source and license before selecting; search metadata alone is not a rights guarantee. Credits remain attached to the image and are included in the post/email.
- Choose cover or inline placement, alt text, and captions. For exact inline placement, insert the displayed `![alt](asset:UUID)` token in the Markdown body. Otherwise inline images appear after the article. Remote Markdown image URLs are not loaded.

## Development and checks

```text
npm ci
npm test
npm run build
npm run dev
```

Use Node.js 22 or newer locally, matching Vercel; the Supabase client requires native WebSocket support. `npm run dev` serves both the API and UI at `http://127.0.0.1:5175`. Put local credentials in gitignored `.env.local` if testing integrations. Without credentials, the public blog shows its empty state and the editor explains that setup is incomplete. `npm run dev:frontend` runs Vite alone and does not support the API.

The automated tests execute the real SQL functions in local PostgreSQL (PGlite), testing email/approval gates, snapshots, access restrictions, date boundaries, retries, and generation locks. The Tavily/Gemini/Gmail trial has succeeded; authenticated editing and publication still require the owner to complete Google sign-in and approve the latest emailed version.

If a function times out, wait six minutes before retrying its topic. Duplicate runs are locked out. If SMTP delivery is uncertain, check your inbox before retrying the email; the system intentionally does not auto-resend an ambiguous delivery. Keep scheduling paused until connection problems are resolved.
