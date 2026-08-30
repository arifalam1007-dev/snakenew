import { useEffect, useRef, useState } from "react";
import ContactSection from "./ContactSection";

/* ============================================================
   SNAKE — a single-file canvas arcade game.
   Grid logic + rendering + audio all live below; the only
   dependency is the browser's Canvas 2D API.
   ============================================================ */

const COLS = 22;
const ROWS = 22;
const CELL = 26;
const W = COLS * CELL;
const H = ROWS * CELL;
const STEP = 100; // fixed speed: one move every 100ms

type Vec = { x: number; y: number };
type UiState = "ready" | "running" | "paused" | "over";

type Fx =
  | { kind: "spark"; x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number }
  | { kind: "ring"; x: number; y: number; life: number; max: number };

interface Core {
  snake: Vec[];
  prev: Vec[];
  dir: Vec;
  queue: Vec[];
  food: Vec;
  foodBorn: number;
  grow: number;
  score: number;
  best: number;
  acc: number;
  last: number;
  ui: UiState;
  shake: number;
  flash: number;
  deathTime: number;
  ateTime: number;
  fx: Fx[];
}

interface Ui {
  state: UiState;
  score: number;
  len: number;
  best: number;
  newBest: boolean;
  won: boolean;
}

const pad3 = (n: number) => String(n).padStart(3, "0");
const easeOutBack = (x: number) => {
  const c = 1.70158;
  return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
};

const HEAD_RGB: [number, number, number] = [122, 255, 146];
const TAIL_RGB: [number, number, number] = [15, 92, 52];
function segColor(t: number) {
  const r = Math.round(HEAD_RGB[0] + (TAIL_RGB[0] - HEAD_RGB[0]) * t);
  const g = Math.round(HEAD_RGB[1] + (TAIL_RGB[1] - HEAD_RGB[1]) * t);
  const b = Math.round(HEAD_RGB[2] + (TAIL_RGB[2] - HEAD_RGB[2]) * t);
  return `rgb(${r},${g},${b})`;
}

function readBest(): number {
  try {
    return parseInt(localStorage.getItem("snake-best") || "0", 10) || 0;
  } catch {
    return 0;
  }
}

/* Tiny WebAudio synth — no samples, no libs */
function makeSound(isMuted: () => boolean) {
  let ac: AudioContext | null = null;
  const ensure = () => {
    if (!ac) {
      try {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AC) ac = new AC();
      } catch {
        ac = null;
      }
    }
    if (ac && ac.state === "suspended") ac.resume().catch(() => {});
    return ac;
  };
  const tone = (freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number, when = 0) => {
    const a = ensure();
    if (!a || isMuted()) return;
    try {
      const t0 = a.currentTime + when;
      const o = a.createOscillator();
      const gn = a.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t0);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
      gn.gain.setValueAtTime(vol, t0);
      gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(gn);
      gn.connect(a.destination);
      o.start(t0);
      o.stop(t0 + dur + 0.03);
    } catch {
      /* audio is decoration — never break the game */
    }
  };
  return {
    eat() {
      tone(620, 0.07, "square", 0.045);
      tone(930, 0.09, "square", 0.04, undefined, 0.06);
    },
    die() {
      tone(300, 0.42, "sawtooth", 0.055, 68);
      tone(160, 0.5, "square", 0.045, 44, 0.05);
    },
    start() {
      tone(392, 0.08, "square", 0.04);
      tone(523, 0.08, "square", 0.04, undefined, 0.09);
      tone(659, 0.13, "square", 0.04, undefined, 0.18);
    },
    pause() {
      tone(494, 0.07, "triangle", 0.05);
      tone(330, 0.1, "triangle", 0.05, undefined, 0.08);
    },
    turn() {
      tone(240, 0.03, "square", 0.012);
    },
    jingle() {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, "triangle", 0.05, undefined, i * 0.09));
    },
    blip() {
      tone(700, 0.05, "square", 0.03);
    },
  };
}

