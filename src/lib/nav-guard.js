// A screen can block navigation while something important is running (a live call).
// The guard returns true to allow leaving, false to stay.
let guard = null;
export const setNavGuard = (fn) => { guard = fn; };
export const clearNavGuard = (fn) => { if (!fn || guard === fn) guard = null; };
export const canLeave = () => !guard || guard();
