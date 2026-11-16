# Publish the Notcards Chrome extension

The upload file is `D:/ware/represent/dist/notcards-extension/notcards-store.zip`. To rebuild it from the checkout:

```powershell
node D:/ware/represent/scripts/notcards-extension.mjs --store #
```

## Upload the first draft

1. Sign in with the Google account that will own Notcards in the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole). First-time publishers register, provide a monitored developer email and pay Google's one-time registration fee. [Google registration instructions](https://developer.chrome.com/docs/webstore/register)
2. Build the Store distribution from this checkout if a fresh ZIP is needed. Use the separate **notcards-store.zip** supplied with the release. Keep the ZIP compressed for upload. The ZIP downloaded from the development website is the unpacked-install distribution.
3. Choose **Add new item**, select the Store ZIP and upload. Leave the item in draft. Copy the 32-letter **item ID** from the dashboard. This ID is public. The unpacked development ID is `aimdojafaddgpjhiejbfihfljeacolmk`. [Upload instructions](https://developer.chrome.com/docs/webstore/publish) · [How Chrome assigns and exposes the item identity](https://developer.chrome.com/docs/extensions/reference/manifest/key)
4. Give the Notcards operator the **item ID**. Add it as `NOTCARDS_STORE_EXTENSION_ID` to the existing Notcards development app environment and recreate the app using the development launcher. Keep the unpacked identity registered. The pilot operates at `https://not.maremoto.dev`. Google continues to redirect to `https://not.maremoto.dev/auth/google/callback`. Notcards returns its extension authorization code to the exact Store identity's Chromium callback.
5. Test that identity before requesting review. For an unpacked test with the assigned identity, open the item's **Package → View public key** and use Chrome's documented procedure to put that public key in the manifest of a separate, disposable unpacked copy of the Store ZIP. Load that copy in a fresh Chrome profile, verify the ID in the extensions manager, and follow the acceptance steps below. Keep the development installer and existing profile separate. [Chrome's public-key procedure](https://developer.chrome.com/docs/extensions/reference/manifest/key)

## Complete the listing

**Name:** Notcards

**Suggested single purpose:** Save a YouTube video and its available captions to the user's private Notcards research collection when they press the Notcards button.

**Short description:** Save YouTube videos and their available captions as full-art research cards in your Notcards library.

Use screenshots of the actual YouTube capture button and the resulting notebook. Supply the requested icon, promotional imagery, category, language, support contact and support URL in the dashboard. Claim features available to the reviewer. Development currently saves source material while AI summaries await gateway activation.

In **Privacy**, describe the data that actually travels. The extension reads the selected video's URL, title, channel and available captions. It queues pending captures in Chrome local storage and sends them to the signed-in Notcards service. A scoped Notcards grant is held in Chrome session storage. The website uses basic Google account identity for sign-in. Provide a publicly accessible privacy policy reviewed by the publisher that covers collection, use, sharing, retention and the real contact/deletion process. Confirm that it matches the release before submitting. [Google privacy disclosures](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)

| Requested permission | Reason for this release |
|---|---|
| identity | Complete Notcards sign-in and receive the extension callback. |
| storage | Keep the session grant and retain pending saves for retry. |
| scripting | Read the selected video's metadata and available captions when saving it. |
| www.youtube.com | Display the capture button on supported video pages and read the selected source. |
| not.maremoto.dev | Authorize the user's session, send the selected capture and open the notebook. |

## Test and publish

1. In a fresh Chrome profile, install the build with the Store item ID. Open one of the three supplied watch URLs and click **Notcards**. Complete Google sign-in. Verify that the correct account opens the new video card. Check its source text if captions are available. A captionless video should still produce a card.
2. Save a second video without signing in again. Reload Chrome and retry a previously pending save. Verify that notebook creation is idempotent and a different account cannot access the first account's collection.
3. In **Test instructions**, give reviewers the working Notcards URL, a sample video and these click-through steps. If Google restricts the OAuth consent screen to test users, arrange a working reviewer sign-in path before submission. Use the dashboard's private reviewer fields for necessary access information.
4. In **Distribution**, choose the intended audience. Unlisted is suitable for the initial link-only pilot. Choose **Submit for Review**. Clear automatic publishing if you want to release manually after approval. When approved, publish and replace the site's download action with the actual Store installation URL. [Google publishing instructions](https://developer.chrome.com/docs/webstore/publish)

## Fix an existing installation

A valid grant from the old service had a numeric expiry. Extension 0.3.0 tried to parse that number as a date string. The compatibility update returns an ISO timestamp and accepts both earlier caption payloads and plain text. Updated extension builds also accept either timestamp representation. The service can now complete a queued save from the previously released client. Click Notcards on a video again in the same Chrome profile. If using the unpacked installer, extract the new development ZIP into the existing extension directory, click **Reload** in Chrome's extensions manager, and refresh the YouTube tab.
