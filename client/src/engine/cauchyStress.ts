/**
 * Cauchy Stress Tensor Module
 * Augustin-Louis Cauchy (1822) - Continuum Mechanics
 *
 * The Cauchy stress tensor sigma is a 3x3 symmetric second-order tensor:
 *
 *       | sxx  txy  txz |
 *  s =  | txy  syy  tyz |
 *       | txz  tyz  szz |
 *
 * Normal stresses (sxx, syy, szz) act perpendicular to faces.
 * Shear stresses  (txy, txz, tyz) act tangential to faces.
 * Symmetry: tij = tji (moment equilibrium, Cauchy's theorem).
 *
 * This module computes:
 *   - Principal stresses (eigenvalues) via Jacobi iteration
 *   - Principal directions (eigenvectors) -> rotation
 *   - Hydrostatic pressure and deviatoric tensor
 *   - Von Mises equivalent stress (yield criterion)
 *   - Principal strains via generalised Hooke's law
 *   - Volumetric strain -> scale deformation
 *   - Body force vector -> position displacement
 *   - Mohr's circle parameters
 */

export interface CauchyTensor {
  sxx: number; // Normal stress X (Pa)
  syy: number; // Normal stress Y (Pa)
  szz: number; // Normal stress Z (Pa)
  txy: number; // Shear stress XY (Pa)
  txz: number; // Shear stress XZ (Pa)
  tyz: number; // Shear stress YZ (Pa)
}

export interface MaterialProps {
  youngsModulus: number;  // E  (Pa)  - stiffness
  poissonsRatio: number;  // nu (0..0.5) - lateral contraction
  density: number;        // rho (kg/m3) - for body force
}

export interface PrincipalStresses {
  s1: number; // Major principal stress
  s2: number; // Intermediate principal stress
  s3: number; // Minor principal stress
  // Eigenvectors (principal directions) as flat [x,y,z] arrays
  v1: [number, number, number];
  v2: [number, number, number];
  v3: [number, number, number];
}

export interface StressInvariants {
  I1: number;  // First invariant:  trace(sigma) = sxx+syy+szz
  I2: number;  // Second invariant: 0.5*(I1^2 - trace(s^2))
  I3: number;  // Third invariant:  det(sigma)
  J2: number;  // Second deviatoric invariant (von Mises)
  vonMises: number;  // sqrt(3*J2)
  hydrostatic: number; // Mean normal stress p = I1/3
  tresca: number;      // Tresca criterion: (s1-s3)/2
}

export interface StressDeformation {
  // Strains from generalised Hooke's law
  exx: number;
  eyy: number;
  ezz: number;
  gxy: number; // Engineering shear strain
  gxz: number;
  gyz: number;
  volumetricStrain: number; // ev = exx + eyy + ezz
  // Scale factors (1 + strain)
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  // Rotation from principal directions (Euler angles in radians)
  rotX: number;
  rotY: number;
  rotZ: number;
  // Body force displacement (proportional to stress gradient proxy)
  dispX: number;
  dispY: number;
  dispZ: number;
}

