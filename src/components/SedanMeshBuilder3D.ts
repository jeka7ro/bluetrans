import * as THREE from 'three';

export interface SedanMaterials {
  cabPaint: THREE.MeshPhysicalMaterial;
  darkChassis: THREE.MeshStandardMaterial;
  darkPlastic: THREE.MeshStandardMaterial;
  glossBlack: THREE.MeshPhysicalMaterial;
  chrome: THREE.MeshStandardMaterial;
  brushedAlu: THREE.MeshStandardMaterial;
  tireRubber: THREE.MeshStandardMaterial;
  ledWhite: THREE.MeshStandardMaterial;
  ledAmber: THREE.MeshStandardMaterial;
  ledRed: THREE.MeshStandardMaterial;
}

export interface DisposableBucket {
  geometries: THREE.BufferGeometry[];
  textures: THREE.Texture[];
  materials: THREE.Material[];
}

/* ============================================================================
   MATHEMATICAL INTERPOLATION & C1-SMOOTH AUTOMOTIVE SURFACE ENGINE
============================================================================ */

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smoothstep(e0: number, e1: number, x: number): number {
  const t = clamp((x - e0) / (e1 - e0 || 1e-6), 0, 1);
  return t * t * (3 - 2 * t);
}

/** C-infinity smooth maximum (eliminates normal pinching where circular wheel arch meets rocker sill). */
function smoothMax(a: number, b: number, k = 0.026): number {
  const d = a - b;
  return 0.5 * (a + b + Math.sqrt(d * d + k * k));
}

/** Piecewise cubic Hermite 1D spline evaluated at `x` over sorted control knots `[[x0, y0], ...]`. */
function evalSpline1D(knots: ReadonlyArray<readonly [number, number]>, x: number): number {
  const n = knots.length;
  if (x <= knots[0][0]) return knots[0][1];
  if (x >= knots[n - 1][0]) return knots[n - 1][1];

  let idx = 0;
  for (let i = 0; i < n - 1; i++) {
    if (x >= knots[i][0] && x <= knots[i + 1][0]) {
      idx = i;
      break;
    }
  }

  const [x0, y0] = knots[idx];
  const [x1, y1] = knots[idx + 1];
  const h = x1 - x0 || 1e-6;
  const t = (x - x0) / h;

  const sec = (i: number): number => {
    const a = knots[clamp(i, 0, n - 2)];
    const b = knots[clamp(i + 1, 1, n - 1)];
    return (b[1] - a[1]) / (b[0] - a[0] || 1e-6);
  };

  const m0 = idx === 0 ? sec(0) : 0.5 * (sec(idx - 1) + sec(idx));
  const m1 = idx === n - 2 ? sec(n - 2) : 0.5 * (sec(idx) + sec(idx + 1));

  const t2 = t * t;
  const t3 = t2 * t;
  return (
    (2 * t3 - 3 * t2 + 1) * y0 +
    (t3 - 2 * t2 + t) * h * m0 +
    (-2 * t3 + 3 * t2) * y1 +
    (t3 - t2) * h * m1
  );
}

interface SedanBodySpec {
  rearCornerX: number;
  rearAxleX: number;
  rearGlassBaseX: number;
  dloRearX: number;
  rearRoofX: number;
  roofPeakX: number;
  frontRoofX: number;
  cowlX: number;
  frontAxleX: number;
  frontCornerX: number;
  wheelR: number;
  archRadius: number;
  trackZ: number;
  shoulderRatio: number;
  roofHalfWidth: number;
  hoodRibZ: number;
  hoodRibHeight: number;
  /** Exact side-view front nose X(y) at centerline z = 0 (`y` ascending from chin to hood leading edge). */
  frontNoseCenterXKnots: ReadonlyArray<readonly [number, number]>;
  /** Exact side-view rear tail/bumper X(y) at centerline z = 0 (`y` ascending from diffuser to trunk spoiler lip). */
  rearTailCenterXKnots: ReadonlyArray<readonly [number, number]>;
  sillKnots: ReadonlyArray<readonly [number, number]>;
  bellyYKnots: ReadonlyArray<readonly [number, number]>;
  beltYKnots: ReadonlyArray<readonly [number, number]>;
  centerDeckYKnots: ReadonlyArray<readonly [number, number]>;
  halfWidthKnots: ReadonlyArray<readonly [number, number]>;
  roofYKnots: ReadonlyArray<readonly [number, number]>;
}

/**
 * Exact 3D front nose surface `X(y, z)` shared 1:1 between the painted unibody and all conformal front parts
 * (headlights, DRLs, radiator grille, license plate, lower intake, fog pods).
 */
function evalFrontSurfaceX(spec: SedanBodySpec, y: number, z: number): number {
  const wCorner = evalSpline1D(spec.halfWidthKnots, spec.frontCornerX);
  const zn = clamp(Math.abs(z) / (wCorner || 0.78), 0, 1);
  const centerX = evalSpline1D(spec.frontNoseCenterXKnots, y);
  // Subtle forward curve at fender corner beltline so headlights sweep naturally into the front wings
  const cornerX = spec.frontCornerX + 0.025 * Math.sin(clamp((y - 0.20) / 0.55, 0, 1) * Math.PI);
  const sweep = Math.pow(zn, 2.05);
  return lerp(centerX, cornerX, sweep);
}

/**
 * Exact 3D rear bumper & tailgate surface `X(y, z)` shared 1:1 between the painted unibody and all conformal rear parts
 * (taillights, trunk badges, chrome trim, license plate, rear diffuser, exhaust).
 */
function evalRearSurfaceX(spec: SedanBodySpec, y: number, z: number): number {
  const wCorner = evalSpline1D(spec.halfWidthKnots, spec.rearCornerX);
  const zn = clamp(Math.abs(z) / (wCorner || 0.78), 0, 1);
  const centerX = evalSpline1D(spec.rearTailCenterXKnots, y);
  const cornerX = spec.rearCornerX - 0.02 * Math.sin(clamp((y - 0.22) / 0.74, 0, 1) * Math.PI);
  const sweep = Math.pow(zn, 2.05);
  return lerp(centerX, cornerX, sweep);
}

/**
 * Enforces bilateral mirror-symmetry normals (`nz = 0` on `|z| < 1e-4` and smooth seam wrap at `j = 0 / ringCount-1`)
 * so zero shading split ever appears down the middle of the hood, bumper, or trunk.
 */
function enforceRingSymmetryNormals(
  geo: THREE.BufferGeometry,
  numRings: number,
  subSegs: number
): void {
  geo.computeVertexNormals();
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  const nrm = geo.getAttribute('normal') as THREE.BufferAttribute;
  const ringCount = 2 * subSegs + 1;

  for (let i = 0; i < numRings; i++) {
    const base = i * ringCount;

    // Weld bottom-underbody wrap seam (j = 0 and j = ringCount - 1)
    const i0 = base;
    const iLast = base + ringCount - 1;
    let bx = nrm.getX(i0) + nrm.getX(iLast);
    let by = nrm.getY(i0) + nrm.getY(iLast);
    const blen = Math.hypot(bx, by) || 1;
    bx /= blen;
    by /= blen;
    nrm.setXYZ(i0, bx, by, 0);
    nrm.setXYZ(iLast, bx, by, 0);

    // Symmetrize any pair (k, ringCount - 1 - k) that lies on the z = 0 centerline plane (including nose & tail tips!)
    for (let k = 1; k <= subSegs; k++) {
      const idxPosZ = base + k;
      const idxNegZ = base + (ringCount - 1 - k);
      if (Math.abs(pos.getZ(idxPosZ)) < 1.5e-3) {
        let sx = nrm.getX(idxPosZ) + nrm.getX(idxNegZ);
        let sy = nrm.getY(idxPosZ) + nrm.getY(idxNegZ);
        const slen = Math.hypot(sx, sy) || 1;
        sx /= slen;
        sy /= slen;
        nrm.setXYZ(idxPosZ, sx, sy, 0);
        nrm.setXYZ(idxNegZ, sx, sy, 0);
      }
    }
  }
  nrm.needsUpdate = true;
}

/**
 * Builds a conformal curved 3D mesh patch `(z ∈ [z0, z1])` mapped directly onto
 * `evalFrontSurfaceX` (`dir = +1`) or `evalRearSurfaceX` (`dir = -1`), sitting `xOutset` meters proud of the body.
 * Supports optional swept vertical bounds `[y0End, y1End]` at `tz = 1` for tapered automotive headlights & taillights!
 */
