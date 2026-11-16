# Notcards development service

Notcards is Represent’s research notebook. The development origin is [not.maremoto.dev](https://not.maremoto.dev). The intended production domain is `not.cards`. The initial public collection uses the three supplied YouTube links and their public thumbnails. Personal notes, images, and collection order belong to the signed-in account.

## Google configuration

Leave Google's **AI agent** checkbox clear for this client. Notcards uses the standard Google identity scopes to sign people in. Ghost handles research summaries separately. [Google OAuth client guidance](https://support.google.com/cloud/answer/15549257?hl=en#agentic-client)

Create a Google OAuth **Web application** for Notcards development. Register the exact callback `https://not.maremoto.dev/auth/google/callback` and web origin `https://not.maremoto.dev`. If the OAuth app is in Testing, add the intended Google accounts as test users. The web service handles sign-in. The Chrome extension exchanges a short-lived authorization code for an app grant. Neither the OAuth secret nor a Google token belongs in the extension. [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect) · [Chrome identity](https://developer.chrome.com/docs/extensions/reference/api/identity)

The launcher creates a dedicated file at `%LOCALAPPDATA%/Notcards/dev/runtime.env`. It accepts the dedicated `NOTCARDS_GOOGLE_CLIENT_ID` and `NOTCARDS_GOOGLE_CLIENT_SECRET`. The app generates random website session tokens and extension grants, and stores their hashes in SQLite. Rerun the launcher after changing the Google configuration. Only the app container receives the Google configuration.

## Run the development stack

Development accounts have limits of 2,500 notebooks, 200 folders and 512 MiB of notebook storage. A notebook accepts up to eight PNG, JPEG or WebP images, each at most 2 MiB. When a write would exceed a limit the service rejects it. Existing research remains readable.

For a downloaded Google Web client JSON, pass its local path via the launcher's `-GoogleClientFile` parameter. It checks the registered callback and imports only the client ID and secret into the dedicated dev environment file. Leave Google's AI agent client checkbox unchecked for this interactive sign-in client. [Google client configuration](https://support.google.com/cloud/answer/15549257?hl=en#agentic-client).

On lab1 the launcher builds the dev extension, embeds its ZIP in the app image, and starts the app and dedicated named tunnel. The app runs as the Node user with a read-only application filesystem. The named volume `notcards-dev-data` holds account data. Only loopback port 8891 is published on the machine. The connector uses a credential for `notcards-dev` and an exact hostname ingress rule. Google authentication is handled by the app.

```powershell
& D:/ware/represent/deploy/notcards/dev.ps1 #
```

The dedicated Cloudflare tunnel identifier is `1e391707-1dee-43e8-847e-0adb76605b2e`. Its credential lives outside Git. In the **maremoto.dev** zone, the dev route is one proxied CNAME named `not` targeting `1e391707-1dee-43e8-847e-0adb76605b2e.cfargotunnel.com` with automatic TTL. Check the zone before saving. The machine's default cloudflared origin certificate currently selects `ware.cl`. Rebuilding an existing deployment needs only the launcher. [Cloudflare named tunnels](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/local-management/create-local-tunnel/)

Use the dev ZIP on the site, unzip it, then **Chrome → Extensions → Developer mode → Load unpacked** and select the directory that directly contains `manifest.json`. The dev ID is `aimdojafaddgpjhiejbfihfljeacolmk`. The hosted service permits its exact redirect `https://aimdojafaddgpjhiejbfihfljeacolmk.chromiumapp.org/auth`. Select Notcards on a YouTube video. With an existing web session, the extension can authorize quietly. A first-time user signs in through Google and then resumes the capture. Store publication and the production extension ID are separate release steps.

The existing Clay Notes local data and the legacy loopback extension remain available for their earlier development workflow. New hosted accounts have their own collection. The dev deployment saves source material while gateway onboarding is pending. The proposed internal gateway key and lane names remain in the existing [operator request](../design/clay-notes-gateway-request.md).

## Verification and rollback

On lab1 the development container served the collection and ZIP and returned HTTP 401 for signed-out private notes. A clean Chromium profile loaded the unpacked extension at the expected ID and showed its capture button on all three supplied videos. The hosted account checks use isolated fixture identities. The public HTTPS origin serves the collection. The Google web client is configured, and the live sign-in reaches the Google account chooser. Completing consent and returning to a private account are separate acceptance checks. Paid video summaries require the operator's separate Ghost onboarding and allowance.

Check the development HTTPS origin, download the ZIP, and confirm that a signed-out request to `/api/notes` gets 401. Once the Google client is configured, complete a real sign-in, capture one of the three videos with Chrome, reopen its notebook, switch accounts, and check that the other account opens its own library. The local regression suite exercises separate account data, auth, and capture using fixtures.

Stop only this stack and retain the data volume:

```powershell
& D:/ware/represent/deploy/notcards/dev.ps1 -Stop #
```

To roll back, deploy the prior verified application revision against a backup of its compatible data volume. Back up the development volume and the host-managed session configuration before a storage migration. Configure a separate domain, Google client, persistent storage and store extension for the production launch at `not.cards`.

Use the [Chrome Web Store publishing guide](notcards-chrome-store.md) to upload the Store build and register its assigned ID alongside the unpacked development extension.
