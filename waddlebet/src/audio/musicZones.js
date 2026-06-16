/**
 * BBALL-rooted procedural loops — shared note/tick helpers, distinct pattern per zone.
 */

export const BAR = 8;

/**
 * @typedef {Object} MusicTrack
 * @property {number} id
 * @property {string} name
 * @property {'beach'|'forest'|'town'|'snow'|'harbor'|'club'} pattern
 * @property {number} tempo
 * @property {number[]} penta
 * @property {number[]} bass
 * @property {number[][]} chords
 * @property {number} master
 * @property {number} melodyChance
 * @property {number} padVol
 * @property {number} padAttack
 * @property {number} bassVol
 * @property {number} melodyVol
 * @property {number} tickStrong
 * @property {number} tickWeak
 */

/** @type {MusicTrack[]} */
export const MUSIC_TRACKS = [
    {
        id: 0,
        name: 'Coastal Dawn',
        pattern: 'beach',
        tempo: 86,
        penta: [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25],
        bass: [65.41, 55.0, 43.65, 49.0],
        chords: [
            [261.63, 329.63, 392.0],
            [220.0, 261.63, 329.63],
            [174.61, 220.0, 261.63],
            [196.0, 246.94, 293.66],
        ],
        master: 0.16,
        melodyChance: 0.62,
        padVol: 0.1,
        padAttack: 0.4,
        bassVol: 0.55,
        melodyVol: 0.22,
        tickStrong: 0.07,
        tickWeak: 0.035,
    },
    {
        id: 1,
        name: 'Forest Path',
        pattern: 'forest',
        tempo: 72,
        penta: [196.0, 220.0, 246.94, 261.63, 293.66, 329.63, 392.0, 440.0],
        bass: [55.0, 49.0, 43.65, 41.2],
        chords: [
            [220.0, 261.63, 329.63],
            [196.0, 233.08, 293.66],
            [174.61, 207.65, 261.63],
            [196.0, 246.94, 293.66],
        ],
        master: 0.14,
        melodyChance: 0.45,
        padVol: 0.08,
        padAttack: 0.55,
        bassVol: 0.42,
        melodyVol: 0.16,
        tickStrong: 0.04,
        tickWeak: 0.02,
    },
    {
        id: 2,
        name: 'Town Square',
        pattern: 'town',
        tempo: 86,
        penta: [349.23, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0],
        bass: [87.31, 73.42, 58.27, 65.41],
        chords: [
            [349.23, 440.0, 523.25],
            [293.66, 349.23, 440.0],
            [261.63, 329.63, 392.0],
            [392.0, 493.88, 587.33],
        ],
        master: 0.16,
        melodyChance: 0.55,
        padVol: 0.075,
        padAttack: 0.32,
        bassVol: 0.44,
        melodyVol: 0.18,
        tickStrong: 0.06,
        tickWeak: 0.032,
    },
    {
        id: 3,
        name: 'Snow Forts',
        pattern: 'snow',
        tempo: 82,
        penta: [261.63, 329.63, 392.0, 440.0, 523.25, 659.25, 783.99, 880.0],
        bass: [65.41, 43.65, 65.41, 49.0],
        chords: [
            [261.63, 329.63, 392.0],
            [174.61, 220.0, 261.63],
            [261.63, 329.63, 392.0],
            [196.0, 246.94, 293.66],
        ],
        master: 0.16,
        melodyChance: 0.58,
        padVol: 0.085,
        padAttack: 0.3,
        bassVol: 0.46,
        melodyVol: 0.19,
        tickStrong: 0.07,
        tickWeak: 0.038,
    },
    {
        id: 4,
        name: 'Harbor Evening',
        pattern: 'harbor',
        tempo: 76,
        penta: [293.66, 329.63, 369.99, 440.0, 493.88, 587.33, 659.25, 739.99],
        bass: [73.42, 65.41, 55.0, 61.74],
        chords: [
            [293.66, 369.99, 440.0],
            [261.63, 329.63, 392.0],
            [220.0, 277.18, 329.63],
            [246.94, 311.13, 369.99],
        ],
        master: 0.15,
        melodyChance: 0.5,
        padVol: 0.11,
        padAttack: 0.5,
        bassVol: 0.46,
        melodyVol: 0.18,
        tickStrong: 0.05,
        tickWeak: 0.028,
    },
    {
        id: 5,
        name: 'Neon Dancefloor',
        pattern: 'club',
        tempo: 100,
        penta: [220.0, 261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33],
        bass: [55.0, 49.0, 43.65, 41.2],
        chords: [
            [220.0, 261.63, 329.63],
            [174.61, 220.0, 261.63],
            [196.0, 246.94, 293.66],
            [246.94, 293.66, 349.23],
        ],
        master: 0.16,
        melodyChance: 0.58,
        padVol: 0.07,
        padAttack: 0.22,
        bassVol: 0.54,
        melodyVol: 0.2,
        tickStrong: 0.11,
        tickWeak: 0.06,
    },
];

