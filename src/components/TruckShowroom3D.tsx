import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RotateCw, Pause, Play } from 'lucide-react';
import {
  buildSculptedDaciaLogan3,
  buildSculptedMercedesW204,
} from './SedanMeshBuilder3D';

export type ShowroomVehicleKind =
  | 'tractor-scania'
  | 'tractor-volvo'
  | 'tractor-mercedes'
  | 'tractor-daf'
  | 'tractor-man'
  | 'van-sprinter'
  | 'car-logan'
  | 'car-mercedes'
  | 'trailer-schmitz'
  | 'trailer-krone';

export interface TruckShowroom3DProps {
  bodyStyle: ShowroomVehicleKind;
  modelName: string;
  oemHex: string;
  secondaryHex: string;
  accentHex: string;
  plateNumber: string;
  partnerPlateNumber?: string;
  companyName?: string;
  trailerCompanyName?: string;
  trailerOemHex?: string;
  axleConfig?: string;
  showCoupledRoadTrain?: boolean;
  zone1Temp?: number;
  zone2Temp?: number;
  onSwitchToPhoto?: () => void;
  hasPhotoOption?: boolean;
}

type CameraPreset = 'front34' | 'side' | 'rear34';

type ManifestMap = Record<string, string | null>;
let cachedManifestPromise: Promise<ManifestMap> | null = null;

function loadModelManifest(): Promise<ManifestMap> {
  if (!cachedManifestPromise) {
    cachedManifestPromise = fetch('/models/manifest.json')
      .then((r) => (r.ok ? (r.json() as Promise<ManifestMap>) : {}))
      .catch(() => ({}));
  }
  return cachedManifestPromise;
}

function getManifestKey(bodyStyle: ShowroomVehicleKind): string {
  switch (bodyStyle) {
    case 'tractor-scania':
      return 'scania';
    case 'tractor-volvo':
      return 'volvo';
    case 'tractor-mercedes':
      return 'mercedes';
    case 'tractor-daf':
      return 'daf';
    case 'tractor-man':
      return 'man';
    case 'van-sprinter':
      return 'sprinter';
    case 'car-logan':
      return 'carLogan';
    case 'car-mercedes':
      return 'carMercedes';
    case 'trailer-krone':
      return 'trailerKrone';
    case 'trailer-schmitz':
    default:
      return 'trailerSchmitz';
  }
}

/* ============================================================================
   HIGH-DPI PROCEDURAL AUTOMOTIVE CANVAS TEXTURES (100% LOCAL, ZERO WATERMARKS)
============================================================================ */

function createShowroomFloorTexture(accentHex: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;
  const cx = 512;
  const cy = 512;

  const bg = ctx.createRadialGradient(cx, cy, 30, cx, cy, 512);
  bg.addColorStop(0, '#1e293b');
  bg.addColorStop(0.58, '#0f172a');
  bg.addColorStop(0.92, '#090f1d');
  bg.addColorStop(1, '#060a14');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1024, 1024);

  // Subtle brushed concentric showroom rings
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
  ctx.lineWidth = 2;
  [180, 310, 425, 476].forEach((r) => {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  });

  // Glowing outer showroom ring
  ctx.strokeStyle = accentHex || '#38bdf8';
  ctx.lineWidth = 5;
  ctx.globalAlpha = 0.65;
  ctx.beginPath();
  ctx.arc(cx, cy, 488, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Degree ticks around turntable
  for (let deg = 0; deg < 360; deg += 5) {
    const rad = (deg * Math.PI) / 180;
    const isMajor = deg % 30 === 0;
    const rInner = isMajor ? 454 : 466;
    const rOuter = 476;
    ctx.strokeStyle = isMajor
      ? 'rgba(56, 189, 248, 0.55)'
      : 'rgba(148, 163, 184, 0.22)';
    ctx.lineWidth = isMajor ? 3 : 1.5;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(rad) * rInner, cy + Math.sin(rad) * rInner);
    ctx.lineTo(cx + Math.cos(rad) * rOuter, cy + Math.sin(rad) * rOuter);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createEuRoPlateTexture(plateNumber: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 112;
  const ctx = canvas.getContext('2d')!;

  // White reflective background + dark frame
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 512, 112);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, 504, 104);

  // EU blue strip
  ctx.fillStyle = '#003399';
  ctx.fillRect(8, 8, 66, 96);

  // EU stars circle
  ctx.fillStyle = '#facc15';
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    ctx.beginPath();
    ctx.arc(41 + Math.cos(a) * 16, 36 + Math.sin(a) * 16, 2.3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 22px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('RO', 41, 90);

  // Plate text
  ctx.fillStyle = '#0f172a';
  ctx.font = '900 64px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText((plateNumber || 'IF 96 STS').toUpperCase(), 292, 58);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createFrontGrilleTexture(
  brand: 'SCANIA' | 'VOLVO' | 'OTHER',
  modelBadge: string
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Base dark gunmetal grille surround
  const bg = ctx.createLinearGradient(0, 0, 0, 1024);
  bg.addColorStop(0, '#0f172a');
  bg.addColorStop(0.5, '#1e293b');
  bg.addColorStop(1, '#0b1120');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1024, 1024);

  // Honeycomb dark mesh pattern
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
  ctx.lineWidth = 2;
  for (let y = 180; y < 980; y += 22) {
    for (let x = 60; x < 964; x += 32) {
      const ox = (y / 22) % 2 === 0 ? 0 : 16;
      ctx.strokeRect(x + ox, y, 22, 14);
    }
  }

  if (brand === 'SCANIA') {
    // Upper glossy black Scania visor bar
    ctx.fillStyle = '#090d16';
    ctx.fillRect(24, 24, 976, 155);

    // Chrome trim under SCANIA wordmark
    const chrome = ctx.createLinearGradient(0, 168, 1024, 182);
    chrome.addColorStop(0, '#64748b');
    chrome.addColorStop(0.5, '#f8fafc');
    chrome.addColorStop(1, '#64748b');
    ctx.fillStyle = chrome;
    ctx.fillRect(48, 168, 928, 10);

    // SCANIA bold silver wordmark
    ctx.fillStyle = '#f1f5f9';
    ctx.font = '900 102px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 8;
    ctx.fillText('S C A N I A', 512, 102);
    ctx.shadowBlur = 0;

    // R 500 / S 500 badge on left
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(72, 206, 175, 48);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 3;
    ctx.strokeRect(72, 206, 175, 48);
    ctx.fillStyle = '#f8fafc';
    ctx.font = '900 30px system-ui, sans-serif';
    ctx.fillText(modelBadge || 'R 500', 160, 232);

    // Red SUPER / V8 accent badge on right
    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(780, 210, 168, 40);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 22px system-ui, sans-serif';
    ctx.fillText('NEXT GEN', 864, 231);

    // 5 signature NextGen V-shaped horizontal louvre ribs with chrome edges
    const ribYs = [295, 430, 565, 705, 845];
    ribYs.forEach((ry, idx) => {
      const inset = idx * 24;
      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.moveTo(56 + inset, ry);
      ctx.lineTo(512, ry + 34);
      ctx.lineTo(968 - inset, ry);
      ctx.lineTo(968 - inset, ry + 64);
      ctx.lineTo(512, ry + 98);
      ctx.lineTo(56 + inset, ry + 64);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(60 + inset, ry + 4);
      ctx.lineTo(512, ry + 38);
      ctx.lineTo(964 - inset, ry + 4);
      ctx.stroke();
    });
  } else if (brand === 'VOLVO') {
    // Upper Volvo piano-black iron-mark panel
    ctx.fillStyle = '#090d16';
    ctx.fillRect(24, 24, 976, 260);

    // Diagonal Volvo Chrome Slash
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.moveTo(88, 268);
    ctx.lineTo(936, 42);
    ctx.stroke();

    // Central Volvo Circle + Arrow Iron Mark
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(512, 155, 68, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(512, 155, 64, 0, Math.PI * 2);
    ctx.stroke();

    // Blue VOLVO banner across circle
    ctx.fillStyle = '#003057';
    ctx.fillRect(436, 134, 152, 42);
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 3;
    ctx.strokeRect(436, 134, 152, 42);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 28px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('VOLVO', 512, 156);

    // FH badge on right
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '900 38px system-ui, sans-serif';
    ctx.fillText(modelBadge || 'FH 540', 835, 240);

    // Lower Volvo FH brushed metallic honeycomb & horizontal bars
    for (let ry = 335; ry <= 865; ry += 128) {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(68, ry, 888, 72);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(68, ry, 888, 10);
    }
  } else {
    // Generic Euro 6 Truck Grille (Mercedes / DAF / MAN)
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(24, 24, 976, 180);
    ctx.fillStyle = '#f8fafc';
    ctx.font = '900 78px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(modelBadge || 'EURO 6', 512, 114);
    for (let ry = 250; ry <= 850; ry += 140) {
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(72, ry, 880, 18);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createRoofSignTexture(text: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 160;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, 1024, 160);
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, 1008, 144);

  // Subtle backlit white glow panel
  const glow = ctx.createLinearGradient(120, 0, 904, 0);
  glow.addColorStop(0, '#0f172a');
  glow.addColorStop(0.15, '#f8fafc');
  glow.addColorStop(0.85, '#f8fafc');
  glow.addColorStop(1, '#0f172a');
  ctx.fillStyle = glow;
  ctx.fillRect(80, 22, 864, 116);

  ctx.fillStyle = '#0f172a';
  ctx.font = '900 66px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 512, 82);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createTireTreadTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#14171c';
  ctx.fillRect(0, 0, 512, 512);

  // 4 longitudinal highway tread grooves
  ctx.fillStyle = '#07090c';
  [105, 205, 307, 407].forEach((x) => {
    ctx.fillRect(x - 10, 0, 20, 512);
  });

  // Cross sipes
  ctx.strokeStyle = '#222730';
  ctx.lineWidth = 4;
  for (let y = 0; y < 512; y += 24) {
    ctx.beginPath();
    ctx.moveTo(30, y);
    ctx.lineTo(482, y + 8);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 5);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createDiamondPlateTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = '#cbd5e1';
  for (let y = 0; y < 256; y += 32) {
    for (let x = 0; x < 256; x += 32) {
      ctx.save();
      ctx.translate(x + 16, y + 16);
      ctx.rotate(((x + y) % 64 === 0 ? 45 : -45) * (Math.PI / 180));
      ctx.fillRect(-7, -2.5, 14, 5);
      ctx.restore();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function normalizeFleetCompany(rawCompany?: string): {
  primary: string;
  subtitle: string;
  rearLeft: string;
  rearRight: string;
  isScandexpres: boolean;
} {
  const upper = (rawCompany || 'BLUE TRANS SPEDITION').trim().toUpperCase();
  if (upper.includes('SCANDEXPRES')) {
    return {
      primary: 'SCANDEXPRES',
      subtitle: 'BLUE TRANS SPEDITION GROUP  ·  FRIGO & BI-TEMP LOGISTICS',
      rearLeft: 'SCANDEXPRES',
      rearRight: 'BLUE TRANS GROUP',
      isScandexpres: true,
    };
  }
  return {
    primary: upper || 'BLUE TRANS SPEDITION',
    subtitle: 'INTERNATIONAL FRIGO & BI-TEMP LOGISTICS  ·  ROMÂNIA',
    rearLeft: 'BLUE TRANS',
    rearRight: 'SPEDITION',
    isScandexpres: false,
  };
}

function createReeferSideTexture(
  isKrone: boolean,
  plateNumber: string,
  zone1Temp: number,
  zone2Temp: number,
  companyName?: string,
  trailerHex?: string
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const brand = normalizeFleetCompany(companyName);
  const hexUpper = (trailerHex || '#F8FAFC').toUpperCase();
  const isColoredBox =
    hexUpper !== '#F8FAFC' && hexUpper !== '#F1F5F9' && hexUpper !== '#FFFFFF';

  // Ferroplast insulated panel (Polar White or OEM Royal Blue per RAR CIV, e.g. BH 33 STS = ALBASTRU)
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  if (isColoredBox) {
    grad.addColorStop(0, '#0284c7');
    grad.addColorStop(0.55, '#0369a1');
    grad.addColorStop(1, '#003d8f');
  } else {
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.84, '#f4f7fb');
    grad.addColorStop(1, '#e2e8f0');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 2048, 512);

  // Subtle vertical insulated panel joints every 160px
  ctx.strokeStyle = isColoredBox
    ? 'rgba(15, 23, 42, 0.28)'
    : 'rgba(148, 163, 184, 0.32)';
  ctx.lineWidth = 2;
  for (let x = 128; x < 2048; x += 160) {
    ctx.beginPath();
    ctx.moveTo(x, 22);
    ctx.lineTo(x, 468);
    ctx.stroke();
  }

  // Top & bottom anodized aluminum rail extrusions
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(0, 0, 2048, 22);
  ctx.fillRect(0, 468, 2048, 44);

  // Corporate lower & upper trim stripes
  const lowerStripeGrad = ctx.createLinearGradient(0, 0, 2048, 0);
  if (isColoredBox) {
    lowerStripeGrad.addColorStop(0, '#bae6fd');
    lowerStripeGrad.addColorStop(0.5, '#ffffff');
    lowerStripeGrad.addColorStop(1, '#bae6fd');
  } else {
    lowerStripeGrad.addColorStop(0, '#003d8f');
    lowerStripeGrad.addColorStop(0.5, '#0284c7');
    lowerStripeGrad.addColorStop(1, '#003d8f');
  }
  ctx.fillStyle = lowerStripeGrad;
  ctx.fillRect(0, 442, 2048, 24);

  ctx.fillStyle = isColoredBox ? '#7dd3fc' : '#0ea5e9';
  ctx.fillRect(0, 22, 2048, 10);

  // Top-left OEM manufacturer badge & top-right ATP Bi-Temp spec (leaves center 100% clean)
  const maker = isKrone ? 'KRONE COOL LINER' : 'SCHMITZ CARGOBULL · S.KO COOL';
  ctx.fillStyle = isColoredBox ? '#ffffff' : '#1e293b';
  ctx.font = '900 28px system-ui, -apple-system, "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(maker, 64, 74);

  ctx.fillStyle = isColoredBox ? '#e0f2fe' : '#0369a1';
  ctx.font = '800 24px system-ui, -apple-system, "Segoe UI", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(
    `ATP FRC BI-TEMP (${zone1Temp}°C / +${zone2Temp}°C) · 13.6 LDM · ${plateNumber}`,
    1984,
    74
  );

  // =========================================================================
  // CENTER CORPORATE FLEET LIVERY (Compensated for 12.65m x 2.66m UV aspect)
  // =========================================================================
  ctx.save();
  ctx.translate(1024, 0);
  ctx.scale(0.84, 1);

  const fontSize = brand.isScandexpres ? 128 : 104;
  ctx.font = `900 ${fontSize}px system-ui, -apple-system, "Segoe UI", Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  const textWidth = ctx.measureText(brand.primary).width;
  const halfText = textWidth / 2;

  // Dynamic slanted speed chevrons on the left of the company name
  const skewX = -34;
  const chevronBaseX = -halfText - 44;
  const chevronSpecs = isColoredBox
    ? [
        { offset: 0, width: 34, color: '#ffffff' },
        { offset: -48, width: 26, color: '#bae6fd' },
        { offset: -86, width: 16, color: '#38bdf8' },
      ]
    : [
        { offset: 0, width: 34, color: '#003d8f' },
        { offset: -48, width: 26, color: '#0284c7' },
        { offset: -86, width: 16, color: '#38bdf8' },
      ];
  chevronSpecs.forEach(({ offset, width, color }) => {
    const rightTopX = chevronBaseX + offset;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(rightTopX - width, 162);
    ctx.lineTo(rightTopX, 162);
    ctx.lineTo(rightTopX + skewX, 274);
    ctx.lineTo(rightTopX - width + skewX, 274);
    ctx.closePath();
    ctx.fill();
  });

  // Trailing aerodynamic chevrons on the right of the company name
  const rightBaseX = halfText + 44;
  const rightSpecs = isColoredBox
    ? [
        { offset: 0, width: 30, color: '#ffffff' },
        { offset: 42, width: 18, color: '#7dd3fc' },
      ]
    : [
        { offset: 0, width: 30, color: '#0284c7' },
        { offset: 42, width: 18, color: '#38bdf8' },
      ];
  rightSpecs.forEach(({ offset, width, color }) => {
    const leftTopX = rightBaseX + offset;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(leftTopX, 174);
    ctx.lineTo(leftTopX + width, 174);
    ctx.lineTo(leftTopX + width + skewX * 0.85, 270);
    ctx.lineTo(leftTopX + skewX * 0.85, 270);
    ctx.closePath();
    ctx.fill();
  });

  // Subtle crisp metallic drop highlight + wordmark
  ctx.fillStyle = isColoredBox ? 'rgba(15, 23, 42, 0.38)' : 'rgba(14, 165, 233, 0.20)';
  ctx.fillText(brand.primary, 4, 273);

  if (isColoredBox) {
    ctx.fillStyle = '#ffffff';
  } else {
    const wordGrad = ctx.createLinearGradient(0, 155, 0, 278);
    wordGrad.addColorStop(0, '#002e6e');
    wordGrad.addColorStop(0.55, '#004aad');
    wordGrad.addColorStop(1, '#0369a1');
    ctx.fillStyle = wordGrad;
  }
  ctx.fillText(brand.primary, 0, 269);

  // Sleek skewed corporate subtitle ribbon underneath the main company name
  const ribbonHalfW = Math.max(halfText + 36, 560);
  const ribbonTop = 298;
  const ribbonBottom = 352;
  const ribbonGrad = ctx.createLinearGradient(-ribbonHalfW, 0, ribbonHalfW, 0);
  if (isColoredBox) {
    ribbonGrad.addColorStop(0, '#0f172a');
    ribbonGrad.addColorStop(0.5, '#1e293b');
    ribbonGrad.addColorStop(1, '#0f172a');
  } else {
    ribbonGrad.addColorStop(0, '#003d8f');
    ribbonGrad.addColorStop(0.5, '#0284c7');
    ribbonGrad.addColorStop(1, '#003d8f');
  }
  ctx.fillStyle = ribbonGrad;
  ctx.beginPath();
  ctx.moveTo(-ribbonHalfW + 16, ribbonTop);
  ctx.lineTo(ribbonHalfW + 16, ribbonTop);
  ctx.lineTo(ribbonHalfW - 4, ribbonBottom);
  ctx.lineTo(-ribbonHalfW - 4, ribbonBottom);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 28px system-ui, -apple-system, "Segoe UI", Arial, sans-serif';
  ctx.fillText(brand.subtitle, 6, 335);

  ctx.restore();

  // ECE R104 yellow retro-reflective dashed safety tape along bottom rail
  ctx.fillStyle = '#facc15';
  for (let x = 28; x < 2020; x += 64) {
    ctx.fillRect(x, 478, 42, 14);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  return tex;
}

function createReeferRearDoorsTexture(
  isKrone: boolean,
  plateNumber: string,
  companyName?: string,
  trailerHex?: string
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 640;
  const ctx = canvas.getContext('2d')!;
  const brand = normalizeFleetCompany(companyName);
  const hexUpper = (trailerHex || '#F8FAFC').toUpperCase();
  const isColoredBox =
    hexUpper !== '#F8FAFC' && hexUpper !== '#F1F5F9' && hexUpper !== '#FFFFFF';

  ctx.fillStyle = isColoredBox ? '#0369a1' : '#f1f5f9';
  ctx.fillRect(0, 0, 512, 640);

  // Outer red ECE R70 retro-reflective contour border
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 12;
  ctx.strokeRect(18, 18, 476, 604);

  // Corporate branding plaques across Left & Right door leaves (under stainless locking bars)
  const drawDoorPlaque = (x: number, w: number, title: string, sub: string) => {
    const plaqueGrad = ctx.createLinearGradient(x, 182, x + w, 266);
    plaqueGrad.addColorStop(0, '#00357a');
    plaqueGrad.addColorStop(1, '#0284c7');
    ctx.fillStyle = plaqueGrad;
    ctx.fillRect(x, 182, w, 82);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(x, 182, w, 6);

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = title.length > 11 ? '900 21px system-ui, sans-serif' : '900 25px system-ui, sans-serif';
    ctx.fillText(title, x + w / 2, 224);

    ctx.fillStyle = '#bae6fd';
    ctx.font = '800 13px system-ui, sans-serif';
    ctx.fillText(sub, x + w / 2, 249);
  };

  drawDoorPlaque(34, 206, brand.rearLeft, 'FRIGO · BI-TEMP');
  drawDoorPlaque(272, 206, brand.rearRight, plateNumber);

  // Center rubber door seal split
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(252, 12, 8, 616);

  // 4 stainless-steel vertical door locking bars + handles
  [108, 198, 314, 404].forEach((x) => {
    const barGrad = ctx.createLinearGradient(x - 6, 0, x + 6, 0);
    barGrad.addColorStop(0, '#64748b');
    barGrad.addColorStop(0.5, '#f8fafc');
    barGrad.addColorStop(1, '#475569');
    ctx.fillStyle = barGrad;
    ctx.fillRect(x - 6, 26, 12, 588);

    // Handle latch
    ctx.fillStyle = '#334155';
    ctx.fillRect(x - 14, 410, 28, 52);
  });

  // Manufacturer upper right decal + speed limit 80/90 decals
  ctx.fillStyle = '#0369a1';
  ctx.font = '900 24px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(isKrone ? 'KRONE' : 'SCHMITZ', 380, 96);

  // 80 km/h circle
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(96, 535, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 7;
  ctx.stroke();
  ctx.fillStyle = '#0f172a';
  ctx.font = '900 24px system-ui, sans-serif';
  ctx.fillText('80', 96, 543);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  return tex;
}

function createSprinterBoxSideTexture(
  plateNumber: string,
  companyName?: string
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1536;
  canvas.height = 768;
  const ctx = canvas.getContext('2d')!;
  const brand = normalizeFleetCompany(companyName);

  // Crisp glossy Polar White insulated GRP/Ferroplast wall (BA04)
  const grad = ctx.createLinearGradient(0, 0, 0, 768);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.82, '#f8fafc');
  grad.addColorStop(1, '#e2e8f0');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1536, 768);

  // Anodized silver aluminum top & bottom perimeter profiles
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(0, 0, 1536, 26);
  ctx.fillRect(0, 720, 1536, 48);

  // Corporate upper & lower aerodynamic accent stripes
  ctx.fillStyle = '#0ea5e9';
  ctx.fillRect(0, 26, 1536, 12);

  const lowerGrad = ctx.createLinearGradient(0, 0, 1536, 0);
  lowerGrad.addColorStop(0, '#003d8f');
  lowerGrad.addColorStop(0.5, '#0284c7');
  lowerGrad.addColorStop(1, '#003d8f');
  ctx.fillStyle = lowerGrad;
  ctx.fillRect(0, 690, 1536, 28);

  // Top technical ATP & RAR BA04 spec callouts
  ctx.fillStyle = '#1e293b';
  ctx.font = '900 26px system-ui, -apple-system, "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('CAROSERIE FRIGO BA04 · THERMO KING C-250e', 52, 86);

  ctx.fillStyle = '#0369a1';
  ctx.font = '800 25px system-ui, -apple-system, "Segoe UI", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`EXPRESS 3.5T · 8 EURO-PALEȚI · ${plateNumber}`, 1484, 86);

  // Center corporate livery (aspect-compensated for 4.08m x 2.26m Sprinter box)
  ctx.save();
  ctx.translate(768, 388);
  ctx.scale(0.92, 1);

  const fontSize = brand.isScandexpres ? 116 : 86;
  ctx.font = `900 ${fontSize}px system-ui, -apple-system, "Segoe UI", Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  const textWidth = ctx.measureText(brand.primary).width;
  const halfText = textWidth / 2;

  // Dynamic slanted speed chevrons on the left
  const skewX = -32;
  const chevronBaseX = -halfText - 36;
  [
    { offset: 0, width: 32, color: '#003d8f' },
    { offset: -44, width: 24, color: '#0284c7' },
    { offset: -78, width: 15, color: '#38bdf8' },
  ].forEach(({ offset, width, color }) => {
    const rightTopX = chevronBaseX + offset;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(rightTopX - width, -84);
    ctx.lineTo(rightTopX, -84);
    ctx.lineTo(rightTopX + skewX, 18);
    ctx.lineTo(rightTopX - width + skewX, 18);
    ctx.closePath();
    ctx.fill();
  });

  // Trailing chevrons on the right
  const rightBaseX = halfText + 36;
  [
    { offset: 0, width: 26, color: '#0284c7' },
    { offset: 38, width: 16, color: '#38bdf8' },
  ].forEach(({ offset, width, color }) => {
    const leftTopX = rightBaseX + offset;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(leftTopX, -74);
    ctx.lineTo(leftTopX + width, -74);
    ctx.lineTo(leftTopX + width + skewX * 0.85, 14);
    ctx.lineTo(leftTopX + skewX * 0.85, 14);
    ctx.closePath();
    ctx.fill();
  });

  ctx.fillStyle = 'rgba(14, 165, 233, 0.18)';
  ctx.fillText(brand.primary, 4, 18);

  const wordGrad = ctx.createLinearGradient(0, -85, 0, 22);
  wordGrad.addColorStop(0, '#002e6e');
  wordGrad.addColorStop(0.55, '#004aad');
  wordGrad.addColorStop(1, '#0369a1');
  ctx.fillStyle = wordGrad;
  ctx.fillText(brand.primary, 0, 14);

  // Skewed subtitle ribbon
  const ribbonHalfW = Math.max(halfText + 28, 490);
  const ribbonGrad = ctx.createLinearGradient(-ribbonHalfW, 0, ribbonHalfW, 0);
  ribbonGrad.addColorStop(0, '#003d8f');
  ribbonGrad.addColorStop(0.5, '#0284c7');
  ribbonGrad.addColorStop(1, '#003d8f');
  ctx.fillStyle = ribbonGrad;
  ctx.beginPath();
  ctx.moveTo(-ribbonHalfW + 16, 40);
  ctx.lineTo(ribbonHalfW + 16, 40);
  ctx.lineTo(ribbonHalfW - 4, 94);
  ctx.lineTo(-ribbonHalfW - 4, 94);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 27px system-ui, -apple-system, "Segoe UI", Arial, sans-serif';
  ctx.fillText('EXPRESS FRIGO 3.5T · CONTROL TEMPERATURĂ ATP (-20°C / +12°C)', 6, 76);

  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  return tex;
}

function createSprinterRearDoorsTexture(
  plateNumber: string,
  companyName?: string
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 768;
  const ctx = canvas.getContext('2d')!;
  const brand = normalizeFleetCompany(companyName);

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 768, 768);

  // Aluminum outer frame + black rubber door seals
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 24;
  ctx.strokeRect(12, 12, 744, 744);
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 7;
  ctx.strokeRect(30, 30, 708, 708);

  // Center double-door rubber gasket
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(380, 26, 8, 716);

  // Stainless espagnolette locking rods + handles
  [256, 512].forEach((lx) => {
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(lx - 7, 34, 14, 700);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(lx - 18, 430, 36, 62);
  });

  // Corporate branding across upper doors
  ctx.fillStyle = '#003d8f';
  ctx.font = '900 32px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(brand.primary, 384, 168);

  ctx.fillStyle = '#0284c7';
  ctx.fillRect(108, 188, 552, 38);
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 19px system-ui, -apple-system, sans-serif';
  ctx.fillText(`MERCEDES-BENZ SPRINTER FRIGO · ${plateNumber}`, 384, 213);

  // Red ECE rear contour strips along bottom
  ctx.fillStyle = '#ef4444';
  for (let x = 44; x < 720; x += 54) {
    ctx.fillRect(x, 708, 36, 12);
  }

  // Round '90' speed limit decal on left door
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(124, 596, 36, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.fillStyle = '#0f172a';
  ctx.font = '900 28px system-ui, sans-serif';
  ctx.fillText('90', 124, 606);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  return tex;
}

function createSprinterGrilleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Matte anthracite Sprinter W906 radiator surround
  const bg = ctx.createLinearGradient(0, 0, 0, 512);
  bg.addColorStop(0, '#0f172a');
  bg.addColorStop(0.5, '#1e293b');
  bg.addColorStop(1, '#090d16');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1024, 512);

  // Deep radiator mesh behind slats
  ctx.fillStyle = '#050811';
  ctx.fillRect(36, 36, 952, 440);
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
  ctx.lineWidth = 2;
  for (let y = 52; y < 464; y += 18) {
    for (let x = 52; x < 972; x += 28) {
      ctx.strokeRect(x, y, 20, 11);
    }
  }

  // 3 signature Mercedes-Benz Sprinter W906 perforated horizontal slats with silver-grey leading edge
  [118, 256, 394].forEach((sy) => {
    const slatGrad = ctx.createLinearGradient(0, sy - 26, 0, sy + 26);
    slatGrad.addColorStop(0, '#334155');
    slatGrad.addColorStop(0.45, '#1e293b');
    slatGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = slatGrad;
    ctx.fillRect(44, sy - 24, 936, 48);

    // Chrome/silver top highlight line on each horizontal louver
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(52, sy - 22, 920, 5);

    // Perforated Sprinter grille slots on left & right of central star boss
    ctx.fillStyle = '#030712';
    for (let sx = 76; sx < 368; sx += 52) {
      ctx.fillRect(sx, sy - 9, 36, 18);
    }
    for (let sx = 620; sx < 940; sx += 52) {
      ctx.fillRect(sx, sy - 9, 36, 18);
    }
  });

  // Central gloss-black circular star boss backing
  ctx.fillStyle = '#0b1120';
  ctx.beginPath();
  ctx.arc(512, 256, 148, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createThermoKingC250Texture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 384;
  const ctx = canvas.getContext('2d')!;

  // White aerodynamic Thermo King over-cab nosemount housing
  const grad = ctx.createLinearGradient(0, 0, 0, 384);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.7, '#f1f5f9');
  grad.addColorStop(1, '#cbd5e1');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 384);

  // Dark louvered condenser intake grille on left & right
  [76, 656].forEach((gx) => {
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(gx, 64, 292, 252, 28);
    ctx.fill();

    ctx.fillStyle = '#334155';
    for (let ly = 88; ly < 296; ly += 22) {
      ctx.fillRect(gx + 22, ly, 248, 8);
    }
  });

  // Center Thermo King blue emblem + C-250e MAX badge
  ctx.fillStyle = '#0284c7';
  ctx.font = '900 48px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('TK', 512, 162);

  ctx.fillStyle = '#0f172a';
  ctx.font = '900 28px system-ui, -apple-system, sans-serif';
  ctx.fillText('THERMO KING', 512, 214);

  ctx.fillStyle = '#0369a1';
  ctx.font = '800 22px system-ui, -apple-system, sans-serif';
  ctx.fillText('C-250e MAX', 512, 252);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/* ============================================================================
   GEOMETRY BUILDERS (SCULPTED EXTRUSIONS, ALCOA RIMS, 4X2 CHASSIS, REEFER)
============================================================================ */

