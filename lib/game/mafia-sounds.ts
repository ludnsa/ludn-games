"use client";

/**
 * مؤثرات لعبة المافيا — تتولد بالكود (Web Audio) بدون أي ملفات صوت.
 * كل الأصوات تمر على صدى (reverb) مشترك يعطيها جو سينمائي.
 * لاحقاً نقدر نبدلها بملفات mp3 حقيقية بدون ما نغيّر أماكن الاستدعاء.
 *
 * المتصفحات تمنع الصوت قبل أول لمسة من المستخدم، فنفعّل الـ AudioContext
 * عند أول ضغطة (unlockMafiaAudio).
 */

export type MafiaSound =
  /** ذبح: ضربة سيف معدنية مع صدى */
  | "slash"
  /** رعب الموت: نبض قلب + أوتار متنافرة + صرخة */
  | "horror"
  /** حماية: نجوم لامعة */
  | "sparkle"
  /** درع الجندي */
  | "shield"
  /** تحقيق: قرع طبول متسارع ينتهي بضربة */
  | "drumroll"
  /** كشف مافيا: "دن دن دااان" */
  | "dramatic"
  /** تحقيق خاطئ: "وومب وومب" */
  | "womp"
  | "magic"
  | "camera"
  | "bomb"
  | "tick"
  /** بداية الليل: جرس مظلم مع ريح */
  | "night"
  /** بومة: أول ما تبدأ اللعبة */
  | "owl"
  /** طلوع الصبح */
  | "rooster"
  | "vote"
  | "win"
  /** فوز المافيا: كورد شرير */
  | "evil"
  | "reveal";

const MUTE_KEY = "mafia_muted";

/**
 * أصوات حقيقية من ملفات (public/sounds/mafia). أي صوت له ملف هنا يتشغّل
 * من الملف، وإذا الملف ما تحمّل يرجع تلقائياً للصوت المولّد بالكود.
 */
const SOUND_FILES: Partial<Record<MafiaSound, string>> = {
  horror: "/sounds/mafia/horror.mp3",
  dramatic: "/sounds/mafia/dramatic.mp3",
  // اختياري: إذا الملف مو موجود نستخدم البومة المولّدة
  owl: "/sounds/mafia/owl.mp3",
  rooster: "/sounds/mafia/rooster.mp3",
};

/**
 * مدة كل صوت ولحظات الذروة فيه (بالثواني) — الحركات تتزامن عليها.
 * للأصوات المولّدة نعرفها مسبقاً، وللملفات نحسبها من الموجة نفسها بعد التحميل.
 */
export interface MafiaSoundTiming {
  duration: number;
  peaks: number[];
}

const SYNTH_TIMING: Record<MafiaSound, MafiaSoundTiming> = {
  slash: { duration: 1.2, peaks: [0.33] },
  horror: { duration: 3.9, peaks: [0, 0.22, 0.75, 0.97, 1.5] },
  sparkle: { duration: 1.3, peaks: [0] },
  shield: { duration: 1.2, peaks: [0.1] },
  drumroll: { duration: 3.2, peaks: [2.1] },
  dramatic: { duration: 3.2, peaks: [0, 0.45, 0.95] },
  womp: { duration: 2, peaks: [0, 0.35, 0.7, 1.05] },
  magic: { duration: 1.5, peaks: [0.8] },
  camera: { duration: 0.7, peaks: [0, 0.1] },
  bomb: { duration: 3, peaks: [0.8] },
  tick: { duration: 0.1, peaks: [0] },
  night: { duration: 3.5, peaks: [0] },
  owl: { duration: 2.4, peaks: [0, 0.55, 1.1] },
  rooster: { duration: 2.5, peaks: [0.44] },
  vote: { duration: 0.15, peaks: [0] },
  win: { duration: 3, peaks: [0, 0.22, 0.44, 0.66, 1.2] },
  evil: { duration: 3.2, peaks: [0, 1.2] },
  reveal: { duration: 3, peaks: [1.4] },
};

const fileBuffers = new Map<MafiaSound, AudioBuffer>();
const fileTimings = new Map<MafiaSound, MafiaSoundTiming>();
let filesLoading = false;

/**
 * يلقى لحظات "الضربة" في الملف: نقسم الصوت لشرائح 30ms ونحسب قوتها،
 * والذروة = شريحة قوية ترتفع فجأة عن اللي قبلها. نبعد بين الذروات ربع ثانية على الأقل.
 */
