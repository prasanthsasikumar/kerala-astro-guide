// Two editions from one codebase:
//  full   (default, local only): includes the private texts and data.
//  public (VITE_EDITION=public): calculations only, open data, no third-party texts.
export const PUBLIC = import.meta.env?.VITE_EDITION === "public";
export const APP_NAME = PUBLIC ? "Kerala Astro Guide" : "Astro Guide";
export const APP_NAME_ML = PUBLIC ? "കേരള അസ്ട്രോ ഗൈഡ്" : "അസ്ട്രോ ഗൈഡ്";

// UTC offset (hours) of an IANA zone at a local wall-clock date/time, using the browser's tz database.
export function tzOffsetAt(tzName, date, time = "12:00") {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mi] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mi);
  const off = (ms) => {
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tzName, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
      .formatToParts(new Date(ms)).map((p) => [p.type, p.value]));
    return (Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute) - ms) / 36e5;
  };
  // two passes settle DST edges
  const o1 = off(guess - 0);
  return off(guess - o1 * 36e5);
}
