export type ImageFraming = { x: number; y: number; zoom: number };
export const defaultFraming: ImageFraming = { x: 50, y: 50, zoom: 1 };

export function parseImageFraming(value: unknown): ImageFraming | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "object" || Array.isArray(value)) throw Error("Invalid image framing.");
  const frame = value as Record<string, unknown>;
  const inRange = (key: string, min: number, max: number) =>
    typeof frame[key] === "number" && Number.isFinite(frame[key]) && frame[key] >= min && frame[key] <= max;
  if (!inRange("x", 0, 100) || !inRange("y", 0, 100) || !inRange("zoom", 1, 3)) {
    throw Error("Image position must be between 0 and 100, with zoom between 100% and 300%.");
  }
  return { x: frame.x as number, y: frame.y as number, zoom: frame.zoom as number };
}

export function imageFramingStyle(frame: ImageFraming | null | undefined, originalFit: "contain" | "cover" = "cover") {
  if (!frame) return { objectFit: originalFit };
  const position = `${frame.x}% ${frame.y}%`;
  // Matching transform-origin and object-position gives the same crop at any
  // frame size. Increasing zoom creates more room to move without blank edges.
  return { objectFit: "cover" as const, objectPosition: position, transform: `scale(${frame.zoom})`, transformOrigin: position };
}

export function frameOverflow(image: { width: number; height: number }, frame: { width: number; height: number }, zoom: number) {
  if (image.width <= 0 || image.height <= 0 || frame.width <= 0 || frame.height <= 0) return { x: 0, y: 0 };
  const scale = Math.max(frame.width / image.width, frame.height / image.height) * zoom;
  return { x: Math.max(0, image.width * scale - frame.width), y: Math.max(0, image.height * scale - frame.height) };
}

export function moveFraming(start: ImageFraming, delta: { x: number; y: number }, overflow: { x: number; y: number }): ImageFraming {
  const position = (start: number, movement: number, extra: number) =>
    extra < 0.01 ? start : Math.round(Math.max(0, Math.min(100, start - movement / extra * 100)) * 100) / 100;
  return { ...start, x: position(start.x, delta.x, overflow.x), y: position(start.y, delta.y, overflow.y) };
}
