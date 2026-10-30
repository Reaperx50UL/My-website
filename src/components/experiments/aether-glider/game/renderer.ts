import {
  EnvironmentProfile,
  getBirdProfile,
  getEnvironmentProfile,
} from './config';
import { ObstaclePair, SimulationState } from './types';

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Helper to draw a detailed mechanical cogwheel with teeth and spokes
 */
function drawGearWheel(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  teeth: number,
  angle: number,
  fill: string,
  stroke: string
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.6;

  // Gear teeth
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2;
    ctx.save();
    ctx.rotate(a);
    ctx.fillRect(-outerR * 0.14, -outerR - 4, outerR * 0.28, 6);
    ctx.strokeRect(-outerR * 0.14, -outerR - 4, outerR * 0.28, 6);
    ctx.restore();
  }

  // Outer wheel rim
  ctx.beginPath();
  ctx.arc(0, 0, outerR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Inner cutout + cross spokes
  ctx.fillStyle = stroke;
  ctx.beginPath();
  ctx.arc(0, 0, innerR, 0, Math.PI * 2);
  ctx.stroke();

  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * outerR, Math.sin(a) * outerR);
    ctx.stroke();
  }

  // Center axle hub
  ctx.fillStyle = '#FEF3C7';
  ctx.beginPath();
  ctx.arc(0, 0, Math.max(2.5, innerR * 0.45), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 *Helper to draw a bamboo leaf cluster at a stalk joint
 */
function drawBambooLeafSprig(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dir: 1 | -1,
  sway: number,
  color: string
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(dir * 0.35 + sway);
  ctx.fillStyle = color;

  // 3 slender pointed bamboo leaves
  const angles = [-0.28, 0.05, 0.38];
  const lengths = [22, 26, 18];
  for (let i = 0; i < 3; i++) {
    ctx.save();
    ctx.rotate(angles[i] * dir);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(dir * lengths[i] * 0.5, -4, dir * lengths[i], 2);
    ctx.quadraticCurveTo(dir * lengths[i] * 0.45, 5, 0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function drawSkyAndParallax(
  ctx: CanvasRenderingContext2D,
  env: EnvironmentProfile,
  w: number,
  h: number,
  groundH: number,
  distance: number,
  timeSec: number,
  reducedMotion: boolean
): void {
  const horizonY = h - groundH;

  // 1. Base Sky Gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
  skyGrad.addColorStop(0, env.colors.skyTop);
  skyGrad.addColorStop(0.38, env.colors.skyMid);
  skyGrad.addColorStop(0.75, env.colors.skyLow);
  skyGrad.addColorStop(1, env.colors.skyHorizon);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, horizonY);

  // 2. Environment-Specific Background Scenery
  if (env.id === 'clockwork') {
    // Astrolabe Sun + Giant Rotating Sky Cogs
    const sunX = w * 0.72;
    const sunY = horizonY * 0.46;
    const sunGlow = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 180);
    sunGlow.addColorStop(0, env.colors.celestialGlow);
    sunGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = sunGlow;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 180, 0, Math.PI * 2);
    ctx.fill();

    // Giant background interlocking clockwork gears in the sky
    const rot = reducedMotion ? 0.2 : timeSec * 0.22;
    drawGearWheel(
      ctx,
      sunX,
      sunY,
      68,
      42,
      16,
      rot,
      'rgba(217, 119, 6, 0.22)',
      'rgba(253, 230, 138, 0.35)'
    );
    drawGearWheel(
      ctx,
      sunX - 88,
      sunY + 46,
      38,
      20,
      10,
      -rot * 1.6,
      'rgba(180, 83, 9, 0.24)',
      'rgba(251, 191, 36, 0.32)'
    );
    drawGearWheel(
      ctx,
      sunX + 82,
      sunY - 42,
      32,
      16,
      8,
      -rot * 2.0,
      'rgba(180, 83, 9, 0.24)',
      'rgba(251, 191, 36, 0.32)'
    );

    // Clockwork Citadel Towers with Illuminated Clock Faces
    const farScroll = reducedMotion ? 0 : (distance * 0.14) % 320;
    for (let x = -farScroll; x < w + 320; x += 160) {
      // Clock tower silhouette
      ctx.fillStyle = '#241834';
      ctx.fillRect(x + 20, horizonY - 155, 52, 155);
      // Pointed brass spire roof
      ctx.beginPath();
      ctx.moveTo(x + 14, horizonY - 155);
      ctx.lineTo(x + 46, horizonY - 205);
      ctx.lineTo(x + 78, horizonY - 155);
      ctx.closePath();
      ctx.fill();

      // Glowing Clock Face on Tower
      const cx = x + 46;
      const cy = horizonY - 122;
      ctx.fillStyle = 'rgba(254, 243, 199, 0.85)';
      ctx.beginPath();
      ctx.arc(cx, cy, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#92400E';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Clock hands
      ctx.strokeStyle = '#1E1310';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(rot * 2) * 10, cy + Math.sin(rot * 2) * 10);
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(rot * 0.4) * 7, cy + Math.sin(rot * 0.4) * 7);
      ctx.stroke();

      // Secondary gear workshop silhouette + giant background wheel
      drawGearWheel(
        ctx,
        x + 118,
        horizonY - 62,
        34,
        18,
        12,
        rot + x * 0.01,
        '#2E1F42',
        '#B45309'
      );
      ctx.fillStyle = '#1D142B';
      ctx.fillRect(x + 86, horizonY - 65, 64, 65);
    }
  } else if (env.id === 'bamboo') {
    // Misty Jade Moon + Sunbeams filtering through a dense multi-layered Bamboo Forest
    const moonX = w * 0.75;
    const moonY = horizonY * 0.36;
    const moonGlow = ctx.createRadialGradient(moonX, moonY, 8, moonX, moonY, 160);
    moonGlow.addColorStop(0, 'rgba(167, 243, 208, 0.42)');
    moonGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = moonGlow;
    ctx.beginPath();
    ctx.arc(moonX, moonY, 160, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ECFDF5';
    ctx.beginPath();
    ctx.arc(moonX, moonY, 34, 0, Math.PI * 2);
    ctx.fill();

    // Diagonal emerald light rays filtering through the bamboo canopy
    ctx.save();
    ctx.fillStyle = 'rgba(167, 243, 208, 0.05)';
    for (let rx = 60; rx < w; rx += 220) {
      ctx.beginPath();
      ctx.moveTo(rx, 0);
      ctx.lineTo(rx + 70, 0);
      ctx.lineTo(rx - 50, horizonY);
      ctx.lineTo(rx - 120, horizonY);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Far-layer dense bamboo grove silhouettes
    const farBambooScroll = reducedMotion ? 0 : (distance * 0.12) % 240;
    for (let x = -farBambooScroll; x < w + 240; x += 48) {
      const stalkX = x + ((x * 13) % 17);
      ctx.fillStyle = '#0A2E23';
      ctx.fillRect(stalkX, 20, 8, horizonY - 20);
      // Far bamboo nodes
      ctx.fillStyle = '#134E3A';
      for (let ny = 60; ny < horizonY; ny += 64) {
        ctx.fillRect(stalkX - 1.5, ny, 11, 3);
      }
    }

    // Mid-layer vibrant bamboo forest stalks with swaying foliage
    const midBambooScroll = reducedMotion ? 0 : (distance * 0.24) % 300;
    const sway = reducedMotion ? 0 : Math.sin(timeSec * 1.8) * 0.08;
    for (let x = -midBambooScroll; x < w + 300; x += 75) {
      const stalkX = x + 18;
      ctx.fillStyle = '#144936';
      ctx.fillRect(stalkX, 0, 12, horizonY);
      ctx.fillStyle = '#1F6E50';
      ctx.fillRect(stalkX + 2, 0, 4, horizonY);

      // Nodes & leaf sprigs on background bamboo stalks
      for (let ny = 75; ny < horizonY - 40; ny += 72) {
        ctx.fillStyle = '#34D399';
        ctx.fillRect(stalkX - 2, ny, 16, 3.5);
        drawBambooLeafSprig(
          ctx,
          stalkX + (ny % 144 === 0 ? 12 : 0),
          ny,
          ny % 144 === 0 ? 1 : -1,
          sway,
          '#1F6E50'
        );
      }
    }
  } else if (env.id === 'volcano') {
    // Erupting Volcanoes in Background with Smoke Plumes, Lava Fountains & Flowing Magma Rivers
    const farScroll = reducedMotion ? 0 : (distance * 0.14) % 420;
    for (let x = -farScroll; x < w + 420; x += 210) {
      const peakX = x + 105;
      const peakY = horizonY - 165;

      // Erupting Ash & Smoke Plume rising from the volcano crater
      const plumePulse = reducedMotion ? 0 : Math.sin(timeSec * 2.4 + x) * 6;
      ctx.fillStyle = 'rgba(45, 20, 24, 0.72)';
      ctx.beginPath();
      ctx.arc(peakX - 10, peakY - 28 + plumePulse, 28, 0, Math.PI * 2);
      ctx.arc(peakX + 18, peakY - 52 - plumePulse, 38, 0, Math.PI * 2);
      ctx.arc(peakX - 22, peakY - 78, 44, 0, Math.PI * 2);
      ctx.arc(peakX + 28, peakY - 96, 50, 0, Math.PI * 2);
      ctx.fill();

      // Glowing Eruption Fireball / Lava Fountain at Crater Mouth
      const eruptGrad = ctx.createRadialGradient(
        peakX,
        peakY,
        4,
        peakX,
        peakY - 20,
        65
      );
      eruptGrad.addColorStop(0, '#FEF08A');
      eruptGrad.addColorStop(0.45, 'rgba(249, 115, 22, 0.85)');
      eruptGrad.addColorStop(1, 'rgba(220, 38, 38, 0)');
      ctx.fillStyle = eruptGrad;
      ctx.beginPath();
      ctx.arc(peakX, peakY - 10, 65, 0, Math.PI * 2);
      ctx.fill();

      // Fountaining Lava Arcs shooting out of the volcano crater
      ctx.strokeStyle = '#FDE047';
      ctx.lineWidth = 2.5;
      for (let side = -1; side <= 1; side += 2) {
        ctx.beginPath();
        ctx.moveTo(peakX, peakY + 4);
        ctx.quadraticCurveTo(
          peakX + side * 26,
          peakY - 48 - plumePulse * side,
          peakX + side * 48,
          peakY - 8
        );
        ctx.stroke();
      }

      // Massive Volcanic Cone Silhouette
      const coneGrad = ctx.createLinearGradient(peakX, peakY, peakX, horizonY);
      coneGrad.addColorStop(0, '#451215');
      coneGrad.addColorStop(0.5, '#2A0C10');
      coneGrad.addColorStop(1, '#180709');
      ctx.fillStyle = coneGrad;
      ctx.beginPath();
      ctx.moveTo(x - 15, horizonY);
      ctx.lineTo(peakX - 38, peakY + 12);
      ctx.lineTo(peakX - 22, peakY);
      ctx.lineTo(peakX + 22, peakY);
      ctx.lineTo(peakX + 38, peakY + 12);
      ctx.lineTo(x + 225, horizonY);
      ctx.closePath();
      ctx.fill();

      // Glowing Crater Rim + Flowing Molten Lava Rivers down the Volcano Slopes
      ctx.fillStyle = '#F97316';
      ctx.beginPath();
      ctx.ellipse(peakX, peakY + 2, 22, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#FB923C';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(peakX - 8, peakY + 4);
      ctx.quadraticCurveTo(peakX - 25, horizonY - 85, peakX - 52, horizonY);
      ctx.moveTo(peakX + 10, peakY + 4);
      ctx.quadraticCurveTo(peakX + 28, horizonY - 95, peakX + 44, horizonY);
      ctx.stroke();

      ctx.strokeStyle = '#FEF08A';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(peakX - 8, peakY + 4);
      ctx.quadraticCurveTo(peakX - 25, horizonY - 85, peakX - 52, horizonY);
      ctx.stroke();
    }
  } else if (env.id === 'ice') {
    // Shimmering Aurora + Towering Snow-Capped Ice Mountains
    ctx.save();
    const auroraGrad = ctx.createLinearGradient(0, 20, w, 150);
    auroraGrad.addColorStop(0, 'rgba(52, 211, 153, 0)');
    auroraGrad.addColorStop(0.3, 'rgba(52, 211, 153, 0.25)');
    auroraGrad.addColorStop(0.65, 'rgba(56, 189, 248, 0.28)');
    auroraGrad.addColorStop(1, 'rgba(168, 85, 247, 0)');
    ctx.strokeStyle = auroraGrad;
    ctx.lineWidth = 28;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let ax = 0; ax <= w; ax += 40) {
      const ay =
        85 + Math.sin(ax * 0.012 + (reducedMotion ? 0 : timeSec * 0.8)) * 20;
      if (ax === 0) ctx.moveTo(ax, ay);
      else ctx.lineTo(ax, ay);
    }
    ctx.stroke();
    ctx.restore();

    // Towering Jagged Ice Mountains with sunlit glacial faces & snow caps
    const farScroll = reducedMotion ? 0 : (distance * 0.14) % 360;
    for (let x = -farScroll; x < w + 360; x += 180) {
      const mPeakX = x + 90;
      const mPeakY = horizonY - 185;

      // Left sunlit glacial face
      ctx.fillStyle = '#38BDF8';
      ctx.beginPath();
      ctx.moveTo(x - 10, horizonY);
      ctx.lineTo(mPeakX, mPeakY);
      ctx.lineTo(mPeakX + 12, horizonY);
      ctx.closePath();
      ctx.fill();

      // Right shadowed glacial face
      ctx.fillStyle = '#0369A1';
      ctx.beginPath();
      ctx.moveTo(mPeakX, mPeakY);
      ctx.lineTo(x + 195, horizonY);
      ctx.lineTo(mPeakX + 12, horizonY);
      ctx.closePath();
      ctx.fill();

      // Bright White Snow Cap on Mountain Peak
      ctx.fillStyle = '#F0F9FF';
      ctx.beginPath();
      ctx.moveTo(mPeakX, mPeakY);
      ctx.lineTo(mPeakX - 36, mPeakY + 68);
      ctx.lineTo(mPeakX - 12, mPeakY + 52);
      ctx.lineTo(mPeakX + 8, mPeakY + 72);
      ctx.lineTo(mPeakX + 38, mPeakY + 64);
      ctx.closePath();
      ctx.fill();

      // Secondary foreground ice peak
      const sPeakX = x + 155;
      const sPeakY = horizonY - 125;
      ctx.fillStyle = '#0284C7';
      ctx.beginPath();
      ctx.moveTo(x + 95, horizonY);
      ctx.lineTo(sPeakX, sPeakY);
      ctx.lineTo(x + 215, horizonY);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#E0F2FE';
      ctx.beginPath();
      ctx.moveTo(sPeakX, sPeakY);
      ctx.lineTo(sPeakX - 22, sPeakY + 42);
      ctx.lineTo(sPeakX + 4, sPeakY + 34);
      ctx.lineTo(sPeakX + 24, sPeakY + 44);
      ctx.closePath();
      ctx.fill();
    }
  } else if (env.id === 'cyber') {
    // Synthwave Holo-Sun + Futuristic Cyber City Metropolis Skyline
    const sunX = w * 0.72;
    const sunY = horizonY * 0.48;
    const sunGlow = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 180);
    sunGlow.addColorStop(0, 'rgba(217, 70, 239, 0.45)');
    sunGlow.addColorStop(0.5, 'rgba(34, 211, 238, 0.22)');
    sunGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = sunGlow;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 180, 0, Math.PI * 2);
    ctx.fill();

    const sunFace = ctx.createLinearGradient(0, sunY - 42, 0, sunY + 42);
    sunFace.addColorStop(0, '#22D3EE');
    sunFace.addColorStop(0.55, '#E879F9');
    sunFace.addColorStop(1, '#F43F5E');
    ctx.fillStyle = sunFace;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 42, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = env.colors.skyLow;
    for (let sy = sunY + 2; sy < sunY + 42; sy += 7) {
      ctx.fillRect(sunX - 44, sy, 88, 2.8);
    }

    // Far Layer Cyber City Megastructures with Neon Window Grids & Holo Billboards
    const cityScroll = reducedMotion ? 0 : (distance * 0.18) % 360;
    for (let x = -cityScroll; x < w + 360; x += 180) {
      const buildings = [
        { dx: 6, bw: 44, bh: 175, neon: '#22D3EE' },
        { dx: 56, bw: 36, bh: 120, neon: '#F43F5E' },
        { dx: 98, bw: 48, bh: 205, neon: '#A855F7' },
        { dx: 150, bw: 26, bh: 140, neon: '#22D3EE' },
      ];

      for (const b of buildings) {
        const bx = x + b.dx;
        const by = horizonY - b.bh;
        ctx.fillStyle = '#0D0821';
        ctx.fillRect(bx, by, b.bw, b.bh);

        // Neon roof trim & antenna spire
        ctx.strokeStyle = b.neon;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(bx, by, b.bw, b.bh);
        ctx.beginPath();
        ctx.moveTo(bx + b.bw * 0.5, by);
        ctx.lineTo(bx + b.bw * 0.5, by - 22);
        ctx.stroke();

        // Lit skyscraper window matrix
        ctx.fillStyle = b.neon;
        ctx.globalAlpha = 0.45;
        for (let wy = by + 12; wy < horizonY - 14; wy += 14) {
          for (let wx = bx + 6; wx < bx + b.bw - 8; wx += 9) {
            if ((wx + wy) % 3 !== 0) {
              ctx.fillRect(wx, wy, 4, 6);
            }
          }
        }
        ctx.globalAlpha = 1;
      }

      // Glowing Holographic Billboard on Tallest Tower
      ctx.fillStyle = 'rgba(244, 63, 94, 0.28)';
      ctx.strokeStyle = '#F43F5E';
      ctx.lineWidth = 1.5;
      ctx.fillRect(x + 104, horizonY - 185, 36, 18);
      ctx.strokeRect(x + 104, horizonY - 185, 36, 18);
    }

    // Horizontal flying traffic light-streaks in the cyber skyline
    const trafficScroll = reducedMotion ? 100 : (timeSec * 140) % w;
    for (let ty = horizonY - 150; ty < horizonY - 40; ty += 38) {
      const tx = (trafficScroll + ty * 3.7) % w;
      ctx.fillStyle = ty % 2 === 0 ? '#22D3EE' : '#F43F5E';
      ctx.fillRect(tx, ty, 24, 2);
      ctx.fillRect((w - tx + 180) % w, ty + 14, 18, 2);
    }
  }

  // 3. Soft Horizon Mist / Atmospheric Depth Layer
  const nearScroll = reducedMotion ? 0 : (distance * 0.42) % 240;
  ctx.fillStyle = env.colors.nearCloud;
  for (let x = -nearScroll; x < w + 240; x += 120) {
    ctx.beginPath();
    ctx.arc(x + 30, horizonY - 2, 26, 0, Math.PI * 2);
    ctx.arc(x + 75, horizonY - 8, 32, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Ambient foreground weather effects (Ice Field Snowstorm, Volcano Embers, Bamboo Leaves)
 */
function drawAmbientEnvironmentWeather(
  ctx: CanvasRenderingContext2D,
  env: EnvironmentProfile,
  w: number,
  h: number,
  groundH: number,
  timeSec: number,
  reducedMotion: boolean
): void {
  const floorY = h - groundH;

  if (env.id === 'ice') {
    // Active Snowstorm / Blizzard: wind-driven diagonal snow streaks and swirling snowflakes
    ctx.save();
    ctx.strokeStyle = 'rgba(224, 242, 254, 0.32)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 18; i++) {
      const t = reducedMotion ? i * 17 : timeSec * 260 + i * 95;
      const sx = w - ((t * 1.35 + i * 83) % (w + 160)) + 80;
      const sy = (t * 0.65 + i * 53) % floorY;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + 28, sy - 12);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(240, 249, 255, 0.82)';
    for (let i = 0; i < 36; i++) {
      const speed = 110 + (i % 5) * 32;
      const t = reducedMotion ? i * 29 : timeSec * speed;
      const fx =
        w - ((t * 1.2 + i * 67) % (w + 60)) + Math.sin(timeSec * 3 + i) * 8;
      const fy = (t * 0.72 + i * 41) % floorY;
      const r = 1.6 + (i % 3) * 0.9;
      ctx.beginPath();
      ctx.arc(fx, fy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  } else if (env.id === 'volcano') {
    // Rising glowing volcanic embers and ash motes
    ctx.save();
    for (let i = 0; i < 20; i++) {
      const t = reducedMotion ? i * 31 : timeSec * (55 + (i % 4) * 18);
      const ex =
        ((i * 79 - t * 0.5) % w + w) % w + Math.sin(timeSec * 2.5 + i) * 10;
      const ey = floorY - ((t + i * 47) % floorY);
      ctx.fillStyle = i % 3 === 0 ? '#FEF08A' : '#F97316';
      ctx.beginPath();
      ctx.arc(ex, ey, 1.5 + (i % 2), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  } else if (env.id === 'bamboo') {
    // Gently drifting emerald bamboo leaves
    ctx.save();
    ctx.fillStyle = 'rgba(110, 231, 183, 0.55)';
    for (let i = 0; i < 10; i++) {
      const t = reducedMotion ? i * 40 : timeSec * 48;
      const lx = ((w - ((t + i * 110) % w)) + w) % w;
      const ly = (t * 0.45 + i * 67) % floorY;
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(Math.sin(timeSec * 2 + i) * 0.6);
      ctx.beginPath();
      ctx.ellipse(0, 0, 6, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }
}

function drawEnvironmentTrapEffect(
  ctx: CanvasRenderingContext2D,
  obs: ObstaclePair,
  worldHeight: number,
  groundHeight: number
): void {
  if (obs.trapDisarmed || obs.shatteredByShield) return;

  const cx = obs.x + obs.width * 0.5;

  if (obs.trapType === 'oscillating_gears') {
    // Spinning interlocking brass gears mounted at the gap lips
    drawGearWheel(
      ctx,
      cx,
      obs.topHeight - 12,
      11,
      5,
      8,
      obs.trapPhase * 1.8,
      '#F59E0B',
      '#3D271D'
    );
    drawGearWheel(
      ctx,
      cx,
      obs.bottomY + 12,
      11,
      5,
      8,
      -obs.trapPhase * 1.8,
      '#F59E0B',
      '#3D271D'
    );
  } else if (obs.trapType === 'whirlwind_gust') {
    // Swirling jade crosswind streamlines inside the bamboo gap
    ctx.save();
    const topY = obs.topHeight + 10;
    const botY = obs.bottomY - 10;
    ctx.strokeStyle =
      obs.windDirection > 0
        ? 'rgba(110, 231, 183, 0.68)'
        : 'rgba(253, 230, 138, 0.65)';
    ctx.lineWidth = 2.2;
    for (let i = 0; i < 3; i++) {
      const frac = (i + 0.5) / 3;
      const baseY = topY + (botY - topY) * frac;
      const waveOffset = Math.sin(obs.trapPhase * 2 + i * 2.1) * 10;
      ctx.beginPath();
      ctx.moveTo(obs.x - 8, baseY + waveOffset);
      ctx.quadraticCurveTo(
        cx,
        baseY - obs.windDirection * 16,
        obs.x + obs.width + 8,
        baseY - waveOffset
      );
      ctx.stroke();
    }
    ctx.fillStyle = obs.windDirection > 0 ? '#6EE7B7' : '#FDE68A';
    const arrowY = obs.gapCenterY + Math.sin(obs.trapPhase * 2) * 8;
    const dir = obs.windDirection > 0 ? -1 : 1;
    ctx.beginPath();
    ctx.moveTo(cx, arrowY + dir * 7);
    ctx.lineTo(cx - 6, arrowY - dir * 5);
    ctx.lineTo(cx + 6, arrowY - dir * 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  } else if (obs.trapType === 'magma_geyser') {
    // Glowing lava crater lip + erupting molten magma jet
    const ventW = obs.width * 0.52;
    const ventX = cx - ventW / 2;
    ctx.fillStyle = '#F97316';
    ctx.fillRect(ventX, obs.bottomY - 3, ventW, 6);

    if (obs.geyserHeight > 2) {
      const jetGrad = ctx.createLinearGradient(
        cx,
        obs.bottomY - obs.geyserHeight,
        cx,
        obs.bottomY
      );
      jetGrad.addColorStop(0, '#FEF08A');
      jetGrad.addColorStop(0.45, '#F97316');
      jetGrad.addColorStop(1, '#DC2626');

      ctx.fillStyle = jetGrad;
      ctx.beginPath();
      ctx.moveTo(cx - ventW * 0.48, obs.bottomY);
      ctx.quadraticCurveTo(
        cx,
        obs.bottomY - obs.geyserHeight * 1.15,
        cx + ventW * 0.48,
        obs.bottomY
      );
      ctx.closePath();
      ctx.fill();
    }
  } else if (obs.trapType === 'falling_icicle') {
    // Razor-sharp crystalline icicle spike hanging from iceberg tip or dropping through gap
    const iy = obs.icicleTriggered ? obs.icicleY : obs.topHeight;
    if (iy < worldHeight - groundHeight) {
      ctx.save();
      const shakeX =
        !obs.icicleTriggered && Math.sin(obs.trapPhase * 6) > 0.3
          ? Math.sin(obs.trapPhase * 18) * 1.8
          : 0;
      ctx.translate(cx + shakeX, iy);
      ctx.fillStyle = '#F0F9FF';
      ctx.strokeStyle = '#0284C7';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-9, 0);
      ctx.lineTo(9, 0);
      ctx.lineTo(0, 28);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  } else if (obs.trapType === 'laser_grid') {
    // Cyber laser emitter nodes on skyscraper roofs/soffits
    ctx.fillStyle = obs.laserActive ? '#F43F5E' : '#22D3EE';
    ctx.beginPath();
    ctx.arc(cx, obs.topHeight, 5.5, 0, Math.PI * 2);
    ctx.arc(cx, obs.bottomY, 5.5, 0, Math.PI * 2);
    ctx.fill();

    if (obs.laserActive) {
      ctx.save();
      ctx.strokeStyle = 'rgba(244, 63, 94, 0.45)';
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.moveTo(cx, obs.topHeight);
      ctx.lineTo(cx, obs.bottomY);
      ctx.stroke();

      ctx.strokeStyle = '#FDA4AF';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(cx, obs.topHeight);
      ctx.lineTo(cx, obs.bottomY);
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.save();
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.45)';
      ctx.lineWidth = 1.6;
      ctx.setLineDash([5, 6]);
      ctx.beginPath();
      ctx.moveTo(cx, obs.topHeight);
      ctx.lineTo(cx, obs.bottomY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  }
}

/**
 * 1. CLOCKWORK PILLARS: Brass & Copper mechanical clockwork columns with interlocking gears,
 * piston rods, riveted plates, and steam pressure gauges.
 */
function drawClockworkObstacle(
  ctx: CanvasRenderingContext2D,
  obs: ObstaclePair,
  env: EnvironmentProfile,
  floorY: number
): void {
  const x = obs.x;
  const w = obs.width;
  const cx = x + w * 0.5;
  const capH = 24;

  const brassGrad = ctx.createLinearGradient(x, 0, x + w, 0);
  brassGrad.addColorStop(0, '#5C3414');
  brassGrad.addColorStop(0.22, '#B45309');
  brassGrad.addColorStop(0.5, '#F59E0B');
  brassGrad.addColorStop(0.78, '#B45309');
  brassGrad.addColorStop(1, '#45230C');

  const drawClockworkShaft = (topY: number, height: number, isTop: boolean) => {
    if (height <= 0) return;

    // External piston rods flanking the clockwork column
    ctx.strokeStyle = '#FDE68A';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + 6, topY);
    ctx.lineTo(x + 6, topY + height);
    ctx.moveTo(x + w - 6, topY);
    ctx.lineTo(x + w - 6, topY + height);
    ctx.stroke();

    // Main riveted brass housing
    ctx.fillStyle = brassGrad;
    ctx.fillRect(x, topY, w, height);
    ctx.strokeStyle = '#1E1310';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, topY, w, height);

    // Recessed dark clockwork gear window along center of pillar
    const winH = Math.max(0, height - capH - 16);
    const winY = isTop ? topY + 6 : topY + capH + 10;
    if (winH > 26) {
      ctx.fillStyle = '#1F141E';
      ctx.fillRect(x + 12, winY, w - 24, winH);
      ctx.strokeStyle = '#78350F';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 12, winY, w - 24, winH);

      // Visible spinning clockwork cogwheels inside the pillar
      for (let gy = winY + 24; gy < winY + winH - 16; gy += 48) {
        drawGearWheel(
          ctx,
          cx,
          gy,
          15,
          6,
          8,
          obs.trapPhase * (gy % 96 === 0 ? 1.4 : -1.4),
          '#D97706',
          '#FEF3C7'
        );
      }
    }

    // Rivet studs along the left/right edges
    ctx.fillStyle = '#FEF3C7';
    for (let ry = topY + 14; ry < topY + height - 14; ry += 28) {
      ctx.beginPath();
      ctx.arc(x + 5, ry, 2, 0, Math.PI * 2);
      ctx.arc(x + w - 5, ry, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Heavy Geared Brass Collar at the gap edge
    const capY = isTop ? topY + height - capH : topY;
    ctx.fillStyle = brassGrad;
    drawRoundedRect(ctx, x - 6, capY, w + 12, capH, 5);
    ctx.fill();
    ctx.strokeStyle = '#1E1310';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Gear teeth molded onto the collar rim
    ctx.fillStyle = '#FDE68A';
    for (let tx = x - 2; tx < x + w + 2; tx += 12) {
      ctx.fillRect(tx, capY + 5, 6, capH - 10);
    }

    // Status accent light bar
    ctx.fillStyle = obs.passed ? '#34D399' : env.colors.accentHex;
    ctx.fillRect(x + 4, isTop ? capY + capH - 5 : capY + 2, w - 8, 3);
  };

  drawClockworkShaft(0, obs.topHeight, true);
  drawClockworkShaft(obs.bottomY, floorY - obs.bottomY, false);
}

/**
 * 2. BAMBOO FOREST PILLARS: Authentic segmented green bamboo stalks (culms)
 * with raised bamboo node joints, vertical fiber sheen, and sprouting bamboo leaves.
 */
function drawBambooObstacle(
  ctx: CanvasRenderingContext2D,
  obs: ObstaclePair,
  floorY: number
): void {
  const x = obs.x;
  const w = obs.width;
  const stalkX = x + 4;
  const stalkW = w - 8;

  const bambooGrad = ctx.createLinearGradient(stalkX, 0, stalkX + stalkW, 0);
  bambooGrad.addColorStop(0, '#14532D');
  bambooGrad.addColorStop(0.22, '#16A34A');
  bambooGrad.addColorStop(0.45, '#86EFAC');
  bambooGrad.addColorStop(0.75, '#15803D');
  bambooGrad.addColorStop(1, '#052E16');

  const drawBambooCulm = (topY: number, height: number, isTop: boolean) => {
    if (height <= 0) return;

    // Cylindrical bamboo stalk body
    ctx.fillStyle = bambooGrad;
    ctx.fillRect(stalkX, topY, stalkW, height);

    // Specular vertical bamboo fiber highlight
    ctx.fillStyle = 'rgba(220, 252, 231, 0.25)';
    ctx.fillRect(stalkX + stalkW * 0.28, topY, stalkW * 0.14, height);

    // Vertical outline of the bamboo culm
    ctx.strokeStyle = '#052E16';
    ctx.lineWidth = 2;
    ctx.strokeRect(stalkX, topY, stalkW, height);

    // Raised Bamboo Nodes (joints) every 54px with sprouting leaf sprigs
    const step = 54;
    const startY = isTop ? topY + height - step : topY + step;
    for (
      let ny = startY;
      isTop ? ny > topY + 12 : ny < topY + height - 12;
      ny += isTop ? -step : step
    ) {
      // Bulging bamboo node ring
      ctx.fillStyle = '#4ADE80';
      drawRoundedRect(ctx, stalkX - 4, ny - 4, stalkW + 8, 8, 4);
      ctx.fill();
      ctx.strokeStyle = '#052E16';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // Cream/pale-green sheath line on the node
      ctx.strokeStyle = '#DCFCE7';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(stalkX - 2, ny);
      ctx.lineTo(stalkX + stalkW + 2, ny);
      ctx.stroke();

      // Sprouting bamboo leaves on alternating sides of nodes
      const dir: 1 | -1 = Math.round(ny) % 108 === 0 ? 1 : -1;
      drawBambooLeafSprig(
        ctx,
        dir === 1 ? stalkX + stalkW + 2 : stalkX - 2,
        ny,
        dir,
        Math.sin(obs.trapPhase + ny * 0.05) * 0.12,
        '#22C55E'
      );
    }

    // Thick Bamboo Node Joint Collar right at the gap opening
    const rimY = isTop ? topY + height - 16 : topY;
    ctx.fillStyle = bambooGrad;
    drawRoundedRect(ctx, x - 3, rimY, w + 6, 16, 6);
    ctx.fill();
    ctx.strokeStyle = '#052E16';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner hollow bamboo rim highlight
    ctx.fillStyle = obs.passed ? '#34D399' : '#FEF08A';
    ctx.fillRect(x + 4, isTop ? rimY + 11 : rimY + 2, w - 8, 3);
  };

  drawBambooCulm(0, obs.topHeight, true);
  drawBambooCulm(obs.bottomY, floorY - obs.bottomY, false);
}

/**
 * 3. VOLCANO FIELD PILLARS: Jagged Volcanic Cones & Craggy Obsidian-Basalt Formations
 * with glowing molten lava cracks and bubbling magma crater lips at the gap.
 */
function drawVolcanoObstacle(
  ctx: CanvasRenderingContext2D,
  obs: ObstaclePair,
  floorY: number
): void {
  const x = obs.x;
  const w = obs.width;
  const cx = x + w * 0.5;

  const rockGrad = ctx.createLinearGradient(x, 0, x + w, 0);
  rockGrad.addColorStop(0, '#18090A');
  rockGrad.addColorStop(0.3, '#3B1416');
  rockGrad.addColorStop(0.55, '#571D20');
  rockGrad.addColorStop(0.85, '#2E0F11');
  rockGrad.addColorStop(1, '#140607');

  // --- TOP VOLCANIC STALACTITE / INVERTED CRATER CONE ---
  if (obs.topHeight > 0) {
    const h = obs.topHeight;
    ctx.fillStyle = rockGrad;
    ctx.strokeStyle = '#0F0405';
    ctx.lineWidth = 2.2;

    // Jagged volcanic rock profile tapering slightly from wide base to crater lip
    ctx.beginPath();
    ctx.moveTo(x - 8, 0);
    ctx.lineTo(x - 3, h * 0.35);
    ctx.lineTo(x + 2, h * 0.68);
    ctx.lineTo(x - 4, h - 14);
    ctx.lineTo(x + 4, h);
    ctx.lineTo(x + w - 4, h);
    ctx.lineTo(x + w + 4, h - 14);
    ctx.lineTo(x + w - 2, h * 0.62);
    ctx.lineTo(x + w + 3, h * 0.3);
    ctx.lineTo(x + w + 8, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Glowing molten magma veins branching through the volcanic rock
    ctx.strokeStyle = '#F97316';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - 6, 0);
    ctx.lineTo(cx + 5, h * 0.42);
    ctx.lineTo(cx - 4, h * 0.78);
    ctx.lineTo(cx, h - 4);
    ctx.moveTo(cx + 5, h * 0.42);
    ctx.lineTo(x + w - 10, h * 0.65);
    ctx.stroke();

    ctx.strokeStyle = '#FEF08A';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Glowing molten lava rim dripping at the crater mouth
    ctx.fillStyle = obs.passed ? '#34D399' : '#F97316';
    ctx.beginPath();
    ctx.ellipse(cx, h - 3, w * 0.46, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- BOTTOM ERUPTING VOLCANO PILLAR ---
  const botH = floorY - obs.bottomY;
  if (botH > 0) {
    const by = obs.bottomY;
    ctx.fillStyle = rockGrad;
    ctx.strokeStyle = '#0F0405';
    ctx.lineWidth = 2.2;

    // Steep volcanic cone slope widening toward the magma floor
    ctx.beginPath();
    ctx.moveTo(x + 3, by);
    ctx.lineTo(x - 4, by + 14);
    ctx.lineTo(x + 2, by + botH * 0.38);
    ctx.lineTo(x - 5, by + botH * 0.72);
    ctx.lineTo(x - 10, floorY);
    ctx.lineTo(x + w + 10, floorY);
    ctx.lineTo(x + w + 5, by + botH * 0.68);
    ctx.lineTo(x + w - 2, by + botH * 0.35);
    ctx.lineTo(x + w + 4, by + 14);
    ctx.lineTo(x + w - 3, by);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Glowing magma fissures running down the volcano pillar
    ctx.strokeStyle = '#F97316';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(cx, by + 4);
    ctx.lineTo(cx - 7, by + botH * 0.45);
    ctx.lineTo(cx + 6, by + botH * 0.8);
    ctx.lineTo(cx - 2, floorY);
    ctx.moveTo(cx - 7, by + botH * 0.45);
    ctx.lineTo(x + 10, by + botH * 0.72);
    ctx.stroke();

    ctx.strokeStyle = '#FEF08A';
    ctx.lineWidth = 1.3;
    ctx.stroke();

    // Glowing Volcanic Crater Rim at top of bottom volcano pillar
    ctx.fillStyle = obs.passed ? '#34D399' : '#FB923C';
    ctx.beginPath();
    ctx.ellipse(cx, by + 4, w * 0.46, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * 4. COLD ICE FIELD PILLARS: Faceted Crystalline Icebergs & Glacial Spires
 * with sharp geometric ice facets, snow/frost ledges, and internal cyan refraction.
 */
function drawIcebergObstacle(
  ctx: CanvasRenderingContext2D,
  obs: ObstaclePair,
  floorY: number
): void {
  const x = obs.x;
  const w = obs.width;
  const cx = x + w * 0.5;

  const iceGrad = ctx.createLinearGradient(x, 0, x + w, 0);
  iceGrad.addColorStop(0, '#0284C7');
  iceGrad.addColorStop(0.28, '#38BDF8');
  iceGrad.addColorStop(0.55, '#E0F2FE');
  iceGrad.addColorStop(0.82, '#7DD3FC');
  iceGrad.addColorStop(1, '#0369A1');

  // --- TOP HANGING GLACIER / ICEBERG FORMATION ---
  if (obs.topHeight > 0) {
    const h = obs.topHeight;
    ctx.fillStyle = iceGrad;
    ctx.strokeStyle = '#0C4A6E';
    ctx.lineWidth = 2;

    // Faceted, angular crystalline iceberg silhouette with jagged icy tip
    ctx.beginPath();
    ctx.moveTo(x - 6, 0);
    ctx.lineTo(x - 2, h * 0.42);
    ctx.lineTo(x + 3, h * 0.76);
    ctx.lineTo(x - 4, h - 16);
    ctx.lineTo(x + w * 0.22, h);
    ctx.lineTo(cx, h - 8);
    ctx.lineTo(x + w * 0.78, h);
    ctx.lineTo(x + w + 4, h - 16);
    ctx.lineTo(x + w - 3, h * 0.72);
    ctx.lineTo(x + w + 2, h * 0.38);
    ctx.lineTo(x + w + 6, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Bright white sunlit ice facet plane on the left side
    ctx.fillStyle = 'rgba(240, 249, 255, 0.42)';
    ctx.beginPath();
    ctx.moveTo(x - 2, 0);
    ctx.lineTo(cx + 4, h * 0.55);
    ctx.lineTo(x + w * 0.22, h);
    ctx.lineTo(x - 4, h - 16);
    ctx.closePath();
    ctx.fill();

    // Diagonal crystalline refraction lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + 6, h * 0.25);
    ctx.lineTo(x + w - 8, h * 0.48);
    ctx.moveTo(x + 8, h * 0.62);
    ctx.lineTo(x + w - 6, h * 0.82);
    ctx.stroke();
  }

  // --- BOTTOM TOWERING ICEBERG SPIRE ---
  const botH = floorY - obs.bottomY;
  if (botH > 0) {
    const by = obs.bottomY;
    ctx.fillStyle = iceGrad;
    ctx.strokeStyle = '#0C4A6E';
    ctx.lineWidth = 2;

    // Jagged multi-peaked iceberg crown widening toward the frozen sea floor
    ctx.beginPath();
    ctx.moveTo(x - 4, by + 16);
    ctx.lineTo(x + w * 0.2, by);
    ctx.lineTo(cx, by + 9);
    ctx.lineTo(x + w * 0.8, by);
    ctx.lineTo(x + w + 4, by + 16);
    ctx.lineTo(x + w - 2, by + botH * 0.45);
    ctx.lineTo(x + w + 6, by + botH * 0.78);
    ctx.lineTo(x + w + 9, floorY);
    ctx.lineTo(x - 9, floorY);
    ctx.lineTo(x - 6, by + botH * 0.75);
    ctx.lineTo(x + 2, by + botH * 0.42);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Sunlit white-cyan facet on left face of iceberg
    ctx.fillStyle = 'rgba(240, 249, 255, 0.45)';
    ctx.beginPath();
    ctx.moveTo(x + w * 0.2, by);
    ctx.lineTo(cx + 5, by + botH * 0.52);
    ctx.lineTo(x - 6, floorY);
    ctx.lineTo(x - 4, by + 16);
    ctx.closePath();
    ctx.fill();

    // Fresh white snow cap crowning the top of the bottom iceberg
    ctx.fillStyle = obs.passed ? '#34D399' : '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(x - 4, by + 16);
    ctx.lineTo(x + w * 0.2, by);
    ctx.lineTo(cx, by + 9);
    ctx.lineTo(x + w * 0.8, by);
    ctx.lineTo(x + w + 4, by + 16);
    ctx.lineTo(cx, by + 18);
    ctx.closePath();
    ctx.fill();
  }
}

/**
 * 5. CYBER CITY PILLARS: Futuristic Cybernetic Skyscraper Buildings
 * with illuminated window grids, neon architectural trim, and glowing holo-signage.
 */
function drawCyberBuildingObstacle(
  ctx: CanvasRenderingContext2D,
  obs: ObstaclePair,
  floorY: number
): void {
  const x = obs.x;
  const w = obs.width;

  const bldgGrad = ctx.createLinearGradient(x, 0, x + w, 0);
  bldgGrad.addColorStop(0, '#090618');
  bldgGrad.addColorStop(0.2, '#16113A');
  bldgGrad.addColorStop(0.5, '#251D59');
  bldgGrad.addColorStop(0.82, '#16113A');
  bldgGrad.addColorStop(1, '#090618');

  const drawSkyscraper = (topY: number, height: number, isTop: boolean) => {
    if (height <= 0) return;

    // Skyscraper steel & glass facade
    ctx.fillStyle = bldgGrad;
    ctx.fillRect(x, topY, w, height);

    // Glowing neon building frame
    ctx.strokeStyle = obs.passed ? '#34D399' : '#22D3EE';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, topY, w, height);

    // Multi-column illuminated skyscraper window grid
    const roofH = 22;
    const winStart = isTop ? topY + 10 : topY + roofH + 8;
    const winEnd = isTop ? topY + height - roofH - 8 : topY + height - 10;

    for (let wy = winStart; wy < winEnd - 6; wy += 13) {
      for (let col = 0; col < 4; col++) {
        const wx = x + 8 + col * ((w - 16) / 3.5);
        const hash = Math.abs(Math.floor(obs.id * 17 + wy * 3 + col * 11));
        if (hash % 4 !== 0) {
          ctx.fillStyle =
            hash % 5 === 0
              ? '#F43F5E'
              : hash % 3 === 0
              ? '#FDE047'
              : '#22D3EE';
          ctx.fillRect(wx, wy, 7, 7);
        } else {
          ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
          ctx.fillRect(wx, wy, 7, 7);
        }
      }
    }

    // Architectural Penthouse / Holo-Billboard Cap at the Gap Edge
    const capY = isTop ? topY + height - roofH : topY;
    ctx.fillStyle = '#0F0A26';
    drawRoundedRect(ctx, x - 5, capY, w + 10, roofH, 3);
    ctx.fill();
    ctx.strokeStyle = obs.passed ? '#34D399' : '#F43F5E';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Neon holographic advertisement strip on the penthouse collar
    ctx.fillStyle = obs.passed
      ? 'rgba(52, 211, 153, 0.85)'
      : 'rgba(244, 63, 94, 0.85)';
    ctx.fillRect(x + 2, capY + 6, w * 0.55, 4);
    ctx.fillStyle = '#22D3EE';
    ctx.fillRect(x + w * 0.64, capY + 6, w * 0.3, 4);
    ctx.fillRect(x + 2, capY + 13, w - 4, 2.5);
  };

  drawSkyscraper(0, obs.topHeight, true);
  drawSkyscraper(obs.bottomY, floorY - obs.bottomY, false);
}

function drawObstacleConduit(
  ctx: CanvasRenderingContext2D,
  obs: ObstaclePair,
  env: EnvironmentProfile,
  worldHeight: number,
  groundHeight: number
): void {
  if (obs.shatteredByShield) return;

  const floorY = worldHeight - groundHeight;

  if (env.id === 'clockwork') {
    drawClockworkObstacle(ctx, obs, env, floorY);
  } else if (env.id === 'bamboo') {
    drawBambooObstacle(ctx, obs, floorY);
  } else if (env.id === 'volcano') {
    drawVolcanoObstacle(ctx, obs, floorY);
  } else if (env.id === 'ice') {
    drawIcebergObstacle(ctx, obs, floorY);
  } else if (env.id === 'cyber') {
    drawCyberBuildingObstacle(ctx, obs, floorY);
  }

  // Draw the active Environment Trap effect inside/around the conduit gap
  drawEnvironmentTrapEffect(ctx, obs, worldHeight, groundHeight);
}

function drawEnvironmentFloor(
  ctx: CanvasRenderingContext2D,
  env: EnvironmentProfile,
  w: number,
  h: number,
  groundH: number,
  distance: number,
  reducedMotion: boolean
): void {
  const floorY = h - groundH;

  const trimGrad = ctx.createLinearGradient(0, floorY, 0, floorY + 14);
  trimGrad.addColorStop(0, env.colors.collarHighlight);
  trimGrad.addColorStop(0.5, env.colors.floorTop);
  trimGrad.addColorStop(1, env.colors.pillarDark);
  ctx.fillStyle = trimGrad;
  ctx.fillRect(0, floorY, w, 14);

  const tickScroll = reducedMotion ? 0 : distance % 36;
  ctx.fillStyle =
    env.id === 'volcano'
      ? 'rgba(254, 240, 138, 0.55)'
      : env.id === 'cyber'
      ? 'rgba(34, 211, 238, 0.55)'
      : 'rgba(15, 10, 18, 0.48)';
  for (let x = -tickScroll - 36; x < w + 36; x += 36) {
    ctx.beginPath();
    ctx.moveTo(x, floorY + 2);
    ctx.lineTo(x + 14, floorY + 2);
    ctx.lineTo(x + 6, floorY + 12);
    ctx.lineTo(x - 8, floorY + 12);
    ctx.closePath();
    ctx.fill();
  }

  const subGrad = ctx.createLinearGradient(0, floorY + 14, 0, h);
  subGrad.addColorStop(0, env.colors.floorSub);
  subGrad.addColorStop(1, '#08060C');
  ctx.fillStyle = subGrad;
  ctx.fillRect(0, floorY + 14, w, groundH - 14);

  ctx.strokeStyle = '#0D080A';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, floorY);
  ctx.lineTo(w, floorY);
  ctx.stroke();
}

function drawPlayerGlider(
  ctx: CanvasRenderingContext2D,
  state: SimulationState,
  visualRadius: number
): void {
  const player = state.player;
  const bird = getBirdProfile(state.birdId);

  if (player.trail.length > 1) {
    for (let i = 0; i < player.trail.length - 1; i++) {
      const pt = player.trail[i];
      const next = player.trail[i + 1];
      ctx.strokeStyle = `rgba(${bird.colors.trailRgba}, ${(pt.alpha * 0.6).toFixed(2)})`;
      ctx.lineWidth = Math.max(1.5, (1 - i / player.trail.length) * 6.5);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(pt.x, pt.y);
      ctx.lineTo(next.x, next.y);
      ctx.stroke();
    }
  }

  ctx.save();
  ctx.translate(player.x, player.y);

  if (state.abilityActiveTimer > 0 || state.shieldActive) {
    if (bird.id === 'kora' && state.shieldActive) {
      const shieldRadius = visualRadius * 1.65;
      const grad = ctx.createRadialGradient(
        0,
        0,
        shieldRadius * 0.3,
        0,
        0,
        shieldRadius
      );
      grad.addColorStop(0, 'rgba(251, 191, 36, 0.08)');
      grad.addColorStop(0.75, 'rgba(251, 191, 36, 0.28)');
      grad.addColorStop(1, 'rgba(254, 243, 199, 0.72)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, shieldRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#FEF3C7';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (bird.id === 'zephyr') {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(visualRadius * 1.6, 0);
      ctx.lineTo(-visualRadius * 1.5, -visualRadius * 1.25);
      ctx.moveTo(visualRadius * 1.6, 0);
      ctx.lineTo(-visualRadius * 1.5, visualRadius * 1.25);
      ctx.stroke();
    } else if (bird.id === 'ignis') {
      const progress = 1 - state.abilityActiveTimer / bird.abilityDurationSec;
      const pulseR = visualRadius * (1.5 + progress * 7.5);
      ctx.strokeStyle = `rgba(248, 113, 113, ${(1 - progress).toFixed(2)})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, pulseR, 0, Math.PI * 2);
      ctx.stroke();
    } else if (bird.id === 'chronos') {
      ctx.save();
      ctx.rotate(state.flightTimeSec * 2.5);
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.75)';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.arc(0, 0, visualRadius * 1.6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    } else if (bird.id === 'valkyrie') {
      // Astral Blink: Rotating starlight astrolabe diamond & phase aura
      ctx.save();
      ctx.rotate(-state.flightTimeSec * 3.6);
      const portalR = visualRadius * 1.72;
      ctx.strokeStyle = 'rgba(192, 132, 252, 0.88)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(portalR, 0);
      ctx.lineTo(0, portalR);
      ctx.lineTo(-portalR, 0);
      ctx.lineTo(0, -portalR);
      ctx.closePath();
      ctx.stroke();
      ctx.strokeStyle = 'rgba(253, 230, 138, 0.72)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, 0, visualRadius * 1.48, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else if (bird.id === 'volt') {
      // Tesla Overload: Crackling electromagnetic shock-shield & high-voltage lightning arcs
      const empRadius = visualRadius * 1.7;
      const grad = ctx.createRadialGradient(0, 0, empRadius * 0.25, 0, 0, empRadius);
      grad.addColorStop(0, 'rgba(34, 211, 238, 0.08)');
      grad.addColorStop(0.75, 'rgba(34, 211, 238, 0.3)');
      grad.addColorStop(1, 'rgba(250, 204, 21, 0.78)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, empRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#22D3EE';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (let a = 0; a < 8; a++) {
        const ang1 = (Math.PI * 2 * a) / 8 + state.flightTimeSec * 4;
        const ang2 = ang1 + Math.PI / 8;
        const r1 = empRadius * 0.88;
        const r2 = empRadius * 1.12;
        if (a === 0) ctx.moveTo(Math.cos(ang1) * r1, Math.sin(ang1) * r1);
        else ctx.lineTo(Math.cos(ang1) * r1, Math.sin(ang1) * r1);
        ctx.lineTo(Math.cos(ang2) * r2, Math.sin(ang2) * r2);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }

  ctx.rotate(player.rotation);
  ctx.scale(player.scaleX, player.scaleY);

  const r =
    bird.id === 'ignis'
      ? visualRadius * 0.9
      : bird.id === 'chronos' || bird.id === 'volt'
      ? visualRadius * 0.92
      : bird.id === 'valkyrie'
      ? visualRadius * 0.95
      : visualRadius;

  ctx.fillStyle = bird.colors.tail;
  ctx.strokeStyle = '#1E1310';
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (bird.id === 'zephyr' || bird.id === 'valkyrie') {
    ctx.moveTo(-r * 0.65, 0);
    ctx.lineTo(-r * 1.65, -r * 0.55);
    ctx.lineTo(-r * 1.15, 0);
    ctx.lineTo(-r * 1.65, r * 0.45);
  } else if (bird.id === 'ignis' || bird.id === 'volt') {
    ctx.moveTo(-r * 0.6, -r * 0.15);
    ctx.lineTo(-r * 1.55, -r * 0.5);
    ctx.lineTo(-r * 1.25, 0);
    ctx.lineTo(-r * 1.5, r * 0.35);
  } else {
    ctx.moveTo(-r * 0.65, 0);
    ctx.lineTo(-r * 1.35, -r * 0.42);
    ctx.lineTo(-r * 1.18, r * 0.25);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  const tailGlow = ctx.createRadialGradient(-r * 0.85, 2, 1, -r * 0.85, 2, 12);
  tailGlow.addColorStop(0, '#FFFFFF');
  tailGlow.addColorStop(0.5, `rgba(${bird.colors.trailRgba}, 0.7)`);
  tailGlow.addColorStop(1, `rgba(${bird.colors.trailRgba}, 0)`);
  ctx.fillStyle = tailGlow;
  ctx.beginPath();
  ctx.arc(-r * 0.85, 2, 12, 0, Math.PI * 2);
  ctx.fill();

  const bodyGrad = ctx.createLinearGradient(0, -r, 0, r);
  bodyGrad.addColorStop(0, bird.colors.bodyTop);
  bodyGrad.addColorStop(0.48, bird.colors.bodyMid);
  bodyGrad.addColorStop(1, bird.colors.bodyBottom);

  ctx.fillStyle = player.hitFlashTimer > 0 ? '#FFFFFF' : bodyGrad;
  ctx.strokeStyle = '#1E1310';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  const rx =
    bird.id === 'zephyr' || bird.id === 'valkyrie' ? r * 1.22 : r * 1.08;
  const ry =
    bird.id === 'zephyr' || bird.id === 'valkyrie' ? r * 0.74 : r * 0.84;
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (bird.id === 'ignis') {
    ctx.fillStyle = '#FBBF24';
    ctx.beginPath();
    ctx.moveTo(-r * 0.1, -ry * 0.9);
    ctx.lineTo(-r * 0.65, -ry * 1.45);
    ctx.lineTo(r * 0.35, -ry * 0.85);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (bird.id === 'valkyrie') {
    // Swept astral valkyrie wing-crown crest
    ctx.fillStyle = '#FDE047';
    ctx.beginPath();
    ctx.moveTo(r * 0.05, -ry * 0.88);
    ctx.lineTo(-r * 0.78, -ry * 1.52);
    ctx.lineTo(-r * 0.32, -ry * 0.92);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (bird.id === 'volt') {
    // High-voltage brass lightning-rod antenna crest
    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.moveTo(r * 0.1, -ry * 0.85);
    ctx.lineTo(-r * 0.25, -ry * 1.55);
    ctx.lineTo(r * 0.38, -ry * 0.82);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.fillStyle = bird.colors.beak;
  ctx.strokeStyle = '#1E1310';
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (bird.id === 'chronos') {
    ctx.moveTo(rx * 0.85, -r * 0.14);
    ctx.lineTo(rx * 1.75, 0);
    ctx.lineTo(rx * 0.85, r * 0.16);
  } else if (bird.id === 'volt') {
    ctx.moveTo(rx * 0.84, -r * 0.18);
    ctx.lineTo(rx * 1.55, -0.02 * r);
    ctx.lineTo(rx * 0.84, r * 0.22);
  } else {
    ctx.moveTo(rx * 0.84, -r * 0.22);
    ctx.lineTo(rx * 1.38, 0.04 * r);
    ctx.lineTo(rx * 0.82, r * 0.28);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  const eyeX = r * 0.42;
  const eyeY = -r * 0.16;
  ctx.fillStyle = '#1E1310';
  ctx.beginPath();
  ctx.arc(eyeX, eyeY, r * 0.34, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = bird.colors.eye;
  ctx.beginPath();
  ctx.arc(eyeX, eyeY, r * 0.23, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(eyeX + r * 0.07, eyeY - r * 0.07, r * 0.08, 0, Math.PI * 2);
  ctx.fill();

  const wingLift = Math.sin(player.wingPhase) * (r * 0.6);
  ctx.save();
  ctx.translate(-r * 0.12, r * 0.05);
  ctx.fillStyle = bird.colors.wing;
  ctx.strokeStyle = '#1E1310';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(r * 0.25, 0);
  const wingSpanX =
    bird.id === 'zephyr' || bird.id === 'valkyrie' ? -r * 1.05 : -r * 0.82;
  ctx.quadraticCurveTo(
    -r * 0.25,
    -r * 0.68 - wingLift,
    wingSpanX,
    -r * 0.15 - wingLift * 0.7
  );
  ctx.quadraticCurveTo(-r * 0.35, r * 0.38, r * 0.25, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = bird.colors.bodyBottom;
  ctx.beginPath();
  ctx.arc(r * 0.08, 0, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

export function renderGameCanvas(
  ctx: CanvasRenderingContext2D,
  state: SimulationState,
  visualRadius: number,
  reducedMotion: boolean
): void {
  const w = state.worldWidth;
  const h = state.worldHeight;
  const env = getEnvironmentProfile(state.environmentId);

  ctx.save();

  if (!reducedMotion && state.cameraTrauma > 0) {
    const shake = state.cameraTrauma * state.cameraTrauma * 12;
    const dx = Math.sin(state.flightTimeSec * 55) * shake;
    const dy = Math.cos(state.flightTimeSec * 48) * shake;
    ctx.translate(dx, dy);
  }

  drawSkyAndParallax(
    ctx,
    env,
    w,
    h,
    state.groundHeight,
    state.distanceTraveled,
    state.flightTimeSec,
    reducedMotion
  );

  if (state.phase === 'playing' && state.launchGraceTimer > 0) {
    const alpha = Math.min(0.32, state.launchGraceTimer * 0.15);
    ctx.strokeStyle = `rgba(253, 230, 138, ${alpha.toFixed(2)})`;
    ctx.lineWidth = 1.5;
    const floorSafeY = h - state.groundHeight - 85;
    ctx.setLineDash([12, 10]);
    ctx.beginPath();
    ctx.moveTo(0, floorSafeY);
    ctx.lineTo(w, floorSafeY);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  for (let i = 0; i < state.obstacles.length; i++) {
    drawObstacleConduit(ctx, state.obstacles[i], env, h, state.groundHeight);
  }

  drawAmbientEnvironmentWeather(
    ctx,
    env,
    w,
    h,
    state.groundHeight,
    state.flightTimeSec,
    reducedMotion
  );

  drawEnvironmentFloor(
    ctx,
    env,
    w,
    h,
    state.groundHeight,
    state.distanceTraveled,
    reducedMotion
  );

  for (let i = 0; i < state.particles.length; i++) {
    const p = state.particles[i];
    if (!p.active || p.alpha <= 0.01) continue;
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);

    if (p.shape === 'gear') {
      // Miniature Clockwork Brass Cogwheel with 6 teeth & hollow axle
      const outerR = p.size * 1.15;
      const bodyR = p.size * 0.78;
      ctx.fillStyle = p.color;
      for (let t = 0; t < 6; t++) {
        ctx.save();
        ctx.rotate((t * Math.PI) / 3);
        ctx.fillRect(-p.size * 0.24, -outerR, p.size * 0.48, outerR * 2);
        ctx.restore();
      }
      ctx.beginPath();
      ctx.arc(0, 0, bodyR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#78350F';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Specular brass axle ring
      ctx.fillStyle = '#FEF3C7';
      ctx.beginPath();
      ctx.arc(0, 0, p.size * 0.28, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.shape === 'streak') {
      // High-speed aerodynamic sky-slipstream wind ribbon
      const len = p.size * 3.8;
      const thickness = Math.max(1.4, p.size * 0.36);
      const streakGrad = ctx.createLinearGradient(-len * 0.6, 0, len * 0.4, 0);
      streakGrad.addColorStop(0, 'rgba(254, 243, 199, 0)');
      streakGrad.addColorStop(0.55, p.color);
      streakGrad.addColorStop(1, '#FFFFFF');
      ctx.strokeStyle = streakGrad;
      ctx.lineWidth = thickness;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-len * 0.6, 0);
      ctx.lineTo(len * 0.4, 0);
      ctx.stroke();
    } else if (p.shape === 'prism') {
      // 4-point aether crystal diamond mote with brass-white core
      const r = p.size * 1.25;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.lineTo(r * 0.45, -r * 0.45);
      ctx.lineTo(r, 0);
      ctx.lineTo(r * 0.45, r * 0.45);
      ctx.lineTo(0, r);
      ctx.lineTo(-r * 0.45, r * 0.45);
      ctx.lineTo(-r, 0);
      ctx.lineTo(-r * 0.45, -r * 0.45);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#FEF3C7';
      ctx.beginPath();
      ctx.arc(0, 0, p.size * 0.32, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.shape === 'smoke') {
      // Expanding pressurized clockwork steam puff
      const puffR = p.size * (1.1 + (1 - p.alpha) * 1.05);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(0, 0, puffR, 0, Math.PI * 2);
      ctx.arc(-puffR * 0.45, puffR * 0.15, puffR * 0.68, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.shape === 'ring') {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, p.size * (1.8 - p.alpha * 0.8), 0, Math.PI * 2);
      ctx.stroke();
    } else if (p.shape === 'feather') {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size * 1.45, p.size * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#FEF3C7';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(-p.size * 1.1, 0);
      ctx.lineTo(p.size * 1.1, 0);
      ctx.stroke();
    } else {
      // Glowing brass spark with bright core
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(0, 0, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FEF3C7';
      ctx.beginPath();
      ctx.arc(0, 0, p.size * 0.42, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawPlayerGlider(ctx, state, visualRadius);

  for (let i = 0; i < state.popups.length; i++) {
    const pop = state.popups[i];
    if (!pop.active || pop.alpha <= 0.01) continue;
    ctx.save();
    ctx.globalAlpha = pop.alpha;
    ctx.translate(pop.x, pop.y);
    ctx.scale(pop.scale, pop.scale);
    ctx.font = '800 20px "Bricolage Grotesque", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#140D0B';
    ctx.lineWidth = 4;
    ctx.strokeText(pop.text, 0, 0);
    ctx.fillStyle = pop.color;
    ctx.fillText(pop.text, 0, 0);

    if (pop.subtext) {
      ctx.font = '700 11px "JetBrains Mono", monospace';
      ctx.lineWidth = 3;
      ctx.strokeText(pop.subtext, 0, -20);
      ctx.fillStyle = '#FEF3C7';
      ctx.fillText(pop.subtext, 0, -20);
    }
    ctx.restore();
  }

  ctx.restore();
}
