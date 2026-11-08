// Google Analytics 4 and PostHog: anonymous usage only (screens, call starts/ends, durations, errors).
// Never send names, birth details or conversation text here; those go to the private call log.
// Both run cookieless: GA with Consent Mode defaults denied, PostHog with cookieless_mode and no person profiles.
import posthog from "posthog-js";

const GA_ID = "G-5TWSWES606";
const LIVE_HOSTS = ["astro.flowsxr.com", "kerala-astro-guide.vercel.app"];
const enabled = typeof location !== "undefined" && LIVE_HOSTS.includes(location.hostname);

if (enabled) {
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  // must run before config so GA sends cookieless pings
  window.gtag("consent", "default", {
    analytics_storage: "denied", ad_storage: "denied",
    ad_user_data: "denied", ad_personalization: "denied",
  });
  window.gtag("js", new Date());
  window.gtag("config", GA_ID, { send_page_view: false });
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.append(s);

  posthog.init("phc_Dpf2jxsea6e9eukisrHaRe5C7gosREy4bvCzzeFriv73", {
    api_host: "https://us.i.posthog.com",
    ui_host: "https://us.posthog.com",
    defaults: "2025-05-24",
    cookieless_mode: "always",
    person_profiles: "never",
    // routes are hash based, which PostHog's history capture does not see; trackScreen sends each $pageview
    capture_pageview: false,
  });
}

export function track(event, params = {}) {
  if (enabled) window.gtag("event", event, params);
}

// hash routes are separate screens
export function trackScreen(route, title) {
  track("page_view", { page_title: title, page_location: `${location.origin}/${route}`, page_path: `/${route}` });
  if (enabled) posthog.capture("$pageview", { $current_url: location.href, title });
}