function createCenteredExtrude(
  shape: THREE.Shape,
  widthZ: number,
  bevelSize = 0.055,
  bevelThickness = 0.055
): THREE.ExtrudeGeometry {
  const innerDepth = Math.max(0.05, widthZ - bevelThickness * 2);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: innerDepth,
    bevelEnabled: true,
    bevelSize,
    bevelThickness,
    bevelSegments: 8,
    curveSegments: 28,
  });
  geo.translate(0, 0, -innerDepth / 2);
  geo.computeVertexNormals();
  return geo;
}

interface SharedMaterials {
  cabPaint: THREE.MeshPhysicalMaterial;
  cabSecondary: THREE.MeshPhysicalMaterial;
  darkChassis: THREE.MeshStandardMaterial;
  darkPlastic: THREE.MeshStandardMaterial;
  glossBlack: THREE.MeshPhysicalMaterial;
  chrome: THREE.MeshStandardMaterial;
  brushedAlu: THREE.MeshStandardMaterial;
  smokedGlass: THREE.MeshPhysicalMaterial;
  tireRubber: THREE.MeshStandardMaterial;
  ledWhite: THREE.MeshStandardMaterial;
  ledAmber: THREE.MeshStandardMaterial;
  ledRed: THREE.MeshStandardMaterial;
  catwalkAlu: THREE.MeshStandardMaterial;
}

function createHgvWheelAssembly(
  mats: SharedMaterials,
  isDual: boolean,
  sideSign: 1 | -1
): THREE.Group {
  const wheelGroup = new THREE.Group();
  const radius = 0.505;
  const tireWidth = 0.315;

  const buildSingleWheel = (offsetZ: number) => {
    const unit = new THREE.Group();
    unit.position.z = offsetZ;

    // Outer tire cylinder (rotated so cylinder axis = Z)
    const tireGeo = new THREE.CylinderGeometry(radius, radius, tireWidth * 0.84, 48, 1, false);
    tireGeo.rotateX(Math.PI / 2);
    const tireMesh = new THREE.Mesh(tireGeo, mats.tireRubber);
    tireMesh.castShadow = true;
    tireMesh.receiveShadow = true;
    unit.add(tireMesh);

    // Rounded tire shoulders (Left & Right Torus) so edges look like real pneumatic Michelin sidewalls
    const shoulderGeo = new THREE.TorusGeometry(radius - 0.055, 0.058, 16, 48);
    [-1, 1].forEach((s) => {
      const sh = new THREE.Mesh(shoulderGeo, mats.tireRubber);
      sh.position.z = s * (tireWidth * 0.36);
      unit.add(sh);
    });

    // Brushed Alcoa 22.5" Aluminum Rim
    const rimOuterR = 0.305;
    const rimRingGeo = new THREE.CylinderGeometry(rimOuterR, rimOuterR, tireWidth * 0.86, 36);
    rimRingGeo.rotateX(Math.PI / 2);
    unit.add(new THREE.Mesh(rimRingGeo, mats.brushedAlu));

    // Conical deep dish + outer face
    const faceZ = sideSign * (tireWidth * 0.39);
    const dishGeo = new THREE.CylinderGeometry(rimOuterR * 0.96, rimOuterR * 0.62, 0.06, 36);
    dishGeo.rotateX(Math.PI / 2);
    const dish = new THREE.Mesh(dishGeo, mats.chrome);
    dish.position.z = faceZ - sideSign * 0.02;
    unit.add(dish);

    // 10 chrome lug nuts + ventilation holes circle
    const lugGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.032, 10);
    lugGeo.rotateX(Math.PI / 2);
    const ventGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.065, 12);
    ventGeo.rotateX(Math.PI / 2);
    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI * 2) / 10;
      const lug = new THREE.Mesh(lugGeo, mats.chrome);
      lug.position.set(Math.cos(a) * 0.165, Math.sin(a) * 0.165, faceZ);
      unit.add(lug);

      const vent = new THREE.Mesh(ventGeo, mats.darkChassis);
      vent.position.set(
        Math.cos(a + Math.PI / 10) * 0.235,
        Math.sin(a + Math.PI / 10) * 0.235,
        faceZ - sideSign * 0.015
      );
      unit.add(vent);
    }

    // Center hubcap (heavy planetary hub on rear duals, sleek cap on steer/trailer)
    const hubLen = isDual ? 0.14 : 0.08;
    const hubR = isDual ? 0.125 : 0.105;
    const hubGeo = new THREE.CylinderGeometry(hubR * 0.88, hubR, hubLen, 24);
    hubGeo.rotateX(Math.PI / 2);
    const hub = new THREE.Mesh(hubGeo, isDual ? mats.darkChassis : mats.chrome);
    hub.position.z = faceZ + sideSign * (hubLen * 0.25);
    unit.add(hub);

    return unit;
  };

  if (isDual) {
    // Dual drive tires (inner + outer)
    wheelGroup.add(buildSingleWheel(-sideSign * 0.175));
    wheelGroup.add(buildSingleWheel(sideSign * 0.175));
  } else {
    wheelGroup.add(buildSingleWheel(0));
  }

  return wheelGroup;
}