/* ---------- inline icons (no emoji, no icon fonts) ---------- */
const SnakeMark = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 44 48" fill="none" aria-hidden="true">
    <path d="M33 13H19a6 6 0 0 0 0 12h7a6 6 0 0 1 0 12H13" stroke="#3ecf6e" strokeWidth="5" strokeLinecap="round" />
    <circle cx="13" cy="37" r="4.2" fill="#7aff92" />
    <circle cx="33" cy="13" r="3.4" fill="#ff7a4d" />
  </svg>
);
const SoundIcon = () => (
  <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 6h2.5L8 3v10L4.5 10H2z" fill="currentColor" stroke="none" />
    <path d="M10.5 5.5a3.5 3.5 0 0 1 0 5" />
    <path d="M12.5 3.5a6.2 6.2 0 0 1 0 9" />
  </svg>
);
const MutedIcon = () => (
  <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 6h2.5L8 3v10L4.5 10H2z" fill="currentColor" stroke="none" />
    <path d="M10.5 6l4 4M14.5 6l-4 4" />
  </svg>
);
const RestartIcon = () => (
  <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M13.6 8A5.6 5.6 0 1 1 11.5 3.6" />
    <path d="M13.9 1.6v3.2h-3.2" />
  </svg>
);
const Arrow = ({ rot }: { rot: number }) => (
  <svg viewBox="0 0 20 20" width="20" height="20" style={{ transform: `rotate(${rot}deg)` }} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10 15V5M5.5 9.5L10 5l4.5 4.5" />
  </svg>
);
const PauseIcon = () => (
  <svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor" aria-hidden="true">
    <rect x="5" y="4" width="3.4" height="12" rx="1" />
    <rect x="11.6" y="4" width="3.4" height="12" rx="1" />
  </svg>
);

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gRef = useRef<Core | null>(null);
  const mutedRef = useRef(false);
  const soundRef = useRef<ReturnType<typeof makeSound> | null>(null);

  const [ui, setUi] = useState<Ui>(() => ({ state: "ready", score: 0, len: 3, best: readBest(), newBest: false, won: false }));
  const [muted, setMuted] = useState(false);

  /* bridge so JSX buttons can reach the imperative engine */
  const api = useRef<{ begin: () => void; turn: (d: Vec) => void; togglePause: () => void; toggleMute: () => void; screenTap: () => void }>({
    begin: () => {},
    turn: () => {},
    togglePause: () => {},
    toggleMute: () => {},
    screenTap: () => {},
  }).current;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const fit = () => {
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    window.addEventListener("resize", fit);

    const sound = makeSound(() => mutedRef.current);
    soundRef.current = sound;

    const g: Core = {
      snake: [],
      prev: [],
      dir: { x: 1, y: 0 },
      queue: [],
      food: { x: 15, y: 11 },
      foodBorn: 0,
      grow: 0,
      score: 0,
      best: readBest(),
      acc: 0,
      last: performance.now(),
      ui: "ready",
      shake: 0,
      flash: 0,
      deathTime: 0,
      ateTime: -9999,
      fx: [],
    };
    gRef.current = g;

    /* ---------------- core game logic ---------------- */
    function spawnFood() {
      const occupied = new Set(g.snake.map((s) => s.x + "," + s.y));
      const empty: Vec[] = [];
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (!occupied.has(x + "," + y)) empty.push({ x, y });
      if (empty.length === 0) {
        win();
        return;
      }
      g.food = empty[Math.floor(Math.random() * empty.length)];
      g.foodBorn = performance.now();
    }

    function resetBoard() {
      const mid = Math.floor(ROWS / 2);
      g.snake = [
        { x: 8, y: mid },
        { x: 7, y: mid },
        { x: 6, y: mid },
      ];
      g.prev = g.snake.map((p) => ({ ...p }));
      g.dir = { x: 1, y: 0 };
      g.queue = [];
      g.grow = 0;
      g.score = 0;
      g.acc = 0;
      g.fx = [];
      g.shake = 0;
      g.flash = 0;
      g.ateTime = -9999;
      spawnFood();
    }

    function syncHud(state: UiState, extra?: Partial<Ui>) {
      setUi((u) => ({ ...u, ...extra, state, score: g.score, len: g.snake.length, best: g.best }));
    }

    function begin(withDir?: Vec) {
      resetBoard();
      if (withDir && !(withDir.x === -1 && withDir.y === 0)) g.dir = withDir;
      g.ui = "running";
      sound.start();
      syncHud("running", { newBest: false, won: false });
    }

    function pauseGame() {
      if (g.ui !== "running") return;
      g.ui = "paused";
      sound.pause();
      syncHud("paused");
    }

    function resumeGame() {
      if (g.ui !== "paused") return;
      g.ui = "running";
      g.last = performance.now();
      sound.blip();
      syncHud("running");
    }

    function togglePause() {
      if (g.ui === "running") pauseGame();
      else if (g.ui === "paused") resumeGame();
    }

    function die() {
      g.ui = "over";
      g.deathTime = performance.now();
      g.shake = 1;
      g.flash = 1;
      sound.die();
      let newBest = false;
      if (g.score > g.best) {
        g.best = g.score;
        newBest = true;
        try {
          localStorage.setItem("snake-best", String(g.best));
        } catch {
          /* private mode — best just won't persist */
        }
        setTimeout(() => sound.jingle(), 450);
      }
      syncHud("over", { newBest, won: false });
    }

    function win() {
      g.ui = "over";
      g.deathTime = performance.now();
      let newBest = false;
      if (g.score > g.best) {
        g.best = g.score;
        newBest = true;
        try {
          localStorage.setItem("snake-best", String(g.best));
        } catch {
          /* ignore */
        }
      }
      sound.jingle();
      syncHud("over", { newBest, won: true });
    }

    function burst(cell: Vec) {
      const cx = (cell.x + 0.5) * CELL;
      const cy = (cell.y + 0.5) * CELL;
      const colors = ["#ffc65c", "#ff7a4d", "#7aff92", "#fff3d6"];
      for (let i = 0; i < 14; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 50 + Math.random() * 110;
        g.fx.push({
          kind: "spark",
          x: cx,
          y: cy,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - 30,
          life: 0.5 + Math.random() * 0.25,
          max: 0.75,
          color: colors[i % 4],
          size: 2 + Math.random() * 2.5,
        });
      }
      g.fx.push({ kind: "ring", x: cx, y: cy, life: 0.4, max: 0.4 });
    }

    function tick() {
      if (g.ui !== "running") return;
      // consume queued turns, skipping reversals / no-ops
      while (g.queue.length) {
        const d = g.queue.shift()!;
        const isReverse = d.x === -g.dir.x && d.y === -g.dir.y;
        const isSame = d.x === g.dir.x && d.y === g.dir.y;
        if (!isReverse && !isSame) {
          g.dir = d;
          break;
        }
      }
      const old = g.snake;
      g.prev = old.map((p) => ({ ...p }));
      const head = old[0];
      const nx = head.x + g.dir.x;
      const ny = head.y + g.dir.y;

      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) {
        die();
        return;
      }
      const eats = nx === g.food.x && ny === g.food.y;
      const willGrow = eats || g.grow > 0;
      const body = willGrow ? old : old.slice(0, old.length - 1);
      for (const s of body) {
        if (s.x === nx && s.y === ny) {
          die();
          return;
        }
      }

      g.snake = [{ x: nx, y: ny }, ...old];
      if (eats) {
        g.score += 1;
        g.grow += 1;
        g.ateTime = performance.now();
        g.shake = Math.max(g.shake, 0.28);
        burst({ x: nx, y: ny });
        sound.eat();
        spawnFood();
        syncHud("running");
      }
      if (g.grow > 0) g.grow -= 1;
      else g.snake.pop();
    }

    function turn(d: Vec) {
      if (g.ui === "ready") {
        begin(d);
        return;
      }
      if (g.ui !== "running") return;
      const ref = g.queue.length ? g.queue[g.queue.length - 1] : g.dir;
      if (d.x === ref.x && d.y === ref.y) return;
      if (d.x === -ref.x && d.y === -ref.y) return;
      if (g.queue.length < 3) {
        g.queue.push(d);
        sound.turn();
      }
    }

    function primaryAction() {
      if (g.ui === "ready" || g.ui === "over") begin();
      else togglePause();
    }

    function toggleMute() {
      mutedRef.current = !mutedRef.current;
      setMuted(mutedRef.current);
      if (!mutedRef.current) sound.blip();
    }

    /* ---------------- rendering ---------------- */
    function drawBoard() {
      ctx!.fillStyle = "#07130c";
      ctx!.fillRect(0, 0, W, H);
      ctx!.fillStyle = "rgba(124,255,178,0.03)";
      for (let y = 0; y < ROWS; y++) for (let x = y % 2; x < COLS; x += 2) ctx!.fillRect(x * CELL, y * CELL, CELL, CELL);
      ctx!.strokeStyle = "rgba(122,255,146,0.08)";
      ctx!.lineWidth = 2;
      ctx!.strokeRect(1, 1, W - 2, H - 2);
    }

    function drawFood(now: number) {
      const born = Math.min(1, (now - g.foodBorn) / 280);
      const s = born >= 1 ? 1 : easeOutBack(Math.max(0, born));
      const cx = (g.food.x + 0.5) * CELL;
      const cy = (g.food.y + 0.5) * CELL;
      const pulse = 1 + Math.sin(now / 170) * 0.07;
      const r = CELL * 0.32 * pulse * s;
      if (r <= 0.5) return;
      const halo = ctx!.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 2.6);
      halo.addColorStop(0, "rgba(255,122,77,0.32)");
      halo.addColorStop(1, "rgba(255,122,77,0)");
      ctx!.fillStyle = halo;
      ctx!.fillRect(cx - r * 2.6, cy - r * 2.6, r * 5.2, r * 5.2);
      const body = ctx!.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.15, cx, cy, r);
      body.addColorStop(0, "#ffd9a0");
      body.addColorStop(0.45, "#ff7a4d");
      body.addColorStop(1, "#d63a2a");
      ctx!.fillStyle = body;
      ctx!.beginPath();
      ctx!.arc(cx, cy, r, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.save();
      ctx!.translate(cx + r * 0.15, cy - r * 0.95);
      ctx!.rotate(-0.6);
      ctx!.fillStyle = "#5ce089";
      ctx!.beginPath();
      ctx!.ellipse(0, 0, r * 0.42, r * 0.18, 0, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.restore();
      ctx!.fillStyle = "rgba(255,255,255,0.75)";
      ctx!.beginPath();
      ctx!.arc(cx - r * 0.32, cy - r * 0.34, r * 0.16, 0, Math.PI * 2);
      ctx!.fill();
    }

    function points(now: number) {
      const t = g.ui === "running" ? Math.min(1, g.acc / STEP) : 1;
      const out: { x: number; y: number }[] = [];
      for (let i = 0; i < g.snake.length; i++) {
        const c = g.snake[i];
        const p = g.prev[i] ?? c;
        out.push({ x: (p.x + (c.x - p.x) * t + 0.5) * CELL, y: (p.y + (c.y - p.y) * t + 0.5) * CELL });
      }
      return out;
    }

    function drawSnake(now: number) {
      if (g.snake.length === 0) return;
      // death blink
      if (g.ui === "over" && !g.deathTime) return;
      if (g.ui === "over" && now - g.deathTime < 700 && Math.floor((now - g.deathTime) / 90) % 2 === 1) return;

      const pts = points(now);
      const n = pts.length;
      const W0 = CELL * 0.7;
      ctx!.lineCap = "round";
      ctx!.lineJoin = "round";
      for (let i = n - 1; i > 0; i--) {
        ctx!.strokeStyle = segColor(i / Math.max(n - 1, 1));
        ctx!.lineWidth = W0 * (1 - 0.3 * (i / n));
        ctx!.beginPath();
        ctx!.moveTo(pts[i].x, pts[i].y);
        ctx!.lineTo(pts[i - 1].x, pts[i - 1].y);
        ctx!.stroke();
      }
      // head
      const h = pts[0];
      const d = g.dir;
      const chomp = now - g.ateTime < 160 ? (1 - (now - g.ateTime) / 160) * 0.35 : 0;
      const hr = W0 * 0.52 * (1 + chomp);
      ctx!.fillStyle = segColor(0);
      ctx!.beginPath();
      ctx!.arc(h.x, h.y, hr, 0, Math.PI * 2);
      ctx!.fill();
      // tongue flick
      if (g.ui === "running" && now % 2600 < 240) {
        const px = -d.y;
        const py = d.x;
        const tx = h.x + d.x * (hr + 5);
        const ty = h.y + d.y * (hr + 5);
        ctx!.strokeStyle = "#ff5d6e";
        ctx!.lineWidth = 1.8;
        ctx!.beginPath();
        ctx!.moveTo(h.x + d.x * hr * 0.8, h.y + d.y * hr * 0.8);
        ctx!.lineTo(tx, ty);
        ctx!.moveTo(tx, ty);
        ctx!.lineTo(tx + d.x * 3 + px * 2.4, ty + d.y * 3 + py * 2.4);
        ctx!.moveTo(tx, ty);
        ctx!.lineTo(tx + d.x * 3 - px * 2.4, ty + d.y * 3 - py * 2.4);
        ctx!.stroke();
      }
      // eyes
      const px = -d.y;
      const py = d.x;
      const ex = h.x + d.x * hr * 0.32;
      const ey = h.y + d.y * hr * 0.32;
      const blink = g.ui !== "over" && now % 3600 < 130;
      for (const s of [1, -1]) {
        const cx = ex + px * hr * 0.45 * s;
        const cy = ey + py * hr * 0.45 * s;
        if (blink) {
          ctx!.strokeStyle = "#06130b";
          ctx!.lineWidth = 1.6;
          ctx!.beginPath();
          ctx!.moveTo(cx - 2.4, cy);
          ctx!.lineTo(cx + 2.4, cy);
          ctx!.stroke();
        } else {
          ctx!.fillStyle = "#f4fff6";
          ctx!.beginPath();
          ctx!.arc(cx, cy, 3.1, 0, Math.PI * 2);
          ctx!.fill();
          ctx!.fillStyle = "#0a1f12";
          ctx!.beginPath();
          ctx!.arc(cx + d.x * 1.2, cy + d.y * 1.2, 1.6, 0, Math.PI * 2);
          ctx!.fill();
        }
      }
    }

    function drawFx(dt: number) {
      for (let i = g.fx.length - 1; i >= 0; i--) {
        const f = g.fx[i];
        f.life -= dt;
        if (f.life <= 0) {
          g.fx.splice(i, 1);
          continue;
        }
        const k = Math.max(0, f.life / f.max);
        if (f.kind === "spark") {
          f.x += f.vx * dt;
          f.y += f.vy * dt;
          f.vy += 160 * dt;
          f.vx *= 0.985;
          ctx!.globalAlpha = k;
          ctx!.fillStyle = f.color;
          ctx!.fillRect(f.x - f.size / 2, f.y - f.size / 2, f.size, f.size);
        } else {
          const r = (1 - k) * CELL * 1.7 + 5;
          ctx!.globalAlpha = k * 0.9;
          ctx!.strokeStyle = "#ffc65c";
          ctx!.lineWidth = 2;
          ctx!.beginPath();
          ctx!.arc(f.x, f.y, r, 0, Math.PI * 2);
          ctx!.stroke();
        }
      }
      ctx!.globalAlpha = 1;
    }

    function draw(now: number, dt: number) {
      ctx!.save();
      if (g.shake > 0.005) {
        const s = g.shake * 7;
        ctx!.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
        g.shake *= 0.88;
      } else g.shake = 0;

      drawBoard();
      drawFood(now);
      drawSnake(now);
      drawFx(dt);

      const vg = ctx!.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.78);
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, "rgba(0,0,0,0.4)");
      ctx!.fillStyle = vg;
      ctx!.fillRect(0, 0, W, H);

      if (g.flash > 0.01) {
        ctx!.fillStyle = `rgba(255,70,84,${(g.flash * 0.26).toFixed(3)})`;
        ctx!.fillRect(0, 0, W, H);
        g.flash *= 0.9;
      } else g.flash = 0;
      ctx!.restore();
    }

    /* ---------------- loop: rAF render, fixed 100ms sim step ---------------- */
    let raf = 0;
    const frame = (now: number) => {
      const dtMs = Math.min(50, now - g.last);
      g.last = now;
      if (g.ui === "running") {
        g.acc += dtMs;
        while (g.acc >= STEP && g.ui === "running") {
          g.acc -= STEP;
          tick();
        }
      }
      draw(now, dtMs / 1000);
      raf = requestAnimationFrame(frame);
    };
    resetBoard();
    raf = requestAnimationFrame(frame);

    /* ---------------- input ---------------- */
    const DIRS: Record<string, Vec> = {
      arrowup: { x: 0, y: -1 },
      w: { x: 0, y: -1 },
      arrowdown: { x: 0, y: 1 },
      s: { x: 0, y: 1 },
      arrowleft: { x: -1, y: 0 },
      a: { x: -1, y: 0 },
      arrowright: { x: 1, y: 0 },
      d: { x: 1, y: 0 },
    };
    const onKey = (e: KeyboardEvent) => {
      const lower = e.key.toLowerCase();
      if (DIRS[lower]) {
        e.preventDefault();
        if (!e.repeat) turn(DIRS[lower]);
        return;
      }
      if (lower === " " || e.code === "Space") {
        e.preventDefault();
        if (!e.repeat) primaryAction();
      } else if (lower === "r") {
        if (!e.repeat && g.ui !== "ready") begin();
      } else if (lower === "p") {
        if (!e.repeat) togglePause();
      } else if (lower === "m") {
        if (!e.repeat) toggleMute();
      } else if (lower === "enter") {
        if (!e.repeat && (g.ui === "ready" || g.ui === "over")) begin();
      }
    };
    window.addEventListener("keydown", onKey);

    api.begin = begin;
    api.turn = turn;
    api.togglePause = togglePause;
    api.toggleMute = toggleMute;
    api.screenTap = () => {
      if (g.ui === "ready" || g.ui === "over") begin();
      else togglePause();
    };

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", fit);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusText = { ready: "READY", running: "PLAYING", paused: "PAUSED", over: "GAME OVER" }[ui.state];

  return (
    <div className="page">
      <style>{CSS_TEXT}</style>

      <div className="fireflies" aria-hidden="true">
        {Array.from({ length: 8 }).map((_, i) => (
          <i
            key={i}
            className={`ff ff${i % 3}`}
            style={{
              left: `${(i * 13 + 5) % 96}%`,
              top: `${(i * 27 + 9) % 92}%`,
              animationDelay: `${i * 0.9}s`,
              animationDuration: `${8 + (i % 4) * 2.4}s`,
            }}
          />
        ))}
      </div>

      <main className="cab">
        <header className="cab-top">
          <div className="brand">
            <SnakeMark className="mark" />
            <div>
              <h1 className="logo">SNAKE</h1>
              <p className="tag">CANVAS ARCADE · 22 × 22 GRID</p>
            </div>
          </div>
          <div className="status">
            <span className={`led led-${ui.state}`} />
            <span className="status-txt">{statusText}</span>
            <button className="icon-btn" onClick={() => api.toggleMute()} aria-label={muted ? "Unmute sound" : "Mute sound"} title="Sound (M)">
              {muted ? <MutedIcon /> : <SoundIcon />}
            </button>
          </div>
        </header>

        <div className="hud">
          <div className="stat">
            <span className="stat-label">SCORE</span>
            <span key={ui.score} className="stat-value amber pop">
              {pad3(ui.score)}
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">LENGTH</span>
            <span className="stat-value mint">{pad3(ui.len)}</span>
          </div>
          <div className="stat">
            <span className="stat-label">BEST</span>
            <span className="stat-value ice">{pad3(ui.best)}</span>
          </div>
        </div>

        <div className="screen" onClick={() => api.screenTap()}>
          <canvas ref={canvasRef} className="game-canvas" style={{ aspectRatio: "1 / 1" }} />
          <div className="fx-scan" />
          <div className="fx-sweep" />
          <div className="fx-vig" />

          {ui.state === "ready" && (
            <div className="ov">
              <span className="ov-eyebrow">PLAYER ONE · CREDIT 01</span>
              <h2 className="ov-title">READY?</h2>
              <p className="ov-sub">Eat the glowing fruit to grow. One bite, one segment. Walls and your own tail end the run.</p>
              <span className="ov-blink">PRESS SPACE OR STEER TO START</span>
              <span className="ov-meta">FRUIT +1 · TICK 100MS · ONE LIFE</span>
            </div>
          )}

          {ui.state === "paused" && (
            <div className="ov">
              <h2 className="ov-title minted">PAUSED</h2>
              <span className="ov-blink">SPACE TO RESUME</span>
            </div>
          )}

          {ui.state === "over" && (
            <div className="ov ov-late">
              <span className="ov-eyebrow">{ui.won ? "BOARD CLEARED · FLAWLESS" : "INSERT COIN TO CONTINUE"}</span>
              <h2 className={`ov-title ${ui.won ? "minted" : "danger"}`}>{ui.won ? "YOU WIN" : "GAME OVER"}</h2>
              {ui.newBest && <span className="badge">NEW RECORD</span>}
              <div>
                <span className="ov-score-label">FINAL SCORE</span>
                <div className="ov-score">{pad3(ui.score)}</div>
                <span className="ov-best">
                  BEST {pad3(ui.best)} · LENGTH {pad3(ui.len)}
                </span>
              </div>
              <button className="btn" onClick={(e) => { e.stopPropagation(); api.begin(); }}>
                <RestartIcon />
                RESTART
              </button>
              <span className="ov-hint">
                or hit <kbd>SPACE</kbd> / <kbd>R</kbd>
              </span>
            </div>
          )}
        </div>

        <footer className="deck">
          <div className="keys">
            <span className="kgroup">
              <kbd>W</kbd>
              <kbd>A</kbd>
              <kbd>S</kbd>
              <kbd>D</kbd>
              <em>/</em>
              <kbd>ARROWS</kbd>
              <span className="lbl">steer</span>
            </span>
            <span className="kgroup">
              <kbd>SPACE</kbd>
              <span className="lbl">pause</span>
            </span>
            <span className="kgroup">
              <kbd>R</kbd>
              <span className="lbl">restart</span>
            </span>
            <span className="kgroup">
              <kbd>M</kbd>
              <span className="lbl">sound</span>
            </span>
          </div>
          <span className="tick-note">FIXED TICK · 100 MS</span>
        </footer>
      </main>

      <ContactSection />

      <div className="pad" onContextMenu={(e) => e.preventDefault()}>
        <button className="pbtn up" aria-label="Up" onPointerDown={(e) => { e.preventDefault(); api.turn({ x: 0, y: -1 }); }}>
          <Arrow rot={0} />
        </button>
        <button className="pbtn left" aria-label="Left" onPointerDown={(e) => { e.preventDefault(); api.turn({ x: -1, y: 0 }); }}>
          <Arrow rot={-90} />
        </button>
        <button className="pbtn mid" aria-label="Pause or resume" onPointerDown={(e) => { e.preventDefault(); api.togglePause(); }}>
          <PauseIcon />
        </button>
        <button className="pbtn right" aria-label="Right" onPointerDown={(e) => { e.preventDefault(); api.turn({ x: 1, y: 0 }); }}>
          <Arrow rot={90} />
        </button>
        <button className="pbtn down" aria-label="Down" onPointerDown={(e) => { e.preventDefault(); api.turn({ x: 0, y: 1 }); }}>
          <Arrow rot={180} />
        </button>
      </div>

      <p className="colophon">CANVAS 2D · REQUESTANIMATIONFRAME · ZERO LIBRARIES</p>
    </div>
  );
}