function findPeaks(buffer: AudioBuffer): number[] {
  const data = buffer.getChannelData(0);
  const win = Math.floor(buffer.sampleRate * 0.03);
  const energy: number[] = [];
  for (let i = 0; i + win <= data.length; i += win) {
    let sum = 0;
    for (let j = i; j < i + win; j++) sum += data[j] * data[j];
    energy.push(Math.sqrt(sum / win));
  }
  const max = Math.max(...energy, 0.0001);

  const candidates: { t: number; e: number }[] = [];
  energy.forEach((e, i) => {
    const prev = energy[Math.max(0, i - 3)] ?? 0;
    if (e > max * 0.5 && e > prev * 1.35) candidates.push({ t: (i * win) / buffer.sampleRate, e });
  });

  const picked: { t: number; e: number }[] = [];
  candidates
    .sort((a, b) => b.e - a.e)
    .forEach((c) => {
      if (picked.length < 8 && picked.every((p) => Math.abs(p.t - c.t) > 0.25)) picked.push(c);
    });

  const loudest = energy.indexOf(max);
  if (picked.length === 0) picked.push({ t: (loudest * win) / buffer.sampleRate, e: max });
  return picked.map((p) => p.t).sort((a, b) => a - b);
}

function preloadFiles(ac: AudioContext) {
  if (filesLoading) return;
  filesLoading = true;
  Object.entries(SOUND_FILES).forEach(async ([key, url]) => {
    try {
      const res = await fetch(url!);
      if (!res.ok) {
        if (res.status !== 404) console.warn(`[mafia] ملف الصوت ما تحمّل: ${url} (${res.status}) — نستخدم الصوت المولّد`);
        return;
      }
      const buffer = await ac.decodeAudioData(await res.arrayBuffer());
      fileBuffers.set(key as MafiaSound, buffer);
      fileTimings.set(key as MafiaSound, { duration: buffer.duration, peaks: findPeaks(buffer) });
    } catch (err) {
      // الملف ناقص أو تالف — نكمل بالصوت المولّد
      console.warn(`[mafia] تعذّر تشغيل ملف الصوت: ${url}`, err);
    }
  });
}

export function getMafiaSoundTiming(sound: MafiaSound): MafiaSoundTiming {
  return fileTimings.get(sound) ?? SYNTH_TIMING[sound];
}

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let reverb: ConvolverNode | null = null;
let muted = readMuted();
const listeners = new Set<() => void>();