// -----------------------------------------------------------------------
// Jacobi eigenvalue algorithm for 3x3 symmetric matrices
// Returns { values: [l1,l2,l3], vectors: [[v1x,v1y,v1z],[v2x,v2y,v2z],[v3x,v3y,v3z]] }
// -----------------------------------------------------------------------
export function jacobiEigen3(
  a00: number, a11: number, a22: number,
  a01: number, a02: number, a12: number
): { values: [number, number, number]; vectors: [[number,number,number],[number,number,number],[number,number,number]] } {
  // Work matrix (symmetric, stored as upper triangle)
  let m = [
    [a00, a01, a02],
    [a01, a11, a12],
    [a02, a12, a22],
  ];

  // Eigenvector matrix initialised to identity
  let v = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];

  const MAX_ITER = 100;
  const EPS = 1e-10;

  for (let iter = 0; iter < MAX_ITER; iter++) {
    // Find the largest off-diagonal element
    let p = 0, q = 1;
    let maxVal = Math.abs(m[0][1]);
    if (Math.abs(m[0][2]) > maxVal) { maxVal = Math.abs(m[0][2]); p = 0; q = 2; }
    if (Math.abs(m[1][2]) > maxVal) { maxVal = Math.abs(m[1][2]); p = 1; q = 2; }

    if (maxVal < EPS) break; // Converged

    // Compute rotation angle
    const theta = 0.5 * Math.atan2(2 * m[p][q], m[q][q] - m[p][p]);
    const c = Math.cos(theta);
    const s = Math.sin(theta);

    // Apply Jacobi rotation: m' = R^T * m * R
    const newM = m.map(row => [...row]);
    const newV = v.map(row => [...row]);

    // Update matrix elements
    const mpp = c*c*m[p][p] - 2*s*c*m[p][q] + s*s*m[q][q];
    const mqq = s*s*m[p][p] + 2*s*c*m[p][q] + c*c*m[q][q];
    const mpq = 0; // This is the whole point of the rotation

    newM[p][p] = mpp;
    newM[q][q] = mqq;
    newM[p][q] = mpq;
    newM[q][p] = mpq;

    // Update remaining rows/columns
    for (let r = 0; r < 3; r++) {
      if (r !== p && r !== q) {
        newM[p][r] = c*m[p][r] - s*m[q][r];
        newM[r][p] = newM[p][r];
        newM[q][r] = s*m[p][r] + c*m[q][r];
        newM[r][q] = newM[q][r];
      }
    }

    // Update eigenvectors
    for (let r = 0; r < 3; r++) {
      newV[r][p] = c*v[r][p] - s*v[r][q];
      newV[r][q] = s*v[r][p] + c*v[r][q];
    }

    m = newM;
    v = newV;
  }

  // Sort eigenvalues descending (s1 >= s2 >= s3)
  const eigenPairs: [number, number[]][] = [
    [m[0][0], [v[0][0], v[1][0], v[2][0]]],
    [m[1][1], [v[0][1], v[1][1], v[2][1]]],
    [m[2][2], [v[0][2], v[1][2], v[2][2]]],
  ];
  eigenPairs.sort((a, b) => b[0] - a[0]);

  return {
    values: [eigenPairs[0][0], eigenPairs[1][0], eigenPairs[2][0]] as [number, number, number],
    vectors: [
      eigenPairs[0][1] as [number, number, number],
      eigenPairs[1][1] as [number, number, number],
      eigenPairs[2][1] as [number, number, number],
    ],
  };
}

// -----------------------------------------------------------------------
// Compute principal stresses and directions
// -----------------------------------------------------------------------
export function computePrincipalStresses(t: CauchyTensor): PrincipalStresses {
  const { values, vectors } = jacobiEigen3(
    t.sxx, t.syy, t.szz,
    t.txy, t.txz, t.tyz
  );
  return {
    s1: values[0],
    s2: values[1],
    s3: values[2],
    v1: vectors[0],
    v2: vectors[1],
    v3: vectors[2],
  };
}

// -----------------------------------------------------------------------
// Compute stress invariants and derived quantities
// -----------------------------------------------------------------------
export function computeInvariants(t: CauchyTensor): StressInvariants {
  const { sxx, syy, szz, txy, txz, tyz } = t;

  // First invariant: I1 = trace
  const I1 = sxx + syy + szz;

  // Second invariant: I2 = 0.5*(I1^2 - trace(s^2))
  const traceS2 = sxx*sxx + syy*syy + szz*szz + 2*(txy*txy + txz*txz + tyz*tyz);
  const I2 = 0.5 * (I1*I1 - traceS2);

  // Third invariant: I3 = det(sigma)
  const I3 = sxx*(syy*szz - tyz*tyz) - txy*(txy*szz - tyz*txz) + txz*(txy*tyz - syy*txz);

  // Hydrostatic (mean) stress
  const hydrostatic = I1 / 3;

  // Deviatoric stresses: s' = s - p*I
  const dxx = sxx - hydrostatic;
  const dyy = syy - hydrostatic;
  const dzz = szz - hydrostatic;

  // Second deviatoric invariant J2
  const J2 = 0.5 * (dxx*dxx + dyy*dyy + dzz*dzz + 2*(txy*txy + txz*txz + tyz*tyz));

  // Von Mises equivalent stress: sigma_vm = sqrt(3*J2)
  const vonMises = Math.sqrt(3 * Math.max(J2, 0));

  // Principal stresses for Tresca
  const ps = computePrincipalStresses(t);
  const tresca = (ps.s1 - ps.s3) / 2;

  return { I1, I2, I3, J2, vonMises, hydrostatic, tresca };
}

