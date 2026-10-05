import { micConstraints } from "../../lib/autocall.js";
// Live voice call over the Gemini Live WebSocket API.
// Mic -> 16 kHz PCM16 -> server; server audio (24 kHz PCM16) -> gapless playback.
// Barge-in: when the server reports `interrupted`, queued speech is dropped immediately.

const WS_URL = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained";

const WORKLET = `
class Capture extends AudioWorkletProcessor {
  constructor() { super(); this.buf = new Int16Array(1600); this.n = 0; }
  process(inputs) {
    const ch = inputs[0][0];
    if (!ch) return true;
    for (let i = 0; i < ch.length; i++) {
      const s = Math.max(-1, Math.min(1, ch[i]));
      this.buf[this.n++] = s < 0 ? s * 0x8000 : s * 0x7fff;
      if (this.n === this.buf.length) { this.port.postMessage(this.buf.buffer.slice(0)); this.n = 0; }
    }
    return true;
  }
}
registerProcessor("capture", Capture);
`;

const b64 = (buf) => {
  let s = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
};
const unb64 = (str) => {
  const bin = atob(str);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
};

/**
 * events: onState(state) with "connecting" | "listening" | "speaking" | "ended" | "error",
 *         onLevel({ me, them }) 0..1 each animation frame, onError(err)
 */
export class LiveCall {
  constructor({ token, model, greeting, onState, onLevel, onError, onTranscript }) {
    Object.assign(this, { token, model, greeting, onState, onLevel, onError, onTranscript });
    this.transcript = []; // [{ r: "u" | "a", t, at }] at = seconds since the call connected
    this.muted = false;
    this.sources = new Set();
    this.nextTime = 0;
    this.closed = false;
  }

  // stream: a microphone already opened in the user's tap (see lib/autocall.js), if there is one
  async start(stream = null) {
    this.onState?.("connecting");
    // microphone: browser echo cancellation is essential for speakerphone barge-in
    this.stream = stream || await navigator.mediaDevices.getUserMedia({ audio: micConstraints });
    this.inCtx = new AudioContext({ sampleRate: 16000 });
    await this.inCtx.audioWorklet.addModule(URL.createObjectURL(new Blob([WORKLET], { type: "text/javascript" })));
    const src = this.inCtx.createMediaStreamSource(this.stream);
    this.capture = new AudioWorkletNode(this.inCtx, "capture");
    this.inAnalyser = this.inCtx.createAnalyser();
    this.inAnalyser.fftSize = 512;
    src.connect(this.inAnalyser);
    src.connect(this.capture);

    // playback through an <audio> element so the browser's echo canceller can hear it
    this.outCtx = new AudioContext({ sampleRate: 24000 });
    this.outGain = this.outCtx.createGain();
    this.outAnalyser = this.outCtx.createAnalyser();
    this.outAnalyser.fftSize = 512;
    const dest = this.outCtx.createMediaStreamDestination();
    this.outGain.connect(this.outAnalyser);
    this.outGain.connect(dest);
    this.audioEl = new Audio();
    this.audioEl.srcObject = dest.stream;
    this.audioEl.play().catch(() => this.outGain.connect(this.outCtx.destination));

    await new Promise((resolve, reject) => {
      this.ws = new WebSocket(`${WS_URL}?access_token=${encodeURIComponent(this.token)}`);
      this.ws.onopen = () => this.ws.send(JSON.stringify({ setup: { model: this.model } }));
      this.ws.onerror = () => reject(new Error("connection failed"));
      this.ws.onclose = (e) => {
        if (!this.closed) {
          this.closed = true;
          this.cleanup();
          this.onState?.(e.code === 1000 ? "ended" : "error");
          if (e.code !== 1000) this.onError?.(new Error(e.reason || "call dropped"));
        }
        reject(new Error(e.reason || "closed"));
      };
      this.ws.onmessage = async (ev) => {
        const msg = JSON.parse(typeof ev.data === "string" ? ev.data : await ev.data.text());
        if (msg.setupComplete) {
          this.connectedAt = Date.now();
          resolve();
          return;
        }
        this.handle(msg);
      };
    });

    // stream the microphone
    this.capture.port.onmessage = (e) => {
      if (this.muted || this.ws?.readyState !== 1) return;
      this.ws.send(JSON.stringify({ realtimeInput: { audio: { data: b64(e.data), mimeType: "audio/pcm;rate=16000" } } }));
    };
    // the astrologer speaks first
    if (this.greeting) this.ws.send(JSON.stringify({ realtimeInput: { text: this.greeting } }));
    this.onState?.("listening");
    this.meter();
    this.wakeLock = await navigator.wakeLock?.request("screen").catch(() => null);
  }