function buildEuropeanTractor(
  props: TruckShowroom3DProps,
  mats: SharedMaterials,
  disposables: { geometries: THREE.BufferGeometry[]; textures: THREE.Texture[]; materials: THREE.Material[] }
): THREE.Group {
  const root = new THREE.Group();
  const isVolvo = props.bodyStyle === 'tractor-volvo';
  const isScania = props.bodyStyle === 'tractor-scania';
  const is6x2 = (props.axleConfig || '').includes('6x2');

  const brandKey: 'SCANIA' | 'VOLVO' | 'OTHER' = isScania
    ? 'SCANIA'
    : isVolvo
      ? 'VOLVO'
      : 'OTHER';

  const scaniaMatch = props.modelName.match(/\b([RSG])\s*(\d{3})\b/i);
  const volvoMatch = props.modelName.match(/\b(FH|FM)\s*(\d{3})\b/i);
  const modelBadge = isScania
    ? scaniaMatch
      ? `${scaniaMatch[1].toUpperCase()} ${scaniaMatch[2]}`
      : 'R 450'
    : isVolvo
      ? volvoMatch
        ? `${volvoMatch[1].toUpperCase()} ${volvoMatch[2]}`
        : 'FH 460'
      : props.modelName.split(' ').slice(0, 2).join(' ');

  /* ---- 1. 4x2 / 6x2 HEAVY CHASSIS FRAME RAILS ---- */
  const railGeo = new THREE.BoxGeometry(5.32, 0.24, 0.09);
  disposables.geometries.push(railGeo);
  [-0.43, 0.43].forEach((z) => {
    const rail = new THREE.Mesh(railGeo, mats.darkChassis);
    rail.position.set(-0.22, 0.86, z);
    rail.castShadow = true;
    root.add(rail);
  });

  // Crossmembers + Rear Differential + Air Suspension Bellows
  [-2.75, -2.15, -1.25, -0.15, 1.55, 2.45].forEach((x) => {
    const cmGeo = new THREE.BoxGeometry(0.14, 0.2, 0.88);
    disposables.geometries.push(cmGeo);
    const cm = new THREE.Mesh(cmGeo, mats.darkChassis);
    cm.position.set(x, 0.85, 0);
    root.add(cm);
  });

  // Drive axle tube + differential housing
  const axleTubeGeo = new THREE.CylinderGeometry(0.085, 0.085, 1.92, 20);
  axleTubeGeo.rotateX(Math.PI / 2);
  disposables.geometries.push(axleTubeGeo);
  const rearAxle = new THREE.Mesh(axleTubeGeo, mats.darkChassis);
  rearAxle.position.set(-2.15, 0.505, 0);
  root.add(rearAxle);

  const diffGeo = new THREE.SphereGeometry(0.22, 24, 18);
  disposables.geometries.push(diffGeo);
  const diff = new THREE.Mesh(diffGeo, mats.darkChassis);
  diff.position.set(-2.15, 0.505, 0);
  root.add(diff);

  // 4 rubber air-ride suspension bellows around rear axle
  const bellowGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.24, 20);
  disposables.geometries.push(bellowGeo);
  [
    [-1.82, -0.45],
    [-1.82, 0.45],
    [-2.48, -0.45],
    [-2.48, 0.45],
  ].forEach(([bx, bz]) => {
    const bel = new THREE.Mesh(bellowGeo, mats.darkPlastic);
    bel.position.set(bx, 0.68, bz);
    root.add(bel);
  });

  /* ---- 2. WHEELS (FRONT STEER + REAR DUAL DRIVE + OPTIONAL 6X2 TAG) ---- */
  const flWheel = createHgvWheelAssembly(mats, false, -1);
  flWheel.position.set(1.55, 0.505, -1.06);
  root.add(flWheel);

  const frWheel = createHgvWheelAssembly(mats, false, 1);
  frWheel.position.set(1.55, 0.505, 1.06);
  root.add(frWheel);

  const rlWheel = createHgvWheelAssembly(mats, true, -1);
  rlWheel.position.set(-2.15, 0.505, -0.94);
  root.add(rlWheel);

  const rrWheel = createHgvWheelAssembly(mats, true, 1);
  rrWheel.position.set(-2.15, 0.505, 0.94);
  root.add(rrWheel);

  if (is6x2) {
    const tlWheel = createHgvWheelAssembly(mats, false, -1);
    tlWheel.position.set(-1.02, 0.525, -1.04);
    root.add(tlWheel);
    const trWheel = createHgvWheelAssembly(mats, false, 1);
    trWheel.position.set(-1.02, 0.525, 1.04);
    root.add(trWheel);
  }

  /* ---- 3. CURVED REAR FENDERS + MUDFLAPS + LED TAIL LIGHTS ---- */
  [-0.95, 0.95].forEach((zCenter) => {
    // Curved half-arch fender over dual tires
    const fenderGeo = new THREE.CylinderGeometry(0.61, 0.61, 0.68, 32, 1, true, 0, Math.PI);
    fenderGeo.rotateZ(Math.PI / 2);
    fenderGeo.rotateY(Math.PI / 2);
    disposables.geometries.push(fenderGeo);
    const fenderMat = new THREE.MeshStandardMaterial({
      color: '#18212f',
      roughness: 0.55,
      metalness: 0.2,
      side: THREE.DoubleSide,
    });
    disposables.materials.push(fenderMat);
    const fender = new THREE.Mesh(fenderGeo, fenderMat);
    fender.position.set(-2.15, 0.52, zCenter);
    fender.castShadow = true;
    root.add(fender);

    // Rear mudflap behind rear tire
    const flapGeo = new THREE.BoxGeometry(0.025, 0.36, 0.62);
    disposables.geometries.push(flapGeo);
    const flap = new THREE.Mesh(flapGeo, mats.darkPlastic);
    flap.position.set(-2.75, 0.33, zCenter);
    root.add(flap);

    // White reflective strip at bottom of mudflap
    const stripGeo = new THREE.BoxGeometry(0.03, 0.045, 0.56);
    disposables.geometries.push(stripGeo);
    const strip = new THREE.Mesh(stripGeo, mats.ledWhite);
    strip.position.set(-2.755, 0.18, zCenter);
    root.add(strip);
  });

  // Rear tail light bar + 5-chamber Euro LED lamps + rear EU-RO plate
  const tailBarGeo = new THREE.BoxGeometry(0.1, 0.16, 2.15);
  disposables.geometries.push(tailBarGeo);
  const tailBar = new THREE.Mesh(tailBarGeo, mats.darkChassis);
  tailBar.position.set(-2.84, 0.72, 0);
  root.add(tailBar);

  [-0.82, 0.82].forEach((zLamp) => {
    const redGeo = new THREE.BoxGeometry(0.04, 0.11, 0.28);
    const ambGeo = new THREE.BoxGeometry(0.045, 0.11, 0.11);
    disposables.geometries.push(redGeo, ambGeo);
    const redLamp = new THREE.Mesh(redGeo, mats.ledRed);
    redLamp.position.set(-2.88, 0.72, zLamp);
    root.add(redLamp);
    const ambLamp = new THREE.Mesh(ambGeo, mats.ledAmber);
    ambLamp.position.set(-2.885, 0.72, zLamp + (zLamp > 0 ? 0.16 : -0.16));
    root.add(ambLamp);
  });

  const plateTex = createEuRoPlateTexture(props.plateNumber);
  disposables.textures.push(plateTex);
  const plateMat = new THREE.MeshStandardMaterial({
    map: plateTex,
    roughness: 0.3,
    metalness: 0.08,
  });
  disposables.materials.push(plateMat);

  const plateGeo = new THREE.PlaneGeometry(0.52, 0.115);
  disposables.geometries.push(plateGeo);

  // Rear plate
  const rearPlate = new THREE.Mesh(plateGeo, plateMat);
  rearPlate.position.set(-2.895, 0.72, 0);
  rearPlate.rotation.y = -Math.PI / 2;
  root.add(rearPlate);

  /* ---- 4. ALUMINUM FUEL TANKS + ADBLUE + AERODYNAMIC SIDE SKIRTS + CATWALK + 5TH WHEEL ---- */
  if (!is6x2) {
    // Polished 1000L Aluminum Fuel Tanks inside chassis
    const tankGeo = new THREE.BoxGeometry(1.52, 0.56, 0.58);
    disposables.geometries.push(tankGeo);
    [-0.78, 0.78].forEach((zt) => {
      const tank = new THREE.Mesh(tankGeo, mats.brushedAlu);
      tank.position.set(-0.42, 0.72, zt);
      tank.castShadow = true;
      root.add(tank);
    });

    // Blue AdBlue Tank Cap on left side behind cab
    const adBlueGeo = new THREE.CylinderGeometry(0.048, 0.048, 0.08, 16);
    disposables.geometries.push(adBlueGeo);
    const adBlueMat = new THREE.MeshStandardMaterial({
      color: '#0284c7',
      roughness: 0.3,
      metalness: 0.2,
    });
    disposables.materials.push(adBlueMat);
    const adBlue = new THREE.Mesh(adBlueGeo, adBlueMat);
    adBlue.position.set(0.22, 1.04, -0.96);
    root.add(adBlue);
  }

  // Painted Aerodynamic Side Skirts (left & right) with sculpted recess & amber side markers
  const skirtShape = new THREE.Shape();
  skirtShape.moveTo(-1.38, 0.36);
  skirtShape.lineTo(0.88, 0.36);
  skirtShape.quadraticCurveTo(0.95, 0.36, 0.95, 0.45);
  skirtShape.lineTo(0.86, 1.01);
  skirtShape.lineTo(-1.42, 1.01);
  skirtShape.quadraticCurveTo(-1.46, 0.68, -1.38, 0.36);

  const skirtGeo = createCenteredExtrude(skirtShape, 0.08, 0.02, 0.02);
  disposables.geometries.push(skirtGeo);

  [-1.19, 1.19].forEach((zs) => {
    const skirt = new THREE.Mesh(skirtGeo, mats.cabPaint);
    skirt.position.set(0, 0, zs);
    skirt.castShadow = true;
    skirt.receiveShadow = true;
    root.add(skirt);

    // Chrome trim strip along lower skirt
    const trimGeo = new THREE.BoxGeometry(2.15, 0.028, 0.095);
    disposables.geometries.push(trimGeo);
    const trim = new THREE.Mesh(trimGeo, mats.chrome);
    trim.position.set(-0.24, 0.43, zs);
    root.add(trim);

    // 2 glowing amber LED side-marker lamps
    [-0.95, 0.42].forEach((xm) => {
      const mGeo = new THREE.BoxGeometry(0.085, 0.032, 0.098);
      disposables.geometries.push(mGeo);
      const marker = new THREE.Mesh(mGeo, mats.ledAmber);
      marker.position.set(xm, 0.54, zs);
      root.add(marker);
    });
  });

  // Aluminum Diamond-Plate Catwalk behind cab
  const catwalkGeo = new THREE.BoxGeometry(1.42, 0.035, 1.18);
  disposables.geometries.push(catwalkGeo);
  const catwalk = new THREE.Mesh(catwalkGeo, mats.catwalkAlu);
  catwalk.position.set(-0.72, 1.0, 0);
  catwalk.receiveShadow = true;
  root.add(catwalk);

  // Jost 5th-Wheel Coupling Saddle (Șa de cuplare)
  const fifthGroup = new THREE.Group();
  fifthGroup.position.set(-1.92, 1.05, 0);

  const subPlateGeo = new THREE.BoxGeometry(0.76, 0.05, 0.96);
  disposables.geometries.push(subPlateGeo);
  fifthGroup.add(new THREE.Mesh(subPlateGeo, mats.darkChassis));

  // Horseshoe saddle plate tilted 5° rearward
  const saddleShape = new THREE.Shape();
  saddleShape.moveTo(0.36, -0.44);
  saddleShape.quadraticCurveTo(0.44, 0, 0.36, 0.44);
  saddleShape.lineTo(-0.34, 0.42);
  saddleShape.lineTo(-0.34, 0.14);
  saddleShape.lineTo(-0.02, 0.08);
  saddleShape.lineTo(-0.02, -0.08);
  saddleShape.lineTo(-0.34, -0.14);
  saddleShape.lineTo(-0.34, -0.42);
  saddleShape.closePath();

  const saddleGeo = new THREE.ExtrudeGeometry(saddleShape, {
    depth: 0.055,
    bevelEnabled: true,
    bevelSize: 0.015,
    bevelThickness: 0.015,
    bevelSegments: 4,
  });
  saddleGeo.rotateX(-Math.PI / 2);
  disposables.geometries.push(saddleGeo);
  const saddle = new THREE.Mesh(saddleGeo, mats.darkPlastic);
  saddle.position.y = 0.08;
  saddle.rotation.z = 0.08;
  saddle.castShadow = true;
  fifthGroup.add(saddle);

  // Pull-out release handle on left side of 5th wheel
  const handleGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.42, 8);
  handleGeo.rotateX(Math.PI / 2);
  disposables.geometries.push(handleGeo);
  const fHandle = new THREE.Mesh(handleGeo, mats.chrome);
  fHandle.position.set(0.04, 0.07, -0.56);
  fifthGroup.add(fHandle);

  root.add(fifthGroup);

  /* ---- 5. SCULPTED AERODYNAMIC EUROPEAN CAB + SLEEPER + HIGHLINE ROOF ---- */
  // Lower Front Bumper & Front Wheel Arches
  const bumperShape = new THREE.Shape();
  bumperShape.moveTo(1.98, 0.28);
  bumperShape.lineTo(2.74, 0.28);
  bumperShape.quadraticCurveTo(2.77, 0.34, 2.76, 0.56);
  bumperShape.lineTo(2.75, 1.16);
  bumperShape.lineTo(1.98, 1.16);
  bumperShape.closePath();

  const bumperGeo = createCenteredExtrude(bumperShape, 2.48, 0.065, 0.065);
  disposables.geometries.push(bumperGeo);
  const bumper = new THREE.Mesh(bumperGeo, mats.cabPaint);
  bumper.castShadow = true;
  bumper.receiveShadow = true;
  root.add(bumper);

  // Front lower dark lip splitter + lower intake mesh
  const lipGeo = new THREE.BoxGeometry(0.42, 0.08, 2.42);
  disposables.geometries.push(lipGeo);
  const lip = new THREE.Mesh(lipGeo, mats.darkPlastic);
  lip.position.set(2.64, 0.25, 0);
  root.add(lip);

  // Front EU-RO License Plate mounted proudly outside front bumper bevel (x = 2.825)
  const plateHolderGeo = new THREE.BoxGeometry(0.04, 0.14, 0.56);
  disposables.geometries.push(plateHolderGeo);
  const fHolder = new THREE.Mesh(plateHolderGeo, mats.darkPlastic);
  fHolder.position.set(2.835, 0.39, 0);
  root.add(fHolder);

  const frontPlate = new THREE.Mesh(plateGeo, plateMat);
  frontPlate.position.set(2.86, 0.39, 0);
  frontPlate.rotation.y = Math.PI / 2;
  root.add(frontPlate);

  // Front Wheel Arch Flares + 3 Perforated Boarding Steps
  [-1.16, 1.16].forEach((zSide) => {
    const archGeo = new THREE.CylinderGeometry(0.64, 0.64, 0.26, 32, 1, true, 0, Math.PI);
    archGeo.rotateZ(Math.PI / 2);
    archGeo.rotateY(Math.PI / 2);
    disposables.geometries.push(archGeo);
    const arch = new THREE.Mesh(archGeo, mats.darkPlastic);
    arch.position.set(1.55, 0.54, zSide);
    root.add(arch);

    // 3 aluminum cab boarding steps forward of front wheel
    [0.44, 0.68, 0.92].forEach((yStep) => {
      const stepGeo = new THREE.BoxGeometry(0.36, 0.032, 0.16);
      disposables.geometries.push(stepGeo);
      const step = new THREE.Mesh(stepGeo, mats.brushedAlu);
      step.position.set(2.28, yStep, zSide > 0 ? 1.22 : -1.22);
      root.add(step);
    });
  });

  // Main Sculpted Cab Body (Scania CR20H/CS20H vs Volvo FH Globetrotter profile)
  const cabShape = new THREE.Shape();
  cabShape.moveTo(0.06, 1.12);
  cabShape.lineTo(2.74, 1.12);
  cabShape.lineTo(2.74, 1.82);
  if (isVolvo) {
    // Volvo FH steeper raked windshield & aerodynamic wedge Globetrotter forehead
    cabShape.lineTo(2.38, 2.8);
    cabShape.quadraticCurveTo(2.14, 3.38, 1.62, 3.54);
    cabShape.lineTo(0.14, 3.54);
  } else {
    // Scania NextGen muscular upright windshield & Highline roof crown
    cabShape.lineTo(2.48, 2.84);
    cabShape.quadraticCurveTo(2.34, 3.38, 1.88, 3.5);
    cabShape.lineTo(0.14, 3.5);
  }
  cabShape.quadraticCurveTo(0.06, 3.48, 0.06, 3.32);
  cabShape.closePath();

  const cabGeo = createCenteredExtrude(cabShape, 2.46, 0.075, 0.075);
  disposables.geometries.push(cabGeo);
  const cabMesh = new THREE.Mesh(cabGeo, mats.cabPaint);
  cabMesh.castShadow = true;
  cabMesh.receiveShadow = true;
  root.add(cabMesh);

  // Sculpted Roof Wind Spoiler / Deflector + Side Cab Extenders
  const spoilerShape = new THREE.Shape();
  spoilerShape.moveTo(0.06, 3.46);
  spoilerShape.lineTo(1.55, 3.46);
  spoilerShape.quadraticCurveTo(0.85, 3.74, -0.24, 3.88);
  spoilerShape.lineTo(-0.28, 3.52);
  spoilerShape.closePath();

  const spoilerGeo = createCenteredExtrude(spoilerShape, 2.38, 0.04, 0.04);
  disposables.geometries.push(spoilerGeo);
  const spoiler = new THREE.Mesh(spoilerGeo, mats.cabPaint);
  spoiler.castShadow = true;
  root.add(spoiler);

  // Left & Right Rear Aerodynamic Cab Side Deflectors (Extenders)
  const extShape = new THREE.Shape();
  extShape.moveTo(-0.34, 1.14);
  extShape.lineTo(0.12, 1.14);
  extShape.lineTo(0.12, 3.52);
  extShape.lineTo(-0.26, 3.84);
  extShape.lineTo(-0.34, 3.48);
  extShape.closePath();

  const extGeo = createCenteredExtrude(extShape, 0.06, 0.015, 0.015);
  disposables.geometries.push(extGeo);
  [-1.2, 1.2].forEach((ze) => {
    const ext = new THREE.Mesh(extGeo, mats.cabPaint);
    ext.position.set(0, 0, ze);
    ext.castShadow = true;
    root.add(ext);
  });

  /* ---- 6. FRONT GRILLE MASK + LED HEADLIGHTS + ROOF SIGN (PROUD OF FRONT BEVEL x=2.825) ---- */
  const grilleTex = createFrontGrilleTexture(brandKey, modelBadge);
  disposables.textures.push(grilleTex);
  const grilleMat = new THREE.MeshStandardMaterial({
    map: grilleTex,
    roughness: 0.3,
    metalness: 0.42,
  });
  disposables.materials.push(grilleMat);

  // 3D Dark Grille Bezel + Front Textured Face at x = 2.858
  const grilleBezelGeo = new THREE.BoxGeometry(0.06, 1.34, 1.62);
  disposables.geometries.push(grilleBezelGeo);
  const grilleBezel = new THREE.Mesh(grilleBezelGeo, mats.glossBlack);
  grilleBezel.position.set(2.822, 1.16, 0);
  root.add(grilleBezel);

  const grillePlaneGeo = new THREE.PlaneGeometry(1.58, 1.3);
  disposables.geometries.push(grillePlaneGeo);
  const grilleMesh = new THREE.Mesh(grillePlaneGeo, grilleMat);
  grilleMesh.position.set(2.856, 1.16, 0);
  grilleMesh.rotation.y = Math.PI / 2;
  root.add(grilleMesh);

  // LED Projector Headlights (Scania C-DRL vs Volvo V-shaped Thor's Hammer DRL)
  [-0.99, 0.99].forEach((zh) => {
    const housingGeo = new THREE.BoxGeometry(0.075, isVolvo ? 0.46 : 0.3, 0.4);
    disposables.geometries.push(housingGeo);
    const housing = new THREE.Mesh(housingGeo, mats.glossBlack);
    housing.position.set(2.822, isVolvo ? 0.78 : 0.72, zh);
    root.add(housing);

    // Bright LED DRL signature strips
    const drlHorizGeo = new THREE.BoxGeometry(0.04, 0.042, 0.35);
    const drlVertGeo = new THREE.BoxGeometry(0.04, isVolvo ? 0.38 : 0.24, 0.045);
    disposables.geometries.push(drlHorizGeo, drlVertGeo);

    const hBar = new THREE.Mesh(drlHorizGeo, mats.ledWhite);
    hBar.position.set(2.852, isVolvo ? 0.62 : 0.59, zh);
    root.add(hBar);

    const vBar = new THREE.Mesh(drlVertGeo, mats.ledWhite);
    vBar.position.set(2.852, isVolvo ? 0.78 : 0.72, zh + (zh > 0 ? 0.15 : -0.15));
    root.add(vBar);

    // Amber corner turn indicator
    const turnGeo = new THREE.BoxGeometry(0.038, 0.045, 0.14);
    disposables.geometries.push(turnGeo);
    const turn = new THREE.Mesh(turnGeo, mats.ledAmber);
    turn.position.set(2.852, isVolvo ? 0.97 : 0.84, zh + (zh > 0 ? 0.1 : -0.1));
    root.add(turn);

    // Projector lens core
    const lensGeo = new THREE.SphereGeometry(0.06, 16, 16);
    disposables.geometries.push(lensGeo);
    const lens = new THREE.Mesh(lensGeo, mats.ledWhite);
    lens.position.set(2.838, isVolvo ? 0.78 : 0.73, zh);
    root.add(lens);

    // Lower bumper fog lamp
    const fogGeo = new THREE.BoxGeometry(0.05, 0.075, 0.2);
    disposables.geometries.push(fogGeo);
    const fog = new THREE.Mesh(fogGeo, mats.ledWhite);
    fog.position.set(2.845, 0.4, zh);
    root.add(fog);
  });

  // Roof Lightbox (GLOBETROTTER / SCANIA HIGHLINE) + Sunvisor + Roof Spotlights + Air Horns
  const roofLabel = isVolvo
    ? 'GLOBETROTTER XL'
    : isScania
      ? 'SCANIA HIGHLINE'
      : 'EURO 6 SUPER';
  const roofTex = createRoofSignTexture(roofLabel);
  disposables.textures.push(roofTex);
  const roofSignMat = new THREE.MeshStandardMaterial({
    map: roofTex,
    emissive: new THREE.Color('#ffffff'),
    emissiveMap: roofTex,
    emissiveIntensity: 0.45,
    roughness: 0.22,
  });
  disposables.materials.push(roofSignMat);

  const roofBoxGroup = new THREE.Group();
  roofBoxGroup.position.set(isVolvo ? 2.24 : 2.38, 3.21, 0);
  roofBoxGroup.rotation.z = isVolvo ? 0.54 : 0.44;
  const roofFrameGeo = new THREE.BoxGeometry(0.08, 0.26, 1.56);
  const roofSignGeo = new THREE.PlaneGeometry(1.5, 0.22);
  disposables.geometries.push(roofFrameGeo, roofSignGeo);
  roofBoxGroup.add(new THREE.Mesh(roofFrameGeo, mats.glossBlack));
  const roofSign = new THREE.Mesh(roofSignGeo, roofSignMat);
  roofSign.position.x = 0.043;
  roofSign.rotation.y = Math.PI / 2;
  roofBoxGroup.add(roofSign);
  root.add(roofBoxGroup);

  // Tinted External Sunvisor above windshield + 4 LED High-Beam Roof Spotlights
  const visorGeo = new THREE.BoxGeometry(0.24, 0.15, 2.42);
  disposables.geometries.push(visorGeo);
  const visor = new THREE.Mesh(visorGeo, mats.glossBlack);
  visor.position.set(isVolvo ? 2.54 : 2.64, 2.86, 0);
  visor.rotation.z = 0.2;
  root.add(visor);

  [-0.86, -0.32, 0.32, 0.86].forEach((zv) => {
    const vLedGeo = new THREE.BoxGeometry(0.04, 0.048, 0.2);
    disposables.geometries.push(vLedGeo);
    const vLed = new THREE.Mesh(vLedGeo, mats.ledWhite);
    vLed.position.set(isVolvo ? 2.65 : 2.75, 2.85, zv);
    root.add(vLed);
  });

  [-0.92, 0.92].forEach((zv) => {
    // Chrome Roof Air Horns
    const hornGeo = new THREE.CylinderGeometry(0.025, 0.052, 0.58, 16);
    hornGeo.rotateZ(Math.PI / 2);
    disposables.geometries.push(hornGeo);
    const horn = new THREE.Mesh(hornGeo, mats.chrome);
    horn.position.set(1.55, 3.57, zv);
    root.add(horn);
  });

  /* ---- 7. PANORAMIC SMOKED WINDSHIELD, SIDE WINDOWS, WIPERS, MIRRORS & 3D CAB INTERIOR ---- */
  // 3D Cab Interior visible through glass (Dashboard + Driver & Passenger High-Back Seats + Steering Wheel)
  const dashGeo = new THREE.BoxGeometry(0.55, 0.42, 2.18);
  disposables.geometries.push(dashGeo);
  const dash = new THREE.Mesh(dashGeo, mats.darkPlastic);
  dash.position.set(2.22, 1.72, 0);
  root.add(dash);

  [-0.62, 0.62].forEach((zs) => {
    const seatBackGeo = new THREE.BoxGeometry(0.18, 0.86, 0.52);
    disposables.geometries.push(seatBackGeo);
    const seat = new THREE.Mesh(seatBackGeo, mats.darkPlastic);
    seat.position.set(1.55, 2.02, zs);
    seat.rotation.z = -0.14;
    root.add(seat);
  });

  // Steering wheel on European Left-Hand-Drive side (z = -0.62)
  const wheelRimGeo = new THREE.TorusGeometry(0.21, 0.022, 12, 28);
  wheelRimGeo.rotateY(Math.PI / 2);
  disposables.geometries.push(wheelRimGeo);
  const stWheel = new THREE.Mesh(wheelRimGeo, mats.darkPlastic);
  stWheel.position.set(1.96, 1.98, -0.62);
  stWheel.rotation.z = 0.72;
  root.add(stWheel);

  // Flush Panoramic Front Windshield + Gloss-Black Seal Frame (proud of front cab bevel!)
  const wsAngle = isVolvo ? 0.352 : 0.25;
  const wsX = isVolvo ? 2.648 : 2.702;
  const wsY = isVolvo ? 2.31 : 2.33;

  const wsFrameGeo = new THREE.BoxGeometry(0.04, 1.08, 2.36);
  const wsGeo = new THREE.BoxGeometry(0.052, 0.98, 2.24);
  disposables.geometries.push(wsFrameGeo, wsGeo);

  const wsFrame = new THREE.Mesh(wsFrameGeo, mats.glossBlack);
  wsFrame.position.set(wsX, wsY, 0);
  wsFrame.rotation.z = wsAngle;
  root.add(wsFrame);

  const windshield = new THREE.Mesh(wsGeo, mats.smokedGlass);
  windshield.position.set(wsX + 0.008, wsY, 0);
  windshield.rotation.z = wsAngle;
  root.add(windshield);

  // Dual Windshield Wipers outside lower glass seal
  [-0.5, 0.36].forEach((zw) => {
    const wiperGeo = new THREE.BoxGeometry(0.035, 0.032, 0.72);
    disposables.geometries.push(wiperGeo);
    const wiper = new THREE.Mesh(wiperGeo, mats.glossBlack);
    wiper.position.set(2.835, 1.84, zw);
    root.add(wiper);
  });

  // Side Door Windows (3D Recessed Frame + Gloss Smoked Glass proud of z = ±1.23)
  const winShape = new THREE.Shape();
  winShape.moveTo(1.18, 1.92);
  winShape.lineTo(2.44, 1.8);
  winShape.lineTo(2.26, 2.76);
  winShape.lineTo(1.18, 2.76);
  winShape.closePath();

  const sideWinGeo = new THREE.ExtrudeGeometry(winShape, {
    depth: 0.024,
    bevelEnabled: false,
  });
  sideWinGeo.translate(0, 0, -0.012);
  disposables.geometries.push(sideWinGeo);

  [-1, 1].forEach((side) => {
    const winMesh = new THREE.Mesh(sideWinGeo, mats.glossBlack);
    winMesh.position.z = side * 1.236;
    root.add(winMesh);

    // Door panel shutlines + sleeper storage locker frame
    const lockerGeo = new THREE.BoxGeometry(0.56, 0.62, 0.016);
    disposables.geometries.push(lockerGeo);
    const locker = new THREE.Mesh(lockerGeo, mats.cabSecondary);
    locker.position.set(0.58, 1.56, side * 1.234);
    root.add(locker);

    // Door handle recess + chrome model badge
    const handleBarGeo = new THREE.BoxGeometry(0.22, 0.048, 0.032);
    disposables.geometries.push(handleBarGeo);
    const dHandle = new THREE.Mesh(handleBarGeo, mats.glossBlack);
    dHandle.position.set(1.36, 1.48, side * 1.242);
    root.add(dHandle);

    const badgeBarGeo = new THREE.BoxGeometry(0.36, 0.048, 0.028);
    disposables.geometries.push(badgeBarGeo);
    const dBadge = new THREE.Mesh(badgeBarGeo, mats.chrome);
    dBadge.position.set(2.18, 1.52, side * 1.242);
    root.add(dBadge);

    // Aerodynamic Twin Wing Mirror Assembly
    const mirrorGroup = new THREE.Group();
    const armGeo = new THREE.BoxGeometry(0.05, 0.05, 0.24);
    const housingMainGeo = new THREE.BoxGeometry(0.14, 0.64, 0.21);
    const glassMainGeo = new THREE.PlaneGeometry(0.17, 0.56);
    disposables.geometries.push(armGeo, housingMainGeo, glassMainGeo);

    const topArm = new THREE.Mesh(armGeo, mats.glossBlack);
    topArm.position.set(2.34, 2.66, side * 1.32);
    mirrorGroup.add(topArm);

    const botArm = new THREE.Mesh(armGeo, mats.glossBlack);
    botArm.position.set(2.44, 1.96, side * 1.32);
    mirrorGroup.add(botArm);

    const mHousing = new THREE.Mesh(housingMainGeo, mats.cabPaint);
    mHousing.position.set(2.39, 2.31, side * 1.43);
    mHousing.castShadow = true;
    mirrorGroup.add(mHousing);

    // Rear-facing reflective mirror glass
    const mGlass = new THREE.Mesh(glassMainGeo, mats.chrome);
    mGlass.position.set(2.315, 2.31, side * 1.43);
    mGlass.rotation.y = -Math.PI / 2;
    mirrorGroup.add(mGlass);

    root.add(mirrorGroup);
  });

  /* ---- 8. BACK OF CAB GANTRY: COILED SPIRAL AIR/EBS HOSES + SNORKEL ---- */
  // Right-rear vertical air intake stack
  const snorkelGeo = new THREE.BoxGeometry(0.11, 1.95, 0.28);
  disposables.geometries.push(snorkelGeo);
  const snorkel = new THREE.Mesh(snorkelGeo, mats.darkPlastic);
  snorkel.position.set(0.01, 2.28, 0.72);
  root.add(snorkel);

  // Coiled Red, Yellow & Black pneumatic/EBS spiral hoses from cab back to chassis
  const hoseSpecs: Array<{ zOffset: number; color: string }> = [
    { zOffset: -0.22, color: '#ef4444' },
    { zOffset: -0.06, color: '#eab308' },
    { zOffset: 0.1, color: '#1e293b' },
  ];
  hoseSpecs.forEach(({ zOffset, color }) => {
    const pts: THREE.Vector3[] = [];
    const turns = 7;
    for (let i = 0; i <= 48; i++) {
      const t = i / 48;
      const angle = t * turns * Math.PI * 2;
      const x = -0.04 - Math.sin(t * Math.PI) * 0.34 + Math.cos(angle) * 0.038;
      const y = 1.88 - t * 0.78 + Math.sin(t * Math.PI) * -0.12;
      const z = zOffset + Math.sin(angle) * 0.038;
      pts.push(new THREE.Vector3(x, y, z));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const hoseGeo = new THREE.TubeGeometry(curve, 48, 0.014, 8, false);
    disposables.geometries.push(hoseGeo);
    const hoseMat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.4,
      metalness: 0.1,
    });
    disposables.materials.push(hoseMat);
    root.add(new THREE.Mesh(hoseGeo, hoseMat));
  });

  return root;
}

