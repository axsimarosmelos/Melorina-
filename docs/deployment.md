# Deploy the Melorina voice service

This release contains a separately deployable backend and a GitHub Pages client.
**A hosted service has not been provisioned or live-tested from this workspace.**
Hosting integrations are disabled by the workspace administrator, and no hosting
credentials or OpenAI API key were available. No service URL is invented in the
app's public configuration.

## Activate the service

1. [Deploy this repository to Render](https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2Faxsimarosmelos%2FMelorina-).
   Sign in to Render and connect the `axsimarosmelos/Melorina-` GitHub repository.
   Review the service and disk charges before confirming. The blueprint selects
   **paid compute and a 1 GB persistent disk**; OpenAI usage is billed separately.
2. Enter `OPENAI_API_KEY` in Render's secret/environment prompt. Use a dedicated
   OpenAI project key with access to the configured models. Never paste the key
   into GitHub, the browser app, or chat.
3. Wait for Render's build and health check. It runs the automated tests and build,
   then starts the service with Node 24. Save the **actual HTTPS service URL** shown
   in the dashboard; the name may have a suffix.
4. In Render's Environment settings, privately copy the generated
   `MELORINA_INVITE_CODE`. Open the service URL, choose **Voice studio → I have an
   invitation**, and create your learner account. Use a password manager.
5. Enable AI voice for this visit. Try **Hear this voice**, record a word, transcribe
   and confirm it, then try one conversation. These are real billed OpenAI calls.
   A successful health check alone does not establish that the key or models work.

The service also serves the complete app, so its HTTPS URL is immediately usable
without another frontend deployment after those checks succeed.

## Connect the GitHub Pages app

