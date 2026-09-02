# Connecting a social account to Relay

Relay downloads Reels and Shorts as **you**. To do that it needs a signed-in
session — not your password, which it never asks for and never sees.

You get it one by exporting a `cookies.txt` from a browser you're already
signed in to, and uploading it. The whole thing takes about two minutes.

- [Before you start](#before-you-start)
- [Instagram](#instagram)
- [YouTube](#youtube)
- [What Relay keeps, and what it throws away](#what-relay-keeps-and-what-it-throws-away)
- [Making a session last](#making-a-session-last)
- [Troubleshooting](#troubleshooting) — every error message, and its fix
- [Why it works this way](#why-it-works-this-way)

---

## Before you start

**Install the export extension.** One extension covers every provider:

| Browser | Extension |
| --- | --- |
| Chrome, Edge, Brave, Arc, Opera | [Get cookies.txt LOCALLY](https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc) |
| Firefox | [Get cookies.txt LOCALLY](https://addons.mozilla.org/en-US/firefox/addon/get-cookies-txt-locally/) |
| Source code | [github.com/kairi003/Get-cookies.txt-LOCALLY](https://github.com/kairi003/Get-cookies.txt-LOCALLY) |

> **The word LOCALLY is not decoration.** There are similarly named cookie
> exporters that upload what they read to a third-party server. A cookie jar
> is a bearer token for your whole account — anyone holding it is signed in
> as you, without needing your password or your 2FA. This one is open source
> and writes the file to your disk. Check the URL matches the table above
> before you install.

**Pick the account you want Relay to use.** It will act as that account. If
you'd rather not point it at your main one, sign up for a second — see
[Making a session last](#making-a-session-last).

---

## Instagram

**Time: ~2 minutes. Any browser, normal window.**

### 1. Sign in

Open <https://www.instagram.com/accounts/login/> and sign in. Complete 2FA if
you use it. You should end up on your feed.

### 2. Go to the export page

In the **same browser**, open <https://www.instagram.com/>.

You need to be *on* an instagram.com page when you export — the extension
reads the cookies for whatever site the current tab is on.

### 3. Export

Click the extension icon in your toolbar, then **Export**.

- Format must be **Netscape** — that is this extension's default, and the
  file it saves is named `instagram.com_cookies.txt` or `cookies.txt`.
- If you see an **Export As** menu, choose the plain/Netscape option, **not**
  JSON. Relay will tell you if you pick the wrong one.
- Exporting *everything* rather than just this site is also fine. See
  [What Relay keeps](#what-relay-keeps-and-what-it-throws-away).

### 4. Upload

In Relay: **Vault → Account → Instagram → Connect**. Choose the file, or open
it in a text editor and paste the contents. Give it a name if you have more
than one account.

You'll get a confirmation telling you how many cookies were kept and how many
were discarded.

**What Relay needs from an Instagram export:** `sessionid` and `ds_user_id`.
If either is missing you weren't signed in when you exported — see
[Troubleshooting](#troubleshooting).

---

## YouTube

**Time: ~3 minutes. This one has extra rules, and they matter.**

> ### Read this first
>
> **YouTube rotates your session every time an open YouTube tab refreshes.**
> Export from an ordinary window and the file is often dead within minutes —
> the act of continuing to browse invalidates what you just saved.
>
> The fix is a private/incognito window that you **close and never reopen**.
> This is [yt-dlp's own documented
> procedure](https://github.com/yt-dlp/yt-dlp/wiki/Extractors#exporting-youtube-cookies),
> not a Relay quirk, and the steps below follow it exactly.
>
> **Google also warns about account bans.** In their words: *"By using your
> account with yt-dlp, you run the risk of it being banned (temporarily or
> permanently). Be mindful with the request rate and amount of downloads you
> make with an account. Use it only when necessary, or consider using a
> throwaway account."* Relay rate-limits itself (see
> [Making a session last](#making-a-session-last)), but the account is yours
> and so is the risk.

### 1. Open a private window

Open a **new incognito / private browsing window**.

`Ctrl+Shift+N` on Chrome/Edge, `Ctrl+Shift+P` on Firefox. On a Mac, `Cmd`
instead of `Ctrl`.

### 2. Sign in to YouTube

In that window, go to
<https://accounts.google.com/ServiceLogin?service=youtube> and sign in.

You may need to enable the extension for incognito first — Chrome:
`chrome://extensions` → Get cookies.txt LOCALLY → **Details** → **Allow in
Incognito**.

### 3. Navigate to robots.txt — in the same tab

In the **same tab**, go to <https://www.youtube.com/robots.txt>.

This should be the **only** private/incognito tab open. `robots.txt` is a
plain text file that issues no new session, which is the entire point: any
normal YouTube page would rotate your cookies as it loaded.

### 4. Export, then close the window immediately

Click the extension → **Export**. Then **close the whole private window**.

Do not reopen YouTube in it. Do not go back and check something. The session
must never be opened in a browser again, or the file you just saved stops
working.

### 5. Upload

In Relay: **Vault → Account → YouTube → Connect**, then choose or paste the
file.

**What Relay needs from a YouTube export:** `SID` and `__Secure-3PSID`.

---

## What Relay keeps, and what it throws away

You can export every cookie in your browser. Relay cleans the file before
anything is saved, and the cleaning happens on the server *before* the first
write — not in the browser, where it could be skipped.

**Three filters run, in order:**

1. **Domain allowlist.** Anything outside the provider's own domains is
   dropped on the floor.

   | Provider | Domains kept |
   | --- | --- |
   | Instagram | `.instagram.com` |
   | YouTube | `.youtube.com`, `.google.com` |

2. **Expiry.** Any cookie already past its own expiry date is dropped.

3. **Completeness.** What survives must still contain the session cookies
   listed above, or the whole import is refused and nothing is stored.

Only what survives all three is encrypted and saved. The confirmation message
tells you the count both ways — *"Kept 8 Instagram cookies and discarded 214
belonging to other sites."*

**Verified:** a jar containing a bank cookie and a webmail cookie alongside a
real Instagram session stored 8 cookies, discarded 2, and neither foreign
value appeared anywhere in what was written.

**What is never stored, logged, or shown again:**

- Cookie **values** are encrypted (AES-256-GCM) the moment they arrive and
  are never returned to a browser, never written to a run record, and never
  sent to a log sink.
- The Vault shows cookie **names** only (`sessionid`, `csrftoken`, …), which
  are the same for every user and reveal nothing.
- Your password is never involved at any point.

---

## Making a session last

A session is a live thing. It ends when the provider decides it has, and
there is no expiry date you can trust — the cookie's own expiry is a ceiling,
not a promise.

**What kills a session immediately:**

| Action | Effect |
| --- | --- |
| Signing out of the account in your own browser | **Kills it.** Signing out revokes the session server-side, including Relay's copy. |
| Changing your password | **Kills it**, on both providers. |
| Reopening a YouTube session after export | **Kills it** — this is why step 4 says close the window. |
| "Sign out of all devices" / security review | **Kills it.** |

Note the first row: **close the tab, don't sign out.** That single habit is
the difference between a session that lasts months and one that dies tonight.

**What does *not* kill it:**

- Continuing to use Instagram normally in your browser. Measured against a
  real account: after a Relay download, `sessionid` came back
  **byte-identical** — only `rur`, an internal routing hint, had rotated.
- Relay downloading. It paces itself deliberately: **10 downloads per hour
  and 50 per day per connected account**, well inside ordinary human
  browsing. Going over the budget *delays* a run, it never fails one.

**On "use it frequently so it lasts longer":** partly true, and worth being
precise about. Frequent use does *not* refresh the cookie — the value doesn't
change. What it does is keep the provider's server-side session record from
aging out through inactivity. So regular use helps, but it isn't a renewal
mechanism, and it can't rescue a session you signed out of.

**Consider a dedicated account.** Both providers' terms discourage automated
access, and yt-dlp's maintainers explicitly recommend a throwaway. A separate
account you only use for this keeps a ban — if one ever comes — away from the
account you actually care about.

**When a session dies,** Relay tells you rather than silently failing. Runs
stop with *"Your Instagram session has expired. Reconnect it in the Vault to
keep processing this source."* After **two** consecutive refusals the Vault
row shows a **Reconnect** action. (Two, not one, so a single transient
checkpoint doesn't nag you about a session that's actually fine — any
successful download resets the count.) Reconnecting is the same flow as
connecting; it replaces the old session in place.

---

## Troubleshooting

Every message Relay can give you, and what to do about it.

### "That's a JSON export. Re-export using the Netscape / cookies.txt format instead."

You used a JSON export — most often from **Cookie-Editor**, which defaults to
it. Either switch that extension's export format, or use
[Get cookies.txt LOCALLY](#before-you-start), which produces the right format
by default.

### "That export is missing your \<provider\> session (sessionid)."

You weren't actually signed in when you exported, or the session had already
expired. The named cookie is the one that's missing.

1. Sign in to the provider in that browser.
2. **Reload the page** — cookies set during login aren't in the tab's context
   until it reloads.
3. Export again.

On YouTube this also happens if you exported from an ordinary window and
kept browsing — go back to [the YouTube steps](#youtube) and use a private
window.

### "That file has no \<provider\> cookies in it."

The export came from a tab on a different site, or you picked the wrong
provider in Relay. The extension reads the *current tab's* site — be on
`instagram.com` or `youtube.com` when you click Export.

### "No cookies could be read from that file."

The file isn't in Netscape format. A correct one starts with
`# Netscape HTTP Cookie File` and has tab-separated columns. If you opened it
in Excel or a rich-text editor and re-saved, the tabs are gone — export a
fresh copy and don't open it in anything but a plain text editor.

### "That file is empty."

Nothing was selected, or the export produced an empty file. Check the
extension actually saved something.

### "That file could not be read as a cookie jar."

The file broke a structural rule — usually a stray tab or newline inside a
cookie value, which means it was edited or corrupted. Export a fresh copy
without editing it.

### Downloads worked, then started failing

Your session expired. See
["When a session dies"](#making-a-session-last) above. This is normal and
expected eventually — reconnect.

### The Instagram card says "Soon"

That source has no entry in Relay's provider registry, so it can't be
connected yet. Availability comes from the registry, not a feature flag.

---

## Why it works this way

Relay used to run a browser **on the server** that you drove remotely through
a video stream, so you could sign in without ever touching a cookie file. It
worked — for Instagram. It was removed anyway, for two reasons:

1. **Google refuses to authenticate an automated browser.** The sign-in page
   returns *"This browser or app may not be secure."* That is a deliberate
   policy against remote-controlled browsers, not a fingerprint you can
   evade, so YouTube — half the point — could never have worked.
2. **It cost ~400MB of Chromium in every deployment**, on a feature only one
   provider could use.

Exporting a file is a worse first-run experience and a better system: your
password no longer travels through this server *at all*, the sign-in happens
in your own browser with your own 2FA, and the deployment lost a browser
engine.

For the full engineering rationale, see [`SESSION_AUTH.md`](SESSION_AUTH.md).

### Further reading

- [yt-dlp — How do I pass cookies to yt-dlp?](https://github.com/yt-dlp/yt-dlp/wiki/FAQ#how-do-i-pass-cookies-to-yt-dlp)
- [yt-dlp — Exporting YouTube cookies](https://github.com/yt-dlp/yt-dlp/wiki/Extractors#exporting-youtube-cookies)
- [Get cookies.txt LOCALLY — source](https://github.com/kairi003/Get-cookies.txt-LOCALLY)
