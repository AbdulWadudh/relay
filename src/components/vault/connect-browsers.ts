"use client"

import * as React from "react"

/**
 * Which browser the user is in, and everything the connect wizard has to
 * say differently because of it.
 *
 * Split out of cookie-import-steps.tsx when the phone cases arrived. The
 * export needs an extension, and "install an extension" means four
 * different things across desktop Chromium, desktop Firefox, Firefox for
 * Android, and a browser that takes no extensions at all — which is every
 * browser on iOS and every Android browser except Firefox.
 *
 * That last case is not a gap in the instructions, it is a hard limit. The
 * cookies that hold a session are httpOnly, so page JavaScript cannot read
 * them: no bookmarklet, no paste-this-in-the-console trick, and nothing
 * Relay itself can serve will ever get at them. Only an extension can, so
 * where none exists the wizard has to say so rather than send the user to
 * a store with nothing in it.
 */

export interface BrowserGuide {
  /**
   * The extension to install, named verbatim so the user can match it in a
   * store listing full of near-identical names.
   *
   * NOT one shared constant. "Get cookies.txt LOCALLY" is not published
   * for Firefox on Android (its AMO listing declares desktop Firefox
   * only), so the phone is sent to a different extension and must be told
   * the different name.
   */
  extension: string
  store: string
  storeLabel: string
  /** Where the extension turns up once installed. */
  extensionLocation: string
  /**
   * The extension settings page as a URL, when there is one the user can
   * paste. Null on Android, where add-on settings are reachable only by
   * tapping through a menu — `settingsPath` carries that route instead.
   */
  settingsUrl: string | null
  settingsPath: string
  /** "incognito" or "private", as that browser's own UI names it. */
  privateName: string
  /** Shortcut for a private window; null where there is no keyboard. */
  shortcut: string | null
  /** How to open a private window when there is no shortcut to press. */
  privateHow: string
  /** The toggle's own label on the settings page. */
  allowLabel: string
}

const BROWSERS: Record<string, BrowserGuide> = {
  chromium: {
    extension: "Get cookies.txt LOCALLY",
    store:
      "https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc",
    storeLabel: "Add to Chrome or Edge",
    extensionLocation: "in the toolbar",
    // NOT a link, deliberately. Browsers refuse to navigate to a
    // `chrome://` URL from page content, so an <a> here would look
    // clickable and do nothing. It is handed over to be copied instead.
    settingsUrl: "chrome://extensions",
    settingsPath: "chrome://extensions",
    privateName: "incognito",
    shortcut: "Ctrl+Shift+N",
    privateHow: "Open a new incognito window from the menu.",
    allowLabel: "Allow in incognito",
  },
  firefox: {
    extension: "Get cookies.txt LOCALLY",
    store:
      "https://addons.mozilla.org/en-US/firefox/addon/get-cookies-txt-locally/",
    storeLabel: "Add to Firefox",
    extensionLocation: "in the toolbar",
    settingsUrl: "about:addons",
    settingsPath: "about:addons",
    privateName: "private",
    shortcut: "Ctrl+Shift+P",
    privateHow: "Open a new private window from the menu.",
    allowLabel: "Run in Private Windows",
  },
  /**
   * Firefox for Android, the one mobile browser that still takes add-ons.
   *
   * A different extension: `cookies.txt` declares Android support from
   * Firefox 121 and writes the same Netscape jar, which is the only part
   * the parser cares about. Everything else differs too — no toolbar, no
   * keyboard, and no `about:` page worth pasting.
   */
  firefoxAndroid: {
    extension: "cookies.txt",
    store: "https://addons.mozilla.org/en-US/firefox/addon/cookies-txt/",
    storeLabel: "Add to Firefox for Android",
    extensionLocation: "in the ⋮ menu",
    settingsUrl: null,
    settingsPath: "⋮ menu, then Add-ons",
    privateName: "private",
    shortcut: null,
    privateHow:
      "Tap the tabs button, switch to the private tabs section with the mask icon, then open a new tab there.",
    allowLabel: "Allowed in private browsing",
  },
}

export type ConnectPlatform = "desktop" | "android" | "ios"

/**
 * What the later steps fall back to when this device has no route of its
 * own. Desktop Chromium, because a user told at step 1 to switch devices
 * is overwhelmingly switching to a desktop.
 */
export const DEFAULT_GUIDE = BROWSERS.chromium

/**
 * Sends the user to the right store and names the right settings page
 * instead of making them work out which browser they are in.
 *
 * Read in an effect, not during render: `navigator` does not exist on the
 * server and reading it while rendering would desync hydration. Desktop
 * Chromium is the starting guess because it is both the majority case and
 * the safest wrong one — a Firefox user sent to the Chrome store notices
 * at once, and nothing is lost either way.
 *
 * A null `guide` means this device has no route at all, not that detection
 * failed.
 */
export function useBrowserGuide(): {
  platform: ConnectPlatform
  guide: BrowserGuide | null
} {
  const [state, setState] = React.useState<{
    platform: ConnectPlatform
    guide: BrowserGuide | null
  }>({ platform: "desktop", guide: BROWSERS.chromium })

  React.useEffect(() => {
    const ua = navigator.userAgent
    // iPadOS reports itself as a Mac, so the touch count is what separates
    // an iPad from a desktop Safari that would otherwise match nothing.
    const ios =
      /iPhone|iPad|iPod/.test(ua) ||
      (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
    if (ios) {
      // Firefox on iOS is Safari underneath (UA says FxiOS) and takes no
      // add-ons, so the browser brand here changes nothing.
      setState({ platform: "ios", guide: null })
      return
    }
    if (/Android/.test(ua)) {
      setState({
        platform: "android",
        guide: /Firefox/.test(ua) ? BROWSERS.firefoxAndroid : null,
      })
      return
    }
    setState({
      platform: "desktop",
      guide: /Firefox/.test(ua) ? BROWSERS.firefox : BROWSERS.chromium,
    })
  }, [])

  return state
}

/** Where an Android user without extensions has to go first. */
export const FIREFOX_ANDROID_STORE =
  "https://play.google.com/store/apps/details?id=org.mozilla.firefox"