function buildReeferTrailer(
  props: TruckShowroom3DProps,
  mats: SharedMaterials,
  isCoupled: boolean,
  disposables: { geometries: THREE.BufferGeometry[]; textures: THREE.Texture[]; materials: THREE.Material[] }
): THREE.Group {
  const root = new THREE.Group();
  const isKrone = props.bodyStyle === 'trailer-krone' || props.modelName.toLowerCase().includes('krone');
  const trailerPlate = isCoupled
    ? props.partnerPlateNumber || props.plateNumber
    : props.plateNumber;
  const trailerCompany = isCoupled
    ? props.trailerCompanyName || props.companyName
    : props.companyName;
  const effectiveTrailerHex = isCoupled
    ? props.trailerOemHex || '#f8fafc'
    : props.oemHex || '#f8fafc';
  const hexUpper = effectiveTrailerHex.toUpperCase();
  const isColoredBox =
    hexUpper !== '#F8FAFC' && hexUpper !== '#F1F5F9' && hexUpper !== '#FFFFFF';

  const boxLength = 12.65; // ~13.6m scaled harmoniously with Thermo King nose
  const boxHeight = 2.66;
  const boxWidth = 2.58;
  const boxCenterY = 1.2 + boxHeight / 2; // Floor at y=1.20, Roof at y=3.86

  /* ---- 1. INSULATED BI-TEMP FERROPLAST BOX ---- */
  const sideTex = createReeferSideTexture(
    isKrone,
    trailerPlate,
    props.zone1Temp ?? -18,
    props.zone2Temp ?? 4,
    trailerCompany,
    effectiveTrailerHex
  );
  const rearTex = createReeferRearDoorsTexture(
    isKrone,
    trailerPlate,
    trailerCompany,
    effectiveTrailerHex
  );
  disposables.textures.push(sideTex, rearTex);

  const sideMat = new THREE.MeshPhysicalMaterial({
    map: sideTex,
    roughness: 0.24,
    metalness: 0.08,
    clearcoat: 0.65,
    clearcoatRoughness: 0.12,
  });
  const rearMat = new THREE.MeshPhysicalMaterial({
    map: rearTex,
    roughness: 0.3,
    metalness: 0.18,
    clearcoat: 0.5,
  });
  const boxBulkheadMat = new THREE.MeshPhysicalMaterial({
    color: isColoredBox ? '#0284c7' : '#f8fafc',
    roughness: 0.28,
    metalness: 0.08,
    clearcoat: 0.6,
  });
  const whiteRoofMat = new THREE.MeshPhysicalMaterial({
    color: '#f8fafc',
    roughness: 0.28,
    metalness: 0.06,
    clearcoat: 0.6,
  });
  disposables.materials.push(sideMat, rearMat, boxBulkheadMat, whiteRoofMat);

  // BoxGeometry material order: [+X (front), -X (rear doors), +Y (roof), -Y (floor), +Z (right side), -Z (left side)]
  const boxGeo = new THREE.BoxGeometry(boxLength, boxHeight, boxWidth);
  disposables.geometries.push(boxGeo);
  const boxMesh = new THREE.Mesh(boxGeo, [
    boxBulkheadMat,
    rearMat,
    boxBulkheadMat,
    mats.darkChassis,
    sideMat,
    sideMat,
  ]);
  boxMesh.position.set(0, boxCenterY, 0);
  boxMesh.castShadow = true;
  boxMesh.receiveShadow = true;
  root.add(boxMesh);

  /* ---- 2. FRONT THERMO KING SLXi SPECTRUM REFRIGERATION UNIT ---- */
  const tkShape = new THREE.Shape();
  tkShape.moveTo(0, -1.02);
  tkShape.lineTo(0.46, -0.94);
  tkShape.quadraticCurveTo(0.56, 0, 0.44, 0.96);
  tkShape.lineTo(0, 1.04);
  tkShape.closePath();

  const tkGeo = createCenteredExtrude(tkShape, 1.88, 0.05, 0.05);
  disposables.geometries.push(tkGeo);
  const tkBody = new THREE.Mesh(tkGeo, mats.darkPlastic);
  tkBody.position.set(boxLength / 2 - 0.02, boxCenterY + 0.1, 0);
  tkBody.castShadow = true;
  root.add(tkBody);

  // Thermo King white aerodynamic center cowl + chrome trim + Bi-Temp status LED
  const tkGrilleGeo = new THREE.BoxGeometry(0.12, 1.28, 1.38);
  disposables.geometries.push(tkGrilleGeo);
  const tkGrille = new THREE.Mesh(tkGrilleGeo, whiteRoofMat);
  tkGrille.position.set(boxLength / 2 + 0.48, boxCenterY + 0.12, 0);
  root.add(tkGrille);

  const tkVentGeo = new THREE.BoxGeometry(0.14, 0.56, 1.16);
  disposables.geometries.push(tkVentGeo);
  const tkVent = new THREE.Mesh(tkVentGeo, mats.glossBlack);
  tkVent.position.set(boxLength / 2 + 0.49, boxCenterY + 0.28, 0);
  root.add(tkVent);

  const statusLedGeo = new THREE.BoxGeometry(0.06, 0.26, 0.08);
  disposables.geometries.push(statusLedGeo);
  const statusMat = new THREE.MeshStandardMaterial({
    color: '#38bdf8',
    emissive: new THREE.Color('#0ea5e9'),
    emissiveIntensity: 2.0,
  });
  disposables.materials.push(statusMat);
  const statusLed = new THREE.Mesh(statusLedGeo, statusMat);
  statusLed.position.set(boxLength / 2 + 0.26, boxCenterY + 0.35, 0.96);
  root.add(statusLed);

  /* ---- 3. GALVANIZED / ANTHRACITE SUB-CHASSIS, LANDING GEAR, PALLET BOX & 3 AXLES ---- */
  const subFrameGeo = new THREE.BoxGeometry(8.8, 0.22, 1.16);
  disposables.geometries.push(subFrameGeo);
  const subFrame = new THREE.Mesh(subFrameGeo, mats.darkChassis);
  subFrame.position.set(-1.7, 1.06, 0);
  root.add(subFrame);

  // Under-slung closed Euro-pallet carrier box (Ladă paleți 36 EUR)
  const palBoxGeo = new THREE.BoxGeometry(2.85, 0.48, 2.42);
  disposables.geometries.push(palBoxGeo);
  const palBox = new THREE.Mesh(palBoxGeo, mats.brushedAlu);
  palBox.position.set(0.75, 0.72, 0);
  palBox.castShadow = true;
  root.add(palBox);

  // Telescopic Landing Gear Legs (retracted when coupled, down on turntable when uncoupled)
  const legHeight = isCoupled ? 0.62 : 1.16;
  const legY = isCoupled ? 0.86 : 0.58;
  const legGeo = new THREE.BoxGeometry(0.14, legHeight, 0.14);
  const footGeo = new THREE.BoxGeometry(0.28, 0.04, 0.26);
  disposables.geometries.push(legGeo, footGeo);
  [-0.92, 0.92].forEach((zl) => {
    const leg = new THREE.Mesh(legGeo, mats.darkChassis);
    leg.position.set(3.15, legY, zl);
    leg.castShadow = true;
    root.add(leg);
    if (!isCoupled) {
      const foot = new THREE.Mesh(footGeo, mats.darkChassis);
      foot.position.set(3.15, 0.02, zl);
      root.add(foot);
    }
  });

  // 3-Axle SAF / Schmitz Disc-Brake Bogie (6 Single Super-Single 385/65 R22.5 Wheels)
  [-2.15, -3.38, -4.61].forEach((xAxle) => {
    const tAxleGeo = new THREE.CylinderGeometry(0.075, 0.075, 2.04, 16);
    tAxleGeo.rotateX(Math.PI / 2);
    disposables.geometries.push(tAxleGeo);
    const tAxle = new THREE.Mesh(tAxleGeo, mats.darkChassis);
    tAxle.position.set(xAxle, 0.505, 0);
    root.add(tAxle);

    const wLeft = createHgvWheelAssembly(mats, false, -1);
    wLeft.position.set(xAxle, 0.505, -1.04);
    root.add(wLeft);

    const wRight = createHgvWheelAssembly(mats, false, 1);
    wRight.position.set(xAxle, 0.505, 1.04);
    root.add(wRight);
  });

  // Curved Continuous Tri-Axle Mudguard + Rear Underrun Bumper + LED Lamps + Plate
  [-1.04, 1.04].forEach((zm) => {
    const guardGeo = new THREE.BoxGeometry(3.85, 0.06, 0.54);
    disposables.geometries.push(guardGeo);
    const guard = new THREE.Mesh(guardGeo, mats.darkPlastic);
    guard.position.set(-3.38, 1.08, zm);
    root.add(guard);
  });

  // Rear underrun protection bar + LED tail lights + EU-RO trailer license plate
  const rearBumperGeo = new THREE.BoxGeometry(0.14, 0.18, 2.46);
  disposables.geometries.push(rearBumperGeo);
  const rearBumper = new THREE.Mesh(rearBumperGeo, mats.brushedAlu);
  rearBumper.position.set(-boxLength / 2 + 0.08, 0.56, 0);
  root.add(rearBumper);

  [-0.92, 0.92].forEach((zr) => {
    const tlGeo = new THREE.BoxGeometry(0.05, 0.12, 0.36);
    disposables.geometries.push(tlGeo);
    const tl = new THREE.Mesh(tlGeo, mats.ledRed);
    tl.position.set(-boxLength / 2 + 0.01, 0.56, zr);
    root.add(tl);
  });

  const trPlateTex = createEuRoPlateTexture(trailerPlate);
  disposables.textures.push(trPlateTex);
  const trPlateMat = new THREE.MeshStandardMaterial({
    map: trPlateTex,
    roughness: 0.3,
    metalness: 0.08,
  });
  disposables.materials.push(trPlateMat);
  const trPlateGeo = new THREE.PlaneGeometry(0.52, 0.115);
  disposables.geometries.push(trPlateGeo);
  const trPlateMesh = new THREE.Mesh(trPlateGeo, trPlateMat);
  trPlateMesh.position.set(-boxLength / 2 + 0.005, 0.56, 0);
  trPlateMesh.rotation.y = -Math.PI / 2;
  root.add(trPlateMesh);

  return root;
}

