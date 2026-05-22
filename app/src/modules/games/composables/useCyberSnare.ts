import { ref, reactive, type Ref } from 'vue';
import { useEventListener } from '@vueuse/core';
import { sfx } from '@/modules/games/composables/useCyberSnareAudio';
import type { GameState, UpgradeDef, MetaStats } from '@/modules/games/types';

export type { GameState, UpgradeDef, MetaStats };

interface Point {
  x: number;
  y: number;
}

const COLORS = {
  cyan: '#0ff',
  magenta: '#f0f',
  yellow: '#ff0',
  white: '#fff',
  green: '#0f0',
  red: '#f00',
  orange: '#ff4500',
  purple: '#a020f0',
} as const;

const TRAIL_MAX_DIST = 10;
const ENERGY_DRAIN_RATE = 0.4;

// ─── Entity Classes ─────────────────────────────────────────────────

class Enemy {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  baseSpeed: number;
  type: string;
  color: string;
  alpha: number;
  angle: number;
  rotSpeed: number;
  oscOffset: number;

  constructor(
    width: number,
    height: number,
    score: number,
    diffMult: number,
    x?: number,
    y?: number,
    forcedType?: string,
  ) {
    if (x !== undefined && y !== undefined) {
      this.x = x;
      this.y = y;
    } else {
      const side = Math.floor(Math.random() * 4);
      if (side === 0) {
        this.x = Math.random() * width;
        this.y = -50;
      } else if (side === 1) {
        this.x = width + 50;
        this.y = Math.random() * height;
      } else if (side === 2) {
        this.x = Math.random() * width;
        this.y = height + 50;
      } else {
        this.x = -50;
        this.y = Math.random() * height;
      }
    }

    if (forcedType) {
      this.type = forcedType;
    } else {
      const r = Math.random();
      if (score > 5000 && r > 0.8) this.type = 'rootkit';
      else if (score > 3000 && r > 0.6) this.type = 'trojan';
      else if (score > 1000 && r > 0.4) this.type = 'worm';
      else if (r > 0.3) this.type = 'seeker';
      else this.type = 'wanderer';
    }

    this.size = 12 + Math.random() * 8;
    this.baseSpeed = (1 + Math.random() * 2) * diffMult;
    this.alpha = 1;
    this.oscOffset = 0;

    if (this.type === 'trojan') {
      this.size *= 1.8;
      this.baseSpeed *= 0.5;
      this.color = COLORS.red;
    } else if (this.type === 'worm') {
      this.size *= 0.8;
      this.baseSpeed *= 1.5;
      this.color = COLORS.green;
      this.oscOffset = Math.random() * Math.PI * 2;
    } else if (this.type === 'rootkit') {
      this.color = COLORS.purple;
      this.baseSpeed *= 1.2;
    } else {
      this.color = this.type === 'seeker' ? COLORS.yellow : COLORS.magenta;
    }

    this.vx = (Math.random() - 0.5) * this.baseSpeed;
    this.vy = (Math.random() - 0.5) * this.baseSpeed;
    if (this.x < 0) this.vx = Math.abs(this.vx) + 1;
    if (this.x > width) this.vx = -Math.abs(this.vx) - 1;
    if (this.y < 0) this.vy = Math.abs(this.vy) + 1;
    if (this.y > height) this.vy = -Math.abs(this.vy) - 1;

    this.angle = 0;
    this.rotSpeed = (Math.random() - 0.5) * 0.2;
  }

