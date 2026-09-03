# Relay for Android — Trusted Web Activity wrapper

**This is not a native app.** It is a ~1.8MB shell whose only job is to open
`https://relay.k79.quest` in a Chrome tab with no browser chrome, and to put
Relay in the Android share sheet. All the UI, all the logic and every update
come from the website — ship a web deploy and every installed copy is updated
instantly, with no store review and no user action.

What the wrapper actually contributes:

- **A launcher icon** and a standalone window (no URL bar, no tabs).
- **The share sheet entry.** This is the reason the wrapper exists at all. A
  web app manifest's `share_target` does *not* put an app in the Android
  share sheet on its own — `AndroidManifest.xml` must also declare an
  `ACTION_SEND` intent-filter, and only a real installed package can do that.
- **Digital Asset Links binding**, which is what removes the browser chrome.

Because it is a TWA and not a WebView, it *is* Chrome: better-auth's cookie
sessions work untouched, and Google OAuth is permitted (Google blocks embedded
WebViews, not TWAs).

---

## 1. Prerequisites

```bash
bun add -g @bubblewrap/cli      # 1.24.1 at time of writing
bubblewrap doctor             # first run provisions its own JDK + Android SDK
```

Bubblewrap installs a private JDK 17 and Android SDK under `~/.bubblewrap`, so
you do **not** need Android Studio, a system JDK, or `ANDROID_HOME`:

```
~/.bubblewrap/config.json
  {"jdkPath": ".../jdk/jdk-17.0.11+9",
   "androidSdkPath": ".../android_sdk"}
```

Those paths are referenced below as `$JDK`.

---

## 2. The release signing key

**The keystore is not in this repo and must never be.** It lives at:

```
~/.relay-twa/android.keystore          # 4096-bit RSA, alias `relay`
~/.relay-twa/keystore-password.txt     # move this into a password manager
```

Both `mobile/twa/.gitignore` and the root `.gitignore` block `*.keystore`,
`*.jks` and `keystore-password.txt`, from two places, so a stray copy inside
the repo still cannot be committed.

| If you… | Then… |
|---|---|
| **lose** the key | No existing installation can ever be updated. A new key means a new `applicationId` and a fresh Play listing. Back it up. |
| **leak** the key | Anyone can sign a package Android will treat as Relay and that `assetlinks.json` authorises. Rotate immediately (§6). |

To create one from scratch (only needed if starting over):

```bash
"$JDK/bin/keytool" -genkeypair -v \
  -keystore ~/.relay-twa/android.keystore \
  -alias relay -keyalg RSA -keysize 4096 -validity 10000 \
  -dname "CN=Relay, OU=Relay, O=k79, L=Unknown, ST=Unknown, C=IN"
```

Read its SHA-256 — this value must match `public/.well-known/assetlinks.json`:

```bash
"$JDK/bin/keytool" -list -v -keystore ~/.relay-twa/android.keystore \
  -alias relay | grep SHA256
```

Current release fingerprint:

```
7C:51:9F:AE:2F:05:42:F2:92:1E:A2:1C:12:01:2B:BC:C6:BC:91:7A:AE:42:CD:BE:BA:6C:11:2F:7E:5E:08:F8
```

---

## 3. Build

> **`twa-manifest.json` reads the LIVE site.** `bubblewrap update` fetches
> `webManifestUrl` and `iconUrl` over the network. If the manifest or the icons
> are not deployed yet, `update` fails with
> `Unexpected token '<', "<!DOCTYPE "... is not valid JSON` — that is the app's
> HTML 404 page, not a config error. **Deploy the web app first.**

```bash
cd mobile/twa

# 1. Regenerate the Android project from twa-manifest.json.
#    --skipVersionUpgrade keeps the version in the manifest; omit it to be
#    prompted for a new one.
bubblewrap update --skipVersionUpgrade

# 2. Build and sign. See the Windows note below.
export BUBBLEWRAP_KEYSTORE_PASSWORD="$(cat ~/.relay-twa/keystore-password.txt)"
export BUBBLEWRAP_KEY_PASSWORD="$BUBBLEWRAP_KEYSTORE_PASSWORD"
bubblewrap build \
  --signingKeyPath ~/.relay-twa/android.keystore \
  --signingKeyAlias relay

# 3. Rename the artifacts to something a human can identify in a release.
VER=$(bun -e 'console.log((await Bun.file("twa-manifest.json").json()).appVersion)')
mv app-release-signed.apk "relay-${VER}.apk"
mv app-release-bundle.aab "relay-${VER}.aab"
rm -f app-release-signed.apk.idsig app-release-unsigned-aligned.apk
```

