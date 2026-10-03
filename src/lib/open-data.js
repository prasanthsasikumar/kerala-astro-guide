// Public-edition data: the traditional reference tables (public/open/reference.json) plus the
// nakshatra porutham grid computed from the classical rules (engine/porutham-rules.js).
import { matchTable } from "../engine/porutham-rules.js";

export function openData(ref) {
  return { db: { ...ref.astro, tblMatchNakshatra: matchTable() }, yogam: ref.yogam };
}