/* ============================================================================
   MERCEDES-BENZ SPRINTER 316 CDI FRIGO BA04 (W906 · 3.5T · THERMO KING C-250e)
   Exact RAR CIV Proportions: 6.50m L × 2.36m W × 3.00m H · Wheelbase 3.665m
============================================================================ */

function createSprinterWheelAssembly(
  mats: SharedMaterials,
  sideSign: 1 | -1,
  disposables: { geometries: THREE.BufferGeometry[]; textures: THREE.Texture[]; materials: THREE.Material[] }
): THREE.Group {
  const unit = new THREE.Group();
  const radius = 0.365; // 195/75 R16C outer radius (~730mm diameter)
  const tireWidth = 0.215;

  const tireGeo = new THREE.CylinderGeometry(radius, radius, tireWidth * 0.82, 44, 1, false);
  tireGeo.rotateX(Math.PI / 2);
  const shoulderGeo = new THREE.TorusGeometry(radius - 0.04, 0.042, 14, 44);
  const rimRingGeo = new THREE.CylinderGeometry(0.218, 0.218, tireWidth * 0.86, 36);
  rimRingGeo.rotateX(Math.PI / 2);

  const faceZ = sideSign * (tireWidth * 0.39);
  const diskGeo = new THREE.CylinderGeometry(0.195, 0.214, 0.036, 36);
  diskGeo.rotateX(Math.PI / 2);
  const ventGeo = new THREE.CylinderGeometry(0.017, 0.017, 0.048, 12);
  ventGeo.rotateX(Math.PI / 2);
  const lugGeo = new THREE.CylinderGeometry(0.011, 0.011, 0.026, 8);
  lugGeo.rotateX(Math.PI / 2);
  const capGeo = new THREE.CylinderGeometry(0.072, 0.082, 0.048, 24);
  capGeo.rotateX(Math.PI / 2);

  disposables.geometries.push(
    tireGeo,
    shoulderGeo,
    rimRingGeo,
    diskGeo,
    ventGeo,
    lugGeo,
    capGeo
  );

  const tireMesh = new THREE.Mesh(tireGeo, mats.tireRubber);
  tireMesh.castShadow = true;
  tireMesh.receiveShadow = true;
  unit.add(tireMesh);

  [-1, 1].forEach((s) => {
    const sh = new THREE.Mesh(shoulderGeo, mats.tireRubber);
    sh.position.z = s * (tireWidth * 0.35);
    unit.add(sh);
  });

  // 16" Sprinter commercial silver steel wheel + 12 round vent holes + black Mercedes hubcap
  unit.add(new THREE.Mesh(rimRingGeo, mats.brushedAlu));

  const disk = new THREE.Mesh(diskGeo, mats.brushedAlu);
  disk.position.z = faceZ - sideSign * 0.012;
  unit.add(disk);

  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI * 2) / 12;
    const vent = new THREE.Mesh(ventGeo, mats.darkChassis);
    vent.position.set(Math.cos(a) * 0.156, Math.sin(a) * 0.156, faceZ - sideSign * 0.008);
    unit.add(vent);
  }

  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI * 2) / 6;
    const lug = new THREE.Mesh(lugGeo, mats.chrome);
    lug.position.set(Math.cos(a) * 0.104, Math.sin(a) * 0.104, faceZ + sideSign * 0.008);
    unit.add(lug);
  }

  const centerCap = new THREE.Mesh(capGeo, mats.darkPlastic);
  centerCap.position.z = faceZ + sideSign * 0.016;
  unit.add(centerCap);

  return unit;
}