The public frontend remains at
[Melorina](https://axsimarosmelos.github.io/Melorina-/).

For the owner’s browser, open `/connect` on the actual service URL, then open
**Voice studio** on the Pages app. The proposed server appears under **Voice
service connection**. Check the address and choose **Trust & connect this
service**. This explicit step prevents links from silently redirecting login
credentials or recordings to a different service. Then sign in. Alternatively,
enter the service URL directly in that connection panel.

For every learner to connect automatically, edit `src/config.js` in GitHub:

```js
globalThis.MelorinaConfig={apiBaseUrl:'https://YOUR-ACTUAL-SERVICE.onrender.com'};
```

Replace the entire example address with the real service origin, without `/api`
or a path. Commit to `main`; GitHub Pages publishes the change. This is a public
URL, not a credential. Share that URL with the project maintainer to have the
configuration update committed. The GitHub configuration takes precedence over
previous per-browser preferences on reload.

OpenAI keys, invitation codes, passwords, and tokens never belong in this file.
Local text practice remains available when the backend is offline. Downloaded
HTML supports offline text practice; `file:` origins are intentionally not
allowed to call the hosted API.

## Updates and hosting layout

- Both frontend and backend source live on `main` in this repository.
- GitHub Pages deploys the browser files from the repository root.
- Render links to `main` and redeploys on commits. Its build runs `npm test && npm
  run build`, so a failing test prevents a new backend build from starting.
- The Blueprint's auto-deploy setting is intentional for this owner's project.
- Hosted mode binds to `0.0.0.0` and the host's `PORT`. TLS is terminated by the
  hosting platform. The configured public origin determines valid Host headers.
- Render supplies `RENDER_EXTERNAL_URL`. Other hosts must supply
  `MELORINA_PUBLIC_ORIGIN`, the exact allowed frontend origins, persistent data
  directory, invitation secret, and `MELORINA_MODE=hosted` (see `.env.example`).
- SQLite lives under `/var/data/melorina`, using the persistent disk. Run one
  service instance. Do not use ephemeral/serverless storage or multiple replicas
  with this design. Disk-backed redeployments have a short interruption.
- `/healthz` reports process liveness. `/api/status` reports configuration presence
  and sign-in requirements. Neither tests provider access or makes paid calls.

## Accounts, allowance, and privacy

Accounts use unique usernames, scrypt password hashes with random salts, and
random seven-day session tokens whose hashes are stored in SQLite. There is no
email collection or email verification. Registration needs the private invitation
code; the default maximum is 100 accounts. Share invitations only with intended
learners and rotate the secret if it leaks. Rotation does not log out existing
accounts.

Bearer tokens are kept in browser session storage, scoped to the selected backend;
closing the tab ends that browser session. Logout revokes the token on the server.
Signing in on a fifth device revokes the oldest of four sessions. Learning profiles
are separate per account and backend in local browser storage. They are **not
cloud-synced or encrypted** and browser/device owners can inspect them. Guest
history is retained separately; signing in does not automatically import it.

Recordings and conversation text are forwarded only for requested operations;
this service does not save them or log request bodies. Provider data handling is
separate; see [voice practice](voice-practice.md). Export or reset learning history
from **Your growth**. Clearing local history does not delete the server account.

Defaults:

| Control | Limit |
| --- | --- |
| Per learner / UTC day | 80 units |
| Whole service / UTC day | 1,000 units |
| Units per operation | Speech 1, transcription 2, conversation reply 3 |
| Concurrent AI requests | 2 service-wide; 1 per learner |
| AI requests / minute | 60 service-wide; 20 per learner |
| Sign-in/registration attempts / minute | 20 service-wide; 5 per username |
| Concurrent sign-in/registration operations | 2 |
| Uploaded audio body | 6 MiB; supported audio MIME types only |
| Conversation/speech JSON body | 24 KB; provider adapter applies field limits |
| Browser recording duration | 30 seconds (the server enforces bytes, not duration) |
| Upstream request timeout | 35 seconds |

Allowances count reserved requests, including requests that fail or are cancelled,
and survive server restarts. They are **not dollar caps**. A conversation reply and
its playback cost four units. The UI shows the last checked allowance; **Check
connection again** refreshes it. Change the numeric limits using Render's
`MELORINA_*` settings in the blueprint. Monitor actual OpenAI usage separately.

## Owner account maintenance

Run these only in the deployed service's private shell. The command refuses to
create a new database at a mistaken path. It never prints credentials.

Revoke all of a learner's sessions:

```sh
node scripts/accounts.js revoke learner_name
```

Reset a forgotten password while keeping the account ID and its local progress
mapping. Use the shell's hidden input prompt; do not put passwords in command
history or command arguments:

```sh
read -r -s -p "New password: " MELORINA_NEW_PASSWORD
printf '%s' "$MELORINA_NEW_PASSWORD" | node scripts/accounts.js reset learner_name
unset MELORINA_NEW_PASSWORD
```

The new password must have 12–128 characters. Reset revokes all current sessions.
There is no automated email recovery. Verify the learner's identity privately
before resetting their account.

For an explicitly requested account deletion:

```sh
node scripts/accounts.js delete learner_name
```

This deletes the server username, password hash and sessions. It does not erase
learning history on the learner's device or provider-held data. The learner can
reset their profile before deletion or clear the site's browser storage. Reusing
a deleted username creates a new account ID, not access to the former profile.

## Release checks and operations

After the first deployment, verify sign-in, speech playback, microphone permission,
transcription confirmation, conversations, logout, and a fresh sign-in on both a
phone and desktop. Check the GitHub Pages origin as well as the backend's own app.
Review generated Emirati speech and responses with an educator before broader
release. See [VALIDATION.md](../VALIDATION.md) for what has actually run.

Configure monitoring for provider failures, spending and disk availability. Keep
SQLite-consistent backups outside this disk; do not copy only the main SQLite
file while WAL writes are active. Use SQLite's backup API or an offline database
copy, and test recovery before expanding beyond the initial invited group.
Database backups contain private account data and must not go in GitHub.
No offsite backup automation or email recovery provider is configured in this
release. Move to managed account services and a shared database before scaling.

## References

- [Render Blueprint specification](https://render.com/docs/blueprint-spec)
- [Render deployment button](https://render.com/docs/deploy-to-render)
- [Render persistent disk lifecycle and limitations](https://render.com/docs/disks)
- [Render public service URL environment variables](https://render.com/docs/environment-variables)
- [OpenAI production guidance](https://developers.openai.com/api/docs/guides/production-best-practices)