  update(
    width: number,
    height: number,
    playerX: number,
    playerY: number,
    diffMult: number,
    frameCount: number,
  ) {
    const MARGIN = 100;
    const STEER = 0.05 * diffMult;

    if (this.x < MARGIN) this.vx += STEER;
    if (this.x > width - MARGIN) this.vx -= STEER;
    if (this.y < MARGIN) this.vy += STEER;
    if (this.y > height - MARGIN) this.vy -= STEER;

    if (this.type === 'seeker') {
      const dx = playerX - this.x;
      const dy = playerY - this.y;
      const mag = Math.hypot(dx, dy);
      if (mag > 0) {
        this.vx += (dx / mag) * STEER;
        this.vy += (dy / mag) * STEER;
      }
    } else if (this.type === 'worm') {
      const speed = Math.hypot(this.vx, this.vy);
      if (speed > 0) {
        const wave = Math.cos(frameCount * 0.1 + this.oscOffset) * 2;
        this.x += (-this.vy / speed) * wave;
        this.y += (this.vx / speed) * wave;
      }
    } else if (this.type === 'rootkit') {
      this.alpha = 0.2 + 0.8 * Math.abs(Math.sin(frameCount * 0.02));
    }

    const speed = Math.hypot(this.vx, this.vy);
    const max = this.baseSpeed * 1.5;
    if (speed > max) {
      this.vx = (this.vx / speed) * max;
      this.vy = (this.vy / speed) * max;
    }

    this.x += this.vx;
    this.y += this.vy;
    this.angle += this.rotSpeed;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.globalAlpha = this.alpha;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 15;
    ctx.shadowColor = this.color;

    ctx.beginPath();
    if (this.type === 'wanderer' || this.type === 'rootkit') {
      ctx.rect(-this.size / 2, -this.size / 2, this.size, this.size);
    } else if (this.type === 'trojan') {
      ctx.moveTo(0, -this.size);
      ctx.lineTo(this.size, 0);
      ctx.lineTo(0, this.size);
      ctx.lineTo(-this.size, 0);
      ctx.closePath();
    } else {
      ctx.moveTo(0, -this.size);
      ctx.lineTo(this.size, this.size);
      ctx.lineTo(-this.size, this.size);
      ctx.closePath();
    }
    ctx.stroke();
    ctx.fillStyle = this.color;
    ctx.globalAlpha = this.alpha * 0.2;
    ctx.fill();
    ctx.restore();
  }
}

class PowerUp {
  x: number;
  y: number;
  type: string;
  life: number;
  size: number;
  angle: number;
  color: string;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    const types = ['FIREWALL', 'OVERCLOCK', 'EMP'] as const;
    this.type = types[Math.floor(Math.random() * types.length)] ?? 'FIREWALL';
    this.life = 10;
    this.size = 15;
    this.angle = 0;
    if (this.type === 'FIREWALL') this.color = COLORS.orange;
    else if (this.type === 'OVERCLOCK') this.color = COLORS.green;
    else this.color = COLORS.cyan;
  }

  update(dt: number) {
    this.life -= dt / 1000;
    this.angle += 0.05;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.globalAlpha = Math.min(1, this.life);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 15;
    ctx.shadowColor = this.color;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      ctx.lineTo(
        this.size * Math.cos((i * Math.PI) / 3),
        this.size * Math.sin((i * Math.PI) / 3),
      );
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  decay: number;
  color: string;
  size: number;

  constructor(x: number, y: number, color: string) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 5 + 1;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = 1.0;
    this.decay = Math.random() * 0.02 + 0.02;
    this.color = color;
    this.size = Math.random() * 3 + 1;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life -= this.decay;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.globalAlpha = Math.max(0, this.life);
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 10;
    ctx.shadowColor = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

class Flash {
  points: Point[];
  life: number;
  constructor(points: Point[]) {
    this.points = points;
    this.life = 1.0;
  }
  update() {
    this.life -= 0.05;
  }
  draw(ctx: CanvasRenderingContext2D) {
    if (this.points.length < 3) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.life);
    ctx.fillStyle = COLORS.cyan;
    ctx.shadowBlur = 20;
    ctx.shadowColor = COLORS.cyan;
    ctx.beginPath();
    const first = this.points[0]!;
    ctx.moveTo(first.x, first.y);
    for (let i = 1; i < this.points.length; i++) {
      const pt = this.points[i]!;
      ctx.lineTo(pt.x, pt.y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }
}

// ─── Math Utilities ─────────────────────────────────────────────────

function dist(a: Point, b: Point) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function getIntersection(
  A: Point,
  B: Point,
  C: Point,
  D: Point,
): (Point & { t: number }) | null {
  const tTop = (D.x - C.x) * (A.y - C.y) - (D.y - C.y) * (A.x - C.x);
  const uTop = (C.y - A.y) * (A.x - B.x) - (C.x - A.x) * (A.y - B.y);
  const bottom = (D.y - C.y) * (B.x - A.x) - (D.x - C.x) * (B.y - A.y);
  if (bottom !== 0) {
    const t = tTop / bottom;
    const u = uTop / bottom;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      return { x: A.x + t * (B.x - A.x), y: A.y + t * (B.y - A.y), t };
    }
  }
  return null;
}

function pointInPolygon(point: Point, vs: Point[]) {
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const vi = vs[i]!,
      vj = vs[j]!;
    const xi = vi.x,
      yi = vi.y,
      xj = vj.x,
      yj = vj.y;
    if (
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }
  return inside;
}

function ptSegDist(p: Point, v: Point, w: Point) {
  const l2 = (w.x - v.x) ** 2 + (w.y - v.y) ** 2;
  if (l2 === 0) return dist(p, v);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return dist(p, { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) });
}