function buildMercedesSprinterFrigo(
  props: TruckShowroom3DProps,
  mats: SharedMaterials,
  disposables: { geometries: THREE.BufferGeometry[]; textures: THREE.Texture[]; materials: THREE.Material[] }
): THREE.Group {
  const root = new THREE.Group();

  // RAR CIV BH 81 STS: Wheelbase 3.665m (front X = +2.02, rear X = -1.645), wheel center Y = 0.365
  const frontAxleX = 2.02;
  const rearAxleX = -1.645;
  const wheelY = 0.365;

  /* ---- 1. CHASSIS FRAME RAILS, 75L TANK, SIDE UNDERRUN & 16" WHEELS ---- */
  const railGeo = new THREE.BoxGeometry(5.76, 0.14, 0.08);
  disposables.geometries.push(railGeo);
  [-0.42, 0.42].forEach((zr) => {
    const rail = new THREE.Mesh(railGeo, mats.darkChassis);
    rail.position.set(-0.28, 0.56, zr);
    rail.castShadow = true;
    root.add(rail);
  });

  // Crossmembers + rear axle differential housing
  const diffRodGeo = new THREE.CylinderGeometry(0.055, 0.055, 1.68, 16);
  diffRodGeo.rotateX(Math.PI / 2);
  const diffPumpkinGeo = new THREE.SphereGeometry(0.14, 18, 18);
  const frontBeamGeo = new THREE.BoxGeometry(0.12, 0.09, 1.66);
  disposables.geometries.push(diffRodGeo, diffPumpkinGeo, frontBeamGeo);

  const rearAxleRod = new THREE.Mesh(diffRodGeo, mats.darkChassis);
  rearAxleRod.position.set(rearAxleX, wheelY, 0);
  root.add(rearAxleRod);

  const diffPumpkin = new THREE.Mesh(diffPumpkinGeo, mats.darkChassis);
  diffPumpkin.position.set(rearAxleX, wheelY, 0);
  root.add(diffPumpkin);

  const frontBeam = new THREE.Mesh(frontBeamGeo, mats.darkChassis);
  frontBeam.position.set(frontAxleX, wheelY, 0);
  root.add(frontBeam);

  // 4x 195/75 R16C commercial wheels
  ([-1, 1] as Array<-1 | 1>).forEach((sideSign) => {
    const fw = createSprinterWheelAssembly(mats, sideSign, disposables);
    fw.position.set(frontAxleX, wheelY, sideSign * 0.88);
    root.add(fw);

    const rw = createSprinterWheelAssembly(mats, sideSign, disposables);
    rw.position.set(rearAxleX, wheelY, sideSign * 0.89);
    root.add(rw);
  });

  // Matte-black rounded rear wheel-arch mudguards + mudflaps
  const rearArchGeo = new THREE.CylinderGeometry(0.44, 0.44, 0.30, 32, 1, true, 0, Math.PI);
  rearArchGeo.rotateZ(Math.PI / 2);
  rearArchGeo.rotateY(Math.PI / 2);
  const flapGeo = new THREE.BoxGeometry(0.022, 0.24, 0.28);
  disposables.geometries.push(rearArchGeo, flapGeo);

  [-0.90, 0.90].forEach((zm) => {
    const rArch = new THREE.Mesh(rearArchGeo, mats.darkPlastic);
    rArch.position.set(rearAxleX, wheelY + 0.02, zm);
    root.add(rArch);

    const flap = new THREE.Mesh(flapGeo, mats.darkPlastic);
    flap.position.set(rearAxleX - 0.43, 0.26, zm);
    root.add(flap);
  });

  // Left-side 75L Sprinter black plastic fuel tank (CIV W: 75 L) + twin aluminum side underrun bars
  const fuelTankGeo = new THREE.BoxGeometry(0.84, 0.26, 0.36);
  const sideGuardGeo = new THREE.BoxGeometry(1.76, 0.055, 0.03);
  const sideStrutGeo = new THREE.BoxGeometry(0.04, 0.28, 0.14);
  disposables.geometries.push(fuelTankGeo, sideGuardGeo, sideStrutGeo);

  const fuelTank = new THREE.Mesh(fuelTankGeo, mats.darkPlastic);
  fuelTank.position.set(0.32, 0.47, -0.66);
  fuelTank.castShadow = true;
  root.add(fuelTank);

  [-1.06, 1.06].forEach((zs) => {
    [0.42, 0.54].forEach((ys) => {
      const bar = new THREE.Mesh(sideGuardGeo, mats.brushedAlu);
      bar.position.set(-0.18, ys, zs);
      root.add(bar);
    });
    [-0.78, 0.42].forEach((xs) => {
      const strut = new THREE.Mesh(sideStrutGeo, mats.darkChassis);
      strut.position.set(xs, 0.54, zs > 0 ? zs - 0.07 : zs + 0.07);
      root.add(strut);
    });
  });

  /* ---- 2. INSULATED WHITE FRIGO BOX (BA04 · 4.08m × 2.26m × 2.26m) ---- */
  const boxLength = 4.08;
  const boxHeight = 2.26;
  const boxWidth = 2.26;
  const boxCenterX = -1.12; // spans X = -3.16 .. +0.92
  const boxCenterY = 0.68 + boxHeight / 2; // Y = 0.68 .. 2.94 (center 1.81)

  const spSideTex = createSprinterBoxSideTexture(props.plateNumber, props.companyName);
  const spRearTex = createSprinterRearDoorsTexture(props.plateNumber, props.companyName);
  disposables.textures.push(spSideTex, spRearTex);

  const spSideMat = new THREE.MeshPhysicalMaterial({
    map: spSideTex,
    roughness: 0.22,
    metalness: 0.06,
    clearcoat: 0.72,
    clearcoatRoughness: 0.1,
  });
  const spRearMat = new THREE.MeshPhysicalMaterial({
    map: spRearTex,
    roughness: 0.28,
    metalness: 0.14,
    clearcoat: 0.55,
  });
  const spWhiteBoxMat = new THREE.MeshPhysicalMaterial({
    color: '#f8fafc',
    roughness: 0.24,
    metalness: 0.06,
    clearcoat: 0.65,
  });
  disposables.materials.push(spSideMat, spRearMat, spWhiteBoxMat);

  const boxGeo = new THREE.BoxGeometry(boxLength, boxHeight, boxWidth);
  disposables.geometries.push(boxGeo);
  const boxMesh = new THREE.Mesh(boxGeo, [
    spWhiteBoxMat, // +X front bulkhead
    spRearMat,     // -X rear double doors
    spWhiteBoxMat, // +Y roof
    mats.darkChassis, // -Y subfloor
    spSideMat,     // +Z right wall
    spSideMat,     // -Z left wall
  ]);
  boxMesh.position.set(boxCenterX, boxCenterY, 0);
  boxMesh.castShadow = true;
  boxMesh.receiveShadow = true;
  root.add(boxMesh);

  // Brushed anodized aluminum corner extrusions around the BA04 box (matches sprinter-frigo-black.jpg)
  const vCornerGeo = new THREE.BoxGeometry(0.055, boxHeight + 0.02, 0.055);
  const hLongCornerGeo = new THREE.BoxGeometry(boxLength + 0.02, 0.055, 0.055);
  const hCrossCornerGeo = new THREE.BoxGeometry(0.055, 0.055, boxWidth + 0.02);
  disposables.geometries.push(vCornerGeo, hLongCornerGeo, hCrossCornerGeo);

  [boxCenterX - boxLength / 2, boxCenterX + boxLength / 2].forEach((xc) => {
    [-boxWidth / 2, boxWidth / 2].forEach((zc) => {
      const vc = new THREE.Mesh(vCornerGeo, mats.brushedAlu);
      vc.position.set(xc, boxCenterY, zc);
      root.add(vc);
    });
    [0.69, 2.93].forEach((yc) => {
      const hc = new THREE.Mesh(hCrossCornerGeo, mats.brushedAlu);
      hc.position.set(xc, yc, 0);
      root.add(hc);
    });
  });

  [-boxWidth / 2, boxWidth / 2].forEach((zc) => {
    [0.69, 2.93].forEach((yc) => {
      const hl = new THREE.Mesh(hLongCornerGeo, mats.brushedAlu);
      hl.position.set(boxCenterX, yc, zc);
      root.add(hl);
    });
  });

  // 3D Stainless Rear Door Locking Rods + Clearance & Side Marker LEDs
  const lockRodGeo = new THREE.CylinderGeometry(0.013, 0.013, boxHeight - 0.1, 12);
  const markerGeo = new THREE.BoxGeometry(0.07, 0.03, 0.018);
  disposables.geometries.push(lockRodGeo, markerGeo);

  [-0.36, 0.36].forEach((zl) => {
    const rod = new THREE.Mesh(lockRodGeo, mats.chrome);
    rod.position.set(boxCenterX - boxLength / 2 - 0.022, boxCenterY, zl);
    root.add(rod);
  });

  [-boxWidth / 2 - 0.008, boxWidth / 2 + 0.008].forEach((zm) => {
    [-2.75, -1.12, 0.52].forEach((xm) => {
      const amb = new THREE.Mesh(markerGeo, mats.ledAmber);
      amb.position.set(xm, 0.72, zm);
      root.add(amb);
    });
    const topFrontLed = new THREE.Mesh(markerGeo, mats.ledWhite);
    topFrontLed.position.set(0.84, 2.89, zm);
    root.add(topFrontLed);

    const topRearLed = new THREE.Mesh(markerGeo, mats.ledRed);
    topRearLed.position.set(-3.08, 2.89, zm);
    root.add(topRearLed);
  });

  // Rear heavy-duty step bumper + 3-chamber LED tail lamps + rear EU-RO license plate
  const rearStepGeo = new THREE.BoxGeometry(0.14, 0.15, 2.16);
  const rearTreadGeo = new THREE.BoxGeometry(0.16, 0.024, 1.36);
  const tailRedGeo = new THREE.BoxGeometry(0.036, 0.105, 0.26);
  const tailAmbGeo = new THREE.BoxGeometry(0.038, 0.105, 0.1);
  disposables.geometries.push(rearStepGeo, rearTreadGeo, tailRedGeo, tailAmbGeo);

  const rearStep = new THREE.Mesh(rearStepGeo, mats.darkChassis);
  rearStep.position.set(-3.19, 0.49, 0);
  root.add(rearStep);

  const rearTread = new THREE.Mesh(rearTreadGeo, mats.catwalkAlu);
  rearTread.position.set(-3.22, 0.57, 0);
  root.add(rearTread);

  [-0.82, 0.82].forEach((zt) => {
    const tRed = new THREE.Mesh(tailRedGeo, mats.ledRed);
    tRed.position.set(-3.262, 0.49, zt);
    root.add(tRed);
    const tAmb = new THREE.Mesh(tailAmbGeo, mats.ledAmber);
    tAmb.position.set(-3.265, 0.49, zt + (zt > 0 ? 0.16 : -0.16));
    root.add(tAmb);
  });

  const plateTex = createEuRoPlateTexture(props.plateNumber);
  disposables.textures.push(plateTex);
  const plateMat = new THREE.MeshStandardMaterial({
    map: plateTex,
    roughness: 0.3,
    metalness: 0.08,
  });
  disposables.materials.push(plateMat);
  const plateGeo = new THREE.PlaneGeometry(0.52, 0.115);
  disposables.geometries.push(plateGeo);

  const rearPlate = new THREE.Mesh(plateGeo, plateMat);
  rearPlate.position.set(-3.268, 0.49, 0);
  rearPlate.rotation.y = -Math.PI / 2;
  root.add(rearPlate);

  /* ---- 3. OVER-CAB AERODYNAMIC THERMO KING C-250e NOSEMOUNT UNIT ---- */
  const tkShape = new THREE.Shape();
  tkShape.moveTo(0.92, 2.43);
  tkShape.lineTo(1.56, 2.45);
  tkShape.quadraticCurveTo(1.68, 2.54, 1.62, 2.74);
  tkShape.quadraticCurveTo(1.52, 2.91, 1.24, 2.92);
  tkShape.lineTo(0.92, 2.92);
  tkShape.closePath();

  const tkGeo = createCenteredExtrude(tkShape, 1.38, 0.045, 0.045);
  disposables.geometries.push(tkGeo);
  const tkUnit = new THREE.Mesh(tkGeo, spWhiteBoxMat);
  tkUnit.castShadow = true;
  root.add(tkUnit);

  const tkTex = createThermoKingC250Texture();
  disposables.textures.push(tkTex);
  const tkFaceMat = new THREE.MeshStandardMaterial({
    map: tkTex,
    roughness: 0.28,
    metalness: 0.12,
  });
  disposables.materials.push(tkFaceMat);

  const tkFrontGroup = new THREE.Group();
  tkFrontGroup.position.set(1.678, 2.67, 0);
  tkFrontGroup.rotation.z = 0.24;
  const tkFaceGeo = new THREE.PlaneGeometry(1.18, 0.36);
  disposables.geometries.push(tkFaceGeo);
  const tkFace = new THREE.Mesh(tkFaceGeo, tkFaceMat);
  tkFace.rotation.y = Math.PI / 2;
  tkFrontGroup.add(tkFace);
  root.add(tkFrontGroup);

  /* ---- 4. SCULPTED MERCEDES-BENZ SPRINTER W906 SEMI-BONNETED CAB ---- */
  // 4A. Unpainted Matte-Black Wraparound Sprinter Commercial Front Bumper & Wheel Arches
  const bumperShape = new THREE.Shape();
  bumperShape.moveTo(2.42, 0.24);
  bumperShape.lineTo(3.24, 0.25);
  bumperShape.quadraticCurveTo(3.30, 0.34, 3.28, 0.56);
  bumperShape.lineTo(3.25, 0.69);
  bumperShape.lineTo(2.42, 0.69);
  bumperShape.closePath();

  const spBumperGeo = createCenteredExtrude(bumperShape, 1.98, 0.05, 0.05);
  disposables.geometries.push(spBumperGeo);
  const spBumper = new THREE.Mesh(spBumperGeo, mats.darkPlastic);
  spBumper.castShadow = true;
  spBumper.receiveShadow = true;
  root.add(spBumper);

  // Lower radiator air-dam slot + central bumper step + round fog lamps + front EU-RO plate
  const airDamGeo = new THREE.BoxGeometry(0.06, 0.15, 0.98);
  const fogLampGeo = new THREE.CylinderGeometry(0.042, 0.042, 0.05, 18);
  fogLampGeo.rotateZ(Math.PI / 2);
  const plateHolderGeo = new THREE.BoxGeometry(0.036, 0.135, 0.55);
  disposables.geometries.push(airDamGeo, fogLampGeo, plateHolderGeo);

  const airDam = new THREE.Mesh(airDamGeo, mats.glossBlack);
  airDam.position.set(3.31, 0.52, 0);
  root.add(airDam);

  [-0.74, 0.74].forEach((zf) => {
    const fog = new THREE.Mesh(fogLampGeo, mats.ledWhite);
    fog.position.set(3.315, 0.36, zf);
    root.add(fog);
  });

  const frontHolder = new THREE.Mesh(plateHolderGeo, mats.darkPlastic);
  frontHolder.position.set(3.325, 0.35, 0);
  root.add(frontHolder);

  const frontPlate = new THREE.Mesh(plateGeo, plateMat);
  frontPlate.position.set(3.346, 0.35, 0);
  frontPlate.rotation.y = Math.PI / 2;
  root.add(frontPlate);

  // Sculpted Sprinter W906 Cab Side Profile (Back wall -> Crowned Roof -> Steep Raked Windshield -> Sloping Hood -> Grille)
  const cabShape = new THREE.Shape();
  cabShape.moveTo(0.96, 0.52);
  cabShape.lineTo(1.62, 0.52);
  // Front wheelhouse cutout clearance under fender
  cabShape.lineTo(1.68, 0.76);
  cabShape.lineTo(2.38, 0.76);
  cabShape.lineTo(2.46, 0.67);
  cabShape.lineTo(3.23, 0.68); // Bottom of radiator grille
  cabShape.lineTo(3.17, 1.13); // Top of radiator grille / front of bonnet
  cabShape.lineTo(2.54, 1.44); // Bonnet cowl / base of windshield
  cabShape.lineTo(1.88, 2.26); // Steeply raked Sprinter panoramic windshield
  cabShape.quadraticCurveTo(1.76, 2.36, 1.56, 2.37); // Crowned Sprinter roof header
  cabShape.lineTo(1.02, 2.36);
  cabShape.quadraticCurveTo(0.96, 2.34, 0.96, 2.24);
  cabShape.closePath();

  const cabGeo = createCenteredExtrude(cabShape, 1.96, 0.05, 0.05);
  disposables.geometries.push(cabGeo);
  const cabMesh = new THREE.Mesh(cabGeo, mats.cabPaint);
  cabMesh.castShadow = true;
  cabMesh.receiveShadow = true;
  root.add(cabMesh);

  // Flared front wheel arches + matte-black lower door rub-strips + cab entry step
  const frontArchGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.18, 32, 1, true, 0, Math.PI);
  frontArchGeo.rotateZ(Math.PI / 2);
  frontArchGeo.rotateY(Math.PI / 2);
  const rubStripGeo = new THREE.BoxGeometry(1.12, 0.09, 0.03);
  const cabStepGeo = new THREE.BoxGeometry(0.56, 0.06, 0.14);
  disposables.geometries.push(frontArchGeo, rubStripGeo, cabStepGeo);

  [-0.95, 0.95].forEach((za) => {
    const fArch = new THREE.Mesh(frontArchGeo, mats.darkPlastic);
    fArch.position.set(frontAxleX, wheelY + 0.03, za);
    root.add(fArch);

    const strip = new THREE.Mesh(rubStripGeo, mats.darkPlastic);
    strip.position.set(1.52, 0.62, za > 0 ? 0.985 : -0.985);
    root.add(strip);

    const step = new THREE.Mesh(cabStepGeo, mats.darkPlastic);
    step.position.set(1.42, 0.42, za > 0 ? 0.95 : -0.95);
    root.add(step);
  });

  /* ---- 5. MERCEDES-BENZ 3-SLAT GRILLE + 3D CHROME STAR + SWEPT HEADLIGHTS ---- */
  const grilleTex = createSprinterGrilleTexture();
  disposables.textures.push(grilleTex);
  const grilleMat = new THREE.MeshStandardMaterial({
    map: grilleTex,
    roughness: 0.34,
    metalness: 0.35,
  });
  disposables.materials.push(grilleMat);

  const grilleGroup = new THREE.Group();
  grilleGroup.position.set(3.255, 0.915, 0);
  grilleGroup.rotation.z = 0.1325;

  const grilleBezelGeo = new THREE.BoxGeometry(0.045, 0.42, 1.06);
  const grillePlaneGeo = new THREE.PlaneGeometry(1.02, 0.39);
  disposables.geometries.push(grilleBezelGeo, grillePlaneGeo);

  grilleGroup.add(new THREE.Mesh(grilleBezelGeo, mats.darkPlastic));
  const grilleFace = new THREE.Mesh(grillePlaneGeo, grilleMat);
  grilleFace.position.x = 0.025;
  grilleFace.rotation.y = Math.PI / 2;
  grilleGroup.add(grilleFace);

  // 3D Chrome Mercedes-Benz 3-Pointed Star Ring & Rays
  const starRingGeo = new THREE.TorusGeometry(0.088, 0.01, 12, 32);
  starRingGeo.rotateY(Math.PI / 2);
  const starDiscGeo = new THREE.CylinderGeometry(0.084, 0.084, 0.016, 28);
  starDiscGeo.rotateZ(Math.PI / 2);
  const starRayGeo = new THREE.ConeGeometry(0.012, 0.084, 4);
  disposables.geometries.push(starRingGeo, starDiscGeo, starRayGeo);

  const starDisc = new THREE.Mesh(starDiscGeo, mats.glossBlack);
  starDisc.position.x = 0.026;
  grilleGroup.add(starDisc);

  const starRing = new THREE.Mesh(starRingGeo, mats.chrome);
  starRing.position.x = 0.034;
  grilleGroup.add(starRing);

  [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].forEach((ang) => {
    const ray = new THREE.Mesh(starRayGeo, mats.chrome);
    // Point ray outward in the YZ plane of the grille face (+Y at ang=0)
    ray.rotation.x = ang;
    ray.position.set(0.036, Math.cos(ang) * 0.041, Math.sin(ang) * 0.041);
    grilleGroup.add(ray);
  });

  root.add(grilleGroup);

  // Swept-back Mercedes Sprinter W906 crystal headlights flanking the grille & sweeping up along hood
  const hlBodyGeo = new THREE.BoxGeometry(0.32, 0.28, 0.37);
  const hlSilverBowlGeo = new THREE.BoxGeometry(0.06, 0.23, 0.33);
  const hlLensGeo = new THREE.SphereGeometry(0.056, 16, 16);
  const hlHighBeamGeo = new THREE.SphereGeometry(0.042, 14, 14);
  const hlTurnGeo = new THREE.BoxGeometry(0.075, 0.048, 0.16);
  const hlBrowGeo = new THREE.BoxGeometry(0.065, 0.024, 0.31);
  disposables.geometries.push(
    hlBodyGeo,
    hlSilverBowlGeo,
    hlLensGeo,
    hlHighBeamGeo,
    hlTurnGeo,
    hlBrowGeo
  );

  [-0.74, 0.74].forEach((zh) => {
    const hlGroup = new THREE.Group();
    hlGroup.position.set(3.11, 0.945, zh);
    hlGroup.rotation.z = 0.36;
    hlGroup.rotation.y = zh > 0 ? -0.24 : 0.24;

    hlGroup.add(new THREE.Mesh(hlBodyGeo, mats.glossBlack));

    const reflector = new THREE.Mesh(hlSilverBowlGeo, mats.brushedAlu);
    reflector.position.x = 0.14;
    hlGroup.add(reflector);

    const proj = new THREE.Mesh(hlLensGeo, mats.ledWhite);
    proj.position.set(0.158, -0.025, zh > 0 ? 0.055 : -0.055);
    hlGroup.add(proj);

    const highBeam = new THREE.Mesh(hlHighBeamGeo, mats.ledWhite);
    highBeam.position.set(0.156, -0.03, zh > 0 ? -0.065 : 0.065);
    hlGroup.add(highBeam);

    const brow = new THREE.Mesh(hlBrowGeo, mats.ledWhite);
    brow.position.set(0.162, 0.088, 0);
    hlGroup.add(brow);

    const turn = new THREE.Mesh(hlTurnGeo, mats.ledAmber);
    turn.position.set(0.155, 0.052, zh > 0 ? 0.085 : -0.085);
    hlGroup.add(turn);

    root.add(hlGroup);
  });

  // Signature twin matte-black Sprinter hood air-intake vents + wipers + roof antenna
  const hoodVentGeo = new THREE.BoxGeometry(0.025, 0.19, 0.32);
  const wiperGeo = new THREE.BoxGeometry(0.028, 0.024, 0.56);
  const antBaseGeo = new THREE.ConeGeometry(0.026, 0.06, 12);
  const antWhipGeo = new THREE.CylinderGeometry(0.005, 0.008, 0.34, 8);
  disposables.geometries.push(hoodVentGeo, wiperGeo, antBaseGeo, antWhipGeo);

  [-0.42, 0.42].forEach((zv) => {
    const vent = new THREE.Mesh(hoodVentGeo, mats.darkPlastic);
    vent.position.set(2.69, 1.425, zv);
    vent.rotation.z = 1.1135;
    root.add(vent);
  });

  [-0.36, 0.28].forEach((zw) => {
    const wiper = new THREE.Mesh(wiperGeo, mats.glossBlack);
    wiper.position.set(2.55, 1.49, zw);
    root.add(wiper);
  });

  const antBase = new THREE.Mesh(antBaseGeo, mats.darkPlastic);
  antBase.position.set(1.78, 2.38, 0);
  root.add(antBase);

  const antWhip = new THREE.Mesh(antWhipGeo, mats.glossBlack);
  antWhip.position.set(1.72, 2.54, 0);
  antWhip.rotation.z = 0.32;
  root.add(antWhip);

  /* ---- 6. PANORAMIC RAKED WINDSHIELD, STEPPED SPRINTER DOOR WINDOWS & WIDE MIRRORS ---- */
  // 2-seat Sprinter Cab Interior (RAR CIV S.1: 2 locuri)
  const spDashGeo = new THREE.BoxGeometry(0.46, 0.36, 1.74);
  const spSeatGeo = new THREE.BoxGeometry(0.16, 0.72, 0.46);
  const spWheelGeo = new THREE.TorusGeometry(0.18, 0.02, 10, 24);
  spWheelGeo.rotateY(Math.PI / 2);
  disposables.geometries.push(spDashGeo, spSeatGeo, spWheelGeo);

  const spDash = new THREE.Mesh(spDashGeo, mats.darkPlastic);
  spDash.position.set(2.18, 1.36, 0);
  root.add(spDash);

  [-0.46, 0.46].forEach((zs) => {
    const seat = new THREE.Mesh(spSeatGeo, mats.darkPlastic);
    seat.position.set(1.38, 1.56, zs);
    seat.rotation.z = -0.14;
    root.add(seat);
  });

  const spStWheel = new THREE.Mesh(spWheelGeo, mats.darkPlastic);
  spStWheel.position.set(1.94, 1.54, -0.46);
  spStWheel.rotation.z = 0.62;
  root.add(spStWheel);

  // Flush Dark-Tinted Automotive Laminated Raked Panoramic Windshield (zero ceiling hotspot glare)
  const spWindshieldMat = new THREE.MeshLambertMaterial({
    color: '#0c192c',
  });
  disposables.materials.push(spWindshieldMat);

  const wsFrameGeo = new THREE.BoxGeometry(0.036, 1.02, 1.82);
  const wsGlassGeo = new THREE.BoxGeometry(0.044, 0.94, 1.72);
  disposables.geometries.push(wsFrameGeo, wsGlassGeo);

  const wsFrame = new THREE.Mesh(wsFrameGeo, mats.darkPlastic);
  wsFrame.position.set(2.266, 1.894, 0);
  wsFrame.rotation.z = 0.6777;
  root.add(wsFrame);

  const wsGlass = new THREE.Mesh(wsGlassGeo, spWindshieldMat);
  wsGlass.position.set(2.276, 1.902, 0);
  wsGlass.rotation.z = 0.6777;
  root.add(wsGlass);

  // Signature Sprinter W906 Stepped Side Door Windows + Quarter Triangle + Door Handles
  const spWinShape = new THREE.Shape();
  spWinShape.moveTo(1.14, 1.42);
  spWinShape.lineTo(1.78, 1.42);
  spWinShape.lineTo(2.16, 1.24); // Iconic Sprinter downward beltline dip toward mirror!
  spWinShape.lineTo(2.40, 1.24);
  spWinShape.lineTo(2.44, 1.42);
  spWinShape.lineTo(1.88, 2.16);
  spWinShape.lineTo(1.14, 2.16);
  spWinShape.closePath();

  const spWinGeo = new THREE.ExtrudeGeometry(spWinShape, {
    depth: 0.022,
    bevelEnabled: true,
    bevelSize: 0.008,
    bevelThickness: 0.008,
    bevelSegments: 3,
  });
  const qBarGeo = new THREE.BoxGeometry(0.032, 0.56, 0.03);
  const handleGeo = new THREE.BoxGeometry(0.17, 0.042, 0.036);
  const mirrorArmGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.28, 10);
  mirrorArmGeo.rotateX(Math.PI / 2);
  const mirrorShellGeo = new THREE.BoxGeometry(0.11, 0.36, 0.17);
  const mirrorGlassGeo = new THREE.PlaneGeometry(0.14, 0.31);
  const mirrorTurnGeo = new THREE.BoxGeometry(0.024, 0.032, 0.15);
  disposables.geometries.push(
    spWinGeo,
    qBarGeo,
    handleGeo,
    mirrorArmGeo,
    mirrorShellGeo,
    mirrorGlassGeo,
    mirrorTurnGeo
  );

  ([-1, 1] as Array<-1 | 1>).forEach((sideSign) => {
    const winMesh = new THREE.Mesh(spWinGeo, mats.smokedGlass);
    winMesh.position.z = sideSign > 0 ? 0.972 : -0.994;
    root.add(winMesh);

    // Quarter-window vertical divider bar
    const qBar = new THREE.Mesh(qBarGeo, mats.glossBlack);
    qBar.position.set(2.14, 1.52, sideSign * 0.992);
    root.add(qBar);

    // Horizontal black Sprinter door handle
    const dHandle = new THREE.Mesh(handleGeo, mats.darkPlastic);
    dHandle.position.set(1.25, 1.18, sideSign * 0.992);
    root.add(dHandle);

    // Wide chassis-cab dual-arm Sprinter towing mirrors reaching past the 2.26m frigo box
    [1.30, 1.58].forEach((ym) => {
      const arm = new THREE.Mesh(mirrorArmGeo, mats.darkPlastic);
      arm.position.set(2.26, ym, sideSign * 1.09);
      root.add(arm);
    });

    const mGroup = new THREE.Group();
    mGroup.position.set(2.24, 1.46, sideSign * 1.22);
    mGroup.rotation.y = sideSign * -0.14;

    const shell = new THREE.Mesh(mirrorShellGeo, mats.darkPlastic);
    shell.castShadow = true;
    mGroup.add(shell);

    const glass = new THREE.Mesh(mirrorGlassGeo, mats.chrome);
    glass.position.x = -0.057;
    glass.rotation.y = -Math.PI / 2;
    mGroup.add(glass);

    // Integrated Sprinter mirror turn-signal LED strip on front face
    const mTurn = new THREE.Mesh(mirrorTurnGeo, mats.ledAmber);
    mTurn.position.set(0.056, -0.04, 0);
    mGroup.add(mTurn);

    root.add(mGroup);
  });

  return root;
}

