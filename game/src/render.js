// The renderer: everything the player sees, painted on one canvas.
// Dusty gold sand under a teal dawn sky, dark raiders with crimson
// sashes — a palette that reads as desert-at-dawn at a glance, not
// another dark night with a warm glow. The HUD is dense on purpose:
// the route strip, leg, distance to the city, score, supplies, salt,
// water, weather, hull, wagon order, crew, streak, ability keys, the
// incoming roster and the explicit win/lose lines are all on screen
// while playing.
import {
  BRIDGE_COST_SUPPLIES, CANNON_COST_SALT, CANNON_RADIUS, LEGS, LEG_PLANS,
  ROAD_BOTTOM, ROAD_TOP, ROAD_Y, ROUTES, TRADES, VIEW_H, VIEW_W, WEATHERS,
} from './config.js';
import { aliveCounts, cardRect, incomingRoster, tradeRect } from './world.js';

const FONT = (px, weight) => `${weight || 700} ${px}px "Trebuchet MS", Verdana, sans-serif`;

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function fit() {
    const scale = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
    canvas.width = VIEW_W;
    canvas.height = VIEW_H;
    canvas.style.width = `${VIEW_W * scale}px`;
    canvas.style.height = `${VIEW_H * scale}px`;
    return scale;
  }

  function bar(x, y, w, h, frac, fill, bg) {
    ctx.fillStyle = bg;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, Math.max(0, Math.min(1, frac)) * w, h);
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w, h);
  }

  function text(str, x, y, px, color, align, weight) {
    ctx.font = FONT(px, weight);
    ctx.fillStyle = color;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(str, x, y);
  }

  function outlined(str, x, y, px, color, align, weight) {
    ctx.font = FONT(px, weight);
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(20,25,20,0.85)';
    ctx.strokeText(str, x, y);
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
  }

  function panel(x, y, w, h, fill) {
    ctx.fillStyle = fill || 'rgba(12,26,28,0.82)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(242,181,68,0.55)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w, h);
  }

  function metresToCity(world) {
    let m = world.legLength - world.distance;
    for (let i = world.leg; i < LEGS; i += 1) m += LEG_PLANS[i].length;
    return Math.max(0, Math.round(m));
  }

  function routeProgress(world) {
    return ((world.leg - 1) + world.distance / world.legLength) / LEGS;
  }

  function drawSky(world, t) {
    const g = ctx.createLinearGradient(0, 0, 0, 380);
    g.addColorStop(0, '#0e3f43');
    g.addColorStop(0.45, '#2a7f74');
    g.addColorStop(0.8, '#e8b45c');
    g.addColorStop(1, '#f2c879');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, 380);
    // Low dawn sun, half-risen over the dunes.
    const sunX = 1050;
    const sunY = 300;
    const sg = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 150);
    sg.addColorStop(0, 'rgba(255,236,170,0.95)');
    sg.addColorStop(0.35, 'rgba(251,191,36,0.55)');
    sg.addColorStop(1, 'rgba(251,191,36,0)');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 150, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.arc(sunX, sunY, 42, 0, Math.PI * 2);
    ctx.fill();
    // Distant dunes, two layers, still by a fixed hash of their x.
    ctx.fillStyle = '#c98f2e';
    ctx.beginPath();
    ctx.moveTo(0, 380);
    for (let x = 0; x <= VIEW_W; x += 40) {
      const h = ((x * 2654435761) >>> 0) % 46;
      ctx.lineTo(x, 330 + h * 0.4);
    }
    ctx.lineTo(VIEW_W, 380);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#a0712a';
    ctx.beginPath();
    ctx.moveTo(0, 380);
    for (let x = 0; x <= VIEW_W; x += 40) {
      const h = ((x * 40503 + 7) >>> 0) % 30;
      ctx.lineTo(x, 356 + h * 0.5);
    }
    ctx.lineTo(VIEW_W, 380);
    ctx.closePath();
    ctx.fill();
    // The far city on the horizon, a promise at the end of the road.
    ctx.fillStyle = '#5b3a1a';
    const cx = 1120;
    ctx.fillRect(cx, 296, 14, 60);
    ctx.fillRect(cx + 20, 312, 10, 44);
    ctx.fillRect(cx + 36, 288, 18, 68);
    ctx.beginPath();
    ctx.moveTo(cx + 36, 288);
    ctx.lineTo(cx + 45, 272);
    ctx.lineTo(cx + 54, 288);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(cx + 62, 318, 12, 38);
    void t;
    void world;
  }

  function drawGround(world, t) {
    // Sand foreground.
    const g = ctx.createLinearGradient(0, 380, 0, VIEW_H);
    g.addColorStop(0, '#d9a441');
    g.addColorStop(1, '#b9832f');
    ctx.fillStyle = g;
    ctx.fillRect(0, 380, VIEW_W, VIEW_H - 380);
    // The road: a packed band with wheel ruts and scattered stones.
    ctx.fillStyle = '#c99a4a';
    ctx.fillRect(0, ROAD_TOP, VIEW_W, ROAD_BOTTOM - ROAD_TOP);
    ctx.strokeStyle = 'rgba(90,58,26,0.5)';
    ctx.lineWidth = 3;
    for (const ry of [ROAD_Y - 52, ROAD_Y + 52]) {
      ctx.beginPath();
      for (let x = 0; x <= VIEW_W; x += 26) {
        const wob = Math.sin((x + world.time * 40) * 0.02) * 3;
        if (x === 0) ctx.moveTo(x, ry + wob);
        else ctx.lineTo(x, ry + wob);
      }
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(90,58,26,0.35)';
    for (let i = 0; i < 40; i += 1) {
      const h = ((i * 73856093) ^ 0x9e3779b9) >>> 0;
      const x = (h % 1280) % 1280;
      const y = ROAD_TOP + 12 + (h % (ROAD_BOTTOM - ROAD_TOP - 24));
      ctx.fillRect(x, y, 4, 3);
    }
    void t;
  }

  function drawWagon(x, y, bob, hitFlash, wagon, ballista) {
    // One wagon: wooden bed, canvas hoop, and a load that shows its role —
    // white salt sacks, blue water barrels, or a red guard banner.
    ctx.save();
    ctx.translate(x, y + Math.sin(bob) * 2);
    ctx.fillStyle = '#7c4a21';
    ctx.fillRect(-34, -16, 68, 26);
    ctx.fillStyle = '#5b3413';
    ctx.fillRect(-34, 8, 68, 6);
    ctx.strokeStyle = '#e8dcc3';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, -12, 26, Math.PI, 0);
    ctx.stroke();
    ctx.fillStyle = '#e8dcc3';
    ctx.beginPath();
    ctx.arc(0, -12, 26, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    if (wagon.type === 'salt') {
      ctx.fillStyle = '#f8f4e8';
      ctx.beginPath();
      ctx.ellipse(-14, -14, 12, 8, 0, 0, Math.PI * 2);
      ctx.ellipse(12, -14, 12, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d9cfb2';
      ctx.beginPath();
      ctx.ellipse(-14, -12, 12, 4, 0, 0, Math.PI);
      ctx.ellipse(12, -12, 12, 4, 0, 0, Math.PI);
      ctx.fill();
    } else if (wagon.type === 'water') {
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(-13, -14, 10, 0, Math.PI * 2);
      ctx.arc(13, -14, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7dd3fc';
      ctx.fillRect(-21, -18, 16, 4);
      ctx.fillRect(5, -18, 16, 4);
    } else {
      // Guard wagon: red banner and a rack of spears.
      ctx.fillStyle = '#b91c1c';
      ctx.beginPath();
      ctx.moveTo(-16, -30);
      ctx.lineTo(16, -30);
      ctx.lineTo(16, -8);
      ctx.lineTo(-16, -8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.moveTo(0, -27);
      ctx.lineTo(5, -19);
      ctx.lineTo(0, -11);
      ctx.lineTo(-5, -19);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-24, -10);
      ctx.lineTo(-18, -28);
      ctx.moveTo(24, -10);
      ctx.lineTo(18, -28);
      ctx.stroke();
    }
    if (ballista) {
      // The ballista wagon auto-fires at hazards on its own.
      ctx.strokeStyle = '#3f3f46';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-14, -30);
      ctx.lineTo(14, -30);
      ctx.moveTo(0, -30);
      ctx.lineTo(0, -12);
      ctx.stroke();
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(18, -30);
      ctx.lineTo(26, -26);
      ctx.lineTo(18, -22);
      ctx.closePath();
      ctx.fill();
    }
    // Wheels.
    ctx.fillStyle = '#3d2c17';
    ctx.beginPath();
    ctx.arc(-20, 16, 11, 0, Math.PI * 2);
    ctx.arc(20, 16, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#a0712a';
    ctx.beginPath();
    ctx.arc(-20, 16, 5, 0, Math.PI * 2);
    ctx.arc(20, 16, 5, 0, Math.PI * 2);
    ctx.fill();
    // Wagon health pips.
    bar(-20, -44, 40, 5, wagon.hp / wagon.maxHp, '#86efac', 'rgba(0,0,0,0.5)');
    if (hitFlash > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fillRect(-34, -40, 68, 66);
    }
    ctx.restore();
  }

  function drawOx(x, y, bob) {
    ctx.save();
    ctx.translate(x, y + Math.sin(bob) * 1.5);
    ctx.fillStyle = '#8a5a2b';
    ctx.beginPath();
    ctx.ellipse(0, 0, 26, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6e4520';
    ctx.beginPath();
    ctx.arc(26, -6, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e8dcc3';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(28, -13);
    ctx.quadraticCurveTo(36, -20, 40, -12);
    ctx.moveTo(24, -13);
    ctx.quadraticCurveTo(18, -20, 14, -13);
    ctx.stroke();
    ctx.strokeStyle = '#5b3413';
    ctx.lineWidth = 5;
    const step = Math.sin(bob * 2) * 4;
    ctx.beginPath();
    ctx.moveTo(-16, 10); ctx.lineTo(-16 + step, 26);
    ctx.moveTo(16, 10); ctx.lineTo(16 - step, 26);
    ctx.stroke();
    ctx.restore();
  }

  function drawCaravan(world, t) {
    const c = world.caravan;
    const bob = world.time * 7;
    drawOx(c.x + 150, ROAD_Y - 6, bob);
    drawOx(c.x + 118, ROAD_Y + 22, bob + 1);
    const offsets = [60, -30, -120, -210];
    c.wagons.forEach((wagon, i) => {
      const yOff = i % 2 === 0 ? -8 : 8;
      drawWagon(c.x + offsets[i], ROAD_Y + yOff, bob + i * 2, c.hitFlash, wagon, world.upgrades.ballista && i === 1);
    });
    // Teal banner with a salt diamond on the lead wagon.
    ctx.strokeStyle = '#3d2c17';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(c.x + 60, ROAD_Y - 44);
    ctx.lineTo(c.x + 60, ROAD_Y - 84);
    ctx.stroke();
    ctx.fillStyle = '#0f766e';
    ctx.beginPath();
    ctx.moveTo(c.x + 60, ROAD_Y - 84);
    ctx.lineTo(c.x + 96, ROAD_Y - 76);
    ctx.lineTo(c.x + 60, ROAD_Y - 66);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fef3c7';
    ctx.beginPath();
    ctx.moveTo(c.x + 72, ROAD_Y - 80);
    ctx.lineTo(c.x + 77, ROAD_Y - 75);
    ctx.lineTo(c.x + 72, ROAD_Y - 70);
    ctx.lineTo(c.x + 67, ROAD_Y - 75);
    ctx.closePath();
    ctx.fill();
    // Hull pips above the lead wagon.
    bar(c.x - 40, ROAD_Y - 104, 100, 9, c.hp / c.maxHp, '#14b8a6', 'rgba(0,0,0,0.55)');
    text('CARAVAN', c.x + 10, ROAD_Y - 110, 11, '#ccfbf1', 'center');
    void t;
  }

  function drawWarden(world, t) {
    const w = world.warden;
    if (w.down) {
      ctx.fillStyle = '#f87171';
      text('WARDEN DOWN — UP IN ' + Math.ceil(w.downTimer) + 's', w.x, w.y - 30, 13, '#f87171', 'center');
      return;
    }
    const bob = Math.sin(t * 8) * 2;
    ctx.save();
    ctx.translate(w.x, w.y + bob);
    ctx.fillStyle = w.hitFlash > 0 ? '#fef3c7' : '#0f766e';
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(12, 10);
    ctx.lineTo(-12, 10);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f2b544';
    ctx.fillRect(-12, 8, 24, 3);
    ctx.fillStyle = '#e8b98a';
    ctx.beginPath();
    ctx.arc(0, -22, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7c4a21';
    ctx.beginPath();
    ctx.arc(0, -26, 9, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#f8f4e8';
    ctx.beginPath();
    ctx.arc(10, 2, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    bar(w.x - 18, w.y - 42, 36, 6, w.hp / w.maxHp, '#2dd4bf', 'rgba(0,0,0,0.55)');
  }

  function drawGuards(world) {
    for (const g of world.guards) {
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.arc(0, -6, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(-10, -16, 20, 4);
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(8, -4);
      ctx.lineTo(20, -14);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawHazard(h, t) {
    ctx.save();
    ctx.translate(h.x, h.y);
    if (h.kind === 'rock') {
      ctx.fillStyle = h.hitFlash > 0 ? '#d6d3d1' : '#6b5a44';
      ctx.beginPath();
      ctx.moveTo(-22, 12);
      ctx.lineTo(-14, -18);
      ctx.lineTo(6, -22);
      ctx.lineTo(22, -4);
      ctx.lineTo(16, 14);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.beginPath();
      ctx.moveTo(-14, -18);
      ctx.lineTo(6, -22);
      ctx.lineTo(0, -6);
      ctx.closePath();
      ctx.fill();
      bar(-20, -34, 40, 5, h.hp / h.maxHp, '#a8a29e', 'rgba(0,0,0,0.5)');
    } else if (h.kind === 'gap') {
      if (h.bridged) {
        ctx.fillStyle = '#8a5a2b';
        ctx.fillRect(-36, -8, 72, 16);
        ctx.strokeStyle = '#5b3413';
        ctx.lineWidth = 2;
        for (let i = -24; i <= 24; i += 12) {
          ctx.beginPath();
          ctx.moveTo(i, -8);
          ctx.lineTo(i, 8);
          ctx.stroke();
        }
        ctx.fillStyle = '#86efac';
        text('BRIDGED', 0, -16, 11, '#86efac', 'center');
      } else {
        ctx.fillStyle = '#241708';
        ctx.beginPath();
        ctx.ellipse(0, 0, 36, 16, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#f87171';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.ellipse(0, 0, 40, 20, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        text('GAP — E TO BRIDGE', 0, -28, 11, '#fca5a5', 'center');
      }
    } else if (h.kind === 'mirage') {
      // Only light: a shimmering, see-through rock that harms no one.
      ctx.globalAlpha = 0.55 + Math.sin(t * 6 + h.x) * 0.15;
      ctx.fillStyle = '#e7e5e4';
      ctx.beginPath();
      ctx.moveTo(-22, 12);
      ctx.lineTo(-14, -18);
      ctx.lineTo(6, -22);
      ctx.lineTo(22, -4);
      ctx.lineTo(16, 14);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fef3c7';
      text('? MIRAGE ?', 0, -30, 12, '#fef3c7', 'center');
    } else if (h.kind === 'slide') {
      // Telegraph: a dashed warning zone, rocks about to drop.
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 5]);
      ctx.strokeRect(-46, -26, 92, 52);
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(239,68,68,0.25)';
      ctx.fillRect(-46, -26, 92, 52);
      text('ROCKSLIDE!', 0, -34, 14, '#fca5a5', 'center');
      text(`${Math.max(0, h.timer).toFixed(1)}s`, 0, 44, 13, '#fef3c7', 'center');
    } else if (h.kind === 'storm') {
      // A rolling wall of dust that grinds the caravan as it passes.
      const a = 0.5 + Math.sin(t * 5 + h.x) * 0.1;
      ctx.fillStyle = `rgba(146,64,14,${a})`;
      ctx.beginPath();
      ctx.arc(-30, 0, 52, 0, Math.PI * 2);
      ctx.arc(30, -10, 58, 0, Math.PI * 2);
      ctx.arc(0, 14, 55, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(254,243,199,0.85)';
      ctx.beginPath();
      ctx.arc(-20, -8, 8, 0, Math.PI * 2);
      ctx.arc(24, 6, 6, 0, Math.PI * 2);
      ctx.fill();
      text('DUST STORM', 0, -72, 13, '#fde68a', 'center');
      bar(-44, -66, 88, 6, h.hp / h.maxHp, '#d97706', 'rgba(0,0,0,0.5)');
    } else if (h.kind === 'worm') {
      if (h.mode === 'erupt') {
        // Telegraph: the sand bulges — something is coming up.
        ctx.fillStyle = '#a16207';
        ctx.beginPath();
        ctx.ellipse(0, 4, 26, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f87171';
        text('!', 0, -22, 22, '#f87171', 'center');
        text('SAND-WORM!', 0, -36, 12, '#fca5a5', 'center');
      } else {
        ctx.fillStyle = '#a16207';
        ctx.beginPath();
        ctx.ellipse(0, 8, 30, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#854d0e';
        ctx.beginPath();
        ctx.arc(0, -12, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#451a03';
        ctx.beginPath();
        ctx.arc(0, -10, 9, 0, Math.PI);
        ctx.fill();
        ctx.fillStyle = '#fef3c7';
        ctx.beginPath();
        ctx.arc(-5, -14, 2, 0, Math.PI * 2);
        ctx.arc(5, -14, 2, 0, Math.PI * 2);
        ctx.fill();
        bar(-20, -34, 40, 5, h.hp / h.maxHp, '#f59e0b', 'rgba(0,0,0,0.5)');
      }
    } else if (h.kind === 'tyrant') {
      if (h.mode === 'burrow') {
        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        ctx.ellipse(0, 6, 44, 14, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f87171';
        text('!', 0, -30, 26, '#f87171', 'center');
        text('IT BURROWS — WATCH THE SAND', 0, -48, 12, '#fca5a5', 'center');
      } else {
        const flash = h.hitFlash > 0;
        ctx.fillStyle = flash ? '#fef3c7' : '#78350f';
        ctx.beginPath();
        ctx.ellipse(0, 10, 46, 18, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(-18, -18, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#451a03';
        ctx.beginPath();
        ctx.arc(-18, -12, 14, 0, Math.PI);
        ctx.fill();
        ctx.fillStyle = '#fef3c7';
        for (let i = -2; i <= 2; i += 1) {
          ctx.beginPath();
          ctx.moveTo(-18 + i * 6 - 3, -12);
          ctx.lineTo(-18 + i * 6, -2);
          ctx.lineTo(-18 + i * 6 + 3, -12);
          ctx.closePath();
          ctx.fill();
        }
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(-28, -26, 4, 0, Math.PI * 2);
        ctx.arc(-8, -26, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fca5a5';
        text('SAND TYRANT', 0, -58, 14, '#fca5a5', 'center');
        bar(-44, -52, 88, 7, h.hp / h.maxHp, '#ea580c', 'rgba(0,0,0,0.6)');
      }
    } else if (h.kind === 'raider') {
      const flash = h.hitFlash > 0;
      ctx.fillStyle = flash ? '#fef3c7' : '#2b2118';
      ctx.beginPath();
      ctx.moveTo(0, -20);
      ctx.lineTo(13, 12);
      ctx.lineTo(-13, 12);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(-13, 4, 26, 5);
      ctx.fillStyle = '#e8b98a';
      ctx.beginPath();
      ctx.arc(0, -24, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2b2118';
      ctx.beginPath();
      ctx.arc(0, -27, 9, Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(12, -18 + Math.sin(t * 6 + h.x) * 3);
      ctx.lineTo(22, -34);
      ctx.stroke();
      bar(-18, -40, 36, 5, h.hp / h.maxHp, '#ef4444', 'rgba(0,0,0,0.5)');
    } else if (h.kind === 'wisp') {
      const a = 0.55 + Math.sin(t * 9 + h.x) * 0.2;
      ctx.fillStyle = `rgba(201,143,46,${a})`;
      ctx.beginPath();
      ctx.arc(0, 0, 14 + Math.sin(t * 12) * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(254,243,199,0.9)';
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      bar(-14, -28, 28, 4, h.hp / h.maxHp, '#fbbf24', 'rgba(0,0,0,0.5)');
    } else if (h.kind === 'chief') {
      const flash = h.hitFlash > 0;
      ctx.fillStyle = flash ? '#fef3c7' : '#4a1420';
      ctx.beginPath();
      ctx.moveTo(0, -52);
      ctx.lineTo(34, 26);
      ctx.lineTo(-34, 26);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(-34, 14, 68, 7);
      ctx.fillStyle = '#e8b98a';
      ctx.beginPath();
      ctx.arc(0, -58, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2b2118';
      ctx.beginPath();
      ctx.arc(0, -64, 17, Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = '#f8f4e8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-14, -70);
      ctx.quadraticCurveTo(-30, -86, -34, -70);
      ctx.moveTo(14, -70);
      ctx.quadraticCurveTo(30, -86, 34, -70);
      ctx.stroke();
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(30, -40);
      ctx.lineTo(48, -78);
      ctx.stroke();
      ctx.fillStyle = '#dc2626';
      text('RAIDER CHIEF', 0, -92, 14, '#fca5a5', 'center');
      bar(-44, -86, 88, 7, h.hp / h.maxHp, '#dc2626', 'rgba(0,0,0,0.6)');
    }
    ctx.restore();
  }

  function drawShots(world) {
    for (const s of world.shots) {
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.arc(s.x, s.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(s.x, s.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const sp of world.spears) {
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(sp.x, sp.y);
      ctx.lineTo(sp.x - sp.vx * 0.04, sp.y - sp.vy * 0.04);
      ctx.stroke();
    }
    if (world.cannonFlash > 0) {
      ctx.fillStyle = `rgba(251,191,36,${world.cannonFlash * 1.6})`;
      ctx.beginPath();
      ctx.arc(world.caravan.x + 190, ROAD_Y, CANNON_RADIUS + 30, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawPickups(world, t) {
    for (const p of world.pickups) {
      const bob = Math.sin(t * 5 + p.x) * 2;
      if (p.kind === 'salt') {
        ctx.fillStyle = '#f8f4e8';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + bob, 11, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f766e';
        text('SALT', p.x, p.y + bob - 12, 10, '#fef3c7', 'center');
      } else {
        ctx.fillStyle = '#92400e';
        ctx.fillRect(p.x - 10, p.y + bob - 7, 20, 14);
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(p.x - 10, p.y + bob - 7, 20, 3);
        ctx.fillStyle = '#fef3c7';
        text('FOOD', p.x, p.y + bob - 12, 10, '#fef3c7', 'center');
      }
    }
  }

  function drawParticles(world) {
    for (const pt of world.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
    }
    ctx.globalAlpha = 1;
  }

  function drawFloats(world) {
    for (const f of world.floats) {
      ctx.globalAlpha = Math.max(0, Math.min(1, f.life / f.maxLife));
      outlined(f.text, f.x, f.y, 15, f.color, 'center');
    }
    ctx.globalAlpha = 1;
  }

  function drawWeather(world, t) {
    if (world.weather === 'heat') {
      ctx.fillStyle = 'rgba(249,115,22,0.07)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.strokeStyle = 'rgba(251,191,36,0.25)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i += 1) {
        const y = 420 + i * 46 + Math.sin(t * 2 + i) * 6;
        ctx.beginPath();
        for (let x = 0; x <= VIEW_W; x += 40) {
          const yy = y + Math.sin(x * 0.02 + t * 3 + i) * 5;
          if (x === 0) ctx.moveTo(x, yy);
          else ctx.lineTo(x, yy);
        }
        ctx.stroke();
      }
    } else if (world.weather === 'storm') {
      ctx.fillStyle = 'rgba(146,64,14,0.14)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.fillStyle = 'rgba(217,119,6,0.35)';
      for (let i = 0; i < 24; i += 1) {
        const h = ((i * 73856093) ^ 0x9e3779b9) >>> 0;
        const x = (h % 1400 - 60 - t * 260) % 1400;
        const xx = x < -60 ? x + 1400 : x;
        const y = 200 + (h % 460);
        ctx.fillRect(xx, y, 26 + (h % 30), 3);
      }
    } else if (world.weather === 'rain') {
      ctx.fillStyle = 'rgba(56,189,248,0.06)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.strokeStyle = 'rgba(125,211,252,0.5)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 30; i += 1) {
        const h = ((i * 19349663) ^ 0x85ebca6b) >>> 0;
        const x = (h % 1280 + t * 40) % 1280;
        const y = (h % 720 + t * 420) % 720;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 4, y + 16);
        ctx.stroke();
      }
    }
  }

  function drawRouteStrip(world) {
    const x0 = 400;
    const x1 = 880;
    const y = 34;
    ctx.strokeStyle = 'rgba(242,181,68,0.7)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
    ctx.stroke();
    for (let i = 0; i <= LEGS; i += 1) {
      const x = x0 + ((x1 - x0) * i) / LEGS;
      const done = i < world.leg || (i === world.leg && world.distance >= world.legLength);
      ctx.fillStyle = done ? '#fbbf24' : '#57534e';
      ctx.beginPath();
      ctx.arc(x, y, i === 0 ? 5 : 7, 0, Math.PI * 2);
      ctx.fill();
      if (i > 0 && i <= LEGS) text(`L${i}`, x, y + 22, 10, '#fde68a', 'center');
    }
    const px = x0 + (x1 - x0) * routeProgress(world);
    ctx.fillStyle = '#fef3c7';
    ctx.beginPath();
    ctx.moveTo(px, y - 12);
    ctx.lineTo(px + 8, y - 2);
    ctx.lineTo(px - 8, y - 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#0f766e';
    ctx.beginPath();
    ctx.arc(px, y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(x1 + 8, y - 12, 12, 24);
    ctx.beginPath();
    ctx.moveTo(x1 + 8, y - 12);
    ctx.lineTo(x1 + 14, y - 20);
    ctx.lineTo(x1 + 20, y - 12);
    ctx.closePath();
    ctx.fill();
    text('THE FAR CITY', x1 + 14, y - 26, 10, '#fde68a', 'center');
  }

  function drawHud(world) {
    // Top bar.
    panel(0, 0, VIEW_W, 92, 'rgba(12,26,28,0.88)');
    text(`LEG ${world.leg}/${LEGS}`, 16, 30, 22, '#fde68a');
    text(`${metresToCity(world)}m TO THE CITY`, 16, 54, 14, '#fef3c7');
    const routeName = world.route ? world.route.name : 'THE OPEN ROAD';
    text(`${routeName}  •  ${WEATHERS[world.weather].name}`, 16, 76, 12, '#a7f3d0');
    drawRouteStrip(world);
    text(`SCORE ${Math.floor(world.score).toLocaleString('en-US')}`, 1264, 30, 20, '#fef3c7', 'right');
    text(`BEST ${Math.floor(world.best).toLocaleString('en-US')}`, 1264, 54, 13, '#a7f3d0', 'right');
    text(`KILLS ${world.kills}`, 1264, 76, 12, '#fde68a', 'right');

    // Resource row.
    panel(16, 100, 680, 52, 'rgba(12,26,28,0.72)');
    text('CARAVAN', 28, 120, 12, '#ccfbf1');
    bar(28, 126, 130, 10, world.caravan.hp / world.caravan.maxHp, '#14b8a6', 'rgba(0,0,0,0.55)');
    text(`${Math.ceil(world.caravan.hp)}/${world.caravan.maxHp}`, 164, 135, 12, '#fef3c7');
    text(`SUPPLIES ${Math.floor(world.supplies)}`, 250, 120, 13, '#86efac');
    text(`SALT ${world.salt}`, 250, 140, 13, '#fef3c7');
    text(`WATER ${Math.floor(world.water)}`, 380, 120, 13, '#38bdf8');
    text(`WARDEN ${Math.ceil(world.warden.hp)}`, 380, 140, 13, '#2dd4bf');
    text(`CHAIN x${Math.min(9, world.chain)}`, 510, 120, 13, '#fbbf24');
    text(world.streak >= 2 ? `STREAK x${world.streak}` : 'STREAK —', 510, 140, 13, '#38bdf8');

    // Incoming roster, right side.
    const roster = incomingRoster(world);
    panel(712, 100, 552, 52, 'rgba(12,26,28,0.72)');
    text('INCOMING', 724, 120, 12, '#fca5a5');
    text(roster || 'ROAD CLEAR', 724, 140, 11, '#fef3c7');

    // Wagons + crew row.
    panel(16, 158, 680, 34, 'rgba(12,26,28,0.72)');
    const wagonText = world.caravan.wagons.map((wgn, i) => `${i === 0 ? '▶' : ''}${wgn.type.toUpperCase()} ${Math.ceil(wgn.hp)}`).join('  •  ');
    text(`WAGONS: ${wagonText || 'NONE LEFT!'}`, 28, 181, 12, '#fef3c7');
    const crew = [];
    if (world.companions.scout) crew.push('SCOUT');
    if (world.companions.healer) crew.push('HEALER');
    if (world.companions.captain) crew.push('CAPTAIN');
    text(`CREW: ${crew.length ? crew.join(' • ') : '—'}   •   R rotate wagons`, 680, 181, 12, '#a7f3d0', 'right');

    // Banner.
    if (world.bannerTimer > 0) {
      ctx.globalAlpha = Math.min(1, world.bannerTimer);
      outlined(world.banner, VIEW_W / 2, 240, 26, '#fde68a', 'center');
      ctx.globalAlpha = 1;
    }

    // Bottom bar: keys + win/lose lines.
    panel(0, VIEW_H - 52, VIEW_W, 52, 'rgba(12,26,28,0.88)');
    text('CLICK salt-shot   •   SPACE salt cannon (6 salt)   •   E bridge gap (4 supplies)   •   Q horn — guards charge   •   R rotate wagons', 16, VIEW_H - 30, 14, '#fef3c7');
    text('WIN: reach the far city on leg 7 and beat the Raider Chief   •   LOSE: caravan broken or supplies gone', 16, VIEW_H - 10, 12, '#a7f3d0');
    text('P pause   •   M mute   •   WASD move', 1264, VIEW_H - 30, 12, '#fde68a', 'right');
    text(`CANNON ${world.cannonCooldown > 0 ? Math.ceil(world.cannonCooldown) + 's' : 'READY'}   HORN ${world.hornCooldown > 0 ? Math.ceil(world.hornCooldown) + 's' : 'READY'}`, 1264, VIEW_H - 10, 12, '#fef3c7', 'right');
  }

  function drawTitle(world) {
    drawSky(world, world.time);
    drawGround(world, world.time);
    const parked = { ...world, caravan: { ...world.caravan, x: 640, y: ROAD_Y }, time: 0.6 };
    drawCaravan(parked, 0.6);
    ctx.fillStyle = 'rgba(12,26,28,0.45)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    outlined('SALTROAD', VIEW_W / 2, 138, 84, '#fde68a', 'center');
    outlined('Guide the salt caravan to the far city — 7 legs across the desert at dawn', VIEW_W / 2, 180, 20, '#fef3c7', 'center');
    panel(290, 214, 700, 236, 'rgba(12,26,28,0.88)');
    text('THE ROAD IS THE GAME — no fixed base, no waves to survive.', 640, 244, 16, '#fbbf24', 'center');
    text('The caravan rolls on its own. Clear the road ahead of it:', 640, 270, 15, '#fef3c7', 'center');
    text('CLICK — salt-shot at rocks, raiders, worms   SPACE — salt cannon (6 salt)', 640, 296, 15, '#fef3c7', 'center');
    text('E — bridge a gap (4 supplies)    Q — horn: guards charge    R — rotate wagons', 640, 320, 15, '#fef3c7', 'center');
    text('Wagons have their own health — the front wagon takes the hits.', 640, 346, 15, '#fef3c7', 'center');
    text('At each post: draft 1 of 3 upgrades, choose your road, trade salt', 640, 372, 15, '#fef3c7', 'center');
    text('for water, guards, repairs and companions. Weather changes every leg.', 640, 396, 15, '#fef3c7', 'center');
    text('WIN: reach the far city on leg 7 and beat the Raider Chief', 640, 424, 15, '#a7f3d0', 'center');
    text('LOSE: the caravan is broken, or its supplies run out', 640, 444, 15, '#fca5a5', 'center');
    outlined('PRESS ENTER OR CLICK TO BEGIN THE JOURNEY', VIEW_W / 2, 500, 22, '#fef3c7', 'center');
    if (world.best > 0) text(`BEST SCORE ${Math.floor(world.best).toLocaleString('en-US')}`, VIEW_W / 2, 534, 15, '#a7f3d0', 'center');
    text('7 legs  •  Sand Tyrant on leg 4  •  salt is cargo and currency  •  clear-streaks pay more', VIEW_W / 2, 566, 14, '#fde68a', 'center');
    text('A complete original game — Canvas 2D, procedural art, synthesized sound, seeded RNG', VIEW_W / 2, 690, 12, '#a7f3d0', 'center');
  }

  function drawUpgrade(world) {
    drawSky(world, world.time);
    drawGround(world, world.time);
    ctx.fillStyle = 'rgba(12,26,28,0.55)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    outlined(`OUTFITTER'S CAMP — LEG ${world.leg} DONE`, VIEW_W / 2, 118, 34, '#fde68a', 'center');
    text(`SCORE ${Math.floor(world.score).toLocaleString('en-US')}   •   SALT ${world.salt}   •   SUPPLIES ${Math.floor(world.supplies)}   •   WATER ${Math.floor(world.water)}   •   CARAVAN ${Math.ceil(world.caravan.hp)}/${world.caravan.maxHp}`, VIEW_W / 2, 152, 15, '#a7f3d0', 'center');
    text(`NEXT: LEG ${world.leg + 1} OF ${LEGS} — ${world.leg + 1 === LEGS ? 'THE FAR CITY AND THE RAIDER CHIEF' : world.leg + 1 === 4 ? 'THE SAND TYRANT WAITS' : 'FURTHER DOWN THE ROAD'}`, VIEW_W / 2, 182, 15, '#fbbf24', 'center');
    if (world.campPhase === 'upgrade') {
      outlined('DRAFT ONE UPGRADE — click a card or press 1, 2 or 3.', VIEW_W / 2, 226, 17, '#fef3c7', 'center');
      world.upgradeOptions.forEach((up, i) => {
        const r = cardRect(i);
        panel(r.x, r.y, r.w, r.h, 'rgba(20,42,44,0.95)');
        ctx.strokeStyle = '#f2b544';
        ctx.lineWidth = 2;
        ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
        text(`[${i + 1}]`, r.x + 20, r.y + 34, 15, '#fbbf24');
        text(up.name, r.x + 20, r.y + 66, 19, '#fef3c7');
        const words = up.line.split(' ');
        let line = '';
        let ly = r.y + 100;
        for (const word of words) {
          if ((line + ' ' + word).trim().length > 22) {
            text(line.trim(), r.x + 20, ly, 14, '#a7f3d0');
            ly += 22;
            line = word;
          } else line += ' ' + word;
        }
        text(line.trim(), r.x + 20, ly, 14, '#a7f3d0');
        text('CLICK OR PRESS ' + (i + 1), r.x + 20, r.y + r.h - 18, 12, '#fde68a');
      });
      text('Then choose your road — and trade salt at the post below.', VIEW_W / 2, 484, 14, '#fde68a', 'center');
    } else {
      outlined('CHOOSE YOUR ROAD — click a card or press 1, 2 or 3.', VIEW_W / 2, 226, 17, '#fef3c7', 'center');
      ROUTES.forEach((route, i) => {
        const r = cardRect(i);
        panel(r.x, r.y, r.w, r.h, 'rgba(20,42,44,0.95)');
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
        text(`[${i + 1}]`, r.x + 20, r.y + 34, 15, '#38bdf8');
        text(route.name, r.x + 20, r.y + 66, 19, '#fef3c7');
        const words = route.line.split(' ');
        let line = '';
        let ly = r.y + 100;
        for (const word of words) {
          if ((line + ' ' + word).trim().length > 22) {
            text(line.trim(), r.x + 20, ly, 14, '#a7f3d0');
            ly += 22;
            line = word;
          } else line += ' ' + word;
        }
        text(line.trim(), r.x + 20, ly, 14, '#a7f3d0');
        text('CLICK OR PRESS ' + (i + 1), r.x + 20, r.y + r.h - 18, 12, '#fde68a');
      });
      text('The road you pick shapes the next leg — short and dangerous, or long and safe.', VIEW_W / 2, 484, 14, '#fde68a', 'center');
    }
    // Trading post row (available in both phases).
    text('TRADING POST — salt is currency  (keys 7 / 8 / 9 / 0, or click)', VIEW_W / 2, 508, 14, '#fbbf24', 'center');
    TRADES.forEach((trade, i) => {
      const r = tradeRect(i);
      const owned = (trade.id === 'scout' && world.companions.scout)
        || (trade.id === 'healer' && world.companions.healer)
        || (trade.id === 'captain' && world.companions.captain)
        || (trade.id === 'guard' && world.guards.length >= 4)
        || (trade.id === 'wagon' && world.caravan.wagons.length >= 4);
      const afford = world.salt >= trade.cost;
      panel(r.x, r.y, r.w, r.h, owned ? 'rgba(40,60,40,0.9)' : 'rgba(20,42,44,0.95)');
      text(trade.name, r.x + 10, r.y + 22, 13, owned ? '#86efac' : '#fef3c7');
      text(`${trade.cost} SALT${trade.key ? '  [' + trade.key + ']' : ''}`, r.x + 10, r.y + 42, 12, afford ? '#fbbf24' : '#f87171');
      text(owned ? 'HIRED' : trade.line, r.x + 10, r.y + 60, 11, '#a7f3d0');
    });
    const crew = [];
    if (world.companions.scout) crew.push('SCOUT');
    if (world.companions.healer) crew.push('HEALER');
    if (world.companions.captain) crew.push('CAPTAIN');
    text(`CREW: ${crew.length ? crew.join(' • ') : '—'}      GUARDS: ${world.guards.length}      WAGONS: ${world.caravan.wagons.map((wgn) => wgn.type.toUpperCase()).join(' • ') || 'NONE'}`, VIEW_W / 2, 628, 13, '#a7f3d0', 'center');
  }

  function drawEnd(world, won) {
    drawSky(world, world.time);
    drawGround(world, world.time);
    ctx.fillStyle = won ? 'rgba(15,60,55,0.55)' : 'rgba(40,16,16,0.6)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const r = world.result || { score: world.score, kills: world.kills, legs: world.legsDone, salt: world.saltEarned, best: world.best, streak: world.bestStreak };
    if (won) {
      outlined('THE FAR CITY!', VIEW_W / 2, 150, 64, '#fde68a', 'center');
      outlined('The salt is sold, the road is done — the caravan made it.', VIEW_W / 2, 196, 20, '#fef3c7', 'center');
      outlined('YOU WIN', VIEW_W / 2, 240, 30, '#86efac', 'center');
    } else {
      outlined('THE ROAD ENDS', VIEW_W / 2, 150, 64, '#fca5a5', 'center');
      outlined(world.loseReason || 'THE CARAVAN FELL', VIEW_W / 2, 196, 20, '#fef3c7', 'center');
      outlined('YOU LOSE', VIEW_W / 2, 240, 30, '#f87171', 'center');
    }
    panel(390, 280, 500, 210, 'rgba(12,26,28,0.9)');
    text(`FINAL SCORE  ${Math.floor(r.score).toLocaleString('en-US')}`, 640, 322, 22, '#fef3c7', 'center');
    text(`BEST  ${Math.floor(r.best).toLocaleString('en-US')}`, 640, 352, 16, '#a7f3d0', 'center');
    text(`LEGS COMPLETED  ${r.legs} / ${LEGS}      RAIDERS BEATEN  ${r.kills}`, 640, 384, 15, '#fef3c7', 'center');
    text(`SALT EARNED  ${r.salt}      BEST CLEAR-STREAK  x${r.streak || 0}`, 640, 412, 15, '#fef3c7', 'center');
    text(won ? 'The chief is beaten and the city gates stand open.' : 'The desert keeps what the road could not carry.', 640, 448, 14, '#fde68a', 'center');
    outlined('PRESS ENTER OR CLICK TO RIDE AGAIN', VIEW_W / 2, 540, 22, '#fef3c7', 'center');
  }

  function draw(world, screen) {
    const t = world.time;
    if (screen === 'title') {
      drawTitle(world);
      return;
    }
    if (screen === 'upgrade') {
      drawUpgrade(world);
      return;
    }
    if (screen === 'win') {
      drawEnd(world, true);
      return;
    }
    if (screen === 'lose') {
      drawEnd(world, false);
      return;
    }
    drawSky(world, t);
    drawGround(world, t);
    drawWeather(world, t);
    drawPickups(world, t);
    for (const h of world.hazards) drawHazard(h, t);
    drawCaravan(world, t);
    drawGuards(world);
    drawWarden(world, t);
    drawShots(world);
    drawParticles(world);
    drawFloats(world);
    drawHud(world);
    if (world.paused) {
      ctx.fillStyle = 'rgba(12,26,28,0.6)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      outlined('PAUSED — PRESS P TO RIDE ON', VIEW_W / 2, VIEW_H / 2, 30, '#fef3c7', 'center');
    }
  }

  return { draw, fit };
}