function note(ctx, out, freq, t, dur, type, vol, attack) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(out);
    osc.start(t);
    osc.stop(t + dur + 0.05);
}

function tick(ctx, out, t, vol, cutoff = 6000) {
    const len = Math.ceil(ctx.sampleRate * 0.05);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = cutoff;
    const gain = ctx.createGain();
    gain.gain.value = vol;
    src.connect(filter).connect(gain).connect(out);
    src.start(t);
}

/** Soft sand / maraca — bandpass noise, longer tail */
function shaker(ctx, out, t, vol) {
    const len = Math.ceil(ctx.sampleRate * 0.09);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
        const env = 1 - i / len;
        data[i] = (Math.random() * 2 - 1) * env * env;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 3200;
    filter.Q.value = 0.7;
    const gain = ctx.createGain();
    gain.gain.value = vol;
    src.connect(filter).connect(gain).connect(out);
    src.start(t);
}

/** Short closed hat — bright noise burst */
function hatClosed(ctx, out, t, vol, cutoff = 7000) {
    tick(ctx, out, t, vol, cutoff);
}

/** Longer open hat wash */
function hatOpen(ctx, out, t, vol) {
    const len = Math.ceil(ctx.sampleRate * 0.14);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 0.6;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 5500;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    src.connect(filter).connect(gain).connect(out);
    src.start(t);
}

/** Town plaza rim / stick click */
function rimClick(ctx, out, t, vol) {
    tick(ctx, out, t, vol * 0.45, 4200);
    note(ctx, out, 820, t, 0.025, 'square', vol * 0.35, 0.001);
}

/** Snow / ice crystal ping */
function tinkle(ctx, out, t, vol, freq = 1046) {
    note(ctx, out, freq, t, 0.18, 'sine', vol, 0.002);
    note(ctx, out, freq * 2.4, t, 0.12, 'sine', vol * 0.25, 0.003);
    tick(ctx, out, t, vol * 0.15, 9000);
}

/** Harbor lounge brush snare */
function brushHit(ctx, out, t, vol) {
    const len = Math.ceil(ctx.sampleRate * 0.11);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 0.85;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1800;
    filter.Q.value = 0.5;
    const gain = ctx.createGain();
    gain.gain.value = vol;
    src.connect(filter).connect(gain).connect(out);
    src.start(t);
}

/** Soft ride cymbal swell */
function softRide(ctx, out, t, vol) {
    const len = Math.ceil(ctx.sampleRate * 0.2);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 3800;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    src.connect(filter).connect(gain).connect(out);
    src.start(t);
}

function woodKnock(ctx, out, t, vol) {
    tick(ctx, out, t, vol, 900);
    note(ctx, out, 180, t, 0.08, 'sine', vol * 0.6, 0.008);
}

function bell(ctx, out, freq, t, vol) {
    note(ctx, out, freq, t, 0.35, 'sine', vol, 0.02);
    note(ctx, out, freq * 2.01, t, 0.25, 'sine', vol * 0.35, 0.03);
}

function randomPenta(tr) {
    return tr.penta[Math.floor(Math.random() * tr.penta.length)];
}

