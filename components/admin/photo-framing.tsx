"use client";
import Image from "next/image";
import { useId, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import { defaultFraming, frameOverflow, imageFramingStyle, moveFraming } from "../../lib/image-framing";
import type { ImageFraming } from "../../lib/image-framing";

type Drag = { pointerId: number; x: number; y: number; frame: ImageFraming; overflow: { x: number; y: number } };
export function PhotoFraming({ src, alt, framing, index, disabled = false, onChange }: {
  src: string; alt: string; framing?: ImageFraming | null; index: number; disabled?: boolean;
  onChange: (frame: ImageFraming | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [failed, setFailed] = useState(false);
  const drag = useRef<Drag | null>(null);
  const helpId = useId();
  const frame = framing ?? defaultFraming;
  const canEdit = editing && !disabled && !failed && size.width > 0;
  function start(event: PointerEvent<HTMLDivElement>) {
    if (!canEdit || event.button !== 0) return;
    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY,
      frame, overflow: frameOverflow(size, bounds, frame.zoom) };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.focus();
  }
  function move(event: PointerEvent<HTMLDivElement>) {
    const start = drag.current;
    if (!canEdit || !start || start.pointerId !== event.pointerId) return;
    onChange(moveFraming(start.frame, { x: event.clientX - start.x, y: event.clientY - start.y }, start.overflow));
  }
  function end(event: PointerEvent<HTMLDivElement>, cancelled = false) {
    const start = drag.current;
    if (!start || start.pointerId !== event.pointerId) return;
    drag.current = null;
    if (cancelled) onChange(start.frame);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function keyboard(event: KeyboardEvent<HTMLDivElement>) {
    if (!canEdit || event.target !== event.currentTarget) return;
    const step = event.shiftKey ? 20 : 4;
    const directions: Record<string, { x: number; y: number }> = {
      ArrowLeft: { x: -step, y: 0 }, ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step }, ArrowDown: { x: 0, y: step },
    };
    if (!directions[event.key]) return;
    event.preventDefault();
    onChange(moveFraming(frame, directions[event.key], frameOverflow(size, event.currentTarget.getBoundingClientRect(), frame.zoom)));
  }
  return <div className="admin-photo-framing">
    <div className={`admin-photo-frame${canEdit ? " is-adjusting" : ""}`} role="group"
      aria-label={`Reposition image ${index + 1}`} aria-describedby={editing ? helpId : undefined}
      tabIndex={canEdit ? 0 : -1} onPointerDown={start} onPointerMove={move}
      onPointerUp={event => end(event)} onPointerCancel={event => end(event, true)}
      onLostPointerCapture={() => { drag.current = null; }} onKeyDown={keyboard}>
      {failed ? <p role="status">Image unavailable. Try reloading this product.</p> : <Image
        src={src} alt={alt} fill sizes="(max-width: 700px) 90vw, 35vw"
        draggable={false} style={imageFramingStyle(framing, "contain")}
        onLoad={event => setSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
        onError={() => setFailed(true)} />}
      {canEdit && <span className="admin-framing-hint" aria-hidden="true">Drag to reposition</span>}
    </div>
    <div className="admin-framing-actions">
      <button type="button" disabled={disabled || failed || !size.width} aria-expanded={editing} onClick={() => {
        if (!editing && !framing) onChange({ ...defaultFraming });
        setEditing(value => !value);
      }}>{editing ? "Done adjusting" : "Adjust framing"}</button>
      {framing && <button type="button" disabled={disabled} onClick={() => { onChange(null); setEditing(false); }}>Show full image</button>}
    </div>
    {editing && <fieldset className="admin-framing-controls" disabled={disabled || failed}>
      <legend className="admin-sr-only">Image {index + 1} framing</legend>
      <p id={helpId} className="admin-help">Drag with a mouse or finger. Arrow keys move the image too. Zoom in for more room to move. The frame matches the website’s 4:5 layout.</p>
      <label>Zoom <output>{Math.round(frame.zoom * 100)}%</output><input type="range" min="1" max="3" step="0.01" value={frame.zoom}
        onChange={event => onChange({ ...frame, zoom: Number(event.target.value) })} /></label>
      <label>Horizontal position <output>{Math.round(frame.x)}%</output><input type="range" min="0" max="100" step="1" value={frame.x}
        onChange={event => onChange({ ...frame, x: Number(event.target.value) })} /></label>
      <label>Vertical position <output>{Math.round(frame.y)}%</output><input type="range" min="0" max="100" step="1" value={frame.y}
        onChange={event => onChange({ ...frame, y: Number(event.target.value) })} /></label>
      <button type="button" onClick={() => onChange({ ...defaultFraming })}>Reset to centre</button>
      <p className="admin-help">Choose Done adjusting, then Save product to apply this framing.</p>
    </fieldset>}
  </div>;
}
