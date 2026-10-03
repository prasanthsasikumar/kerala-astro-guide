// Google Analytics 4: anonymous usage only (screens, call starts/ends, durations, errors).
// Never send names, birth details or conversation text here; those go to the private call log.
const GA_ID = "G-5TWSWES606";
const LIVE_HOSTS = ["astro.flowsxr.com", "kerala-astro-guide.vercel.app"];
const enabled = typeof location !== "undefined" && LIVE_HOSTS.includes(location.hostname);

if (enabled) {
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", GA_ID, { send_page_view: false });
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.append(s);
}

export function track(event, params = {}) {
  if (enabled) window.gtag("event", event, params);
}

// hash routes are separate screens
export function trackScreen(route, title) {
  track("page_view", { page_title: title, page_location: `${location.origin}/${route}`, page_path: `/${route}` });
}
