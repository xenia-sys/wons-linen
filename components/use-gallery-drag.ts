"use client";

import { useEffect, useRef } from "react";
import type { PointerEvent } from "react";
import { galleryDragOffset, galleryIndex, gallerySwipeDirection } from "../lib/product-gallery";

type Drag = {
  id: number;
  surface: HTMLElement;
  x: number;
  y: number;
  width: number;
  origin: number;
  axis?: "horizontal" | "vertical";
  lastX: number;
  lastTime: number;
  velocity: number;
  offset: number;
};

export function useGalleryDrag(active: number, count: number, select: (index: number) => void) {
  const track = useRef<HTMLSpanElement>(null);
  const pointer = useRef<Drag>(null);
  const frame = useRef<number>(0);
  const suppressClick = useRef(false);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  function reset(drag: Drag) {
    pointer.current = null;
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    drag.surface.removeAttribute("data-dragging");
    drag.surface.style.removeProperty("--gallery-drag");
  }

  function onPointerDown(event: PointerEvent<HTMLElement>) {
    if (!event.isPrimary) {
      if (event.pointerType === "touch" && pointer.current) {
        reset(pointer.current);
        suppressClick.current = true;
      }
      return;
    }
    if (event.button !== 0 || pointer.current) return;
    suppressClick.current = false;
    const surface = event.currentTarget;
    const bounds = surface.getBoundingClientRect();
    const trackLeft = track.current?.getBoundingClientRect().left ?? bounds.left;
    pointer.current = { id: event.pointerId, surface, x: event.clientX, y: event.clientY,
      width: bounds.width, origin: trackLeft - bounds.left + active * bounds.width,
      lastX: event.clientX, lastTime: event.timeStamp, velocity: 0, offset: 0 };
    surface.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<HTMLElement>) {
    const drag = pointer.current;
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.axis && Math.hypot(dx, dy) >= 7) {
      if (Math.abs(dx) > Math.abs(dy) * 1.2) drag.axis = "horizontal";
      else if (Math.abs(dy) >= Math.abs(dx)) drag.axis = "vertical";
      if (drag.axis) suppressClick.current = true;
    }
    if (drag.axis !== "horizontal") return;
    const dt = event.timeStamp - drag.lastTime;
    if (dt >= 8) {
      drag.velocity = (event.clientX - drag.lastX) / dt;
      drag.lastX = event.clientX;
      drag.lastTime = event.timeStamp;
    }
    drag.offset = galleryDragOffset(drag.origin + dx, drag.width, active, count);
    if (!frame.current) frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      if (pointer.current !== drag) return;
      drag.surface.setAttribute("data-dragging", "");
      drag.surface.style.setProperty("--gallery-drag", `${drag.offset}px`);
    });
  }

  function onPointerUp(event: PointerEvent<HTMLElement>) {
    const drag = pointer.current;
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    suppressClick.current ||= Math.hypot(dx, dy) > 7;
    const velocity = event.timeStamp - drag.lastTime < 90 ? drag.velocity : 0;
    const direction = drag.axis !== "vertical" ? gallerySwipeDirection(dx, dy, drag.width, velocity) : 0;
    reset(drag);
    if (direction) select(galleryIndex(active + direction, count));
  }

  function cancel(event: PointerEvent<HTMLElement>) {
    const drag = pointer.current;
    if (!drag || drag.id !== event.pointerId) return;
    reset(drag);
    suppressClick.current = true;
  }

  const handlers = count > 1 ? {
    onPointerDown, onPointerMove, onPointerUp, onPointerCancel: cancel, onLostPointerCapture: cancel,
  } : {};

  return { track, suppressClick, handlers };
}