  handle(msg) {
    const sc = msg.serverContent;
    if (sc?.interrupted) this.flush();
    for (const p of sc?.modelTurn?.parts || []) {
      if (p.inlineData?.data) this.play(p.inlineData.data);
    }
    // transcripts are never shown on screen; they are saved to the private call log
    if (sc?.inputTranscription?.text) this.addText("u", sc.inputTranscription.text);
    if (sc?.outputTranscription?.text) this.addText("a", sc.outputTranscription.text);
    if (msg.goAway) this.onError?.(new Error("goAway"));
  }

  addText(r, text) {
    const last = this.transcript.at(-1);
    if (last && last.r === r) last.t += text;
    else this.transcript.push({ r, t: text.trimStart(), at: Math.round((Date.now() - (this.connectedAt || Date.now())) / 1000) });
    this.onTranscript?.(this.transcript);
  }

  play(data) {
    const pcm = new Int16Array(unb64(data));
    const buf = this.outCtx.createBuffer(1, pcm.length, 24000);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < pcm.length; i++) ch[i] = pcm[i] / 0x8000;
    const node = this.outCtx.createBufferSource();
    node.buffer = buf;
    node.connect(this.outGain);
    const t = Math.max(this.nextTime, this.outCtx.currentTime + 0.03);
    node.start(t);
    this.nextTime = t + buf.duration;
    this.sources.add(node);
    node.onended = () => this.sources.delete(node);
  }

  // barge-in: drop everything queued
  flush() {
    for (const s of this.sources) {
      try { s.stop(); } catch { /* already stopped */ }
    }
    this.sources.clear();
    this.nextTime = 0;
  }

  meter() {
    const a = new Uint8Array(256);
    const level = (an) => {
      an.getByteTimeDomainData(a);
      let sum = 0;
      for (const v of a) sum += ((v - 128) / 128) ** 2;
      return Math.min(1, Math.sqrt(sum / a.length) * 4);
    };
    let last = "";
    const tick = () => {
      if (this.closed) return;
      const them = level(this.outAnalyser);
      const me = this.muted ? 0 : level(this.inAnalyser);
      const state = this.sources.size > 0 ? "speaking" : "listening";
      if (state !== last) this.onState?.((last = state));
      this.onLevel?.({ me, them });
      this.raf = requestAnimationFrame(tick);
    };
    tick();
  }

  // a quiet instruction to the astrologer (not spoken by the caller)
  say(text) {
    if (this.ws?.readyState === 1) this.ws.send(JSON.stringify({ realtimeInput: { text } }));
  }

  setMuted(m) {
    this.muted = m;
    this.stream?.getAudioTracks().forEach((t) => (t.enabled = !m));
    if (m && this.ws?.readyState === 1) this.ws.send(JSON.stringify({ realtimeInput: { audioStreamEnd: true } }));
  }

  hangup() {
    if (this.closed) return;
    this.closed = true;
    try { this.ws?.close(1000); } catch { /* ignore */ }
    this.cleanup();
    this.onState?.("ended");
  }

  cleanup() {
    cancelAnimationFrame(this.raf);
    this.flush();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.capture?.port && (this.capture.port.onmessage = null);
    this.inCtx?.close().catch(() => {});
    this.outCtx?.close().catch(() => {});
    if (this.audioEl) this.audioEl.srcObject = null;
    this.wakeLock?.release?.().catch(() => {});
  }
}