- `relay-<version>.apk` → sideload / GitHub release.
- `relay-<version>.aab` → Play Store upload only; Android cannot install an
  `.aab` directly.

### Windows: `gradlew.bat is not recognized`

Windows sets `NoDefaultCurrentDirectoryInExePath=1`, so `cmd` refuses to look
in the working directory, and bubblewrap invokes the wrapper bare. Put the
project directory on `PATH` for the build:

```powershell
$env:PATH = "$PWD;$env:PATH"
```

This is environment, not shell — it fails the same way from Git Bash.

---

## 4. Verify before shipping

```bash
# Signed, and by the key you think.
"$JDK/bin/jarsigner" -verify -verbose:summary -certs relay-0.1.0.aab

# The fingerprint actually embedded in the artifact.
unzip -p relay-0.1.0.apk META-INF/RELAY.RSA > /tmp/cert.rsa
"$JDK/bin/keytool" -printcert -file /tmp/cert.rsa | grep SHA256

# The share-sheet intent-filter. If this block is missing, Relay will not
# appear in the Android share sheet no matter what the web manifest says.
grep -A4 'action.SEND' app/src/main/AndroidManifest.xml
```

Expected:

```xml
<intent-filter>
    <action android:name="android.intent.action.SEND" />
    <category android:name="android.intent.category.DEFAULT" />
    <data android:mimeType="text/plain" />
</intent-filter>
```

Digital Asset Links, checked against Google's own resolver (`"linked": true`
is the only acceptable answer — an absent `linked` field means false):

```bash
curl -s -G https://digitalassetlinks.googleapis.com/v1/assetlinks:check \
  --data-urlencode "source.web.site=https://relay.k79.quest" \
  --data-urlencode "relation=delegate_permission/common.handle_all_urls" \
  --data-urlencode "target.android_app.package_name=space.k79.relay" \
  --data-urlencode "target.android_app.certificate.sha256_fingerprint=<FP>"
```

Install on a device:

```bash
adb install -r relay-0.1.0.apk
```

---

## 5. Two ordering rules that bite

1. **`share_target` must exist in the web manifest BEFORE you generate the
   wrapper.** Bubblewrap derives the `ACTION_SEND` intent-filter from it, and
   only at `init`/`update` time. Change `share_target` in
   `src/app/manifest.ts` and you **must** re-run `bubblewrap update` and ship
   a new APK, or the installed app and the site silently disagree.
2. **`assetlinks.json` must match the key you signed with.** If it drifts, the
   TWA still launches but with a **visible URL bar** — that is the symptom to
   recognise. Nothing errors.

### Bubblewrap manifest gotchas

| Field | Gotcha |
|---|---|
| `appVersion` | This is the version key. `appVersionName` is **silently ignored** and yields `versionName ""`, which Play rejects. |
| `appVersionCode` | Must strictly increase for every Play upload. |
| `splashScreenFadeOutDuration` | Omitting it emits `splashScreenFadeOutDuration: ,` into `build.gradle` — a Gradle syntax error. |
| `webManifestUrl` / `iconUrl` | Fetched at `update` time; must be live. |

---

## 6. Rotating the signing key

Only do this if the key leaked. Users must **uninstall and reinstall** —
Android refuses an update signed by a different key.

1. Generate a new keystore (§2) and read its SHA-256.
2. Replace the fingerprint in `public/.well-known/assetlinks.json`
   (or `bubblewrap fingerprint add <FP> --name=release` then
   `bubblewrap fingerprint generateAssetLinks --output=../../public/.well-known/assetlinks.json`).
3. **Deploy the web app first.** Both fingerprints may be listed at once, which
   is how you avoid a window where neither works.
4. Rebuild, re-sign, and confirm `assetlinks:check` returns `"linked": true`.
5. Remove the old fingerprint once nobody is on the old build.

---

## 7. Releasing a new version

```bash
# in twa-manifest.json: bump appVersion AND appVersionCode
bubblewrap update --skipVersionUpgrade
# build + rename per §3, verify per §4
gh release create "twa-v<version>" "relay-<version>.apk" --title "..." --notes "..."
```

Remember: for a **web-only** change you do not need a new APK at all. The
wrapper only needs rebuilding when `share_target`, the icons, the app name,
the theme colours, `start_url`, or the signing key change.