function createConformalFasciaPatch(
  spec: SedanBodySpec,
  dir: 1 | -1,
  z0: number,
  z1: number,
  y0: number,
  y1: number,
  xOutset: number,
  segZ = 20,
  segY = 8,
  topZScale = 1.0,
  botZScale = 1.0,
  y0AtZ1?: number,
  y1AtZ1?: number
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const zMid = 0.5 * (z0 + z1);
  const zHalf = 0.5 * (z1 - z0);
  const endY0 = y0AtZ1 !== undefined ? y0AtZ1 : y0;
  const endY1 = y1AtZ1 !== undefined ? y1AtZ1 : y1;

  for (let iy = 0; iy <= segY; iy++) {
    const ty = iy / segY;
    const widthScale = lerp(botZScale, topZScale, ty);
    for (let iz = 0; iz <= segZ; iz++) {
      const tz = iz / segZ;
      const z = zMid + (tz * 2 - 1) * zHalf * widthScale;
      const localY0 = lerp(y0, endY0, tz);
      const localY1 = lerp(y1, endY1, tz);
      const y = lerp(localY0, localY1, ty);
      const baseX =
        dir > 0 ? evalFrontSurfaceX(spec, y, z) : evalRearSurfaceX(spec, y, z);
      const x = baseX + dir * xOutset;
      positions.push(x, y, z);
      const uTex = dir > 0 ? 1 - tz : tz;
      uvs.push(uTex, ty);
    }
  }

  const rowStride = segZ + 1;
  for (let iy = 0; iy < segY; iy++) {
    for (let iz = 0; iz < segZ; iz++) {
      const a = iy * rowStride + iz;
      const b = a + 1;
      const c = a + rowStride + 1;
      const d = a + rowStride;
      if (dir > 0) {
        indices.push(a, d, c, a, c, b);
      } else {
        indices.push(a, b, c, a, c, d);
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds the continuous 3D compound-curved painted unibody fuselage:
 * - Cosine-sampled 3D Rear Tail (`uTail ∈ [0..1]`) strictly on `evalRearSurfaceX(spec, y, z)`
 * - 68-station Central Fuselage (`rearCornerX .. frontCornerX`) with C-infinity smooth circular wheel arches,
 *   tucked rocker sills, barrel-curved doors, crisp Tornado shoulder line, and sculpted hood/trunk crowns
 * - Cosine-sampled 3D Front Nose (`uNose ∈ [1..0]`) strictly on `evalFrontSurfaceX(spec, y, z)`
 */
function buildLoftedUnibodyGeometry(spec: SedanBodySpec): THREE.BufferGeometry {
  const nTail = 18;
  const nMid = 68;
  const nNose = 18;
  const subSegs = 24;

  interface StationDef {
    zone: 'tail' | 'mid' | 'nose';
    /** Lateral width scale `u ∈ [0, 1]` (`0` at nose/tail centerline tip, `1` along central fuselage). */
    uWidth: number;
    /** Reference longitudinal X along deck/sill splines. */
    xRef: number;
  }

  const stations: StationDef[] = [];

  const rearHoodTipY = spec.rearTailCenterXKnots[spec.rearTailCenterXKnots.length - 1][0];
  const rearDeckTipX = evalSpline1D(spec.rearTailCenterXKnots, rearHoodTipY);
  const frontHoodTipY = spec.frontNoseCenterXKnots[spec.frontNoseCenterXKnots.length - 1][0];
  const frontDeckTipX = evalSpline1D(spec.frontNoseCenterXKnots, frontHoodTipY);

  // 1. Rear Tail stations (cosine-spaced in width so z steps smoothly every ~3.5cm right up to z = 0!)
  for (let k = 0; k < nTail; k++) {
    const u = Math.sin(((k / nTail) * Math.PI) / 2);
    stations.push({
      zone: 'tail',
      uWidth: u,
      xRef: lerp(rearDeckTipX, spec.rearCornerX, u * u),
    });
  }

  // 2. Central Fuselage stations (rearCornerX -> frontCornerX)
  for (let m = 0; m <= nMid; m++) {
    const t = m / nMid;
    stations.push({
      zone: 'mid',
      uWidth: 1.0,
      xRef: lerp(spec.rearCornerX, spec.frontCornerX, t),
    });
  }

  // 3. Front Nose stations (cosine-spaced from frontCornerX down to u = 0 nose tip)
  for (let k = 1; k <= nNose; k++) {
    const u = Math.cos(((k / nNose) * Math.PI) / 2);
    stations.push({
      zone: 'nose',
      uWidth: u,
      xRef: lerp(frontDeckTipX, spec.frontCornerX, u * u),
    });
  }

  const evalWheelArchLift = (x: number): { liftY: number; flareZ: number } => {
    let liftY = 0;
    let flareZ = 0;
    for (const ax of [spec.rearAxleX, spec.frontAxleX]) {
      const dx = x - ax;
      const r = spec.archRadius;
      if (Math.abs(dx) < r + 0.04) {
        const inside = Math.max(0, r * r - dx * dx);
        const archY = spec.wheelR + 0.008 + Math.sqrt(inside);
        const mask = 1 - smoothstep(r - 0.025, r + 0.035, Math.abs(dx));
        liftY = Math.max(liftY, archY * mask);
      }
      const blisterR = r + 0.22;
      if (Math.abs(dx) < blisterR) {
        const w = Math.cos((Math.PI * 0.5 * dx) / blisterR);
        flareZ = Math.max(flareZ, 0.021 * w * w);
      }
    }
    return { liftY, flareZ };
  };

  const positions: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i < stations.length; i++) {
    const st = stations[i];
    const xRaw = st.xRef;
    const uW = st.uWidth;

    const baseHalfW = evalSpline1D(spec.halfWidthKnots, xRaw) * uW;
    const { liftY, flareZ } =
      st.zone === 'mid' ? evalWheelArchLift(xRaw) : { liftY: 0, flareZ: 0 };

    const baseSillY = evalSpline1D(spec.sillKnots, xRaw);
    const yBottomEdge =
      liftY > 0.02 ? smoothMax(baseSillY, liftY, 0.024) : baseSillY;
    const yUnderCenter = Math.min(baseSillY + 0.015, 0.23);
    const yBelly = Math.max(evalSpline1D(spec.bellyYKnots, xRaw), yBottomEdge + 0.04);
    const yBelt = Math.max(evalSpline1D(spec.beltYKnots, xRaw), yBelly + 0.085);

    const cabinBlend =
      st.zone === 'mid'
        ? smoothstep(spec.rearGlassBaseX - 0.04, spec.rearGlassBaseX + 0.10, xRaw) *
          (1 - smoothstep(spec.cowlX - 0.10, spec.cowlX + 0.04, xRaw))
        : 0;

    const yDeckOuter = evalSpline1D(spec.centerDeckYKnots, xRaw);
    const yCenterTop = lerp(yDeckOuter, 0.56, cabinBlend);

    const zSill = baseHalfW * 0.88 + flareZ * 0.6;
    const zLowerDoor = baseHalfW * 0.96 + flareZ * 0.85;
    const zBelly = baseHalfW + flareZ;
    const zShoulder = baseHalfW * spec.shoulderRatio + flareZ * 0.25;

    // Precompute exact nose/tail shoulder X so deck crown blends C1-smoothly from fascia wall to hood/trunk spine
    const xBeltWall =
      st.zone === 'nose' || xRaw > spec.frontCornerX - 0.34
        ? evalFrontSurfaceX(spec, yBelt, zShoulder)
        : st.zone === 'tail' || xRaw < spec.rearCornerX + 0.34
          ? evalRearSurfaceX(spec, yBelt, zShoulder)
          : xRaw;

    const halfPts: Array<[number, number, number]> = [];

    for (let k = 0; k <= subSegs; k++) {
      const s = k / subSegs;
      let y = 0;
      let z = 0;

      if (s <= 0.14) {
        const lt = s / 0.14;
        z = lerp(0, zSill, Math.sin(lt * Math.PI * 0.5));
        y = lerp(yUnderCenter, yBottomEdge, lt * lt);
      } else if (s <= 0.64) {
        const lt = (s - 0.14) / 0.50;
        y = lerp(yBottomEdge, yBelt, lt);
        const barrel = Math.sin(lt * Math.PI);
        const baseZ = lerp(zSill, zShoulder, smoothstep(0, 1, lt));
        const extraBulge =
          (zBelly - 0.5 * (zSill + zShoulder)) * Math.pow(barrel, 0.85);
        const scallop =
          cabinBlend * -0.011 * Math.exp(-Math.pow((lt - 0.25) / 0.11, 2));
        z = Math.max(
          0,
          lerp(zLowerDoor, baseZ + extraBulge + scallop, smoothstep(0, 0.18, lt))
        );
      } else {
        const lt = (s - 0.64) / 0.36;
        z = lerp(zShoulder, 0, smoothstep(0, 1, lt));
        if (cabinBlend > 0.5) {
          const rim = smoothstep(0, 0.22, lt);
          y = lerp(yBelt, yCenterTop, Math.pow(rim, 1.3));
        } else {
          // Smooth quadratic crown `1 - (z / zShoulder)^2` -> zero slope at z = 0!
          const znDeck = zShoulder > 1e-4 ? clamp(z / zShoulder, 0, 1) : 0;
          const crown = 1 - znDeck * znDeck;
          const hoodZone =
            smoothstep(spec.cowlX + 0.04, spec.cowlX + 0.26, xRaw) *
            (1 - smoothstep(spec.frontCornerX - 0.04, frontDeckTipX, xRaw));
          const ribDist = Math.abs(z - spec.hoodRibZ * uW);
          const ribBump =
            hoodZone *
            spec.hoodRibHeight *
            uW *
            Math.exp(-Math.pow(ribDist / 0.052, 2));
          y = lerp(yBelt, yCenterTop, crown) + ribBump;
        }
      }

      // Compute exact longitudinal X coordinate:
      // - On nose/tail fascia walls (s <= 0.64): 100% identical to evalFrontSurfaceX / evalRearSurfaceX!
      // - On hood/trunk upper deck (s > 0.64): smooth transition from fascia shoulder X to hood/trunk centerline spine!
      let xFinal = xRaw;
      if (st.zone === 'nose') {
        if (s <= 0.64) {
          xFinal = evalFrontSurfaceX(spec, y, z);
        } else {
          const lt = (s - 0.64) / 0.36;
          xFinal = lerp(xBeltWall, xRaw, smoothstep(0, 1, lt));
        }
      } else if (st.zone === 'tail') {
        if (s <= 0.64) {
          xFinal = evalRearSurfaceX(spec, y, z);
        } else {
          const lt = (s - 0.64) / 0.36;
          xFinal = lerp(xBeltWall, xRaw, smoothstep(0, 1, lt));
        }
      } else {
        // Central fuselage: C1-smooth 32cm blend across ALL s in [0, 1] into nose/tail so zero corner step or crease occurs!
        if (xRaw > spec.frontCornerX - 0.32) {
          const w = smoothstep(spec.frontCornerX - 0.32, spec.frontCornerX, xRaw);
          const targetX =
            s <= 0.64
              ? evalFrontSurfaceX(spec, y, z)
              : lerp(xBeltWall, xRaw, smoothstep(0, 1, (s - 0.64) / 0.36));
          xFinal = lerp(xRaw, targetX, w);
        } else if (xRaw < spec.rearCornerX + 0.32) {
          const w = smoothstep(spec.rearCornerX + 0.32, spec.rearCornerX, xRaw);
          const targetX =
            s <= 0.64
              ? evalRearSurfaceX(spec, y, z)
              : lerp(xBeltWall, xRaw, smoothstep(0, 1, (s - 0.64) / 0.36));
          xFinal = lerp(xRaw, targetX, w);
        }
      }

      halfPts.push([xFinal, y, z]);
    }

    for (let k = 0; k <= subSegs; k++) {
      const [px, py, pz] = halfPts[k];
      positions.push(px, py, pz);
    }
    for (let k = subSegs - 1; k >= 0; k--) {
      const [px, py, pz] = halfPts[k];
      positions.push(px, py, -pz);
    }
  }

  const numRings = stations.length;
  const ringCount = 2 * subSegs + 1;
  for (let i = 0; i < numRings - 1; i++) {
    for (let j = 0; j < ringCount - 1; j++) {
      const a = i * ringCount + j;
      const b = (i + 1) * ringCount + j;
      const c = (i + 1) * ringCount + (j + 1);
      const d = i * ringCount + (j + 1);
      indices.push(a, b, c, a, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  enforceRingSymmetryNormals(geo, numRings, subSegs);
  return geo;
}

/**
 * Builds the 3D crowned roof panel, single continuous swept roof-rail arches (`cowlX -> rearGlassBaseX`),
 * sculpted triangular painted C-pillar sail panels, transparent compound-curved glass, and full 3D cabin interior.
 */
function buildGreenhouseAndInterior(
  spec: SedanBodySpec,
  isMercedes: boolean,
  mats: SedanMaterials,
  disposables: DisposableBucket
): THREE.Group {
  const group = new THREE.Group();

  const beltZAt = (x: number): number =>
    evalSpline1D(spec.halfWidthKnots, x) * spec.shoulderRatio;
  const beltYAt = (x: number): number => evalSpline1D(spec.beltYKnots, x);
  const roofYAt = (x: number): number => evalSpline1D(spec.roofYKnots, x);
  const roofZAt = (x: number): number => {
    const t = clamp(
      (x - spec.rearRoofX) / (spec.frontRoofX - spec.rearRoofX),
      0,
      1
    );
    const arch = 1 - 0.075 * Math.pow(2 * t - 1, 2);
    return spec.roofHalfWidth * arch;
  };

  /* ---- 1. AUTHENTIC AUTOMOTIVE TINTED GLASS & INTERIOR MATERIALS ---- */
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: isMercedes ? '#10232e' : '#132a36',
    roughness: 0.04,
    metalness: 0.08,
    transparent: true,
    opacity: 0.52,
    clearcoat: 1.0,
    clearcoatRoughness: 0.03,
    envMapIntensity: 1.95,
    side: THREE.DoubleSide,
  });
  const interiorDarkMat = new THREE.MeshStandardMaterial({
    color: '#11151d',
    roughness: 0.82,
    metalness: 0.06,
  });
  const seatLeatherMat = new THREE.MeshStandardMaterial({
    color: isMercedes ? '#171b24' : '#1e2430',
    roughness: 0.56,
    metalness: 0.08,
  });
  const paintDoubleSideMat = mats.cabPaint.clone();
  paintDoubleSideMat.side = THREE.DoubleSide;
  disposables.materials.push(
    glassMat,
    interiorDarkMat,
    seatLeatherMat,
    paintDoubleSideMat
  );

  /* ---- 2. FULL 3D CABIN INTERIOR ---- */
  const cabinLength = spec.cowlX - spec.rearGlassBaseX - 0.14;
  const cabinCenterX = 0.5 * (spec.cowlX + spec.rearGlassBaseX);
  const floorGeo = new THREE.BoxGeometry(cabinLength, 0.08, 1.30);
  const dashGeo = new THREE.BoxGeometry(0.42, 0.32, 1.32);
  const binnacleGeo = new THREE.BoxGeometry(0.22, 0.10, 0.34);
  const screenGeo = new THREE.BoxGeometry(0.04, 0.11, 0.22);
  const consoleGeo = new THREE.BoxGeometry(0.92, 0.22, 0.22);
  const seatCushionGeo = new THREE.BoxGeometry(0.46, 0.14, 0.45);
  const seatBackGeo = new THREE.BoxGeometry(0.13, 0.50, 0.43);
  const headrestGeo = new THREE.BoxGeometry(0.095, 0.16, 0.20);
  const rearBenchGeo = new THREE.BoxGeometry(0.45, 0.15, 1.22);
  const rearBackGeo = new THREE.BoxGeometry(0.15, 0.46, 1.22);
  const parcelShelfGeo = new THREE.BoxGeometry(0.42, 0.08, 1.24);
  const wheelRimGeo = new THREE.TorusGeometry(0.16, 0.019, 10, 28);
  wheelRimGeo.rotateY(Math.PI / 2);
  const wheelColGeo = new THREE.CylinderGeometry(0.03, 0.036, 0.22, 14);
  wheelColGeo.rotateZ(Math.PI / 2);
  const intMirrorGeo = new THREE.BoxGeometry(0.04, 0.052, 0.19);

  disposables.geometries.push(
    floorGeo,
    dashGeo,
    binnacleGeo,
    screenGeo,
    consoleGeo,
    seatCushionGeo,
    seatBackGeo,
    headrestGeo,
    rearBenchGeo,
    rearBackGeo,
    parcelShelfGeo,
    wheelRimGeo,
    wheelColGeo,
    intMirrorGeo
  );

  const floor = new THREE.Mesh(floorGeo, interiorDarkMat);
  floor.position.set(cabinCenterX, 0.48, 0);
  group.add(floor);

  const dash = new THREE.Mesh(dashGeo, interiorDarkMat);
  dash.position.set(spec.cowlX - 0.26, 0.77, 0);
  group.add(dash);

  const binnacle = new THREE.Mesh(binnacleGeo, interiorDarkMat);
  binnacle.position.set(spec.cowlX - 0.30, 0.95, -0.34);
  group.add(binnacle);

  const mediaScreen = new THREE.Mesh(screenGeo, mats.glossBlack);
  mediaScreen.position.set(spec.cowlX - 0.34, isMercedes ? 0.93 : 0.98, 0);
  group.add(mediaScreen);

  const centerConsole = new THREE.Mesh(consoleGeo, interiorDarkMat);
  centerConsole.position.set(spec.cowlX - 0.68, 0.60, 0);
  group.add(centerConsole);

  const stWheelGrp = new THREE.Group();
  stWheelGrp.position.set(spec.cowlX - 0.48, 0.91, -0.34);
  stWheelGrp.rotation.z = -0.38;
  stWheelGrp.add(new THREE.Mesh(wheelRimGeo, mats.darkPlastic));
  const col = new THREE.Mesh(wheelColGeo, interiorDarkMat);
  col.position.x = 0.10;
  stWheelGrp.add(col);
  group.add(stWheelGrp);

  const frontSeatX = spec.cowlX - 0.88;
  [-0.33, 0.33].forEach((sz) => {
    const cushion = new THREE.Mesh(seatCushionGeo, seatLeatherMat);
    cushion.position.set(frontSeatX + 0.06, 0.56, sz);
    group.add(cushion);

    const back = new THREE.Mesh(seatBackGeo, seatLeatherMat);
    back.position.set(frontSeatX - 0.15, 0.84, sz);
    back.rotation.z = 0.22;
    group.add(back);

    const hr = new THREE.Mesh(headrestGeo, seatLeatherMat);
    hr.position.set(frontSeatX - 0.22, 1.15, sz);
    hr.rotation.z = 0.16;
    group.add(hr);
  });

  const rearSeatX = spec.rearGlassBaseX + 0.54;
  const rBench = new THREE.Mesh(rearBenchGeo, seatLeatherMat);
  rBench.position.set(rearSeatX + 0.08, 0.58, 0);
  group.add(rBench);

  const rBack = new THREE.Mesh(rearBackGeo, seatLeatherMat);
  rBack.position.set(rearSeatX - 0.15, 0.83, 0);
  rBack.rotation.z = 0.24;
  group.add(rBack);

  [-0.37, 0, 0.37].forEach((rz) => {
    const rhr = new THREE.Mesh(headrestGeo, seatLeatherMat);
    rhr.position.set(rearSeatX - 0.23, 1.11, rz);
    rhr.rotation.z = 0.18;
    group.add(rhr);
  });

  const shelf = new THREE.Mesh(parcelShelfGeo, interiorDarkMat);
  shelf.position.set(spec.rearGlassBaseX + 0.20, beltYAt(spec.rearGlassBaseX) - 0.03, 0);
  group.add(shelf);

  const intMirror = new THREE.Mesh(intMirrorGeo, mats.darkPlastic);
  intMirror.position.set(spec.frontRoofX + 0.08, roofYAt(spec.frontRoofX) - 0.10, 0);
  group.add(intMirror);

  /* ---- 3. CROWNED 3D PAINTED ROOF PANEL ---- */
  const rSegX = 28;
  const rSegZ = 22;
  const roofPos: number[] = [];
  const roofIdx: number[] = [];
  for (let ix = 0; ix <= rSegX; ix++) {
    const tx = ix / rSegX;
    const xBase = lerp(spec.rearRoofX - 0.02, spec.frontRoofX + 0.03, tx);
    const yCenter = roofYAt(clamp(xBase, spec.rearRoofX, spec.frontRoofX));
    const zEdge = roofZAt(clamp(xBase, spec.rearRoofX, spec.frontRoofX));
    const headerBow =
      (tx > 0.72 ? Math.pow((tx - 0.72) / 0.28, 2) * -0.042 : 0) +
      (tx < 0.28 ? Math.pow((0.28 - tx) / 0.28, 2) * 0.036 : 0);

    for (let iz = 0; iz <= rSegZ; iz++) {
      const tz = (iz / rSegZ) * 2 - 1;
      const z = tz * zEdge;
      const crownDrop = 0.034 * tz * tz;
      const x = xBase + headerBow * tz * tz;
      roofPos.push(x, yCenter - crownDrop, z);
    }
  }
  for (let ix = 0; ix < rSegX; ix++) {
    for (let iz = 0; iz < rSegZ; iz++) {
      const a = ix * (rSegZ + 1) + iz;
      const b = a + (rSegZ + 1);
      const c = b + 1;
      const d = a + 1;
      roofIdx.push(a, d, c, a, c, b);
    }
  }
  const roofGeo = new THREE.BufferGeometry();
  roofGeo.setAttribute('position', new THREE.Float32BufferAttribute(roofPos, 3));
  roofGeo.setIndex(roofIdx);
  roofGeo.computeVertexNormals();
  disposables.geometries.push(roofGeo);
  const roofMesh = new THREE.Mesh(roofGeo, paintDoubleSideMat);
  roofMesh.castShadow = true;
  roofMesh.receiveShadow = true;
  group.add(roofMesh);

  /* ---- 4. COMPOUND-CURVED TRANSPARENT WINDSHIELD & REAR BACKLIGHT GLASS ---- */
  const buildCurvedWindscreen = (isFront: boolean): THREE.BufferGeometry => {
    const gx = 20;
    const gz = 22;
    const pos: number[] = [];
    const idx: number[] = [];

    for (let iv = 0; iv <= gx; iv++) {
      const tv = iv / gx;
      for (let iz = 0; iz <= gz; iz++) {
        const tz = (iz / gz) * 2 - 1;
        if (isFront) {
          const zBot = beltZAt(spec.cowlX) * 0.96;
          const zTop = roofZAt(spec.frontRoofX) * 0.985;
          const z = tz * lerp(zBot, zTop, tv);
          const xBot = spec.cowlX + 0.055 * (1 - tz * tz);
          const xTop = spec.frontRoofX + 0.03 - 0.042 * tz * tz;
          const x = lerp(xBot, xTop, tv) + 0.020 * Math.sin(tv * Math.PI);
          const yBot = evalSpline1D(spec.centerDeckYKnots, spec.cowlX) - 0.018 * tz * tz;
          const yTop = roofYAt(spec.frontRoofX) - 0.034 * tz * tz;
          const y = lerp(yBot, yTop, tv) + 0.014 * Math.sin(tv * Math.PI);
          pos.push(x, y, z);
        } else {
          const zBot = beltZAt(spec.rearGlassBaseX) * 0.95;
          const zTop = roofZAt(spec.rearRoofX) * 0.985;
          const z = tz * lerp(zBot, zTop, tv);
          const xBot = spec.rearGlassBaseX - 0.045 * (1 - tz * tz);
          const xTop = spec.rearRoofX - 0.02 + 0.036 * tz * tz;
          const x = lerp(xBot, xTop, tv) - 0.016 * Math.sin(tv * Math.PI);
          const yBot = evalSpline1D(spec.centerDeckYKnots, spec.rearGlassBaseX) - 0.018 * tz * tz;
          const yTop = roofYAt(spec.rearRoofX) - 0.034 * tz * tz;
          const y = lerp(yBot, yTop, tv) + 0.012 * Math.sin(tv * Math.PI);
          pos.push(x, y, z);
        }
      }
    }
    for (let iv = 0; iv < gx; iv++) {
      for (let iz = 0; iz < gz; iz++) {
        const a = iv * (gz + 1) + iz;
        const b = a + 1;
        const c = a + (gz + 1) + 1;
        const d = a + (gz + 1);
        if (isFront) {
          idx.push(a, d, c, a, c, b);
        } else {
          idx.push(a, b, c, a, c, d);
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  };

  const frontWsGeo = buildCurvedWindscreen(true);
  const rearWsGeo = buildCurvedWindscreen(false);
  disposables.geometries.push(frontWsGeo, rearWsGeo);
  group.add(new THREE.Mesh(frontWsGeo, glassMat));
  group.add(new THREE.Mesh(rearWsGeo, glassMat));

  const addCurveTube = (pts: THREE.Vector3[], r: number, mat: THREE.Material, segs = 40) => {
    const curve = new THREE.CatmullRomCurve3(pts);
    const tg = new THREE.TubeGeometry(curve, segs, r, 10, false);
    disposables.geometries.push(tg);
    const m = new THREE.Mesh(tg, mat);
    m.castShadow = true;
    group.add(m);
  };

  /* ---- 5. SINGLE CONTINUOUS SWEPT ROOF-RAIL ARCH + SCULPTED SAIL C-PILLAR + SIDE GLASS ---- */
  ([-1, 1] as Array<-1 | 1>).forEach((sideSign) => {
    const zA0 = beltZAt(spec.cowlX);
    const yA0 = beltYAt(spec.cowlX);
    const zRF = roofZAt(spec.frontRoofX);
    const yRF = roofYAt(spec.frontRoofX) - 0.034;
    const zRR = roofZAt(spec.rearRoofX);
    const yRR = roofYAt(spec.rearRoofX) - 0.034;
    const zC1 = beltZAt(spec.rearGlassBaseX);
    const yC1 = beltYAt(spec.rearGlassBaseX);

    // One continuous unbroken 3D painted roof-rail arch from front fender cowl to rear trunk deck!
    const archPts: THREE.Vector3[] = [
      new THREE.Vector3(spec.cowlX + 0.02, yA0 - 0.012, sideSign * zA0),
      new THREE.Vector3(
        lerp(spec.cowlX, spec.frontRoofX, 0.50) + 0.015,
        lerp(yA0, yRF, 0.53) + 0.018,
        sideSign * lerp(zA0, zRF, 0.50)
      ),
      new THREE.Vector3(spec.frontRoofX - 0.012, yRF, sideSign * zRF),
      new THREE.Vector3(
        lerp(spec.frontRoofX, spec.rearRoofX, 0.28),
        roofYAt(lerp(spec.frontRoofX, spec.rearRoofX, 0.28)) - 0.034,
        sideSign * roofZAt(lerp(spec.frontRoofX, spec.rearRoofX, 0.28))
      ),
      new THREE.Vector3(
        lerp(spec.frontRoofX, spec.rearRoofX, 0.65),
        roofYAt(lerp(spec.frontRoofX, spec.rearRoofX, 0.65)) - 0.034,
        sideSign * roofZAt(lerp(spec.frontRoofX, spec.rearRoofX, 0.65))
      ),
      new THREE.Vector3(spec.rearRoofX + 0.016, yRR, sideSign * zRR),
      new THREE.Vector3(
        lerp(spec.rearRoofX, spec.rearGlassBaseX, 0.52),
        lerp(yRR, yC1, 0.48) + 0.016,
        sideSign * lerp(zRR, zC1, 0.52)
      ),
      new THREE.Vector3(spec.rearGlassBaseX - 0.02, yC1 - 0.012, sideSign * zC1),
    ];
    addCurveTube(archPts, 0.031, mats.cabPaint, 56);

    // Sculpted 3D Painted C-Pillar Sail Panel (fills solid sheetmetal between rear side window & rear backlight!)
    const sailRows = 12;
    const sailCols = 8;
    const sailPos: number[] = [];
    const sailIdx: number[] = [];
    for (let ir = 0; ir <= sailRows; ir++) {
      const tr = ir / sailRows; // 0 = beltline, 1 = rearRoofX top
      // Rear edge follows rear backlight outer edge (`rearGlassBaseX -> rearRoofX`)
      const xRear = lerp(spec.rearGlassBaseX, spec.rearRoofX + 0.02, tr);
      const yRear = lerp(yC1, yRR, Math.pow(tr, 0.90));
      const zRear = lerp(zC1, zRR, tr);

      // Front edge follows rear edge of side quarter window (`dloRearX -> rearRoofX + 0.08`)
      const xFront = lerp(spec.dloRearX, spec.rearRoofX + 0.06, tr);
      const yFront = lerp(beltYAt(spec.dloRearX) + 0.004, yRR - 0.004, Math.pow(tr, 0.88));
      const zFront = lerp(beltZAt(spec.dloRearX), zRR, tr);

      for (let ic = 0; ic <= sailCols; ic++) {
        const tc = ic / sailCols;
        const sx = lerp(xRear, xFront, tc);
        const sy = lerp(yRear, yFront, tc);
        const sz = lerp(zRear, zFront, tc) + 0.008 * Math.sin(tr * Math.PI);
        sailPos.push(sx, sy, sideSign * sz);
      }
    }
    for (let ir = 0; ir < sailRows; ir++) {
      for (let ic = 0; ic < sailCols; ic++) {
        const a = ir * (sailCols + 1) + ic;
        const b = a + 1;
        const c = a + (sailCols + 1) + 1;
        const d = a + (sailCols + 1);
        if (sideSign > 0) {
          sailIdx.push(a, b, c, a, c, d);
        } else {
          sailIdx.push(a, d, c, a, c, b);
        }
      }
    }
    const sailGeo = new THREE.BufferGeometry();
    sailGeo.setAttribute('position', new THREE.Float32BufferAttribute(sailPos, 3));
    sailGeo.setIndex(sailIdx);
    sailGeo.computeVertexNormals();
    disposables.geometries.push(sailGeo);
    const sailMesh = new THREE.Mesh(sailGeo, paintDoubleSideMat);
    sailMesh.castShadow = true;
    group.add(sailMesh);

    // Tumblehome Side Daylight Opening Glass (from `dloRearX` to `cowlX - 0.03`)
    const dloFrontX = spec.cowlX - 0.03;
    const sCols = 30;
    const sRows = 10;
    const sPos: number[] = [];
    const sIdx: number[] = [];
    const topOutline: THREE.Vector3[] = [];
    const botOutline: THREE.Vector3[] = [];

    for (let ic = 0; ic <= sCols; ic++) {
      const tc = ic / sCols;
      const xBot = lerp(spec.dloRearX, dloFrontX, tc);
      const yBot = beltYAt(xBot) + 0.006;
      const zBotAbs = beltZAt(xBot) - 0.003;

      let yTop = roofYAt(clamp(xBot, spec.rearRoofX, spec.frontRoofX)) - 0.040;
      let zTopAbs = roofZAt(clamp(xBot, spec.rearRoofX, spec.frontRoofX)) - 0.003;

      if (xBot > spec.frontRoofX - 0.02) {
        const ta = clamp(
          (xBot - (spec.frontRoofX - 0.02)) / (dloFrontX - (spec.frontRoofX - 0.02) || 0.01),
          0,
          1
        );
        yTop = lerp(yRF - 0.006, yBot + 0.028, Math.pow(ta, 0.94));
        zTopAbs = lerp(zRF - 0.003, zBotAbs, ta);
      } else if (xBot < spec.rearRoofX + 0.06) {
        const tr = clamp(
          (spec.rearRoofX + 0.06 - xBot) / (spec.rearRoofX + 0.06 - spec.dloRearX || 0.01),
          0,
          1
        );
        yTop = lerp(yRR - 0.006, yBot + 0.026, Math.pow(tr, 0.88));
        zTopAbs = lerp(zRR - 0.003, zBotAbs, tr);
      }

      botOutline.push(new THREE.Vector3(xBot, yBot, sideSign * (zBotAbs + 0.005)));
      topOutline.push(new THREE.Vector3(xBot, yTop, sideSign * (zTopAbs + 0.005)));

      for (let ir = 0; ir <= sRows; ir++) {
        const tr = ir / sRows;
        const y = lerp(yBot, yTop, tr);
        const zAbs = lerp(zBotAbs, zTopAbs, tr) + 0.009 * Math.sin(tr * Math.PI);
        sPos.push(xBot, y, sideSign * zAbs);
      }
    }

    for (let ic = 0; ic < sCols; ic++) {
      for (let ir = 0; ir < sRows; ir++) {
        const a = ic * (sRows + 1) + ir;
        const b = (ic + 1) * (sRows + 1) + ir;
        const c = b + 1;
        const d = a + 1;
        if (sideSign > 0) {
          sIdx.push(a, b, c, a, c, d);
        } else {
          sIdx.push(a, d, c, a, c, b);
        }
      }
    }

    const sideGlassGeo = new THREE.BufferGeometry();
    sideGlassGeo.setAttribute('position', new THREE.Float32BufferAttribute(sPos, 3));
    sideGlassGeo.setIndex(sIdx);
    sideGlassGeo.computeVertexNormals();
    disposables.geometries.push(sideGlassGeo);
    group.add(new THREE.Mesh(sideGlassGeo, glassMat));

    // 3D Window Surround Trim (Full bright Chrome on Mercedes W204 Avantgarde; Satin Black on Dacia Logan III)
    const trimMat = isMercedes ? mats.chrome : mats.darkPlastic;
    addCurveTube(botOutline, 0.0095, trimMat, 34);
    addCurveTube(topOutline, 0.0085, trimMat, 34);

    // Gloss-Black B-Pillar & Rear Door Quarter Divider
    const addFlushPillar = (px: number, widthX: number) => {
      const yB = beltYAt(px) + 0.006;
      const zB = beltZAt(px) + 0.002;
      const clampedX = clamp(px, spec.rearRoofX, spec.frontRoofX);
      const yT = roofYAt(clampedX) - 0.042;
      const zT = roofZAt(clampedX) + 0.002;
      const dy = yT - yB;
      const dz = zT - zB;
      const len = Math.hypot(dy, dz);
      const pGeo = new THREE.BoxGeometry(widthX, len, 0.015);
      disposables.geometries.push(pGeo);
      const pillar = new THREE.Mesh(pGeo, mats.glossBlack);
      pillar.position.set(px, 0.5 * (yB + yT), sideSign * 0.5 * (zB + zT));
      pillar.rotation.x = sideSign * Math.atan2(dz, dy);
      pillar.rotation.z = 0.07;
      group.add(pillar);
    };

    addFlushPillar(isMercedes ? -0.22 : -0.14, 0.086);
    addFlushPillar(isMercedes ? -0.96 : -0.94, 0.026);
  });

  return group;
}

/* ============================================================================
   HIGH-RESOLUTION PROCEDURAL TEXTURES FOR DACIA LOGAN III & MERCEDES W204
============================================================================ */

function createDaciaLinkGrilleCanvas(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 220;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#080c14';
  ctx.fillRect(0, 0, 1024, 220);

  ctx.strokeStyle = 'rgba(148, 163, 184, 0.18)';
  ctx.lineWidth = 2;
  for (let row = 0; row < 7; row++) {
    const y = 24 + row * 28;
    for (let col = 0; col < 24; col++) {
      const x = col * 44 + (row % 2 ? 22 : 0);
      ctx.strokeRect(x + 4, y, 34, 18);
    }
  }

  const topGrad = ctx.createLinearGradient(0, 0, 1024, 0);
  topGrad.addColorStop(0, '#94a3b8');
  topGrad.addColorStop(0.5, '#f8fafc');
  topGrad.addColorStop(1, '#94a3b8');
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 4, 1024, 9);

  // Two crisp white horizontal segmented Dacia Link bars flanking the center DC emblem
  ctx.fillStyle = '#f8fafc';
  const segWidths = [76, 84, 88];
  let lx = 32;
  for (const sw of segWidths) {
    ctx.fillRect(lx, 68, sw, 14);
    ctx.fillRect(lx, 128, sw, 14);
    lx += sw + 26;
  }
  let rx = 1024 - 32;
  for (const sw of segWidths) {
    rx -= sw;
    ctx.fillRect(rx, 68, sw, 14);
    ctx.fillRect(rx, 128, sw, 14);
    rx -= 26;
  }

  // Bold White 2024 Dacia Link 'DC' Emblem in center
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 18;
  ctx.lineCap = 'square';
  ctx.lineJoin = 'miter';

  ctx.beginPath();
  ctx.moveTo(432, 62);
  ctx.lineTo(476, 62);
  ctx.lineTo(504, 105);
  ctx.lineTo(476, 148);
  ctx.lineTo(432, 148);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(592, 62);
  ctx.lineTo(548, 62);
  ctx.lineTo(520, 105);
  ctx.lineTo(548, 148);
  ctx.lineTo(592, 148);
  ctx.stroke();

  ctx.fillRect(492, 96, 40, 18);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createMercedesW204GrilleCanvas(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 320;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, 1024, 320);

  ctx.fillStyle = '#182235';
  for (let y = 24; y < 296; y += 18) {
    for (let x = 24; x < 1000; x += 26) {
      ctx.fillRect(x, y, 18, 9);
    }
  }

  // Bright chrome outer frame
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 22;
  ctx.strokeRect(11, 11, 1002, 298);

  // Two sculpted silver/chrome Avantgarde horizontal louvers
  [98, 202].forEach((ly) => {
    const lg = ctx.createLinearGradient(0, ly - 16, 0, ly + 22);
    lg.addColorStop(0, '#f8fafc');
    lg.addColorStop(0.45, '#cbd5e1');
    lg.addColorStop(1, '#64748b');
    ctx.fillStyle = lg;
    ctx.fillRect(24, ly - 14, 976, 32);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(24, ly - 4, 976, 7);
  });

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createLowerHoneycombCanvas(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 140;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#0a0e17';
  ctx.fillRect(0, 0, 512, 140);
  ctx.strokeStyle = '#253045';
  ctx.lineWidth = 2;
  for (let r = 0; r < 6; r++) {
    for (let col = 0; col < 18; col++) {
      ctx.strokeRect(col * 28 + (r % 2 ? 14 : 0) + 4, r * 22 + 8, 20, 14);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ============================================================================
   1. 2024 DACIA LOGAN III TCe 90 (`B 102 STS` & `B 196 STS`)
============================================================================ */

export function buildSculptedDaciaLogan3(
  plateNumber: string,
  mats: SedanMaterials,
  createPlateTex: (plate: string) => THREE.CanvasTexture,
  createWheel: (
    radius: number,
    tireWidth: number,
    style: 'logan-5spoke' | 'mercedes-5twinspoke',
    sideSign: 1 | -1
  ) => THREE.Group,
  disposables: DisposableBucket
): THREE.Group {
  const root = new THREE.Group();

  // Official 2024 Dacia Logan III (UU1DJF...): L = 4.396m, W = 1.76m, H = 1.488m, WB = 2.649m
  const spec: SedanBodySpec = {
    rearCornerX: -1.86,
    rearAxleX: -1.32,
    rearGlassBaseX: -1.64,
    dloRearX: -1.38,
    rearRoofX: -1.04,
    roofPeakX: -0.24,
    frontRoofX: 0.12,
    cowlX: 0.80,
    frontAxleX: 1.33,
    frontCornerX: 1.82,
    wheelR: 0.312,
    archRadius: 0.348,
    trackZ: 0.785,
    shoulderRatio: 0.905,
    roofHalfWidth: 0.62,
    hoodRibZ: 0.33,
    hoodRibHeight: 0.014,
    // Sleek, aerodynamic 2024 Dacia Logan III front wedge profile (`dacia-logan-2024-blue.jpg`)
    frontNoseCenterXKnots: [
      [0.19, 2.08],
      [0.26, 2.155],
      [0.42, 2.20],
      [0.52, 2.185],
      [0.65, 2.13],
      [0.695, 2.065],
    ],
    // Authentic 3-box sedan stepped rear bumper + high 528L trunk + integrated ducktail lip
    rearTailCenterXKnots: [
      [0.21, -2.08],
      [0.32, -2.165],
      [0.48, -2.20],
      [0.62, -2.19],
      [0.72, -2.135],
      [0.92, -2.12],
      [1.015, -2.085],
    ],
    sillKnots: [
      [-2.08, 0.22],
      [-1.78, 0.195],
      [-0.90, 0.175],
      [0.92, 0.172],
      [1.76, 0.182],
      [2.08, 0.195],
    ],
    bellyYKnots: [
      [-2.08, 0.54],
      [-1.32, 0.55],
      [0.0, 0.53],
      [1.33, 0.51],
      [2.08, 0.44],
    ],
    beltYKnots: [
      [-2.085, 0.985],
      [-1.64, 0.99],
      [-0.85, 0.945],
      [0.0, 0.908],
      [0.80, 0.878],
      [1.45, 0.805],
      [1.82, 0.74],
      [2.065, 0.685],
    ],
    centerDeckYKnots: [
      [-2.085, 1.005],
      [-1.92, 1.018],
      [-1.64, 1.012],
      [0.80, 0.918],
      [1.42, 0.855],
      [1.82, 0.772],
      [2.065, 0.695],
    ],
    halfWidthKnots: [
      [-2.085, 0.75],
      [-1.86, 0.805],
      [-1.32, 0.875],
      [0.0, 0.885],
      [1.33, 0.875],
      [1.82, 0.80],
      [2.065, 0.74],
    ],
    roofYKnots: [
      [-1.04, 1.405],
      [-0.64, 1.468],
      [-0.22, 1.486],
      [0.12, 1.446],
    ],
  };

  /* ---- 1. SCULPTED UNIBODY + DARK WHEELHOUSE LINERS + 16" DACIA 5-SPOKE WHEELS ---- */
  const unibodyGeo = buildLoftedUnibodyGeometry(spec);
  disposables.geometries.push(unibodyGeo);
  const unibodyMesh = new THREE.Mesh(unibodyGeo, mats.cabPaint);
  unibodyMesh.castShadow = true;
  unibodyMesh.receiveShadow = true;
  root.add(unibodyMesh);

  const linerGeo = new THREE.CylinderGeometry(
    spec.archRadius - 0.008,
    spec.archRadius - 0.008,
    1.54,
    32
  );
  linerGeo.rotateX(Math.PI / 2);
  const underPanGeo = new THREE.BoxGeometry(3.55, 0.05, 1.42);
  disposables.geometries.push(linerGeo, underPanGeo);

  const underPan = new THREE.Mesh(underPanGeo, mats.darkPlastic);
  underPan.position.set(0.0, 0.19, 0);
  root.add(underPan);

  [spec.rearAxleX, spec.frontAxleX].forEach((ax) => {
    const liner = new THREE.Mesh(linerGeo, mats.darkPlastic);
    liner.position.set(ax, spec.wheelR + 0.006, 0);
    root.add(liner);

    ([-1, 1] as Array<-1 | 1>).forEach((sideSign) => {
      const w = createWheel(spec.wheelR, 0.205, 'logan-5spoke', sideSign);
      w.position.set(ax, spec.wheelR, sideSign * spec.trackZ);
      root.add(w);
    });
  });

  /* ---- 2. TRANSPARENT CURVED GREENHOUSE + FULL 3D INTERIOR CABIN ---- */
  root.add(buildGreenhouseAndInterior(spec, false, mats, disposables));

  /* ---- 3. CONFORMAL 2024 DACIA LINK ('DC') FRONT GRILLE & Y-LED HEADLIGHTS ---- */
  const grilleTex = createDaciaLinkGrilleCanvas();
  const meshTex = createLowerHoneycombCanvas();
  const plateTex = createPlateTex(plateNumber || 'B 102 STS');
  disposables.textures.push(grilleTex, meshTex, plateTex);

  const grilleMat = new THREE.MeshStandardMaterial({
    map: grilleTex,
    roughness: 0.22,
    metalness: 0.24,
  });
  const lowerMeshMat = new THREE.MeshStandardMaterial({
    map: meshTex,
    roughness: 0.55,
    metalness: 0.15,
  });
  const plateMat = new THREE.MeshStandardMaterial({
    map: plateTex,
    roughness: 0.24,
    metalness: 0.08,
  });
  const lensGlassMat = new THREE.MeshPhysicalMaterial({
    color: '#ffffff',
    roughness: 0.02,
    metalness: 0.04,
    transparent: true,
    opacity: 0.16,
    clearcoat: 1.0,
    envMapIntensity: 2.3,
  });
  const rubyTailLensMat = new THREE.MeshPhysicalMaterial({
    color: '#991b1b',
    emissive: new THREE.Color('#450a0a'),
    emissiveIntensity: 0.35,
    roughness: 0.05,
    metalness: 0.08,
    transparent: true,
    opacity: 0.62,
    clearcoat: 1.0,
    envMapIntensity: 2.0,
  });
  disposables.materials.push(
    grilleMat,
    lowerMeshMat,
    plateMat,
    lensGlassMat,
    rubyTailLensMat
  );

  // Curved horizontal Dacia Link grille (z ∈ [-0.43, +0.43], y ∈ [0.535, 0.665])
  const grilleGeo = createConformalFasciaPatch(
    spec,
    1,
    -0.43,
    0.43,
    0.535,
    0.665,
    0.008,
    24,
    8,
    1.04,
    0.90
  );
  disposables.geometries.push(grilleGeo);
  root.add(new THREE.Mesh(grilleGeo, grilleMat));

  // Swept Tapered Conformal Headlights wrapping around front corners (`dacia-logan-2024-blue.jpg`)
  const projSphereGeo = new THREE.SphereGeometry(0.029, 16, 16);
  disposables.geometries.push(projSphereGeo);

  ([-1, 1] as Array<-1 | 1>).forEach((sideSign) => {
    const zMin = sideSign > 0 ? 0.425 : -0.785;
    const zMax = sideSign > 0 ? 0.785 : -0.425;
    // When sideSign > 0, tz=0 is inner grille edge & tz=1 is outer wing; when sideSign < 0, tz=0 is outer wing & tz=1 is inner!
    const y0At0 = sideSign > 0 ? 0.542 : 0.602;
    const y1At0 = sideSign > 0 ? 0.665 : 0.708;
    const y0At1 = sideSign > 0 ? 0.602 : 0.542;
    const y1At1 = sideSign > 0 ? 0.708 : 0.665;

    const hlBackGeo = createConformalFasciaPatch(
      spec,
      1,
      zMin,
      zMax,
      y0At0,
      y1At0,
      0.006,
      18,
      6,
      1.0,
      1.0,
      y0At1,
      y1At1
    );
    const hlLensGeo = createConformalFasciaPatch(
      spec,
      1,
      zMin,
      zMax,
      y0At0,
      y1At0,
      0.017,
      18,
      6,
      1.0,
      1.0,
      y0At1,
      y1At1
    );
    disposables.geometries.push(hlBackGeo, hlLensGeo);
    root.add(new THREE.Mesh(hlBackGeo, mats.glossBlack));
    root.add(new THREE.Mesh(hlLensGeo, lensGlassMat));

    // Main LED low-beam projector optic
    const pz = sideSign * 0.565;
    const py = 0.608;
    const px = evalFrontSurfaceX(spec, py, pz) + 0.011;
    const proj = new THREE.Mesh(projSphereGeo, mats.ledWhite);
    proj.position.set(px, py, pz);
    proj.scale.set(0.45, 1, 1);
    root.add(proj);

    // Signature 2024 Dacia Horizontal 'Y'-Shaped Glowing White LED DRL
    const ptOnNose = (y: number, zAbs: number, off = 0.013) => {
      const zz = sideSign * zAbs;
      return new THREE.Vector3(evalFrontSurfaceX(spec, y, zz) + off, y, zz);
    };

    const stemCurve = new THREE.CatmullRomCurve3([
      ptOnNose(0.635, 0.435),
      ptOnNose(0.642, 0.535),
      ptOnNose(0.650, 0.625),
    ]);
    const upperYArm = new THREE.CatmullRomCurve3([
      ptOnNose(0.650, 0.620),
      ptOnNose(0.676, 0.698),
      ptOnNose(0.700, 0.772),
    ]);
    const lowerYArm = new THREE.CatmullRomCurve3([
      ptOnNose(0.650, 0.620),
      ptOnNose(0.626, 0.695),
      ptOnNose(0.608, 0.768),
    ]);

    [stemCurve, upperYArm, lowerYArm].forEach((crv) => {
      const tg = new THREE.TubeGeometry(crv, 14, 0.008, 8, false);
      disposables.geometries.push(tg);
      root.add(new THREE.Mesh(tg, mats.ledWhite));
    });
  });

  // Lower Trapezoidal Honeycomb Intake + Central ADAS Radar + Recessed Fog Pods + Curved RO Plate
  const lowIntakeGeo = createConformalFasciaPatch(
    spec,
    1,
    -0.48,
    0.48,
    0.215,
    0.345,
    0.007,
    20,
    6,
    0.88,
    1.04
  );
  const radarBoxGeo = createConformalFasciaPatch(
    spec,
    1,
    -0.065,
    0.065,
    0.228,
    0.332,
    0.012,
    4,
    4
  );
  const frontPlateHolderGeo = createConformalFasciaPatch(
    spec,
    1,
    -0.265,
    0.265,
    0.375,
    0.490,
    0.009,
    12,
    4
  );
  const frontPlateGeo = createConformalFasciaPatch(
    spec,
    1,
    -0.255,
    0.255,
    0.382,
    0.483,
    0.014,
    12,
    4
  );
  disposables.geometries.push(
    lowIntakeGeo,
    radarBoxGeo,
    frontPlateHolderGeo,
    frontPlateGeo
  );

  root.add(new THREE.Mesh(lowIntakeGeo, lowerMeshMat));
  root.add(new THREE.Mesh(radarBoxGeo, mats.glossBlack));
  root.add(new THREE.Mesh(frontPlateHolderGeo, mats.darkPlastic));
  root.add(new THREE.Mesh(frontPlateGeo, plateMat));

  // Left & Right Sculpted Fog-Lamp Pods (exact match to dacia-logan-2024-blue.jpg!)
  const fogLampGeo = new THREE.SphereGeometry(0.025, 14, 14);
  disposables.geometries.push(fogLampGeo);
  ([-1, 1] as Array<-1 | 1>).forEach((sideSign) => {
    const fz0 = sideSign > 0 ? 0.52 : -0.75;
    const fz1 = sideSign > 0 ? 0.75 : -0.52;
    const podGeo = createConformalFasciaPatch(
      spec,
      1,
      fz0,
      fz1,
      0.235,
      0.345,
      0.007,
      12,
      4
    );
    const stripGeo = createConformalFasciaPatch(
      spec,
      1,
      sideSign > 0 ? 0.535 : -0.665,
      sideSign > 0 ? 0.665 : -0.535,
      0.288,
      0.300,
      0.012,
      8,
      2
    );
    disposables.geometries.push(podGeo, stripGeo);
    root.add(new THREE.Mesh(podGeo, mats.darkPlastic));
    root.add(new THREE.Mesh(stripGeo, mats.brushedAlu));

    const fz = sideSign * 0.70;
    const fy = 0.288;
    const fx = evalFrontSurfaceX(spec, fy, fz) + 0.013;
    const fog = new THREE.Mesh(fogLampGeo, mats.ledWhite);
    fog.position.set(fx, fy, fz);
    fog.scale.set(0.5, 1, 1);
    root.add(fog);
  });

  /* ---- 4. EXTERIOR MIRRORS, FENDER BLINKERS, PULL HANDLES, WIPERS & ANTENNA ---- */
  const mirrorCapGeo = new THREE.SphereGeometry(0.095, 20, 16);
  const mirrorGlassGeo = new THREE.CircleGeometry(0.065, 18);
  const stalkGeo = new THREE.BoxGeometry(0.09, 0.04, 0.09);
  const repeaterGeo = new THREE.SphereGeometry(0.018, 12, 10);
  const handleBarGeo = new THREE.CapsuleGeometry(0.014, 0.125, 6, 12);
  handleBarGeo.rotateZ(Math.PI / 2);
  const wiperGeo = new THREE.BoxGeometry(0.018, 0.014, 0.44);
  const antBaseGeo = new THREE.ConeGeometry(0.022, 0.042, 12);
  const antWhipGeo = new THREE.CylinderGeometry(0.003, 0.005, 0.24, 8);
  disposables.geometries.push(
    mirrorCapGeo,
    mirrorGlassGeo,
    stalkGeo,
    repeaterGeo,
    handleBarGeo,
    wiperGeo,
    antBaseGeo,
    antWhipGeo
  );

  ([-1, 1] as Array<-1 | 1>).forEach((sideSign) => {
    const stalk = new THREE.Mesh(stalkGeo, mats.darkPlastic);
    stalk.position.set(0.64, 0.93, sideSign * 0.81);
    root.add(stalk);

    const mGrp = new THREE.Group();
    mGrp.position.set(0.61, 0.965, sideSign * 0.905);
    mGrp.rotation.y = sideSign * -0.18;

    const cap = new THREE.Mesh(mirrorCapGeo, mats.cabPaint);
    cap.scale.set(0.82, 0.56, 0.98);
    cap.castShadow = true;
    mGrp.add(cap);

    const mFace = new THREE.Mesh(mirrorGlassGeo, mats.chrome);
    mFace.scale.set(1.25, 0.78, 1);
    mFace.position.x = -0.068;
    mFace.rotation.y = -Math.PI / 2;
    mGrp.add(mFace);
    root.add(mGrp);

    // White oval fender side turn repeater behind front arch
    const rep = new THREE.Mesh(repeaterGeo, mats.ledWhite);
    rep.position.set(0.90, 0.74, sideSign * 0.882);
    rep.scale.set(1.8, 0.65, 0.45);
    root.add(rep);

    // Sculpted body-colored pull door handles
    [0.12, -0.66].forEach((hx, idx) => {
      const hy = idx === 0 ? 0.865 : 0.895;
      const dh = new THREE.Mesh(handleBarGeo, mats.cabPaint);
      dh.position.set(hx, hy, sideSign * 0.882);
      root.add(dh);
    });
  });

  [-0.24, 0.22].forEach((zw) => {
    const w = new THREE.Mesh(wiperGeo, mats.glossBlack);
    w.position.set(0.78, 0.95, zw);
    root.add(w);
  });

  const antBase = new THREE.Mesh(antBaseGeo, mats.glossBlack);
  antBase.position.set(-0.78, 1.464, 0);
  root.add(antBase);
  const antWhip = new THREE.Mesh(antWhipGeo, mats.glossBlack);
  antWhip.position.set(-0.85, 1.56, 0);
  antWhip.rotation.z = -0.52;
  root.add(antWhip);

  /* ---- 5. DACIA LOGAN III CONFORMAL REAR ('D A C I A' + Y-LED RUBY TAILLIGHTS) ---- */
  const rearWordCanvas = document.createElement('canvas');
  rearWordCanvas.width = 768;
  rearWordCanvas.height = 112;
  const rctx = rearWordCanvas.getContext('2d')!;
  rctx.clearRect(0, 0, 768, 112);
  rctx.fillStyle = '#f8fafc';
  rctx.font = '900 46px Inter, system-ui, sans-serif';
  rctx.textAlign = 'center';
  rctx.textBaseline = 'middle';
  rctx.fillText('D   A   C   I   A', 384, 56);
  const rearWordTex = new THREE.CanvasTexture(rearWordCanvas);
  rearWordTex.colorSpace = THREE.SRGBColorSpace;
  disposables.textures.push(rearWordTex);
  const rearWordMat = new THREE.MeshStandardMaterial({
    map: rearWordTex,
    transparent: true,
    roughness: 0.20,
    metalness: 0.55,
  });
  disposables.materials.push(rearWordMat);

  const rearWordGeo = createConformalFasciaPatch(
    spec,
    -1,
    -0.36,
    0.36,
    0.855,
    0.945,
    0.009,
    14,
    4
  );
  const rearValanceGeo = createConformalFasciaPatch(
    spec,
    -1,
    -0.64,
    0.64,
    0.22,
    0.35,
    0.007,
    18,
    4
  );
  const rearPlateHolderGeo = createConformalFasciaPatch(
    spec,
    -1,
    -0.265,
    0.265,
    0.42,
    0.535,
    0.009,
    12,
    4
  );
  const rearPlateGeo = createConformalFasciaPatch(
    spec,
    -1,
    -0.255,
    0.255,
    0.427,
    0.528,
    0.014,
    12,
    4
  );
  disposables.geometries.push(
    rearWordGeo,
    rearValanceGeo,
    rearPlateHolderGeo,
    rearPlateGeo
  );

  root.add(new THREE.Mesh(rearWordGeo, rearWordMat));
  root.add(new THREE.Mesh(rearValanceGeo, mats.darkPlastic));
  root.add(new THREE.Mesh(rearPlateHolderGeo, mats.darkPlastic));
  root.add(new THREE.Mesh(rearPlateGeo, plateMat));

  ([-1, 1] as Array<-1 | 1>).forEach((sideSign) => {
    const z0 = sideSign > 0 ? 0.42 : -0.77;
    const z1 = sideSign > 0 ? 0.77 : -0.42;
    const ry0At0 = sideSign > 0 ? 0.815 : 0.795;
    const ry1At0 = sideSign > 0 ? 0.945 : 0.962;
    const ry0At1 = sideSign > 0 ? 0.795 : 0.815;
    const ry1At1 = sideSign > 0 ? 0.962 : 0.945;

    const tlBackGeo = createConformalFasciaPatch(
      spec,
      -1,
      z0,
      z1,
      ry0At0,
      ry1At0,
      0.007,
      16,
      6,
      1.0,
      1.0,
      ry0At1,
      ry1At1
    );
    const tlLensGeo = createConformalFasciaPatch(
      spec,
      -1,
      z0,
      z1,
      ry0At0,
      ry1At0,
      0.018,
      16,
      6,
      1.0,
      1.0,
      ry0At1,
      ry1At1
    );
    disposables.geometries.push(tlBackGeo, tlLensGeo);
    root.add(new THREE.Mesh(tlBackGeo, mats.glossBlack));
    root.add(new THREE.Mesh(tlLensGeo, rubyTailLensMat));

    const ptOnTail = (y: number, zAbs: number) => {
      const zz = sideSign * zAbs;
      return new THREE.Vector3(evalRearSurfaceX(spec, y, zz) - 0.013, y, zz);
    };
    const rStem = new THREE.CatmullRomCurve3([
      ptOnTail(0.88, 0.44),
      ptOnTail(0.88, 0.59),
    ]);
    const rTop = new THREE.CatmullRomCurve3([
      ptOnTail(0.88, 0.58),
      ptOnTail(0.935, 0.75),
    ]);
    const rBot = new THREE.CatmullRomCurve3([
      ptOnTail(0.88, 0.58),
      ptOnTail(0.825, 0.75),
    ]);
    [rStem, rTop, rBot].forEach((crv) => {
      const tg = new THREE.TubeGeometry(crv, 10, 0.0095, 8, false);
      disposables.geometries.push(tg);
      root.add(new THREE.Mesh(tg, mats.ledRed));
    });
  });

  return root;
}

/* ============================================================================
   2. 2012 MERCEDES-BENZ C 250 CDI W204 FACELIFT AVANTGARDE (`BH 01 STS`)
============================================================================ */

export function buildSculptedMercedesW204(
  plateNumber: string,
  mats: SedanMaterials,
  createPlateTex: (plate: string) => THREE.CanvasTexture,
  createWheel: (
    radius: number,
    tireWidth: number,
    style: 'logan-5spoke' | 'mercedes-5twinspoke',
    sideSign: 1 | -1
  ) => THREE.Group,
  disposables: DisposableBucket
): THREE.Group {
  const root = new THREE.Group();

  // Official RAR CIV (BH 01 STS · WDD2040031A698310): L = 4.702m, W = 1.795m, H = 1.445m, WB = 2.760m
  // Authentic RWD German Executive Sport Sedan proportions (`mercedes-c250-w204-black.jpg`)
  const spec: SedanBodySpec = {
    rearCornerX: -1.96,
    rearAxleX: -1.32,
    rearGlassBaseX: -1.62,
    dloRearX: -1.36,
    rearRoofX: -1.04,
    roofPeakX: -0.24,
    frontRoofX: 0.14,
    cowlX: 0.72,
    frontAxleX: 1.44,
    frontCornerX: 1.94,
    wheelR: 0.318,
    archRadius: 0.354,
    trackZ: 0.805,
    shoulderRatio: 0.90,
    roofHalfWidth: 0.63,
    hoodRibZ: 0.35,
    hoodRibHeight: 0.011,
    // Sleek, low-slung W204 Avantgarde front nose profile
    frontNoseCenterXKnots: [
      [0.175, 2.24],
      [0.25, 2.315],
      [0.40, 2.35],
      [0.50, 2.335],
      [0.65, 2.275],
      [0.69, 2.21],
    ],
    // Classic W204 3-box executive rear bumper shelf + recessed trunk plate + subtle trunk lip
    rearTailCenterXKnots: [
      [0.195, -2.23],
      [0.31, -2.315],
      [0.46, -2.35],
      [0.58, -2.335],
      [0.68, -2.265],
      [0.88, -2.25],
      [0.955, -2.22],
    ],
    sillKnots: [
      [-2.22, 0.205],
      [-1.85, 0.182],
      [-0.88, 0.160],
      [0.98, 0.158],
      [1.88, 0.168],
      [2.22, 0.178],
    ],
    bellyYKnots: [
      [-2.22, 0.51],
      [-1.32, 0.525],
      [0.0, 0.505],
      [1.44, 0.49],
      [2.22, 0.43],
    ],
    beltYKnots: [
      [-2.22, 0.925],
      [-1.62, 0.945],
      [-0.85, 0.915],
      [0.0, 0.885],
      [0.72, 0.865],
      [1.50, 0.795],
      [1.94, 0.73],
      [2.21, 0.68],
    ],
    centerDeckYKnots: [
      [-2.22, 0.945],
      [-1.98, 0.962],
      [-1.62, 0.968],
      [0.72, 0.902],
      [1.48, 0.848],
      [1.94, 0.765],
      [2.21, 0.69],
    ],
    halfWidthKnots: [
      [-2.22, 0.76],
      [-1.96, 0.815],
      [-1.32, 0.892],
      [0.0, 0.90],
      [1.44, 0.892],
      [1.94, 0.81],
      [2.21, 0.75],
    ],
    roofYKnots: [
      [-1.04, 1.385],
      [-0.62, 1.434],
      [-0.20, 1.444],
      [0.14, 1.414],
    ],
  };

  /* ---- 1. SCULPTED RWD UNIBODY + WHEELHOUSE LINERS + 17" AVANTGARDE WHEELS ---- */
  const unibodyGeo = buildLoftedUnibodyGeometry(spec);
  disposables.geometries.push(unibodyGeo);
  const unibodyMesh = new THREE.Mesh(unibodyGeo, mats.cabPaint);
  unibodyMesh.castShadow = true;
  unibodyMesh.receiveShadow = true;
  root.add(unibodyMesh);

  const linerGeo = new THREE.CylinderGeometry(
    spec.archRadius - 0.008,
    spec.archRadius - 0.008,
    1.58,
    32
  );
  linerGeo.rotateX(Math.PI / 2);
  const underPanGeo = new THREE.BoxGeometry(3.85, 0.05, 1.46);
  disposables.geometries.push(linerGeo, underPanGeo);

  const underPan = new THREE.Mesh(underPanGeo, mats.darkPlastic);
  underPan.position.set(0.04, 0.175, 0);
  root.add(underPan);

  [
    { ax: spec.rearAxleX, tw: 0.245 },
    { ax: spec.frontAxleX, tw: 0.225 },
  ].forEach(({ ax, tw }) => {
    const liner = new THREE.Mesh(linerGeo, mats.darkPlastic);
    liner.position.set(ax, spec.wheelR + 0.006, 0);
    root.add(liner);

    ([-1, 1] as Array<-1 | 1>).forEach((sideSign) => {
      const w = createWheel(spec.wheelR, tw, 'mercedes-5twinspoke', sideSign);
      w.position.set(ax, spec.wheelR, sideSign * spec.trackZ);
      root.add(w);
    });
  });

  /* ---- 2. TRANSPARENT GREENHOUSE WITH FULL 3D CHROME TRIM + LUXURY INTERIOR ---- */
  root.add(buildGreenhouseAndInterior(spec, true, mats, disposables));

  /* ---- 3. CONFORMAL TRAPEZOIDAL CHROME AVANTGARDE STAR GRILLE + BI-XENON + DRLs ---- */
  const grilleTex = createMercedesW204GrilleCanvas();
  const meshTex = createLowerHoneycombCanvas();
  const plateTex = createPlateTex(plateNumber || 'BH 01 STS');
  disposables.textures.push(grilleTex, meshTex, plateTex);

  const grilleMat = new THREE.MeshStandardMaterial({
    map: grilleTex,
    roughness: 0.16,
    metalness: 0.72,
  });
  const lowerMeshMat = new THREE.MeshStandardMaterial({
    map: meshTex,
    roughness: 0.52,
    metalness: 0.16,
  });
  const plateMat = new THREE.MeshStandardMaterial({
    map: plateTex,
    roughness: 0.24,
    metalness: 0.08,
  });
  const lensGlassMat = new THREE.MeshPhysicalMaterial({
    color: '#ffffff',
    roughness: 0.02,
    metalness: 0.05,
    transparent: true,
    opacity: 0.15,
    clearcoat: 1.0,
    envMapIntensity: 2.35,
  });
  const rubyTailLensMat = new THREE.MeshPhysicalMaterial({
    color: '#991b1b',
    emissive: new THREE.Color('#450a0a'),
    emissiveIntensity: 0.35,
    roughness: 0.05,
    metalness: 0.08,
    transparent: true,
    opacity: 0.60,
    clearcoat: 1.0,
    envMapIntensity: 2.0,
  });
  disposables.materials.push(
    grilleMat,
    lowerMeshMat,
    plateMat,
    lensGlassMat,
    rubyTailLensMat
  );

  // Trapezoidal curved Avantgarde radiator grille (z ∈ [-0.42, +0.42], y ∈ [0.495, 0.675])
  const grilleGeo = createConformalFasciaPatch(
    spec,
    1,
    -0.42,
    0.42,
    0.495,
    0.675,
    0.009,
    24,
    10,
    1.03,
    0.84
  );
  disposables.geometries.push(grilleGeo);
  root.add(new THREE.Mesh(grilleGeo, grilleMat));

  const ptFront = (y: number, z: number, off = 0.015) =>
    new THREE.Vector3(evalFrontSurfaceX(spec, y, z) + off, y, z);

  // 2 Sculpted 3D Chrome Avantgarde Grille Louvers
  [0.555, 0.618].forEach((ly, idx) => {
    const halfSpan = idx === 0 ? 0.36 : 0.395;
    const louvrePts: THREE.Vector3[] = [];
    for (let k = -8; k <= 8; k++) {
      const zz = (k / 8) * halfSpan;
      louvrePts.push(ptFront(ly, zz, 0.016));
    }
    const lCurve = new THREE.CatmullRomCurve3(louvrePts);
    const lGeo = new THREE.TubeGeometry(lCurve, 24, 0.0095, 8, false);
    disposables.geometries.push(lGeo);
    root.add(new THREE.Mesh(lGeo, mats.chrome));
  });

  // Large Central 3D Mercedes-Benz 3-Pointed Star in Grille (y = 0.588, z = 0)
  const starX = evalFrontSurfaceX(spec, 0.588, 0);
  const starGrp = new THREE.Group();
  starGrp.position.set(starX + 0.020, 0.588, 0);
  starGrp.rotation.z = 0.24;

  const starBackGeo = new THREE.CylinderGeometry(0.068, 0.068, 0.014, 32);
  starBackGeo.rotateZ(Math.PI / 2);
  const starRingGeo = new THREE.TorusGeometry(0.068, 0.0085, 12, 36);
  starRingGeo.rotateY(Math.PI / 2);
  const starRayGeo = new THREE.ConeGeometry(0.010, 0.066, 4);
  const hoodBadgeGeo = new THREE.CylinderGeometry(0.017, 0.017, 0.005, 20);
  disposables.geometries.push(starBackGeo, starRingGeo, starRayGeo, hoodBadgeGeo);

  starGrp.add(new THREE.Mesh(starBackGeo, mats.glossBlack));
  const sRing = new THREE.Mesh(starRingGeo, mats.chrome);
  sRing.position.x = 0.006;
  starGrp.add(sRing);

  [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].forEach((ang) => {
    const ray = new THREE.Mesh(starRayGeo, mats.chrome);
    ray.rotation.x = ang;
    ray.position.set(0.009, Math.cos(ang) * 0.032, Math.sin(ang) * 0.032);
    starGrp.add(ray);
  });
  root.add(starGrp);

  // Flat circular Mercedes Laurel emblem on hood nose above grille
  const hoodBadge = new THREE.Mesh(hoodBadgeGeo, mats.chrome);
  hoodBadge.position.set(2.14, 0.708, 0);
  hoodBadge.rotation.z = -0.18;
  root.add(hoodBadge);

  // W204 Facelift Swept Bi-Xenon "C-Light" Headlights (|z| ∈ [0.435, 0.805], y ∈ [0.515, 0.688])
  const xenonSphereGeo = new THREE.SphereGeometry(0.034, 18, 18);
  const innerReflGeo = new THREE.SphereGeometry(0.025, 14, 14);
  const bezelRingGeo = new THREE.TorusGeometry(0.038, 0.005, 10, 24);
  bezelRingGeo.rotateY(Math.PI / 2);
  disposables.geometries.push(xenonSphereGeo, innerReflGeo, bezelRingGeo);

  ([-1, 1] as Array<-1 | 1>).forEach((sideSign) => {
    const zMin = sideSign > 0 ? 0.435 : -0.805;
    const zMax = sideSign > 0 ? 0.805 : -0.435;
    // W204 Facelift eagle-eye swept Bi-Xenon outline: narrower next to chrome grille, sweeping boldly upward onto front wing!
    const y0At0 = sideSign > 0 ? 0.512 : 0.568;
    const y1At0 = sideSign > 0 ? 0.642 : 0.712;
    const y0At1 = sideSign > 0 ? 0.568 : 0.512;
    const y1At1 = sideSign > 0 ? 0.712 : 0.642;

    const hlBackGeo = createConformalFasciaPatch(
      spec,
      1,
      zMin,
      zMax,
      y0At0,
      y1At0,
      0.006,
      18,
      8,
      1.0,
      1.0,
      y0At1,
      y1At1
    );
    const hlLensGeo = createConformalFasciaPatch(
      spec,
      1,
      zMin,
      zMax,
      y0At0,
      y1At0,
      0.019,
      18,
      8,
      1.0,
      1.0,
      y0At1,
      y1At1
    );
    disposables.geometries.push(hlBackGeo, hlLensGeo);
    root.add(new THREE.Mesh(hlBackGeo, mats.glossBlack));
    root.add(new THREE.Mesh(hlLensGeo, lensGlassMat));

    const xz = sideSign * 0.645;
    const xy = 0.612;
    const xx = evalFrontSurfaceX(spec, xy, xz) + 0.012;
    const xenon = new THREE.Mesh(xenonSphereGeo, mats.ledWhite);
    xenon.position.set(xx, xy, xz);
    xenon.scale.set(0.45, 1, 1);
    root.add(xenon);

    const shroud = new THREE.Mesh(bezelRingGeo, mats.chrome);
    shroud.position.set(xx + 0.003, xy, xz);
    shroud.rotation.y = Math.PI / 2 + sideSign * -0.32;
    root.add(shroud);

    const iz = sideSign * 0.525;
    const iy = 0.578;
    const ix = evalFrontSurfaceX(spec, iy, iz) + 0.010;
    const inner = new THREE.Mesh(innerReflGeo, mats.brushedAlu);
    inner.position.set(ix, iy, iz);
    inner.scale.set(0.45, 1, 1);
    root.add(inner);

    // Signature W204 Facelift C-Shaped Swept White LED Light-Guide Brow
    const cBrowPts = [
      ptFront(0.535, sideSign * 0.555, 0.014),
      ptFront(0.552, sideSign * 0.468, 0.014),
      ptFront(0.625, sideSign * 0.478, 0.014),
      ptFront(0.668, sideSign * 0.620, 0.014),
      ptFront(0.698, sideSign * 0.782, 0.014),
    ];
    const browCurve = new THREE.CatmullRomCurve3(cBrowPts);
    const browGeo = new THREE.TubeGeometry(browCurve, 20, 0.0072, 8, false);
    disposables.geometries.push(browGeo);
    root.add(new THREE.Mesh(browGeo, mats.ledWhite));
  });

  // Sporty W204 Avantgarde Lower Bumper: V-shaped central mesh + Side DRL Intakes + Curved BH 01 STS Plate
  const lowerCenterMeshGeo = createConformalFasciaPatch(
    spec,
    1,
    -0.40,
    0.40,
    0.195,
    0.325,
    0.007,
    18,
    6,
    0.92,
    1.04
  );
  const frontPlateHolderGeo = createConformalFasciaPatch(
    spec,
    1,
    -0.265,
    0.265,
    0.348,
    0.462,
    0.009,
    12,
    4
  );
  const frontPlateGeo = createConformalFasciaPatch(
    spec,
    1,
    -0.255,
    0.255,
    0.355,
    0.455,
    0.014,
    12,
    4
  );
  disposables.geometries.push(
    lowerCenterMeshGeo,
    frontPlateHolderGeo,
    frontPlateGeo
  );
  root.add(new THREE.Mesh(lowerCenterMeshGeo, lowerMeshMat));
  root.add(new THREE.Mesh(frontPlateHolderGeo, mats.darkPlastic));
  root.add(new THREE.Mesh(frontPlateGeo, plateMat));

  // Side Bumper Intakes with Straight Horizontal White LED DRL + Chrome Trim Bar
  ([-1, 1] as Array<-1 | 1>).forEach((sideSign) => {
    const sz0 = sideSign > 0 ? 0.46 : -0.77;
    const sz1 = sideSign > 0 ? 0.77 : -0.46;
    const sidePodGeo = createConformalFasciaPatch(
      spec,
      1,
      sz0,
      sz1,
      0.21,
      0.315,
      0.007,
      12,
      4
    );
    disposables.geometries.push(sidePodGeo);
    root.add(new THREE.Mesh(sidePodGeo, mats.glossBlack));

    const drlCurve = new THREE.CatmullRomCurve3([
      ptFront(0.255, sideSign * 0.485, 0.014),
      ptFront(0.258, sideSign * 0.615, 0.014),
      ptFront(0.262, sideSign * 0.745, 0.014),
    ]);
    const chrCurve = new THREE.CatmullRomCurve3([
      ptFront(0.272, sideSign * 0.48, 0.013),
      ptFront(0.275, sideSign * 0.615, 0.013),
      ptFront(0.279, sideSign * 0.75, 0.013),
    ]);
    const drlGeo = new THREE.TubeGeometry(drlCurve, 12, 0.0075, 8, false);
    const chrGeo = new THREE.TubeGeometry(chrCurve, 12, 0.005, 8, false);
    disposables.geometries.push(drlGeo, chrGeo);
    root.add(new THREE.Mesh(drlGeo, mats.ledWhite));
    root.add(new THREE.Mesh(chrGeo, mats.chrome));
  });

  /* ---- 4. W204 AERO MIRRORS WITH TWIN-ARROW LED STRIPS, CHROME HANDLES & SHARK FIN ---- */
  const mirrorCapGeo = new THREE.SphereGeometry(0.096, 20, 16);
  const mirrorGlassGeo = new THREE.CircleGeometry(0.066, 18);
  const stalkGeo = new THREE.BoxGeometry(0.09, 0.04, 0.09);
  const mirrorLedGeo = new THREE.BoxGeometry(0.025, 0.0085, 0.12);
  const handleBarGeo = new THREE.CapsuleGeometry(0.014, 0.135, 6, 12);
  handleBarGeo.rotateZ(Math.PI / 2);
  const handleChrGeo = new THREE.BoxGeometry(0.13, 0.008, 0.012);
  const wiperGeo = new THREE.BoxGeometry(0.018, 0.014, 0.46);
  const sharkFinGeo = new THREE.ConeGeometry(0.022, 0.072, 4);
  disposables.geometries.push(
    mirrorCapGeo,
    mirrorGlassGeo,
    stalkGeo,
    mirrorLedGeo,
    handleBarGeo,
    handleChrGeo,
    wiperGeo,
    sharkFinGeo
  );

  ([-1, 1] as Array<-1 | 1>).forEach((sideSign) => {
    const stalk = new THREE.Mesh(stalkGeo, mats.glossBlack);
    stalk.position.set(0.44, 0.915, sideSign * 0.82);
    root.add(stalk);

    const mGrp = new THREE.Group();
    mGrp.position.set(0.41, 0.95, sideSign * 0.92);
    mGrp.rotation.y = sideSign * -0.18;

    const cap = new THREE.Mesh(mirrorCapGeo, mats.cabPaint);
    cap.scale.set(0.84, 0.54, 1.02);
    cap.castShadow = true;
    mGrp.add(cap);

    const mFace = new THREE.Mesh(mirrorGlassGeo, mats.chrome);
    mFace.scale.set(1.28, 0.76, 1);
    mFace.position.x = -0.070;
    mFace.rotation.y = -Math.PI / 2;
    mGrp.add(mFace);

    [-0.008, 0.008].forEach((ly) => {
      const mLed = new THREE.Mesh(mirrorLedGeo, mats.ledAmber);
      mLed.position.set(0.072, ly, sideSign * 0.01);
      mGrp.add(mLed);
    });
    root.add(mGrp);

    [-0.02, -0.80].forEach((hx, idx) => {
      const hy = idx === 0 ? 0.845 : 0.87;
      const dh = new THREE.Mesh(handleBarGeo, mats.cabPaint);
      dh.position.set(hx, hy, sideSign * 0.896);
      root.add(dh);

      const dhc = new THREE.Mesh(handleChrGeo, mats.chrome);
      dhc.position.set(hx, hy + 0.011, sideSign * 0.906);
      root.add(dhc);
    });

    // Lower Avantgarde chrome side rocker moulding spear
    const spearPts = [
      new THREE.Vector3(-0.92, 0.28, sideSign * 0.892),
      new THREE.Vector3(0.05, 0.265, sideSign * 0.902),
      new THREE.Vector3(1.02, 0.255, sideSign * 0.892),
    ];
    const spearGeo = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(spearPts),
      16,
      0.006,
      8,
      false
    );
    disposables.geometries.push(spearGeo);
    root.add(new THREE.Mesh(spearGeo, mats.chrome));
  });

  [-0.25, 0.23].forEach((zw) => {
    const w = new THREE.Mesh(wiperGeo, mats.glossBlack);
    w.position.set(0.60, 0.93, zw);
    root.add(w);
  });

  const sharkFin = new THREE.Mesh(sharkFinGeo, mats.cabPaint);
  sharkFin.position.set(-0.82, 1.436, 0);
  sharkFin.rotation.y = Math.PI / 4;
  sharkFin.scale.set(1.8, 1, 0.6);
  root.add(sharkFin);

  /* ---- 5. MERCEDES W204 CONFORMAL REAR (3D STAR, CHROME BAR, RUBY LEDs, TWIN EXHAUST) ---- */
  const rearBadgeCanvas = document.createElement('canvas');
  rearBadgeCanvas.width = 768;
  rearBadgeCanvas.height = 96;
  const bctx = rearBadgeCanvas.getContext('2d')!;
  bctx.clearRect(0, 0, 768, 96);
  bctx.fillStyle = '#f8fafc';
  bctx.font = '800 38px Inter, system-ui, sans-serif';
  bctx.textBaseline = 'middle';
  bctx.textAlign = 'left';
  bctx.fillText('C 250', 36, 48);
  bctx.textAlign = 'right';
  bctx.fillText('CDI', 732, 48);
  const rearBadgeTex = new THREE.CanvasTexture(rearBadgeCanvas);
  rearBadgeTex.colorSpace = THREE.SRGBColorSpace;
  disposables.textures.push(rearBadgeTex);
  const rearBadgeMat = new THREE.MeshStandardMaterial({
    map: rearBadgeTex,
    transparent: true,
    roughness: 0.18,
    metalness: 0.78,
  });
  disposables.materials.push(rearBadgeMat);

  const rearBadgeGeo = createConformalFasciaPatch(
    spec,
    -1,
    -0.42,
    0.42,
    0.855,
    0.922,
    0.009,
    14,
    4
  );
  const trunkChromeGeo = createConformalFasciaPatch(
    spec,
    -1,
    -0.42,
    0.42,
    0.812,
    0.832,
    0.011,
    16,
    2
  );
  const rearPlateHolderGeo = createConformalFasciaPatch(
    spec,
    -1,
    -0.265,
    0.265,
    0.680,
    0.795,
    0.009,
    12,
    4
  );
  const rearPlateGeo = createConformalFasciaPatch(
    spec,
    -1,
    -0.255,
    0.255,
    0.687,
    0.788,
    0.014,
    12,
    4
  );
  const rearDiffuserGeo = createConformalFasciaPatch(
    spec,
    -1,
    -0.66,
    0.66,
    0.20,
    0.315,
    0.007,
    18,
    4
  );
  const rearChromeLowerGeo = createConformalFasciaPatch(
    spec,
    -1,
    -0.60,
    0.60,
    0.32,
    0.335,
    0.011,
    16,
    2
  );
  const rStarRingGeo = new THREE.TorusGeometry(0.032, 0.0045, 10, 28);
  rStarRingGeo.rotateY(Math.PI / 2);
  const rStarRayGeo = new THREE.ConeGeometry(0.005, 0.031, 4);
  const exhaustTipGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.13, 20);
  exhaustTipGeo.rotateZ(Math.PI / 2);

  disposables.geometries.push(
    rearBadgeGeo,
    trunkChromeGeo,
    rearPlateHolderGeo,
    rearPlateGeo,
    rearDiffuserGeo,
    rearChromeLowerGeo,
    rStarRingGeo,
    rStarRayGeo,
    exhaustTipGeo
  );

  root.add(new THREE.Mesh(rearBadgeGeo, rearBadgeMat));
  root.add(new THREE.Mesh(trunkChromeGeo, mats.chrome));
  root.add(new THREE.Mesh(rearPlateHolderGeo, mats.darkPlastic));
  root.add(new THREE.Mesh(rearPlateGeo, plateMat));
  root.add(new THREE.Mesh(rearDiffuserGeo, mats.darkPlastic));
  root.add(new THREE.Mesh(rearChromeLowerGeo, mats.chrome));

  const rStarX = evalRearSurfaceX(spec, 0.895, 0) - 0.014;
  const rStarRing = new THREE.Mesh(rStarRingGeo, mats.chrome);
  rStarRing.position.set(rStarX, 0.895, 0);
  root.add(rStarRing);
  [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].forEach((ang) => {
    const ray = new THREE.Mesh(rStarRayGeo, mats.chrome);
    ray.rotation.x = ang;
    ray.position.set(
      rStarX - 0.002,
      0.895 + Math.cos(ang) * 0.015,
      Math.sin(ang) * 0.015
    );
    root.add(ray);
  });

  // W204 Facelift Wraparound Horizontal Ruby LED Bar Taillights + Clear Turn Strip
  ([-1, 1] as Array<-1 | 1>).forEach((sideSign) => {
    const z0 = sideSign > 0 ? 0.44 : -0.79;
    const z1 = sideSign > 0 ? 0.79 : -0.44;
    const ry0At0 = sideSign > 0 ? 0.735 : 0.720;
    const ry1At0 = sideSign > 0 ? 0.875 : 0.892;
    const ry0At1 = sideSign > 0 ? 0.720 : 0.735;
    const ry1At1 = sideSign > 0 ? 0.892 : 0.875;

    const tlBackGeo = createConformalFasciaPatch(
      spec,
      -1,
      z0,
      z1,
      ry0At0,
      ry1At0,
      0.007,
      16,
      6,
      1.0,
      1.0,
      ry0At1,
      ry1At1
    );
    const tlLensGeo = createConformalFasciaPatch(
      spec,
      -1,
      z0,
      z1,
      ry0At0,
      ry1At0,
      0.018,
      16,
      6,
      1.0,
      1.0,
      ry0At1,
      ry1At1
    );
    disposables.geometries.push(tlBackGeo, tlLensGeo);
    root.add(new THREE.Mesh(tlBackGeo, mats.glossBlack));
    root.add(new THREE.Mesh(tlLensGeo, rubyTailLensMat));

    const ptTail = (y: number, zAbs: number) => {
      const zz = sideSign * zAbs;
      return new THREE.Vector3(evalRearSurfaceX(spec, y, zz) - 0.013, y, zz);
    };

    [0.862, 0.834, 0.782, 0.754].forEach((ry) => {
      const rCrv = new THREE.CatmullRomCurve3([
        ptTail(ry, 0.46),
        ptTail(ry, 0.615),
        ptTail(ry, 0.77),
      ]);
      const rg = new THREE.TubeGeometry(rCrv, 12, 0.0072, 8, false);
      disposables.geometries.push(rg);
      root.add(new THREE.Mesh(rg, mats.ledRed));
    });

    const clearCrv = new THREE.CatmullRomCurve3([
      ptTail(0.808, 0.46),
      ptTail(0.808, 0.615),
      ptTail(0.808, 0.77),
    ]);
    const cg = new THREE.TubeGeometry(clearCrv, 12, 0.0082, 8, false);
    disposables.geometries.push(cg);
    root.add(new THREE.Mesh(cg, mats.ledWhite));
  });

  // C 250 CDI Dual Left Oval Chrome Exhaust Tips
  [-0.54, -0.45].forEach((ez) => {
    const tipX = evalRearSurfaceX(spec, 0.215, ez) - 0.025;
    const tip = new THREE.Mesh(exhaustTipGeo, mats.chrome);
    tip.position.set(tipX, 0.215, ez);
    tip.scale.set(1, 0.76, 1.18);
    root.add(tip);
  });

  return root;
}