// ─── Upgrade Definitions ────────────────────────────────────────────

function createDefaultMeta(): MetaStats {
  return {
    driveSpace: 0,
    upgrades: {
      regen: {
        lvl: 0,
        max: 10,
        costBase: 25,
        costMult: 1.8,
        name: 'BANDWIDTH',
        desc: 'Increases energy regeneration speed significantly.',
      },
      energy: {
        lvl: 0,
        max: 10,
        costBase: 25,
        costMult: 1.8,
        name: 'BATTERY CAPACITY',
        desc: 'Increases max energy reserve by +20 per level.',
      },
      loot: {
        lvl: 0,
        max: 5,
        costBase: 50,
        costMult: 2.5,
        name: 'DATA EXTRACTION',
        desc: 'Doubles the amount of Free Space (KB) dropped by viruses.',
      },
      lives: {
        lvl: 0,
        max: 5,
        costBase: 200,
        costMult: 3.0,
        name: 'REDUNDANCY',
        desc: 'Increases maximum system Integrity (Extra Lives).',
      },
      fw_persist: {
        lvl: 0,
        max: 5,
        costBase: 150,
        costMult: 2.2,
        name: 'FIREWALL LINGER',
        desc: 'Firewall remains active on screen as a trap for +1s after drawing.',
      },
      emp_cascade: {
        lvl: 0,
        max: 3,
        costBase: 400,
        costMult: 3.5,
        name: 'EMP CASCADE',
        desc: 'EMP triggers multiple secondary blasts separated by delays.',
      },
      heal: {
        lvl: 0,
        max: 99,
        costBase: 50,
        costMult: 1.0,
        name: 'EMERGENCY REPAIR',
        desc: 'Consumable: Instantly restores 1 missing Integrity (Life).',
      },
    },
  };
}

// ─── Main Composable ────────────────────────────────────────────────