/** Exact BBALL beach loop */
function scheduleBeach(ctx, out, step, t, stepDur, tr) {
    const bar = Math.floor(step / BAR) % 4;
    const inBar = step % BAR;

    if (inBar === 0 || inBar === 4) {
        note(ctx, out, tr.bass[bar] * (inBar === 4 ? 2 : 1), t, stepDur * 3.4, 'triangle', tr.bassVol, 0.02);
    }
    if (inBar === 0) {
        for (const f of tr.chords[bar]) {
            note(ctx, out, f, t, stepDur * BAR * 0.95, 'sine', tr.padVol, tr.padAttack);
        }
    }
    if (inBar % 2 === 1 && Math.random() < tr.melodyChance) {
        note(ctx, out, randomPenta(tr), t, stepDur * 1.6, 'triangle', tr.melodyVol, 0.01);
    }
    // Sandy offbeat shaker + downbeat closed hat
    if (inBar === 1 || inBar === 3 || inBar === 5 || inBar === 7) {
        shaker(ctx, out, t, tr.tickWeak * 1.1);
    }
    if (inBar === 0) hatClosed(ctx, out, t, tr.tickStrong, 6200);
    if (inBar === 4) hatOpen(ctx, out, t, tr.tickWeak * 0.85);
}

/** Slow woodland — long pads, sparse sine melody, wood knocks instead of hi-hats */
function scheduleForest(ctx, out, step, t, stepDur, tr) {
    const bar = Math.floor(step / BAR) % 4;
    const inBar = step % BAR;

    if (inBar === 0) {
        note(ctx, out, tr.bass[bar], t, stepDur * BAR * 1.1, 'sine', tr.bassVol, 0.08);
        for (const f of tr.chords[bar]) {
            note(ctx, out, f, t, stepDur * BAR * 1.05, 'triangle', tr.padVol, tr.padAttack);
        }
    }
    if ((inBar === 3 || inBar === 7) && Math.random() < tr.melodyChance) {
        note(ctx, out, randomPenta(tr), t, stepDur * 2.8, 'sine', tr.melodyVol, 0.06);
    }
    // Sparse woodland knocks — no conventional hi-hats
    if (inBar === 2 && bar % 2 === 0) woodKnock(ctx, out, t, tr.tickWeak);
    if (inBar === 6 && bar % 2 === 1) woodKnock(ctx, out, t, tr.tickStrong * 0.85);
    if (inBar === 4 && bar === 3) woodKnock(ctx, out, t, tr.tickWeak * 0.7);
}

/** Town plaza — relaxed pace, sparse ticks */
function scheduleTown(ctx, out, step, t, stepDur, tr) {
    const bar = Math.floor(step / BAR) % 4;
    const inBar = step % BAR;

    if (inBar === 0 || inBar === 4) {
        note(ctx, out, tr.bass[bar], t, stepDur * 2.4, 'triangle', tr.bassVol * 0.9, 0.02);
    }
    if (inBar === 0) {
        for (const f of tr.chords[bar]) {
            note(ctx, out, f, t, stepDur * BAR * 0.85, 'sine', tr.padVol, tr.padAttack);
        }
    }
    if (inBar === 2 && bar % 2 === 0) {
        bell(ctx, out, tr.chords[bar][0] * 2, t, tr.melodyVol * 0.4);
    }
    if (inBar % 2 === 1 && Math.random() < tr.melodyChance) {
        note(ctx, out, randomPenta(tr), t, stepDur * 1.4, 'triangle', tr.melodyVol, 0.012);
    }
    // Plaza stick clicks + wood block backbeat
    if (inBar === 0) rimClick(ctx, out, t, tr.tickStrong);
    if (inBar === 4) woodKnock(ctx, out, t, tr.tickWeak * 1.15);
    if (inBar === 2 && bar % 2 === 1) rimClick(ctx, out, t, tr.tickWeak * 0.75);
}

/** Playful snow — gentle bounce, not hyper */
function scheduleSnow(ctx, out, step, t, stepDur, tr) {
    const bar = Math.floor(step / BAR) % 4;
    const inBar = step % BAR;

    if (inBar === 0 || inBar === 4) {
        note(ctx, out, tr.bass[bar] * (inBar === 4 ? 1.5 : 1), t, stepDur * 2.8, 'sine', tr.bassVol, 0.02);
    }
    if (inBar === 0) {
        for (const f of tr.chords[bar]) {
            note(ctx, out, f, t, stepDur * BAR * 0.9, 'sine', tr.padVol, tr.padAttack);
        }
    }
    if (inBar % 2 === 1 && Math.random() < tr.melodyChance) {
        note(ctx, out, randomPenta(tr), t, stepDur * 1.2, 'triangle', tr.melodyVol, 0.01);
    }
    // Icy tinkles instead of hi-hats
    if (inBar === 0 && bar % 2 === 0) tinkle(ctx, out, t, tr.tickStrong, 988);
    if (inBar === 4) tinkle(ctx, out, t, tr.tickWeak, 1175);
    if (inBar === 6 && bar === 1) tinkle(ctx, out, t, tr.tickWeak * 0.8, 880);
}