/* ============================================================================
   PASSENGER SEDAN ALLOY WHEELS & 3D SHOWROOM MODELS (DACIA LOGAN III & W204)
============================================================================ */

function createPassengerAlloyWheel(
  radius: number,
  tireWidth: number,
  style: 'logan-5spoke' | 'mercedes-5twinspoke',
  sideSign: 1 | -1,
  mats: SharedMaterials,
  disposables: {
    geometries: THREE.BufferGeometry[];
    textures: THREE.Texture[];
    materials: THREE.Material[];
  }
): THREE.Group {
  const unit = new THREE.Group();
  const rimOuterR = style === 'mercedes-5twinspoke' ? radius * 0.725 : radius * 0.685;

  // Pneumatic low-profile passenger tire tread + rounded Michelin/Continental sidewalls
  const tireGeo = new THREE.CylinderGeometry(radius, radius, tireWidth * 0.80, 48);
  tireGeo.rotateX(Math.PI / 2);
  const shoulderGeo = new THREE.TorusGeometry(radius - 0.036, 0.038, 16, 48);
  const innerBarrelGeo = new THREE.CylinderGeometry(
    rimOuterR * 0.96,
    rimOuterR * 0.96,
    tireWidth * 0.82,
    36
  );
  innerBarrelGeo.rotateX(Math.PI / 2);
  const outerLipGeo = new THREE.TorusGeometry(rimOuterR - 0.008, 0.013, 14, 44);

  // Ventilated brake disc rotor + metallic brake caliper visible behind alloy spokes
  const brakeDiscGeo = new THREE.CylinderGeometry(
    rimOuterR * 0.74,
    rimOuterR * 0.74,
    0.018,
    32
  );
  brakeDiscGeo.rotateX(Math.PI / 2);
  const caliperGeo = new THREE.BoxGeometry(0.058, 0.108, 0.038);
  const hubCenterGeo = new THREE.CylinderGeometry(0.044, 0.046, 0.026, 24);
  hubCenterGeo.rotateX(Math.PI / 2);
  const lugGeo = new THREE.CylinderGeometry(0.0075, 0.0075, 0.022, 10);
  lugGeo.rotateX(Math.PI / 2);

  disposables.geometries.push(
    tireGeo,
    shoulderGeo,
    innerBarrelGeo,
    outerLipGeo,
    brakeDiscGeo,
    caliperGeo,
    hubCenterGeo,
    lugGeo
  );

  const tire = new THREE.Mesh(tireGeo, mats.tireRubber);
  tire.castShadow = true;
  tire.receiveShadow = true;
  unit.add(tire);

  [-1, 1].forEach((s) => {
    const sh = new THREE.Mesh(shoulderGeo, mats.tireRubber);
    sh.position.z = s * (tireWidth * 0.34);
    unit.add(sh);
  });

  // Dark inner alloy barrel so brake disc pops cleanly behind spokes
  unit.add(new THREE.Mesh(innerBarrelGeo, mats.darkChassis));

  const faceZ = sideSign * (tireWidth * 0.40);

  // Outer machined alloy rim lip
  const outerLip = new THREE.Mesh(
    outerLipGeo,
    style === 'mercedes-5twinspoke' ? mats.chrome : mats.brushedAlu
  );
  outerLip.position.z = faceZ;
  unit.add(outerLip);

  // Brake rotor + caliper
  const brakeDisc = new THREE.Mesh(brakeDiscGeo, mats.brushedAlu);
  brakeDisc.position.z = faceZ - sideSign * 0.032;
  unit.add(brakeDisc);

  const caliper = new THREE.Mesh(caliperGeo, mats.chrome);
  caliper.position.set(-rimOuterR * 0.48, rimOuterR * 0.22, faceZ - sideSign * 0.024);
  caliper.rotation.z = -0.35;
  unit.add(caliper);

  if (style === 'mercedes-5twinspoke') {
    // 17" Mercedes-Benz W204 Avantgarde 5-Twin-Spoke Machined Silver Alloy Wheel
    const bladeLen = rimOuterR - 0.030;
    const bladeGeo = new THREE.BoxGeometry(bladeLen, 0.025, 0.022);
    const hubPlateGeo = new THREE.CylinderGeometry(0.068, 0.072, 0.018, 28);
    hubPlateGeo.rotateX(Math.PI / 2);
    const starCapGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.024, 24);
    starCapGeo.rotateX(Math.PI / 2);
    disposables.geometries.push(bladeGeo, hubPlateGeo, starCapGeo);

    const hubPlate = new THREE.Mesh(hubPlateGeo, mats.brushedAlu);
    hubPlate.position.z = faceZ - sideSign * 0.006;
    unit.add(hubPlate);

    for (let i = 0; i < 5; i++) {
      const baseAng = (i * Math.PI * 2) / 5;
      [-0.155, 0.155].forEach((pairOff) => {
        const ang = baseAng + pairOff;
        const blade = new THREE.Mesh(bladeGeo, mats.chrome);
        blade.position.set(
          Math.cos(ang) * (0.030 + bladeLen * 0.48),
          Math.sin(ang) * (0.030 + bladeLen * 0.48),
          faceZ - sideSign * 0.004
        );
        blade.rotation.z = baseAng + pairOff * 0.42;
        unit.add(blade);
      });

      const lug = new THREE.Mesh(lugGeo, mats.darkChassis);
      lug.position.set(
        Math.cos(baseAng + Math.PI / 5) * 0.050,
        Math.sin(baseAng + Math.PI / 5) * 0.050,
        faceZ + sideSign * 0.001
      );
      unit.add(lug);
    }

    const cap = new THREE.Mesh(starCapGeo, mats.glossBlack);
    cap.position.z = faceZ + sideSign * 0.002;
    unit.add(cap);

    const capRingGeo = new THREE.TorusGeometry(0.022, 0.003, 8, 24);
    disposables.geometries.push(capRingGeo);
    const capRing = new THREE.Mesh(capRingGeo, mats.chrome);
    capRing.position.z = faceZ + sideSign * 0.014;
    unit.add(capRing);
  } else {
    // 16" Dacia Logan III 5-Spoke Sculpted V-Groove Silver Wheel (`dacia-logan-2024-blue.jpg`)
    const spokeLen = rimOuterR - 0.028;
    const spokeGeo = new THREE.BoxGeometry(spokeLen, 0.052, 0.018);
    const grooveGeo = new THREE.BoxGeometry(spokeLen * 0.68, 0.011, 0.022);
    const hubDiskGeo = new THREE.CylinderGeometry(0.068, 0.072, 0.018, 28);
    hubDiskGeo.rotateX(Math.PI / 2);
    const smallCapGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.024, 20);
    smallCapGeo.rotateX(Math.PI / 2);
    disposables.geometries.push(spokeGeo, grooveGeo, hubDiskGeo, smallCapGeo);

    const hubDisk = new THREE.Mesh(hubDiskGeo, mats.brushedAlu);
    hubDisk.position.z = faceZ - sideSign * 0.005;
    unit.add(hubDisk);

    for (let i = 0; i < 5; i++) {
      const ang = (i * Math.PI * 2) / 5;
      const spoke = new THREE.Mesh(spokeGeo, mats.brushedAlu);
      spoke.position.set(
        Math.cos(ang) * (0.028 + spokeLen * 0.48),
        Math.sin(ang) * (0.028 + spokeLen * 0.48),
        faceZ - sideSign * 0.004
      );
      spoke.rotation.z = ang;
      unit.add(spoke);

      const groove = new THREE.Mesh(grooveGeo, mats.darkChassis);
      groove.position.set(
        Math.cos(ang) * (0.048 + spokeLen * 0.36),
        Math.sin(ang) * (0.048 + spokeLen * 0.36),
        faceZ - sideSign * 0.002
      );
      groove.rotation.z = ang;
      unit.add(groove);
    }

    // 4 recessed lug bolts (Dacia 4x100 hub pattern)
    for (let i = 0; i < 4; i++) {
      const la = (i * Math.PI) / 2 + Math.PI / 4;
      const lug = new THREE.Mesh(lugGeo, mats.darkChassis);
      lug.position.set(
        Math.cos(la) * 0.046,
        Math.sin(la) * 0.046,
        faceZ + sideSign * 0.001
      );
      unit.add(lug);
    }

    const cap = new THREE.Mesh(smallCapGeo, mats.glossBlack);
    cap.position.z = faceZ + sideSign * 0.002;
    unit.add(cap);
  }

  return unit;
}

function buildDaciaLogan3Sedan(
  props: TruckShowroom3DProps,
  mats: SharedMaterials,
  disposables: {
    geometries: THREE.BufferGeometry[];
    textures: THREE.Texture[];
    materials: THREE.Material[];
  }
): THREE.Group {
  return buildSculptedDaciaLogan3(
    props.plateNumber || "B 102 STS",
    mats,
    createEuRoPlateTexture,
    (radius, tireWidth, style, sideSign) =>
      createPassengerAlloyWheel(radius, tireWidth, style, sideSign, mats, disposables),
    disposables
  );
}

function buildMercedesC250W204Sedan(
  props: TruckShowroom3DProps,
  mats: SharedMaterials,
  disposables: {
    geometries: THREE.BufferGeometry[];
    textures: THREE.Texture[];
    materials: THREE.Material[];
  }
): THREE.Group {
  return buildSculptedMercedesW204(
    props.plateNumber || "BH 01 STS",
    mats,
    createEuRoPlateTexture,
    (radius, tireWidth, style, sideSign) =>
      createPassengerAlloyWheel(radius, tireWidth, style, sideSign, mats, disposables),
    disposables
  );
}

/* ============================================================================
   REACT 360° INTERACTIVE WEBGL SHOWROOM COMPONENT
============================================================================ */

