/**
 * Viewport thumbnail capture utility.
 * Reads the Three.js WebGL canvas and returns a base64 JPEG data URL.
 * The canvas must have preserveDrawingBuffer=true for this to work.
 */

let _canvasRef: HTMLCanvasElement | null = null;

/** Called by Viewport to register the Three.js canvas element. */
export function registerViewportCanvas(canvas: HTMLCanvasElement) {
  _canvasRef = canvas;
}

/** Capture the current viewport as a base64 JPEG (quality 0-1). */
export function captureViewportThumbnail(quality = 0.7): string | null {
  if (!_canvasRef) return null;
  try {
    return _canvasRef.toDataURL('image/jpeg', quality);
  } catch {
    return null;
  }
}
