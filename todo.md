
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