/* ============================================================
   Embedded stylesheet — arcade cabinet presentation
   ============================================================ */
const CSS_TEXT = `
.page{
  --bg:#040b07; --panel2:#0b1d14; --line:#1c3829; --line2:#2c523c;
  --mint:#7fe8a6; --mint-dim:#4e8a68; --amber:#ffc65c; --white:#eafff1;
  --green:#52f06b; --red:#ff4d5e;
  --fd:'Press Start 2P','Courier New',monospace;
  --fb:'Space Grotesk','Segoe UI',sans-serif;
  min-height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center;
  gap:18px; padding:36px 16px 40px; position:relative; overflow:hidden;
  font-family:var(--fb); color:var(--white);
  background:
    radial-gradient(1100px 640px at 12% -8%, rgba(35,102,66,.30), transparent 62%),
    radial-gradient(900px 560px at 108% 12%, rgba(255,176,84,.10), transparent 58%),
    radial-gradient(900px 700px at 50% 118%, rgba(22,64,44,.32), transparent 62%),
    var(--bg);
}
.page::before{
  content:""; position:absolute; inset:0; pointer-events:none;
  background-image:radial-gradient(rgba(127,232,166,.05) 1px, transparent 1.4px);
  background-size:26px 26px;
}
.fireflies{position:absolute; inset:0; pointer-events:none;}
.ff{position:absolute; width:5px; height:5px; border-radius:50%; filter:blur(.5px);
  animation-name:floaty,glowp; animation-timing-function:ease-in-out,ease-in-out;
  animation-iteration-count:infinite,infinite; animation-direction:alternate,normal;}
.ff0{background:#7aff92; box-shadow:0 0 10px 2px rgba(122,255,146,.55);}
.ff1{background:#ffc65c; box-shadow:0 0 10px 2px rgba(255,198,92,.5);}
.ff2{background:#5ce0c0; box-shadow:0 0 10px 2px rgba(92,224,192,.45);}
@keyframes floaty{from{transform:translate(0,0)}to{transform:translate(14px,-30px)}}
@keyframes glowp{0%,100%{opacity:.25}50%{opacity:.85}}

.cab{
  width:min(620px,100%); position:relative; z-index:1;
  background:linear-gradient(180deg,#0a1a12,#07110b);
  border:1px solid var(--line); border-radius:10px;
  padding:16px 16px 14px;
  box-shadow:0 30px 80px rgba(0,0,0,.55), 0 0 0 4px rgba(9,22,15,.6), inset 0 1px 0 rgba(160,255,200,.06);
}
.cab-top{display:flex; align-items:center; justify-content:space-between; gap:12px;}
.brand{display:flex; align-items:center; gap:13px; min-width:0;}
.mark{width:34px; height:38px; flex:none; animation:wiggle 4.5s ease-in-out infinite;}
@keyframes wiggle{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(4deg)}}
.logo{
  margin:0; font-family:var(--fd); font-weight:400;
  font-size:clamp(17px,3.6vw,23px); letter-spacing:.05em; color:var(--white);
  text-shadow:0 0 16px rgba(82,240,107,.5), 3px 3px 0 #0a2416;
}
.tag{margin:6px 0 0; font-size:10px; font-weight:600; letter-spacing:.32em; color:var(--mint-dim); white-space:nowrap;}
.status{display:flex; align-items:center; gap:9px; flex:none;}
.led{width:9px; height:9px; border-radius:50%;}
.led-ready{background:var(--amber); box-shadow:0 0 8px 2px rgba(255,198,92,.6); animation:ledpulse 1.6s ease-in-out infinite;}
.led-running{background:var(--green); box-shadow:0 0 8px 2px rgba(82,240,107,.6); animation:ledpulse 1.1s ease-in-out infinite;}
.led-paused{background:var(--amber); box-shadow:0 0 8px 2px rgba(255,198,92,.5);}
.led-over{background:var(--red); box-shadow:0 0 8px 2px rgba(255,77,94,.6); animation:ledpulse .7s ease-in-out infinite;}
@keyframes ledpulse{50%{opacity:.45}}
.status-txt{font-family:var(--fd); font-size:8px; letter-spacing:.14em; color:var(--mint);}
.icon-btn{
  width:34px; height:34px; display:inline-flex; align-items:center; justify-content:center;
  background:var(--panel2); border:1px solid var(--line2); border-radius:7px; color:var(--mint);
  cursor:pointer; transition:transform .12s ease, border-color .12s ease, color .12s ease, box-shadow .12s ease;
}
.icon-btn:hover{transform:translateY(-1px); border-color:var(--green); color:var(--white); box-shadow:0 0 14px rgba(82,240,107,.25);}
.icon-btn:active{transform:translateY(0);}

.hud{
  margin-top:14px; display:grid; grid-template-columns:repeat(3,1fr);
  background:var(--panel2); border:1px solid var(--line); border-radius:8px; overflow:hidden;
}
.stat{padding:11px 6px 10px; text-align:center;}
.stat + .stat{border-left:1px solid var(--line);}
.stat-label{display:block; font-family:var(--fd); font-size:7px; letter-spacing:.3em; color:var(--mint-dim); margin-bottom:8px;}
.stat-value{display:inline-block; font-family:var(--fd); font-size:17px;}
.stat-value.amber{color:var(--amber); text-shadow:0 0 14px rgba(255,198,92,.35);}
.stat-value.mint{color:var(--mint); text-shadow:0 0 14px rgba(127,232,166,.25);}
.stat-value.ice{color:var(--white); text-shadow:0 0 14px rgba(234,255,241,.2);}
.pop{animation:pop .32s cubic-bezier(.2,1.6,.4,1);}
@keyframes pop{0%{transform:scale(1.5); filter:brightness(1.9)}100%{transform:scale(1)}}

.screen{
  margin-top:14px; position:relative; border-radius:8px; overflow:hidden;
  border:1px solid var(--line2); background:#07130c; cursor:pointer;
  box-shadow:inset 0 0 0 1px rgba(0,0,0,.6), inset 0 0 44px rgba(0,0,0,.5), 0 0 26px rgba(82,240,107,.07);
}
.game-canvas{display:block; width:100%; height:auto;}
.fx-scan,.fx-sweep,.fx-vig{position:absolute; inset:0; pointer-events:none;}
.fx-scan{background:repeating-linear-gradient(0deg, rgba(0,0,0,.15) 0 1px, transparent 1px 3px); opacity:.55; z-index:2;}
.fx-sweep{inset:auto 0; height:34%; top:-40%; z-index:2;
  background:linear-gradient(180deg, transparent, rgba(190,255,214,.07), transparent);
  animation:sweep 6.5s linear infinite;}
@keyframes sweep{to{transform:translateY(430%)}}
.fx-vig{background:radial-gradient(120% 120% at 50% 50%, transparent 55%, rgba(0,0,0,.4) 100%); z-index:2;}

.ov{
  position:absolute; inset:0; z-index:3; display:flex; flex-direction:column; align-items:center;
  justify-content:center; gap:15px; text-align:center; padding:22px;
  background:rgba(4,11,7,.8); pointer-events:none; animation:ovin .35s ease both;
}
.ov-late{animation-delay:.55s;}
@keyframes ovin{from{opacity:0}to{opacity:1}}
.ov-eyebrow{font-family:var(--fd); font-size:8px; letter-spacing:.3em; color:var(--mint-dim);}
.ov-title{
  margin:0; font-family:var(--fd); font-weight:400; font-size:clamp(24px,6.5vw,36px); color:var(--white);
  text-shadow:0 0 20px rgba(82,240,107,.55), 3px 3px 0 #0a2416; letter-spacing:.04em;
}
.ov-title.danger{color:var(--red); text-shadow:0 0 22px rgba(255,77,94,.55), 3px 3px 0 #2b0a10;}
.ov-title.minted{color:var(--mint); text-shadow:0 0 22px rgba(127,232,166,.5), 3px 3px 0 #0a2416;}
.ov-sub{margin:0; max-width:36ch; font-size:14px; line-height:1.55; color:var(--mint);}
.ov-blink{font-family:var(--fd); font-size:10px; letter-spacing:.14em; color:var(--amber); animation:blink 1.15s linear infinite;}
@keyframes blink{0%,58%{opacity:1}59%,100%{opacity:0}}
.ov-meta{font-family:var(--fd); font-size:7px; letter-spacing:.24em; color:#35684d;}
.ov-score-label{display:block; font-family:var(--fd); font-size:8px; letter-spacing:.3em; color:var(--mint-dim); margin-bottom:10px;}
.ov-score{font-family:var(--fd); font-size:clamp(30px,8vw,44px); color:var(--amber); text-shadow:0 0 24px rgba(255,198,92,.45), 3px 3px 0 #33230a;}
.ov-best{display:block; margin-top:10px; font-size:12.5px; font-weight:600; letter-spacing:.18em; color:var(--mint-dim);}
.badge{
  font-family:var(--fd); font-size:9px; letter-spacing:.12em; color:#062012;
  background:var(--amber); padding:8px 12px; border-radius:4px; transform:rotate(-2deg);
  box-shadow:0 3px 0 #8a6420, 0 0 20px rgba(255,198,92,.5);
  animation:badgepop .45s cubic-bezier(.2,1.8,.4,1) both .7s;
}
@keyframes badgepop{from{transform:rotate(-2deg) scale(0)}to{transform:rotate(-2deg) scale(1)}}
.btn{
  pointer-events:auto; display:inline-flex; align-items:center; gap:10px;
  font-family:var(--fd); font-size:11px; letter-spacing:.08em; color:#06210f;
  background:var(--green); border:0; border-radius:6px; padding:15px 24px; cursor:pointer;
  box-shadow:0 5px 0 #1c8f4a, 0 12px 26px rgba(82,240,107,.28);
  transition:transform .12s ease, box-shadow .12s ease, background .12s ease;
}
.btn:hover{background:#6bff85; transform:translateY(-2px); box-shadow:0 7px 0 #1c8f4a, 0 16px 32px rgba(82,240,107,.4);}
.btn:active{transform:translateY(3px); box-shadow:0 2px 0 #1c8f4a, 0 6px 14px rgba(82,240,107,.25);}
.ov-hint{font-size:12px; color:var(--mint-dim);}

kbd{
  font-family:var(--fb); font-weight:700; font-size:10.5px; letter-spacing:.06em; color:var(--mint);
  background:#0d2117; border:1px solid var(--line2); border-bottom-width:3px;
  border-radius:5px; padding:3px 7px; white-space:nowrap;
}

.deck{
  margin-top:13px; display:flex; flex-wrap:wrap; gap:10px 18px;
  align-items:center; justify-content:space-between;
}
.keys{display:flex; flex-wrap:wrap; gap:9px 16px; align-items:center;}
.kgroup{display:inline-flex; align-items:center; gap:5px;}
.kgroup em{font-style:normal; color:#2f5a43; margin:0 1px;}
.kgroup .lbl{margin-left:4px; font-size:10px; font-weight:600; letter-spacing:.18em; text-transform:uppercase; color:var(--mint-dim);}
.tick-note{font-family:var(--fd); font-size:7.5px; letter-spacing:.2em; color:#35684d;}

.pad{
  display:none; position:fixed; right:16px; bottom:16px; z-index:20;
  grid-template-columns:repeat(3,54px); grid-template-rows:repeat(3,54px); gap:7px;
}
@media (pointer:coarse){.pad{display:grid;}}
.pbtn{
  display:flex; align-items:center; justify-content:center;
  background:rgba(13,33,23,.88); border:1px solid var(--line2); border-radius:11px; color:var(--mint);
  touch-action:manipulation; user-select:none; -webkit-user-select:none; cursor:pointer;
}
.pbtn:active{background:#1a4030; color:var(--white);}
.pbtn.up{grid-area:1/2}.pbtn.left{grid-area:2/1}.pbtn.mid{grid-area:2/2}.pbtn.right{grid-area:2/3}.pbtn.down{grid-area:3/2}

.colophon{margin:0; font-family:var(--fd); font-size:7px; letter-spacing:.26em; color:#2f5a43; text-align:center; z-index:1;}

@media (max-width:560px){
  .tag{display:none;}
  .stat-value{font-size:14px;}
  .deck{justify-content:center;}
  .keys .kgroup:nth-child(1){display:none;}
}
@media (prefers-reduced-motion:reduce){
  .ff,.fx-sweep,.mark,.led{animation:none !important;}
}
`;
