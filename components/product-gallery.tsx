"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent, PointerEvent, Ref } from "react";
import type { Product } from "../lib/types";
import { galleryIndex, getProductGallery } from "../lib/product-gallery";
import { useGalleryDrag } from "./use-gallery-drag";
import type { GalleryMedia } from "../lib/product-gallery";
import { imageFramingStyle } from "../lib/image-framing";
import { GarmentArt } from "./garment-art";

function Chevron({ previous = false }: { previous?: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d={previous ? "m14 5-7 7 7 7" : "m10 5 7 7-7 7"}
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  );
}

const ZOOM_SCALE = 2.5;
type ZoomPoint = { x: number; y: number };
const clampPercent = (value: number) => Math.max(0, Math.min(100, value));

function GalleryAsset({
  media,
  product,
  colorHex,
  thumbnail = false,
  enlarged = false,
  near = true,
}: {
  media: GalleryMedia;
  product: Product;
  colorHex: string;
  thumbnail?: boolean;
  /** Request a sharper source while the image is zoomed. */
  enlarged?: boolean;
  near?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (media.kind === "photo") {
    if (failed)
      return (
        <span className="gallery-image-unavailable">
          {thumbnail
            ? "Unavailable"
            : "This image is unavailable. Please try another view."}
        </span>
      );
    return (
      <Image
        src={media.src}
        alt={thumbnail ? "" : media.alt}
        fill
        sizes={
          thumbnail
            ? "(max-width: 700px) 100px, 140px"
            : enlarged
              ? "(max-width: 700px) 250vw, 115vw"
              : "(max-width: 700px) calc(100vw - 40px), 46vw"
        }
        className="gallery-photo"
        draggable={false}
        style={imageFramingStyle(media.framing, thumbnail ? "cover" : "contain")}
        loading={thumbnail || !near ? "lazy" : "eager"}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <span
      className="gallery-illustration"
      role={thumbnail ? undefined : "img"}
      aria-label={thumbnail ? undefined : media.alt}
    >
      <GarmentArt
        category={product.category}
        color={colorHex}
        view={media.view}
      />
    </span>
  );
}

function GalleryTrack({
  media, active, product, colorHex, trackRef, zoom,
}: {
  media: GalleryMedia[];
  active: number;
  product: Product;
  colorHex: string;
  trackRef: Ref<HTMLSpanElement>;
  zoom: ZoomPoint | null;
}) {
  return (
    <span className="gallery-track" ref={trackRef}
      style={{ transform: `translate3d(calc(${-active * 100}% + var(--gallery-drag, 0px)), 0, 0)` }}>
      {media.map((item, index) => {
        const zoomed = index === active && zoom !== null;
        return (
          <span className="gallery-slide" key={item.id} aria-hidden={index !== active}>
            <span className="gallery-zoom" style={zoomed
              ? { transform: `scale(${ZOOM_SCALE})`, transformOrigin: `${zoom.x}% ${zoom.y}%` }
              : undefined}>
              <GalleryAsset media={item} product={product} colorHex={colorHex}
                enlarged={zoomed} near={Math.abs(index - active) <= 1} />
            </span>
          </span>
        );
      })}
    </span>
  );
}

export function ProductGallery({ product, color, colorHex }: {
  product: Product; color: string; colorHex: string;
}) {
  const media = getProductGallery(product, color);
  const [selection, setActive] = useState(0);
  const [zoom, setZoom] = useState<ZoomPoint | null>(null);
  const active = galleryIndex(selection, media.length);
  const current = media[active];
  const thumbnailRail = useRef<HTMLDivElement>(null);
  const thumbnails = useRef<(HTMLButtonElement | null)[]>([]);
  const pan = useRef<{ id: number; x: number; y: number; origin: ZoomPoint; moved: boolean } | null>(null);
  const stageId = useId();
  const hintId = useId();
  const multiple = media.length > 1;
  const mainDrag = useGalleryDrag(active, media.length, setActive);
  const framed = media.some(item => item.kind === "photo" && item.framing);
  const artClass = "art-" + product.category.toLowerCase();

  useEffect(() => setZoom(null), [active]);

  useEffect(() => {
    const rail = thumbnailRail.current;
    const selected = thumbnails.current[active];
    if (!rail || !selected) return;
    const viewport = rail.getBoundingClientRect();
    const card = selected.getBoundingClientRect();
    const offset = card.left < viewport.left ? card.left - viewport.left
      : card.right > viewport.right ? card.right - viewport.right : 0;
    if (offset) rail.scrollTo({ left: rail.scrollLeft + offset,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }, [active]);

  function move(delta: number) {
    setActive(index => galleryIndex(index + delta, media.length));
  }

  function browseWithKeyboard(event: KeyboardEvent, focusThumbnail = false) {
    const key = event.key;
    const next = key === "ArrowRight" ? galleryIndex(active + 1, media.length)
      : key === "ArrowLeft" ? galleryIndex(active - 1, media.length)
      : key === "Home" ? 0 : key === "End" ? media.length - 1 : null;
    if (next === null || !multiple) return;
    event.preventDefault();
    setActive(next);
    if (focusThumbnail) thumbnails.current[next]?.focus({ preventScroll: true });
  }

  function pointFrom(event: { clientX: number; clientY: number; currentTarget: HTMLElement }): ZoomPoint {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: clampPercent(((event.clientX - bounds.left) / bounds.width) * 100),
      y: clampPercent(((event.clientY - bounds.top) / bounds.height) * 100),
    };
  }

  function toggleZoom(event: MouseEvent<HTMLButtonElement>) {
    if (zoom) {
      const moved = pan.current?.moved;
      pan.current = null;
      if (!moved) setZoom(null);
      return;
    }
    if (event.detail > 0 && mainDrag.suppressClick.current) return;
    setZoom(event.detail > 0 ? pointFrom(event) : { x: 50, y: 50 });
  }

  function handleKey(event: KeyboardEvent) {
    if (event.key === "Escape" && zoom) {
      event.preventDefault();
      setZoom(null);
      return;
    }
    browseWithKeyboard(event);
  }

  // While zoomed, the pointer explores the image instead of swiping between images.
  const zoomHandlers = {
    onPointerDown(event: PointerEvent<HTMLButtonElement>) {
      if (!zoom || !event.isPrimary) return;
      pan.current = { id: event.pointerId, x: event.clientX, y: event.clientY, origin: zoom, moved: false };
      if (event.pointerType !== "mouse") event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerMove(event: PointerEvent<HTMLButtonElement>) {
      if (!zoom) return;
      if (event.pointerType === "mouse") {
        setZoom(pointFrom(event));
        return;
      }
      const drag = pan.current;
      if (!drag || drag.id !== event.pointerId) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      if (Math.hypot(dx, dy) > 7) drag.moved = true;
      const factor = 100 / (ZOOM_SCALE - 1);
      setZoom({
        x: clampPercent(drag.origin.x - (dx / bounds.width) * factor),
        y: clampPercent(drag.origin.y - (dy / bounds.height) * factor),
      });
    },
  };

  return (
    <section className="product-gallery" aria-label={`${product.name} image gallery`}>
      <div className="gallery-layout">
        <div id={stageId} className={`gallery-stage ${artClass}`}
          style={framed ? { aspectRatio: "4 / 5" } : undefined}>
          <button type="button" className={`gallery-open${multiple && !zoom ? " gallery-swipe" : ""}`}
            data-zoomed={zoom ? "" : undefined}
            aria-label={zoom ? `Zoom out of image ${active + 1}` : `Zoom in on image ${active + 1}: ${current.label}`}
            aria-pressed={zoom !== null} aria-describedby={hintId}
            onClick={toggleZoom} onKeyDown={handleKey} {...(zoom ? zoomHandlers : mainDrag.handlers)}>
            <GalleryTrack media={media} active={active} product={product} colorHex={colorHex}
              trackRef={mainDrag.track} zoom={zoom} />
          </button>
        </div>
        {multiple && (
          <div className="gallery-navigation" role="group" aria-label="Change product image">
            <button type="button" className="gallery-arrow" aria-label="Previous image"
              aria-controls={stageId} disabled={active === 0} onClick={() => move(-1)}>
              <Chevron previous />
            </button>
            <div className="gallery-thumbnails" ref={thumbnailRail} role="group" aria-label="Product image thumbnails">
              {media.map((item, index) => (
                <button key={item.id} type="button" ref={node => { thumbnails.current[index] = node; }}
                  className={`gallery-thumbnail ${artClass}`} aria-label={`View image ${index + 1}: ${item.label}`}
                  aria-pressed={index === active} aria-controls={stageId} onClick={() => setActive(index)}
                  onKeyDown={event => browseWithKeyboard(event, true)}>
                  <GalleryAsset media={item} product={product} colorHex={colorHex} thumbnail />
                </button>
              ))}
            </div>
            <button type="button" className="gallery-arrow" aria-label="Next image"
              aria-controls={stageId} disabled={active === media.length - 1} onClick={() => move(1)}>
              <Chevron />
            </button>
          </div>
        )}
      </div>
      <div className="gallery-caption">
        <p role="status" aria-live="polite">
          {multiple && <span className="gallery-count">{active + 1} / {media.length} · </span>}
          {current.label} <span>— {color}</span>
        </p>
        <span>{current.kind === "illustration" ? "ILLUSTRATED STUDY" : "WONS LINEN"}</span>
      </div>
      <p id={hintId} className="gallery-swipe-hint">
        {multiple ? "Swipe or drag to browse. " : ""}Click or tap the image to zoom in, and again to zoom out.
      </p>
      {current.kind === "illustration" && <p className="gallery-preview-note">Concept illustrations. Product photography will follow.</p>}
    </section>
  );
}