export const TruckShowroom3D: React.FC<TruckShowroom3DProps> = (props) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const paintMaterialRef = useRef<THREE.MeshPhysicalMaterial | null>(null);
  const secondaryPaintRef = useRef<THREE.MeshPhysicalMaterial | null>(null);

  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [activePreset, setActivePreset] = useState<CameraPreset>('front34');

  const isTrailerOnly =
    !props.showCoupledRoadTrain &&
    (props.bodyStyle === 'trailer-schmitz' || props.bodyStyle === 'trailer-krone');
  const isSprinter = !props.showCoupledRoadTrain && props.bodyStyle === 'van-sprinter';
  const isCar =
    !props.showCoupledRoadTrain &&
    (props.bodyStyle === 'car-logan' || props.bodyStyle === 'car-mercedes');
  const isLongScene = Boolean(props.showCoupledRoadTrain) || isTrailerOnly;

  // Live update paint color immediately without rebuilding WebGL context
  useEffect(() => {
    if (paintMaterialRef.current && !isTrailerOnly) {
      const hexUp = props.oemHex.toUpperCase();
      const isWhite = hexUp === '#F8FAFC' || hexUp === '#F1F5F9' || hexUp === '#FFFFFF';
      const isDarkBlack =
        hexUp === '#0F172A' || hexUp === '#111827' || hexUp === '#1E293B' || hexUp === '#090D16';
      paintMaterialRef.current.color.set(
        isWhite ? '#eef2f7' : isDarkBlack ? '#0c1018' : props.oemHex
      );
      paintMaterialRef.current.metalness = isWhite ? 0.14 : isDarkBlack ? 0.26 : 0.48;
      paintMaterialRef.current.roughness = isWhite ? 0.24 : isDarkBlack ? 0.19 : 0.19;
      paintMaterialRef.current.clearcoatRoughness = isDarkBlack ? 0.03 : 0.04;
      paintMaterialRef.current.envMapIntensity = isWhite ? 1.12 : isDarkBlack ? 1.95 : 1.55;
    }
    if (secondaryPaintRef.current && !isTrailerOnly) {
      secondaryPaintRef.current.color.set(props.secondaryHex);
    }
  }, [props.oemHex, props.secondaryHex, isTrailerOnly]);

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate;
    }
  }, [autoRotate]);

  const applyCameraPreset = (preset: CameraPreset) => {
    setActivePreset(preset);
    const cam = cameraRef.current;
    const ctrl = controlsRef.current;
    if (!cam || !ctrl) return;

    const dist = props.showCoupledRoadTrain
      ? 14.5
      : isTrailerOnly
        ? 12.4
        : isSprinter
          ? 8.55
          : isCar
            ? 5.55
            : 9.15;
    const targetY = isLongScene ? 1.85 : isSprinter ? 1.48 : isCar ? 0.72 : 1.92;
    ctrl.target.set(0, targetY, 0);

    if (preset === 'front34') {
      cam.position.set(
        dist * (isTrailerOnly ? 0.88 : isCar ? 0.76 : 0.78),
        targetY + (isCar ? 0.48 : isSprinter ? 0.78 : 0.92),
        dist * (isTrailerOnly ? 0.56 : isCar ? 0.70 : 0.68)
      );
    } else if (preset === 'side') {
      cam.position.set(isCar ? 0.06 : 0.25, targetY + (isCar ? 0.22 : 0.45), dist * 1.03);
    } else {
      cam.position.set(-dist * 0.78, targetY + (isCar ? 0.54 : 0.95), dist * 0.66);
    }
    ctrl.update();
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let disposed = false;
    let rafId = 0;

    const disposables: {
      geometries: THREE.BufferGeometry[];
      textures: THREE.Texture[];
      materials: THREE.Material[];
    } = { geometries: [], textures: [], materials: [] };

    const width = Math.max(container.clientWidth, 320);
    const height = Math.max(container.clientHeight, 240);

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 120);
    const baseDist = props.showCoupledRoadTrain
      ? 14.5
      : isTrailerOnly
        ? 12.4
        : isSprinter
          ? 8.55
          : isCar
            ? 5.55
            : 9.15;
    const targetY = isLongScene ? 1.85 : isSprinter ? 1.48 : isCar ? 0.72 : 1.92;
    camera.position.set(
      baseDist * (isTrailerOnly ? 0.88 : isCar ? 0.76 : 0.78),
      targetY + (isCar ? 0.48 : isSprinter ? 0.78 : 0.92),
      baseDist * (isTrailerOnly ? 0.56 : isCar ? 0.70 : 0.68)
    );
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.replaceChildren(renderer.domElement);

    // Studio HDRI Reflections via RoomEnvironment
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.035).texture;
    scene.environment = envTex;

    // Showroom Three-Point Lighting
    const hemi = new THREE.HemisphereLight('#f1f5f9', '#0f172a', 0.9);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight('#ffffff', 2.25);
    keyLight.position.set(8, 13, 9);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 40;
    const shadowBound = isLongScene ? 11 : 5.5;
    keyLight.shadow.camera.left = -shadowBound;
    keyLight.shadow.camera.right = shadowBound;
    keyLight.shadow.camera.top = shadowBound;
    keyLight.shadow.camera.bottom = -shadowBound;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight('#38bdf8', 1.25);
    rimLight.position.set(-9, 6, -8);
    scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight('#e2e8f0', 0.85);
    fillLight.position.set(-6, 4, 8);
    scene.add(fillLight);

    // Showroom Turntable Stage (Y = 0 top surface)
    const podiumRadius = props.showCoupledRoadTrain
      ? 9.6
      : isTrailerOnly
        ? 7.8
        : isSprinter
          ? 4.45
          : isCar
            ? 3.25
            : 4.25;
    const floorTex = createShowroomFloorTexture(props.accentHex);
    disposables.textures.push(floorTex);

    const podiumSideMat = new THREE.MeshStandardMaterial({
      color: '#0f172a',
      roughness: 0.35,
      metalness: 0.7,
    });
    const podiumTopMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.32,
      metalness: 0.45,
    });
    disposables.materials.push(podiumSideMat, podiumTopMat);

    const podiumGeo = new THREE.CylinderGeometry(
      podiumRadius,
      podiumRadius * 1.025,
      0.14,
      96
    );
    disposables.geometries.push(podiumGeo);
    const podium = new THREE.Mesh(podiumGeo, [
      podiumSideMat,
      podiumTopMat,
      podiumSideMat,
    ]);
    podium.position.y = -0.07;
    podium.receiveShadow = true;
    scene.add(podium);

    // Glowing cyan outer halo ring around podium
    const haloGeo = new THREE.TorusGeometry(podiumRadius * 0.965, 0.022, 12, 96);
    haloGeo.rotateX(Math.PI / 2);
    disposables.geometries.push(haloGeo);
    const haloMat = new THREE.MeshStandardMaterial({
      color: props.accentHex || '#38bdf8',
      emissive: new THREE.Color(props.accentHex || '#0ea5e9'),
      emissiveIntensity: 1.4,
      roughness: 0.2,
    });
    disposables.materials.push(haloMat);
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.position.y = 0.006;
    scene.add(halo);

    // Shared Automotive PBR Materials
    const hexUpper = props.oemHex.toUpperCase();
    const isWhitePaint =
      hexUpper === '#F8FAFC' || hexUpper === '#F1F5F9' || hexUpper === '#FFFFFF';
    const isDarkBlackPaint =
      hexUpper === '#0F172A' ||
      hexUpper === '#111827' ||
      hexUpper === '#1E293B' ||
      hexUpper === '#090D16';

    const tireTex = createTireTreadTexture();
    const catwalkTex = createDiamondPlateTexture();
    disposables.textures.push(tireTex, catwalkTex);

    const mats: SharedMaterials = {
      cabPaint: new THREE.MeshPhysicalMaterial({
        color: isWhitePaint
          ? '#eef2f7'
          : isDarkBlackPaint
            ? '#0c1018'
            : props.oemHex,
        metalness: isWhitePaint ? 0.14 : isDarkBlackPaint ? 0.26 : 0.48,
        roughness: isWhitePaint ? 0.24 : isDarkBlackPaint ? 0.19 : 0.19,
        clearcoat: 1.0,
        clearcoatRoughness: isDarkBlackPaint ? 0.03 : 0.04,
        envMapIntensity: isWhitePaint ? 1.12 : isDarkBlackPaint ? 1.95 : 1.55,
      }),
      cabSecondary: new THREE.MeshPhysicalMaterial({
        color: props.secondaryHex,
        metalness: 0.65,
        roughness: 0.22,
        clearcoat: 0.9,
      }),
      darkChassis: new THREE.MeshStandardMaterial({
        color: '#1e2430',
        roughness: 0.55,
        metalness: 0.45,
      }),
      darkPlastic: new THREE.MeshStandardMaterial({
        color: '#131822',
        roughness: 0.65,
        metalness: 0.15,
      }),
      glossBlack: new THREE.MeshPhysicalMaterial({
        color: '#090d16',
        roughness: 0.12,
        metalness: 0.35,
        clearcoat: 1.0,
      }),
      chrome: new THREE.MeshStandardMaterial({
        color: '#f8fafc',
        roughness: 0.08,
        metalness: 0.96,
      }),
      brushedAlu: new THREE.MeshStandardMaterial({
        color: '#cbd5e1',
        roughness: 0.24,
        metalness: 0.86,
      }),
      smokedGlass: new THREE.MeshPhysicalMaterial({
        color: '#0b1626',
        roughness: 0.05,
        metalness: 0.15,
        transmission: 0.38,
        transparent: true,
        opacity: 0.82,
        clearcoat: 1.0,
        side: THREE.DoubleSide,
      }),
      tireRubber: new THREE.MeshStandardMaterial({
        map: tireTex,
        color: '#1b1f26',
        roughness: 0.82,
        metalness: 0.06,
      }),
      ledWhite: new THREE.MeshStandardMaterial({
        color: '#ffffff',
        emissive: new THREE.Color('#e0f2fe'),
        emissiveIntensity: 2.2,
        roughness: 0.1,
      }),
      ledAmber: new THREE.MeshStandardMaterial({
        color: '#f59e0b',
        emissive: new THREE.Color('#f59e0b'),
        emissiveIntensity: 2.0,
        roughness: 0.15,
      }),
      ledRed: new THREE.MeshStandardMaterial({
        color: '#ef4444',
        emissive: new THREE.Color('#dc2626'),
        emissiveIntensity: 2.1,
        roughness: 0.15,
      }),
      catwalkAlu: new THREE.MeshStandardMaterial({
        map: catwalkTex,
        roughness: 0.36,
        metalness: 0.78,
      }),
    };
    paintMaterialRef.current = mats.cabPaint;
    secondaryPaintRef.current = mats.cabSecondary;
    disposables.materials.push(...Object.values(mats));

    // Build Procedural Showroom Group immediately (0ms wait)
    const vehicleStage = new THREE.Group();
    scene.add(vehicleStage);

    if (props.showCoupledRoadTrain) {
      const tractor = buildEuropeanTractor(props, mats, disposables);
      tractor.position.x = 5.15;
      vehicleStage.add(tractor);

      const trailer = buildReeferTrailer(
        { ...props, bodyStyle: 'trailer-schmitz' },
        mats,
        true,
        disposables
      );
      trailer.position.x = -2.25;
      vehicleStage.add(trailer);
    } else if (isTrailerOnly) {
      const trailer = buildReeferTrailer(props, mats, false, disposables);
      vehicleStage.add(trailer);
    } else if (isSprinter) {
      const sprinter = buildMercedesSprinterFrigo(props, mats, disposables);
      vehicleStage.add(sprinter);
    } else if (props.bodyStyle === 'car-logan') {
      const logan = buildDaciaLogan3Sedan(props, mats, disposables);
      vehicleStage.add(logan);
    } else if (props.bodyStyle === 'car-mercedes') {
      const mercCar = buildMercedesC250W204Sedan(props, mats, disposables);
      vehicleStage.add(mercCar);
    } else {
      const tractor = buildEuropeanTractor(props, mats, disposables);
      tractor.position.x = -0.1;
      vehicleStage.add(tractor);
    }

    // Optional external .glb override if user drops files in public/models/ and configures manifest.json
    if (!props.showCoupledRoadTrain) {
      const mKey = getManifestKey(props.bodyStyle);
      loadModelManifest().then((manifest) => {
        const glbUrl = manifest[mKey];
        if (!glbUrl || disposed) return;
        const loader = new GLTFLoader();
        loader.load(
          glbUrl,
          (gltf) => {
            if (disposed) return;
            const extRoot = gltf.scene;
            const box = new THREE.Box3().setFromObject(extRoot);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z) || 1;
            const desiredMax = isTrailerOnly
              ? 12.6
              : isSprinter
                ? 6.5
                : props.bodyStyle === 'car-logan'
                  ? 4.4
                  : props.bodyStyle === 'car-mercedes'
                    ? 4.7
                    : 5.95;
            const s = desiredMax / maxDim;
            extRoot.scale.setScalar(s);

            const scaledBox = new THREE.Box3().setFromObject(extRoot);
            const center = scaledBox.getCenter(new THREE.Vector3());
            extRoot.position.set(-center.x, -scaledBox.min.y, -center.z);

            extRoot.traverse((obj) => {
              if ((obj as THREE.Mesh).isMesh) {
                const mesh = obj as THREE.Mesh;
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                const matName = Array.isArray(mesh.material)
                  ? ''
                  : (mesh.material?.name || '').toLowerCase();
                if (
                  !isTrailerOnly &&
                  (matName.includes('paint') ||
                    matName.includes('body') ||
                    matName.includes('carpaint') ||
                    matName.includes('cab'))
                ) {
                  mesh.material = mats.cabPaint;
                }
              }
            });

            vehicleStage.clear();
            vehicleStage.add(extRoot);
          },
          undefined,
          () => {
            /* Keep procedural showroom model on error */
          }
        );
      });
    }

    // OrbitControls for 360° Smooth Showroom Inspection
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.target.set(0, targetY, 0);
    controls.minDistance = isLongScene ? 6.5 : isCar ? 2.85 : 3.8;
    controls.maxDistance = isLongScene ? 22 : isCar ? 9.5 : 11.5;
    controls.minPolarAngle = 0.25;
    controls.maxPolarAngle = Math.PI / 2 - 0.03; // Prevent clipping below showroom floor
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 1.35;
    controls.update();
    controlsRef.current = controls;

    const onPointerDown = () => {
      // Pause auto-spin while user manually drags to inspect
      controls.autoRotate = false;
      setAutoRotate(false);
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(entry.contentRect.width, 240);
        const h = Math.max(entry.contentRect.height, 200);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    });
    resizeObserver.observe(container);

    const animate = () => {
      if (disposed) return;
      rafId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      resizeObserver.disconnect();
      controls.dispose();
      envTex.dispose();
      pmrem.dispose();
      disposables.geometries.forEach((g) => g.dispose());
      disposables.textures.forEach((t) => t.dispose());
      disposables.materials.forEach((m) => m.dispose());
      renderer.dispose();
      paintMaterialRef.current = null;
      secondaryPaintRef.current = null;
      controlsRef.current = null;
      cameraRef.current = null;
    };
    // Rebuild geometry only when structural vehicle type, plates or coupling changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    props.bodyStyle,
    props.modelName,
    props.plateNumber,
    props.partnerPlateNumber,
    props.companyName,
    props.trailerCompanyName,
    props.axleConfig,
    props.showCoupledRoadTrain,
    props.zone1Temp,
    props.zone2Temp,
  ]);

  return (
    <div className="relative w-full h-[252px] rounded-xl overflow-hidden bg-gradient-to-b from-[#0a1224] via-[#111d38] to-[#070c18] border border-white/10">
      {/* Interactive WebGL Canvas Mount */}
      <div
        ref={mountRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        title="Trage cu mouse-ul pentru rotire 360° · Scroll pentru zoom"
      />

      {/* Top-Left Subtle Showroom 360° Hint Pill */}
      <div
        className="pointer-events-none absolute top-2 left-2.5 flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-sky-400/30 text-[10px] font-extrabold tracking-wide"
        style={{ backgroundColor: 'rgba(9, 15, 29, 0.82)', color: '#7dd3fc' }}
      >
        <RotateCw className="w-3 h-3 animate-spin" style={{ animationDuration: '9s' }} />
        <span>SHOWROOM 3D · 360°</span>
      </div>

      {/* Top-Right Mode Switcher: 3D 360° vs Poză Studio */}
      {props.hasPhotoOption && props.onSwitchToPhoto && (
        <div
          className="absolute top-2 right-2.5 flex items-center rounded-full p-0.5 border border-white/20 text-[10px] font-extrabold shadow-md"
          style={{ backgroundColor: 'rgba(9, 15, 29, 0.88)' }}
        >
          <span
            className="px-2.5 py-0.5 rounded-full"
            style={{ backgroundColor: '#0284c7', color: '#ffffff' }}
          >
            3D 360°
          </span>
          <button
            type="button"
            onClick={props.onSwitchToPhoto}
            className="px-2.5 py-0.5 rounded-full transition cursor-pointer hover:bg-white/10"
            style={{ color: '#cbd5e1' }}
          >
            Poză
          </button>
        </div>
      )}

      {/* Bottom Camera Presets + Auto-Rotate Toggle */}
      <div className="absolute bottom-2 inset-x-2.5 flex items-center justify-between gap-1.5 pointer-events-none">
        <div
          className="pointer-events-auto inline-flex items-center gap-0.5 rounded-full p-0.5 border border-white/15 text-[10px] font-bold"
          style={{ backgroundColor: 'rgba(9, 15, 29, 0.84)' }}
        >
          {(
            [
              ['front34', 'Față'],
              ['side', 'Profil'],
              [
                'rear34',
                isCar ? 'Spate' : isTrailerOnly || isSprinter ? 'Uși spate' : 'Spate / Șa',
              ],
            ] as Array<[CameraPreset, string]>
          ).map(([presetKey, label]) => (
            <button
              key={presetKey}
              type="button"
              onClick={() => applyCameraPreset(presetKey)}
              className="px-2.5 py-0.5 rounded-full transition cursor-pointer"
              style={
                activePreset === presetKey
                  ? { backgroundColor: 'rgba(56, 189, 248, 0.25)', color: '#7dd3fc' }
                  : { color: '#cbd5e1' }
              }
            >
              {label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setAutoRotate((v) => !v)}
          className="pointer-events-auto inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-white/15 text-[10px] font-bold transition cursor-pointer hover:bg-white/10"
          style={{
            backgroundColor: 'rgba(9, 15, 29, 0.84)',
            color: autoRotate ? '#4ade80' : '#cbd5e1',
          }}
          title="Pornește / oprește rotirea automată pe platou"
        >
          {autoRotate ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
          <span>{autoRotate ? 'Rotire' : 'Pauză'}</span>
        </button>
      </div>
    </div>
  );
};