/** Warm lounge — walking bass, triangle pads, lazy swung melody */
function scheduleHarbor(ctx, out, step, t, stepDur, tr) {
    const bar = Math.floor(step / BAR) % 4;
    const inBar = step % BAR;

    if (inBar === 0 || inBar === 2 || inBar === 4) {
        note(ctx, out, tr.bass[bar] * (inBar === 4 ? 1.5 : 1), t, stepDur * 2.6, 'sine', tr.bassVol, 0.04);
    }
    if (inBar === 0) {
        for (const f of tr.chords[bar]) {
            note(ctx, out, f, t, stepDur * BAR * 1.0, 'triangle', tr.padVol, tr.padAttack);
        }
    }
    if ((inBar === 1 || inBar === 5) && Math.random() < tr.melodyChance) {
        const f = randomPenta(tr);
        note(ctx, out, f, t, stepDur * 2.0, 'sine', tr.melodyVol, 0.05);
        note(ctx, out, f * 1.25, t + stepDur * 0.35, stepDur * 1.4, 'sine', tr.melodyVol * 0.5, 0.04);
    }
    // Lounge brush + occasional ride swell
    if (inBar === 2 || inBar === 6) brushHit(ctx, out, t, tr.tickWeak);
    if (inBar === 0 && bar % 2 === 1) softRide(ctx, out, t, tr.tickStrong * 0.75);
    if (inBar === 4 && bar === 2) brushHit(ctx, out, t, tr.tickWeak * 0.65);
}

/** Club — four-on-floor kick, closed hats, energy lifts melody + pulse */
function scheduleClub(ctx, out, step, t, stepDur, tr, energy) {
    const bar = Math.floor(step / BAR) % 4;
    const inBar = step % BAR;
    const e = Math.max(0, Math.min(1, energy));
    const melChance = tr.melodyChance + e * 0.35;

    if (inBar % 4 === 0) {
        note(ctx, out, tr.bass[bar] * 0.5, t, stepDur * 2.0, 'sine', 0.07 + e * 0.14, 0.01);
    }
    if (inBar === 0 || inBar === 4) {
        note(ctx, out, tr.bass[bar], t, stepDur * 2.5, 'triangle', tr.bassVol + e * 0.1, 0.015);
    }
    if (inBar === 0 && e < 0.4) {
        for (const f of tr.chords[bar]) {
            note(ctx, out, f, t, stepDur * BAR * 0.6, 'sine', tr.padVol, tr.padAttack);
        }
    }
    if (inBar % 2 === 1 && Math.random() < melChance) {
        note(ctx, out, randomPenta(tr), t, stepDur * 1.2, 'square', (tr.melodyVol + e * 0.08) * 0.45, 0.008);
    }
    // Club keeps tight 16th-style hats — brighter and busier than ambient zones
    hatClosed(ctx, out, t, (inBar % 4 === 0 ? tr.tickStrong : tr.tickWeak) * (0.85 + e * 0.3), 8500);
    if (inBar % 4 === 2 && e > 0.35) hatOpen(ctx, out, t, tr.tickWeak * (0.5 + e * 0.4));
    if (e > 0.55 && inBar % 4 === 2) {
        bell(ctx, out, tr.penta[4], t, 0.06 + e * 0.08);
    }
}

export function scheduleTrackStep(ctx, out, step, t, stepDur, track, energy = 0) {
    switch (track.pattern) {
        case 'forest': scheduleForest(ctx, out, step, t, stepDur, track); break;
        case 'town': scheduleTown(ctx, out, step, t, stepDur, track); break;
        case 'snow': scheduleSnow(ctx, out, step, t, stepDur, track); break;
        case 'harbor': scheduleHarbor(ctx, out, step, t, stepDur, track); break;
        case 'club': scheduleClub(ctx, out, step, t, stepDur, track, energy); break;
        default: scheduleBeach(ctx, out, step, t, stepDur, track); break;
    }
}
