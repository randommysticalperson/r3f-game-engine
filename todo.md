
## Bug Fixes (Round 2)
- [x] Fix: Objects invisible in viewport unless selected
- [x] Fix: Inspector loses selection on mouse release (must hold click to inspect)
- [x] Fix: Crash when clicking objects (TransformControls null updateMatrixWorld)

## Follow-up Features
- [x] Undo/Redo command stack (Ctrl+Z / Ctrl+Y) using Zustand history stack
- [x] Scene thumbnail capture (canvas.toDataURL) on DB save, uploaded to S3
- [x] Manus OAuth login + per-user scene ownership (UserButton in Toolbar)

## Pending Enhancements
- [x] Add isPublic toggle in the File > Save dialog so users can mark scenes public/private

## Cauchy Stress Tensor Feature
- [x] CauchyStressTensor math module: 3x3 symmetric tensor, eigenvalue decomposition (Jacobi), principal stresses, von Mises, hydrostatic/deviatoric split, strain via Hooke's law
- [x] CauchyStress component in engine store with full sigma tensor (sxx, syy, szz, txy, txz, tyz), Young's modulus, Poisson ratio
- [x] Inspector panel: CauchyStress component editor with 6 stress inputs, material constants, live principal stress readout
- [x] Viewport: real-time tensor deformation driving position (body force), rotation (principal stress eigenvectors), scale (principal strains)
- [x] Stress visualization: principal stress arrows (R3F Lines), von Mises color map on mesh, Mohr's circle HUD panel

## Cauchy Stress Follow-ups
- [x] Inline Cauchy Stress Tensor mini-panel under Transform in Inspector (shows when cauchyStress component exists)
- [x] Yield criterion selector (von Mises, Tresca, Mohr-Coulomb) with color-coded yield ratio bar
- [x] Stress wave propagation animation in play mode (wave equation on tensor components)
- [x] Multi-object stress coupling via Rapier collision traction vectors (t = sigma * n_hat)