// -----------------------------------------------------------------------
// Generalised Hooke's Law: strain from stress
// exx = (sxx - nu*(syy+szz)) / E
// eyy = (syy - nu*(sxx+szz)) / E
// ezz = (szz - nu*(sxx+syy)) / E
// gxy = txy / G,  G = E / (2*(1+nu))
// -----------------------------------------------------------------------
export function computeDeformation(
  t: CauchyTensor,
  mat: MaterialProps,
  scale = 1.0,
  dt = 0.016
): StressDeformation {
  const { sxx, syy, szz, txy, txz, tyz } = t;
  const { youngsModulus: E, poissonsRatio: nu } = mat;

  const safeE = Math.max(E, 1e-6);
  const G = safeE / (2 * (1 + nu)); // Shear modulus

  // Normal strains (Hooke's law)
  const exx = (sxx - nu * (syy + szz)) / safeE;
  const eyy = (syy - nu * (sxx + szz)) / safeE;
  const ezz = (szz - nu * (sxx + syy)) / safeE;

  // Engineering shear strains
  const gxy = txy / G;
  const gxz = txz / G;
  const gyz = tyz / G;

  // Volumetric strain
  const volumetricStrain = exx + eyy + ezz;

  // Scale factors: object stretches/compresses proportional to strain
  // Clamp to prevent extreme deformation
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const strainAmp = scale;
  const scaleX = clamp(1 + exx * strainAmp, 0.05, 10);
  const scaleY = clamp(1 + eyy * strainAmp, 0.05, 10);
  const scaleZ = clamp(1 + ezz * strainAmp, 0.05, 10);

  // Rotation from principal stress directions
  // The eigenvectors define the principal frame; we extract Euler angles
  const ps = computePrincipalStresses(t);
  // Build rotation matrix from eigenvectors (columns = principal directions)
  const R = [
    [ps.v1[0], ps.v2[0], ps.v3[0]],
    [ps.v1[1], ps.v2[1], ps.v3[1]],
    [ps.v1[2], ps.v2[2], ps.v3[2]],
  ];

  // Extract Euler angles (ZYX convention) from rotation matrix
  // Scaled by shear stress magnitude to blend with identity
  const shearMag = Math.sqrt(txy*txy + txz*txz + tyz*tyz);
  const normalMag = Math.sqrt(sxx*sxx + syy*syy + szz*szz) + 1e-10;
  const rotBlend = Math.min(shearMag / normalMag, 1.0) * strainAmp;

  const rotX = Math.atan2(R[2][1], R[2][2]) * rotBlend;
  const rotY = Math.atan2(-R[2][0], Math.sqrt(R[2][1]*R[2][1] + R[2][2]*R[2][2])) * rotBlend;
  const rotZ = Math.atan2(R[1][0], R[0][0]) * rotBlend;

  // Body force displacement: F = rho * a, proxy via stress gradient
  // Use deviatoric stress to drive position (shear-driven translation)
  const inv = computeInvariants(t);
  const bodyScale = scale * dt * dt / (mat.density + 1e-10) / safeE * 1e6;
  const dispX = (txy + txz) * bodyScale;
  const dispY = (txy + tyz) * bodyScale;
  const dispZ = (txz + tyz) * bodyScale;

  return {
    exx, eyy, ezz, gxy, gxz, gyz,
    volumetricStrain,
    scaleX, scaleY, scaleZ,
    rotX, rotY, rotZ,
    dispX, dispY, dispZ,
  };
}

// -----------------------------------------------------------------------
// Mohr's Circle parameters (2D cross-section, e.g. XY plane)
// -----------------------------------------------------------------------
export interface MohrsCircle {
  center: number;   // (sxx + syy) / 2
  radius: number;   // sqrt(((sxx-syy)/2)^2 + txy^2)
  sMax: number;     // Maximum normal stress on circle
  sMin: number;     // Minimum normal stress on circle
  tMax: number;     // Maximum shear stress = radius
  angle2theta: number; // Angle to principal plane (radians, in 2*theta space)
}

export function computeMohrsCircle(t: CauchyTensor): MohrsCircle {
  const { sxx, syy, txy } = t;
  const center = (sxx + syy) / 2;
  const radius = Math.sqrt(Math.pow((sxx - syy) / 2, 2) + txy * txy);
  return {
    center,
    radius,
    sMax: center + radius,
    sMin: center - radius,
    tMax: radius,
    angle2theta: Math.atan2(txy, (sxx - syy) / 2),
  };
}

// -----------------------------------------------------------------------
// Yield ratio: 0 = no stress, 1 = at yield surface, >1 = yielded
// Supports von Mises, Tresca, and Mohr-Coulomb criteria
// -----------------------------------------------------------------------
export type YieldCriterion = 'vonMises' | 'tresca' | 'mohrCoulomb';