function readMuted(): boolean {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

/** صدى صناعي: ضوضاء تتلاشى تدريجياً = إحساس قاعة كبيرة */
function buildImpulse(ac: AudioContext, seconds: number, decay: number): AudioBuffer {
  const length = Math.floor(ac.sampleRate * seconds);
  const impulse = ac.createBuffer(2, length, ac.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
  }
  return impulse;
}

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();

    // ضاغط بسيط يمنع التشويش لما تتراكب أصوات كثيرة
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.ratio.value = 6;
    comp.connect(ctx.destination);

    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(comp);

    reverb = ctx.createConvolver();
    reverb.buffer = buildImpulse(ctx, 3, 2.5);
    const wet = ctx.createGain();
    wet.gain.value = 0.35;
    reverb.connect(wet).connect(master);

    preloadFiles(ctx);
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

export function unlockMafiaAudio() {
  getCtx();
}

export function isMafiaMuted() {
  return muted;
}

export function setMafiaMuted(value: boolean) {
  muted = value;
  try {
    window.localStorage.setItem(MUTE_KEY, value ? "1" : "0");
  } catch {
    // التخزين ممكن يكون مقفل (تصفح خفي) — الكتم يشتغل للجلسة الحالية بس
  }
  if (!value) getCtx();
  listeners.forEach((l) => l());
}

export function subscribeMafiaMuted(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// ---------------------------------------------------------------------
// أدوات التوليد
// ---------------------------------------------------------------------

/** يوصل الصوت للمخرج الرئيسي، ونسبة منه للصدى */
function out(ac: AudioContext, node: AudioNode, send = 0.5) {
  node.connect(master ?? ac.destination);
  if (reverb && send > 0) {
    const s = ac.createGain();
    s.gain.value = send;
    node.connect(s).connect(reverb);
  }
}

interface ToneOpts {
  freq: number;
  to?: number;
  dur: number;
  at?: number;
  type?: OscillatorType;
  gain?: number;
  attack?: number;
  /** فلتر يفتح ويسكّر مع الصوت — يعطي إحساس نحاسي/أوتار */
  lowpass?: number;
  vibrato?: { rate: number; depth: number };
  send?: number;
}

function tone(
  ac: AudioContext,
  { freq, to, dur, at = 0, type = "sine", gain = 0.25, attack = 0.01, lowpass, vibrato, send = 0.4 }: ToneOpts
) {
  const t = ac.currentTime + at;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);

  if (vibrato) {
    const lfo = ac.createOscillator();
    const lfoGain = ac.createGain();
    lfo.frequency.value = vibrato.rate;
    lfoGain.gain.value = vibrato.depth;
    lfo.connect(lfoGain).connect(osc.frequency);
    lfo.start(t);
    lfo.stop(t + dur + 0.1);
  }

  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  let last: AudioNode = osc;
  if (lowpass) {
    const f = ac.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.setValueAtTime(lowpass * 3, t);
    f.frequency.exponentialRampToValueAtTime(lowpass, t + dur);
    osc.connect(f);
    last = f;
  }
  last.connect(g);
  out(ac, g, send);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

interface NoiseOpts {
  dur: number;
  at?: number;
  filter?: BiquadFilterType;
  freq?: number;
  to?: number;
  q?: number;
  gain?: number;
  attack?: number;
  send?: number;
}

function noise(
  ac: AudioContext,
  { dur, at = 0, filter = "bandpass", freq = 2000, to, q = 1, gain = 0.3, attack = 0.005, send = 0.4 }: NoiseOpts
) {
  const t = ac.currentTime + at;
  const buffer = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

  const src = ac.createBufferSource();
  src.buffer = buffer;
  const f = ac.createBiquadFilter();
  f.type = filter;
  f.Q.value = q;
  f.frequency.setValueAtTime(freq, t);
  if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g);
  out(ac, g, send);
  src.start(t);
  src.stop(t + dur);
}

/** نبضة قلب: "دُم-دُم" */
function heartbeat(ac: AudioContext, at: number, gain = 0.8) {
  tone(ac, { freq: 60, to: 40, dur: 0.18, at, gain, send: 0.1 });
  tone(ac, { freq: 55, to: 38, dur: 0.22, at: at + 0.22, gain: gain * 0.75, send: 0.1 });
}

/** ضربة نحاسية سينمائية: كورد كامل مع فلتر يسكّر + ضربة باص */
function brassHit(ac: AudioContext, notes: number[], at: number, dur: number, gain = 0.1) {
  notes.forEach((f) => {
    tone(ac, { freq: f, dur, at, type: "sawtooth", gain, attack: 0.02, lowpass: 700, send: 0.6 });
    tone(ac, { freq: f * 1.005, dur, at, type: "sawtooth", gain: gain * 0.7, attack: 0.02, lowpass: 700, send: 0.6 });
  });
  tone(ac, { freq: notes[0] / 2, dur: dur * 0.8, at, type: "sine", gain: 0.5, send: 0.2 });
  noise(ac, { dur: 0.25, at, filter: "lowpass", freq: 300, gain: 0.5, send: 0.3 });
}

/** رنين معدني (نسب غير متناسقة = صوت نصل) */
function metalRing(ac: AudioContext, base: number, at: number, dur: number, gain = 0.07) {
  [1, 2.76, 5.4, 8.93].forEach((ratio, i) =>
    tone(ac, { freq: base * ratio, dur: dur / (i + 1), at, type: "sine", gain: gain / (i + 1), send: 0.7 })
  );
}

// ---------------------------------------------------------------------
// المؤثرات
// ---------------------------------------------------------------------

const SOUNDS: Record<MafiaSound, (ac: AudioContext) => void> = {
  slash: (ac) => {
    // سحب النصل
    noise(ac, { dur: 0.35, filter: "highpass", freq: 1500, to: 7000, gain: 0.35, attack: 0.08, send: 0.3 });
    // الضربة
    noise(ac, { dur: 0.12, at: 0.33, filter: "bandpass", freq: 2500, q: 2, gain: 0.6, send: 0.5 });
    tone(ac, { freq: 90, to: 35, dur: 0.5, at: 0.33, type: "sine", gain: 0.6, send: 0.3 });
    metalRing(ac, 620, 0.33, 1.6);
  },

  horror: (ac) => {
    heartbeat(ac, 0, 0.9);
    heartbeat(ac, 0.75, 0.9);
    // أوتار متنافرة تكبر (نصف تون + تريتون = قلق)
    [110, 116.5, 155.6, 233].forEach((f) =>
      tone(ac, {
        freq: f,
        dur: 2.6,
        at: 1.3,
        type: "sawtooth",
        gain: 0.05,
        attack: 0.8,
        lowpass: 900,
        vibrato: { rate: 5.5, depth: 3 },
        send: 0.8,
      })
    );
    // صرخة بعيدة
    tone(ac, {
      freq: 850,
      to: 1300,
      dur: 0.9,
      at: 1.5,
      type: "sawtooth",
      gain: 0.04,
      attack: 0.05,
      lowpass: 1800,
      vibrato: { rate: 9, depth: 40 },
      send: 0.9,
    });
    // هبوط عميق في النهاية
    tone(ac, { freq: 70, to: 30, dur: 2.2, at: 1.3, type: "sine", gain: 0.5, attack: 0.3, send: 0.3 });
  },

  sparkle: (ac) => {
    [1318, 1568, 2093, 2637, 3136, 4186].forEach((f, i) =>
      tone(ac, { freq: f, dur: 0.6, at: i * 0.06, type: "sine", gain: 0.1, send: 0.9 })
    );
    tone(ac, { freq: 523, dur: 1.2, at: 0.1, type: "triangle", gain: 0.08, attack: 0.2, send: 0.9 });
  },

  shield: (ac) => {
    metalRing(ac, 330, 0, 1.2, 0.12);
    brassHit(ac, [262, 330, 392], 0.1, 0.9, 0.06);
  },

  drumroll: (ac) => {
    // طبول متسارعة وتعلى
    let t = 0;
    for (let i = 0; i < 22; i++) {
      const gap = 0.11 - i * 0.004;
      noise(ac, { dur: 0.06, at: t, filter: "bandpass", freq: 1800, q: 0.8, gain: 0.1 + i * 0.012, send: 0.2 });
      t += gap;
    }
    // صوت يرتفع تحت الطبول
    tone(ac, { freq: 200, to: 800, dur: t, type: "sawtooth", gain: 0.04, attack: 0.3, lowpass: 1200, send: 0.4 });
    // الضربة الأخيرة + صنج
    brassHit(ac, [196, 247, 294], t, 0.9, 0.07);
    noise(ac, { dur: 1.4, at: t, filter: "highpass", freq: 6000, gain: 0.2, send: 0.6 });
  },

  dramatic: (ac) => {
    // دن … دن … دااااان
    brassHit(ac, [98, 147, 196], 0, 0.35, 0.09);
    brassHit(ac, [98, 147, 196], 0.45, 0.35, 0.09);
    brassHit(ac, [92.5, 139, 185, 233], 0.95, 2.2, 0.1);
    noise(ac, { dur: 2, at: 0.95, filter: "highpass", freq: 5000, gain: 0.18, send: 0.7 });
  },

  womp: (ac) => {
    [311, 294, 277].forEach((f, i) =>
      tone(ac, { freq: f, dur: 0.35, at: i * 0.35, type: "sawtooth", gain: 0.08, lowpass: 600, send: 0.3 })
    );
    tone(ac, {
      freq: 262,
      to: 220,
      dur: 1,
      at: 1.05,
      type: "sawtooth",
      gain: 0.08,
      lowpass: 600,
      vibrato: { rate: 6, depth: 6 },
      send: 0.3,
    });
  },

  magic: (ac) => {
    noise(ac, { dur: 1, filter: "bandpass", freq: 400, to: 8000, q: 3, gain: 0.2, attack: 0.3, send: 0.8 });
    tone(ac, { freq: 300, to: 1800, dur: 0.9, type: "sine", gain: 0.12, vibrato: { rate: 12, depth: 30 }, send: 0.8 });
    [2093, 2637, 3136, 3951].forEach((f, i) =>
      tone(ac, { freq: f, dur: 0.5, at: 0.8 + i * 0.07, gain: 0.07, send: 0.9 })
    );
  },

  camera: (ac) => {
    noise(ac, { dur: 0.04, freq: 4000, gain: 0.5, send: 0.2 });
    noise(ac, { dur: 0.07, at: 0.1, freq: 2500, gain: 0.4, send: 0.2 });
    noise(ac, { dur: 0.6, at: 0.1, filter: "highpass", freq: 3000, to: 8000, gain: 0.05, send: 0.3 });
  },

  bomb: (ac) => {
    // فتيل
    noise(ac, { dur: 0.8, filter: "highpass", freq: 4000, gain: 0.1, send: 0.2 });
    // الانفجار
    noise(ac, { dur: 2.2, at: 0.8, filter: "lowpass", freq: 1200, to: 50, gain: 0.9, attack: 0.01, send: 0.6 });
    tone(ac, { freq: 80, to: 25, dur: 1.8, at: 0.8, type: "sine", gain: 0.8, send: 0.4 });
  },

  tick: (ac) => {
    tone(ac, { freq: 1500, dur: 0.04, type: "square", gain: 0.05, send: 0.1 });
    tone(ac, { freq: 800, dur: 0.08, at: 0.01, type: "sine", gain: 0.1, send: 0.1 });
  },

  night: (ac) => {
    // جرس عميق
    [65, 98, 131, 175].forEach((f, i) =>
      tone(ac, { freq: f, dur: 3.5 - i * 0.5, type: "sine", gain: 0.3 / (i + 1), send: 0.9 })
    );
    // ريح
    noise(ac, { dur: 3.5, filter: "bandpass", freq: 300, to: 800, q: 4, gain: 0.12, attack: 1, send: 0.8 });
    // بومة
    tone(ac, { freq: 440, to: 400, dur: 0.35, at: 1.8, type: "sine", gain: 0.06, attack: 0.08, send: 0.9 });
    tone(ac, { freq: 440, to: 380, dur: 0.6, at: 2.3, type: "sine", gain: 0.06, attack: 0.08, send: 0.9 });
  },

  owl: (ac) => {
    // "هوو… هوو… هووووو" — نغمة ناعمة تنزل شوي في آخرها
    const hoot = (at: number, dur: number) => {
      tone(ac, { freq: 392, to: 360, dur, at, type: "sine", gain: 0.22, attack: 0.06, vibrato: { rate: 5, depth: 4 }, send: 0.9 });
      tone(ac, { freq: 784, to: 720, dur, at, type: "sine", gain: 0.03, attack: 0.06, send: 0.9 });
      noise(ac, { dur: dur * 0.8, at, filter: "bandpass", freq: 400, q: 6, gain: 0.04, attack: 0.05, send: 0.6 });
    };
    hoot(0, 0.32);
    hoot(0.55, 0.32);
    hoot(1.1, 1.1);
  },

  rooster: (ac) => {
    tone(ac, { freq: 600, to: 900, dur: 0.15, type: "sawtooth", gain: 0.06, lowpass: 2500, send: 0.4 });
    tone(ac, { freq: 900, to: 1200, dur: 0.25, at: 0.17, type: "sawtooth", gain: 0.07, lowpass: 2500, send: 0.4 });
    tone(ac, {
      freq: 1200,
      to: 800,
      dur: 0.6,
      at: 0.44,
      type: "sawtooth",
      gain: 0.07,
      lowpass: 2500,
      vibrato: { rate: 14, depth: 25 },
      send: 0.4,
    });
    [523, 659, 784].forEach((f) => tone(ac, { freq: f, dur: 1.5, at: 1, gain: 0.07, attack: 0.3, send: 0.9 }));
  },

  vote: (ac) => {
    tone(ac, { freq: 500, to: 900, dur: 0.12, type: "triangle", gain: 0.18, send: 0.2 });
    noise(ac, { dur: 0.05, filter: "lowpass", freq: 400, gain: 0.3, send: 0.1 });
  },

  win: (ac) => {
    brassHit(ac, [262, 330, 392], 0, 0.2, 0.06);
    brassHit(ac, [262, 330, 392], 0.22, 0.2, 0.06);
    brassHit(ac, [262, 330, 392], 0.44, 0.2, 0.06);
    brassHit(ac, [349, 440, 523], 0.66, 0.5, 0.07);
    brassHit(ac, [392, 494, 587, 784], 1.2, 1.8, 0.07);
    noise(ac, { dur: 1.8, at: 1.2, filter: "highpass", freq: 6000, gain: 0.15, send: 0.7 });
  },

  evil: (ac) => {
    brassHit(ac, [73, 110, 146, 174], 0, 3, 0.08);
    tone(ac, {
      freq: 146,
      to: 138,
      dur: 3,
      at: 0.2,
      type: "sawtooth",
      gain: 0.04,
      lowpass: 500,
      vibrato: { rate: 4, depth: 4 },
      send: 0.9,
    });
    heartbeat(ac, 1.2, 0.6);
  },

  reveal: (ac) => {
    tone(ac, { freq: 55, dur: 2.5, type: "sine", gain: 0.5, attack: 0.05, send: 0.5 });
    noise(ac, { dur: 1.5, filter: "bandpass", freq: 200, to: 3000, q: 2, gain: 0.15, attack: 1.2, send: 0.6 });
    brassHit(ac, [110, 131, 165], 1.4, 1.6, 0.07);
  },
};

export function playMafiaSound(sound: MafiaSound) {
  if (muted) return;
  const ac = getCtx();
  if (!ac) return;
  try {
    const file = fileBuffers.get(sound);
    if (file) {
      const src = ac.createBufferSource();
      src.buffer = file;
      out(ac, src, 0.15);
      src.start();
      return;
    }
    SOUNDS[sound](ac);
  } catch {
    // بعض المتصفحات القديمة ترفض بعض العُقد — الصوت كمالي، نتجاهل
  }
}
