// Start the call as soon as the details form is done, without a second tap on the green button.
// The microphone is requested inside the form's final tap (a real user gesture, which iOS needs for
// audio), then handed to the call screen. Unused after 20 s, it is released.
const MIC = { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 };
let pending = null;
let timer = 0;

export const micConstraints = MIC;

export function armAutoCall() {
  release();
  pending = navigator.mediaDevices?.getUserMedia ? navigator.mediaDevices.getUserMedia({ audio: MIC }).catch(() => null) : Promise.resolve(null);
  timer = setTimeout(release, 20000);
}

// the call screen takes it once: a promise of the open mic stream (or null), or null if no call was armed
export function takeAutoCall() {
  const p = pending;
  pending = null;
  clearTimeout(timer);
  return p;
}

function release() {
  clearTimeout(timer);
  const p = pending;
  pending = null;
  p?.then((s) => s?.getTracks().forEach((t) => t.stop()));
}