export interface YieldResult {
  ratio: number;           // 0..1+ (1 = at yield surface)
  effectiveStress: number; // Criterion-specific equivalent stress (Pa)
  criterion: YieldCriterion;
  label: string;           // Human-readable criterion name
  formula: string;         // Formula description
}

/**
 * Compute yield ratio for the given criterion.
 *
 * von Mises:    sigma_vm = sqrt(3*J2)  -- isotropic ductile metals
 * Tresca:       tau_max = (s1-s3)/2    -- conservative, used in pressure vessels
 * Mohr-Coulomb: tau = c + sigma*tan(phi) -- friction-based (soils, concrete)
 *               simplified as (s1 - s3) / 2 + (s1 + s3) * sin(phi) / 2
 *               with phi = 30 deg (typical friction angle for concrete)
 */
export function computeYieldRatio(
  t: CauchyTensor,
  yieldStress: number,
  criterion: YieldCriterion = 'vonMises'
): YieldResult {
  const inv = computeInvariants(t);
  const ps = computePrincipalStresses(t);
  const safeYield = Math.max(yieldStress, 1e-6);

  switch (criterion) {
    case 'vonMises': {
      const vm = inv.vonMises;
      return {
        ratio: vm / safeYield,
        effectiveStress: vm,
        criterion,
        label: 'von Mises',
        formula: 'sigma_vm = sqrt(3*J2)',
      };
    }
    case 'tresca': {
      // Tresca: yield when max shear stress = yield stress / 2
      // i.e. (s1 - s3) >= yieldStress
      const tresca = ps.s1 - ps.s3; // = 2 * tau_max
      return {
        ratio: tresca / safeYield,
        effectiveStress: tresca,
        criterion,
        label: 'Tresca',
        formula: 'tau_max = (s1-s3)/2',
      };
    }
    case 'mohrCoulomb': {
      // Mohr-Coulomb: simplified with friction angle phi = 30 deg, cohesion c = yieldStress/2
      // Failure when: (s1 - s3)/2 + (s1 + s3)/2 * sin(phi) >= c * cos(phi)
      const phi = Math.PI / 6; // 30 degrees
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);
      const c = safeYield / 2; // cohesion
      const lhs = (ps.s1 - ps.s3) / 2 + (ps.s1 + ps.s3) / 2 * sinPhi;
      const rhs = c * cosPhi;
      const effectiveStress = lhs;
      return {
        ratio: rhs > 0 ? lhs / rhs : 0,
        effectiveStress,
        criterion,
        label: 'Mohr-Coulomb',
        formula: 'tau = c + sigma*tan(phi)',
      };
    }
    default:
      return { ratio: 0, effectiveStress: 0, criterion, label: 'Unknown', formula: '' };
  }
}

// -----------------------------------------------------------------------
// Von Mises color map: maps stress to RGB color
// Blue (low) -> Green -> Yellow -> Red (high, near yield)
// -----------------------------------------------------------------------
export function vonMisesColor(vonMises: number, yieldStress: number): [number, number, number] {
  const t = Math.min(vonMises / Math.max(yieldStress, 1e-6), 1.0);
  // Cool-warm colormap
  if (t < 0.25) {
    const s = t / 0.25;
    return [0, s * 0.5, 1 - s * 0.5]; // blue -> cyan
  } else if (t < 0.5) {
    const s = (t - 0.25) / 0.25;
    return [0, 0.5 + s * 0.5, 0.5 - s * 0.5]; // cyan -> green
  } else if (t < 0.75) {
    const s = (t - 0.5) / 0.25;
    return [s, 1 - s * 0.5, 0]; // green -> yellow
  } else {
    const s = (t - 0.75) / 0.25;
    return [1, 0.5 - s * 0.5, 0]; // yellow -> red
  }
}

// -----------------------------------------------------------------------
// Default tensor (zero stress = no deformation)
// -----------------------------------------------------------------------
export const DEFAULT_CAUCHY_TENSOR: CauchyTensor = {
  sxx: 0, syy: 0, szz: 0,
  txy: 0, txz: 0, tyz: 0,
};

export const DEFAULT_MATERIAL: MaterialProps = {
  youngsModulus: 200e9, // Steel: 200 GPa
  poissonsRatio: 0.3,
  density: 7850,        // Steel: 7850 kg/m3
};