export function useCyberSnare() {
  // Reactive state exposed to template
  const gameState = ref<GameState>('START');
  const score = ref(0);
  const lives = ref(1);
  const energy = ref(30);
  const energyMax = ref(30);
  const driveSpace = ref(0);
  const energyBarColor = ref<string>(COLORS.cyan);
  const meta: MetaStats = reactive(createDefaultMeta());

  // Internal mutable state (not reactive — performance critical)
  let canvas: HTMLCanvasElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;
  let monitorEl: HTMLElement | null = null;
  let W = 0,
    H = 0;
  let animId = 0;
  let lastTime = 0;
  let frameCount = 0;

  let playerX = 0,
    playerY = 0;
  let isDrawing = false;
  let trail: Point[] = [];
  let playerEnergy = 30;
  let playerLives = 1;
  let playerScore = 0;
  let invulnTime = 0;
  let hasFirewall = false,
    firewallTimer = 0;
  let hasOverclock = false,
    overclockTimer = 0;

  let enemies: Enemy[] = [];
  let particles: Particle[] = [];
  let flashes: Flash[] = [];
  let powerups: PowerUp[] = [];
  let persistentWalls: { points: Point[]; timer: number; maxTimer: number }[] =
    [];
  let diffMult = 1;
  let _mouseDown = false;

  let ENERGY_MAX_INT = 30;
  let ENERGY_REGEN = 0.15;

  // ─── Sync refs ──────────────────────────────────────────────

  function syncRefs() {
    score.value = playerScore;
    lives.value = playerLives;
    energy.value = playerEnergy;
    energyMax.value = ENERGY_MAX_INT;
    driveSpace.value = Math.floor(meta.driveSpace);

    if (playerEnergy < 20 && !hasOverclock) {
      energyBarColor.value = 'red';
    } else if (hasOverclock) {
      energyBarColor.value = COLORS.green;
    } else if (hasFirewall) {
      energyBarColor.value = COLORS.orange;
    } else {
      energyBarColor.value = COLORS.cyan;
    }
  }

  // ─── Helpers ────────────────────────────────────────────────

  function spawnExplosion(x: number, y: number, color: string, amount = 15) {
    for (let i = 0; i < amount; i++) particles.push(new Particle(x, y, color));
  }

  function dissipate(trailPts: Point[]) {
    for (let i = 0; i < trailPts.length; i += 3) {
      const pt = trailPts[i]!;
      particles.push(new Particle(pt.x, pt.y, COLORS.cyan));
    }
  }

  function triggerShake() {
    if (!monitorEl) return;
    monitorEl.classList.remove('shake');
    void monitorEl.offsetWidth;
    monitorEl.classList.add('shake');
  }

  function takeDamage() {
    if (invulnTime > 0) return;
    playerLives--;
    invulnTime = 1000;
    isDrawing = false;
    dissipate(trail);
    trail = [];
    sfx.playerHit();
    triggerShake();
    syncRefs();

    if (playerLives <= 0) {
      gameState.value = 'GAMEOVER';
    }
  }

  function destroyEnemy(i: number) {
    const en = enemies[i];
    if (!en) return;
    spawnExplosion(en.x, en.y, en.color, 20);

    const baseVals: Record<string, number> = {
      wanderer: 1,
      seeker: 2,
      worm: 5,
      trojan: 10,
      rootkit: 25,
    };
    const lootUpgrade = meta.upgrades.loot;
    meta.driveSpace +=
      (baseVals[en.type] || 1) * Math.pow(2, lootUpgrade ? lootUpgrade.lvl : 0);

    if (en.type === 'trojan') {
      enemies.push(
        new Enemy(W, H, playerScore, diffMult, en.x - 15, en.y, 'wanderer'),
      );
      enemies.push(
        new Enemy(W, H, playerScore, diffMult, en.x + 15, en.y, 'wanderer'),
      );
    }

    if (Math.random() < 0.15) powerups.push(new PowerUp(en.x, en.y));
    enemies.splice(i, 1);
    playerScore += 100;
  }

  function checkLoop() {
    if (trail.length < 10) return;
    const cur = trail[trail.length - 1]!;
    const prev = trail[trail.length - 2]!;

    for (let i = 0; i < trail.length - 5; i++) {
      const hit = getIntersection(prev, cur, trail[i]!, trail[i + 1]!);
      if (hit) {
        sfx.snareClose();
        const poly = trail.slice(i + 1, trail.length - 1);
        poly.push(hit);
        poly.unshift(hit);
        flashes.push(new Flash(poly));

        let caught = 0;
        for (let j = enemies.length - 1; j >= 0; j--) {
          if (pointInPolygon(enemies[j]!, poly)) {
            destroyEnemy(j);
            caught++;
          }
        }
        if (caught > 0) {
          sfx.enemyHit();
          playerScore += caught * 50 * caught;
          diffMult += 0.05;
          triggerShake();
        }

        trail = [];
        isDrawing = false;
        _mouseDown = false;
        syncRefs();
        break;
      }
    }
  }

  function triggerEMP(cascadesLeft: number) {
    if (gameState.value !== 'PLAYING') return;
    for (let i = enemies.length - 1; i >= 0; i--) destroyEnemy(i);
    sfx.enemyHit();
    flashes.push(
      new Flash([
        { x: 0, y: 0 },
        { x: W, y: 0 },
        { x: W, y: H },
        { x: 0, y: H },
      ]),
    );
    if (cascadesLeft > 0) setTimeout(() => triggerEMP(cascadesLeft - 1), 800);
  }

  function activatePowerup(type: string) {
    sfx.powerup();
    triggerShake();
    if (type === 'FIREWALL') {
      firewallTimer = 8000;
      hasFirewall = true;
    } else if (type === 'OVERCLOCK') {
      overclockTimer = 10000;
      hasOverclock = true;
      playerEnergy = ENERGY_MAX_INT;
    } else if (type === 'EMP') {
      triggerEMP(meta.upgrades.emp_cascade?.lvl ?? 0);
    }
    syncRefs();
  }

  function checkCollisions() {
    for (let i = 0; i < enemies.length; i++) {
      const en = enemies[i];
      if (!en) continue;

      if (dist({ x: playerX, y: playerY }, en) < en.size) {
        if (hasFirewall) {
          destroyEnemy(i);
          sfx.enemyHit();
          i--;
        } else {
          takeDamage();
        }
        return;
      }

      if (isDrawing && trail.length > 1) {
        let hit = false;
        for (let j = 0; j < trail.length - 1; j++) {
          if (ptSegDist(en, trail[j]!, trail[j + 1]!) < en.size) {
            if (hasFirewall) {
              destroyEnemy(i);
              sfx.enemyHit();
              i--;
              hit = true;
              break;
            } else {
              takeDamage();
              return;
            }
          }
        }
        if (hit) continue;
      }

      for (let pw = 0; pw < persistentWalls.length; pw++) {
        const wall = persistentWalls[pw];
        if (!wall) continue;
        let destroyed = false;
        for (let j = 0; j < wall.points.length - 1; j++) {
          if (ptSegDist(en, wall.points[j]!, wall.points[j + 1]!) < en.size) {
            destroyEnemy(i);
            sfx.enemyHit();
            i--;
            destroyed = true;
            break;
          }
        }
        if (destroyed) break;
      }
    }
  }

  // ─── Update & Draw ──────────────────────────────────────────

  function update(dt: number) {
    frameCount++;

    if (invulnTime > 0) invulnTime -= dt;
    if (firewallTimer > 0) {
      firewallTimer -= dt;
      if (firewallTimer <= 0) hasFirewall = false;
    }
    if (overclockTimer > 0) {
      overclockTimer -= dt;
      if (overclockTimer <= 0) hasOverclock = false;
    }

    if (isDrawing) {
      if (!hasOverclock) playerEnergy -= ENERGY_DRAIN_RATE;
      if (playerEnergy <= 0) {
        playerEnergy = 0;
        isDrawing = false;
        dissipate(trail);
        trail = [];
        sfx.playerHit();
      }
    } else {
      const regen = hasOverclock ? ENERGY_REGEN * 5 : ENERGY_REGEN;
      playerEnergy = Math.min(ENERGY_MAX_INT, playerEnergy + regen);
    }

    if (isDrawing && trail.length > 0) {
      const last = trail[trail.length - 1]!;
      if (dist({ x: playerX, y: playerY }, last) > TRAIL_MAX_DIST) {
        trail.push({ x: playerX, y: playerY });
        checkLoop();
      }
    }

    for (let i = powerups.length - 1; i >= 0; i--) {
      const pu = powerups[i];
      if (!pu) continue;
      pu.update(dt);
      if (dist({ x: playerX, y: playerY }, pu) < pu.size + 15) {
        activatePowerup(pu.type);
        powerups.splice(i, 1);
      } else if (pu.life <= 0) {
        powerups.splice(i, 1);
      }
    }

    const spawnRate = Math.max(20, 100 - diffMult * 10 - playerScore / 1000);
    if (frameCount % Math.floor(spawnRate) === 0 && enemies.length < 35) {
      enemies.push(new Enemy(W, H, playerScore, diffMult));
    }

    for (let i = persistentWalls.length - 1; i >= 0; i--) {
      const pw = persistentWalls[i];
      if (!pw) continue;
      pw.timer -= dt;
      if (pw.timer <= 0) {
        dissipate(pw.points);
        persistentWalls.splice(i, 1);
      }
    }

    enemies.forEach((en) =>
      en.update(W, H, playerX, playerY, diffMult, frameCount),
    );
    particles.forEach((p) => p.update());
    flashes.forEach((f) => f.update());

    particles = particles.filter((p) => p.life > 0);
    flashes = flashes.filter((f) => f.life > 0);

    checkCollisions();
    syncRefs();
  }

  function drawGrid(c: CanvasRenderingContext2D) {
    c.strokeStyle = '#051525';
    c.lineWidth = 1;
    c.beginPath();
    for (let x = 0; x < W; x += 50) {
      c.moveTo(x, 0);
      c.lineTo(x, H);
    }
    for (let y = 0; y < H; y += 50) {
      c.moveTo(0, y);
      c.lineTo(W, y);
    }
    c.stroke();
  }

  function draw() {
    if (!ctx) return;
    ctx.fillStyle = 'rgba(5, 5, 16, 0.4)';
    ctx.fillRect(0, 0, W, H);

    drawGrid(ctx);
    flashes.forEach((f) => f.draw(ctx!));
    powerups.forEach((pu) => pu.draw(ctx!));
    particles.forEach((p) => p.draw(ctx!));
    enemies.forEach((en) => en.draw(ctx!));

    // Persistent walls
    persistentWalls.forEach((pw) => {
      if (pw.points.length < 2) return;
      const c = ctx!;
      const fp = pw.points[0]!;
      c.beginPath();
      c.moveTo(fp.x, fp.y);
      for (let i = 1; i < pw.points.length; i++) {
        const pt = pw.points[i]!;
        c.lineTo(pt.x, pt.y);
      }
      c.strokeStyle = COLORS.orange;
      c.lineWidth = 5;
      c.lineCap = 'round';
      c.lineJoin = 'round';
      const alpha = Math.max(0, pw.timer / pw.maxTimer);
      c.globalAlpha = alpha;
      c.shadowBlur = 25 * alpha;
      c.shadowColor = COLORS.orange;
      c.stroke();
      c.globalAlpha = 1;
      c.shadowBlur = 0;
    });

    // Player trail
    if (trail.length > 0) {
      const t0 = trail[0]!;
      ctx.beginPath();
      ctx.moveTo(t0.x, t0.y);
      for (let i = 1; i < trail.length; i++) {
        const pt = trail[i]!;
        ctx.lineTo(pt.x, pt.y);
      }
      if (isDrawing) ctx.lineTo(playerX, playerY);

      let lineColor: string = COLORS.cyan;
      if (hasFirewall) lineColor = COLORS.orange;
      else if (hasOverclock) lineColor = COLORS.green;

      ctx.strokeStyle = lineColor;
      ctx.lineWidth = hasFirewall ? 5 : 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowBlur = hasFirewall ? 25 : 15;
      ctx.shadowColor = lineColor;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Player cursor
    if (gameState.value === 'PLAYING') {
      ctx.save();
      ctx.translate(playerX, playerY);
      if (invulnTime > 0)
        ctx.globalAlpha = Math.floor(Date.now() / 100) % 2 === 0 ? 0.3 : 1;

      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(8, 0);
      ctx.lineTo(0, 8);
      ctx.lineTo(-8, 0);
      ctx.closePath();

      let cursorColor: string = COLORS.cyan;
      if (hasFirewall) cursorColor = COLORS.orange;
      else if (hasOverclock) cursorColor = COLORS.green;

      ctx.fillStyle = cursorColor;
      ctx.shadowBlur = 10;
      ctx.shadowColor = cursorColor;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  }

  function loop(timestamp: number) {
    const dt = timestamp - lastTime;
    lastTime = timestamp;
    if (gameState.value === 'PLAYING') update(dt);
    draw();
    animId = requestAnimationFrame(loop);
  }

  // ─── Input ──────────────────────────────────────────────────

  function updatePos(e: MouseEvent | TouchEvent) {
    if ('touches' in e && e.touches.length > 0) {
      const touch = e.touches[0]!;
      playerX = touch.clientX;
      playerY = touch.clientY;
    } else if ('clientX' in e) {
      playerX = e.clientX;
      playerY = e.clientY;
    }
  }

  function onStart(e: MouseEvent | TouchEvent) {
    if (e.cancelable) e.preventDefault();
    if (gameState.value !== 'PLAYING') return;
    updatePos(e);
    _mouseDown = true;
    if (playerEnergy > 10) {
      isDrawing = true;
      trail = [{ x: playerX, y: playerY }];
      sfx.drawStart();
    }
  }

  function onMove(e: MouseEvent | TouchEvent) {
    if (e.cancelable) e.preventDefault();
    if (gameState.value !== 'PLAYING') return;
    updatePos(e);
  }

  function onEnd(e: MouseEvent | TouchEvent) {
    if (e.cancelable) e.preventDefault();
    _mouseDown = false;
    if (isDrawing) {
      isDrawing = false;
      const fwPersist = meta.upgrades.fw_persist;
      if (hasFirewall && fwPersist && fwPersist.lvl > 0 && trail.length > 2) {
        const t = fwPersist.lvl * 1000;
        persistentWalls.push({ points: [...trail], timer: t, maxTimer: t });
      } else {
        dissipate(trail);
      }
      trail = [];
    }
  }

  // ─── Resize ─────────────────────────────────────────────────

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    if (canvas) {
      canvas.width = W;
      canvas.height = H;
    }
  }

  // ─── Public API ─────────────────────────────────────────────

  function resetGame() {
    ENERGY_MAX_INT = 30 + (meta.upgrades.energy?.lvl ?? 0) * 20;
    ENERGY_REGEN = 0.15 + (meta.upgrades.regen?.lvl ?? 0) * 0.15;
    playerLives = 1 + (meta.upgrades.lives?.lvl ?? 0);
    playerScore = 0;
    playerEnergy = ENERGY_MAX_INT;
    trail = [];
    isDrawing = false;
    invulnTime = 0;
    hasFirewall = false;
    firewallTimer = 0;
    hasOverclock = false;
    overclockTimer = 0;
    enemies = [];
    particles = [];
    flashes = [];
    powerups = [];
    persistentWalls = [];
    diffMult = 1;
    frameCount = 0;
    for (let i = 0; i < 3; i++) enemies.push(new Enemy(W, H, 0, 1));
    syncRefs();
  }

  function startGame() {
    sfx.resume();
    gameState.value = 'PLAYING';
    resetGame();
  }

  function restartGame() {
    gameState.value = 'PLAYING';
    resetGame();
  }

  function openUpgrades() {
    gameState.value = 'UPGRADE';
  }
  function closeUpgrades() {
    gameState.value = 'GAMEOVER';
  }

  function getUpgradeCost(key: string): number {
    const u = meta.upgrades[key];
    if (!u) return 0;
    if (key === 'heal') return u.costBase;
    return Math.floor(u.costBase * Math.pow(u.costMult, u.lvl));
  }

  function isUpgradeMaxed(key: string): boolean {
    const u = meta.upgrades[key];
    if (!u) return true;
    if (key === 'heal')
      return playerLives >= 1 + (meta.upgrades.lives?.lvl ?? 0);
    return u.lvl >= u.max;
  }

  function buyUpgrade(key: string) {
    const cost = getUpgradeCost(key);
    const u = meta.upgrades[key];
    if (!u) return;
    if (meta.driveSpace >= cost && u.lvl < u.max) {
      meta.driveSpace -= cost;
      if (key === 'heal') {
        const maxL = 1 + (meta.upgrades.lives?.lvl ?? 0);
        if (playerLives < maxL) playerLives++;
      } else {
        u.lvl++;
      }
      sfx.powerup();
      syncRefs();
    }
  }

  let stopListeners: (() => void)[] = [];

  function init(
    canvasRef: Ref<HTMLCanvasElement | null>,
    monitorRef: Ref<HTMLElement | null>,
  ) {
    canvas = canvasRef.value;
    monitorEl = monitorRef.value;
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    resize();

    stopListeners = [
      useEventListener(window, 'resize', resize),
      useEventListener(window, 'mousedown', onStart),
      useEventListener(window, 'mousemove', onMove),
      useEventListener(window, 'mouseup', onEnd),
      useEventListener(window, 'touchstart', onStart, { passive: false }),
      useEventListener(window, 'touchmove', onMove, { passive: false }),
      useEventListener(window, 'touchend', onEnd),
    ];

    animId = requestAnimationFrame(loop);
  }

  function destroy() {
    cancelAnimationFrame(animId);
    stopListeners.forEach((stop) => stop());
    stopListeners = [];
  }

  return {
    // State
    gameState,
    score,
    lives,
    energy,
    energyMax,
    driveSpace,
    energyBarColor,
    meta,
    // Actions
    init,
    destroy,
    startGame,
    restartGame,
    openUpgrades,
    closeUpgrades,
    getUpgradeCost,
    isUpgradeMaxed,
    buyUpgrade,
  };
}
