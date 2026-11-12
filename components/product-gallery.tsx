"use client";

import Image from "next/image";
import { useId, useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent, PointerEvent } from "react";
import type { Product } from "../lib/types";
import { gallerySwipeDirection, getProductGallery } from "../lib/product-gallery";
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

function ExpandIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5"
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  );
}

function GalleryAsset({
  media,
  product,
  colorHex,
  thumbnail = false,
  enlarged = false,
}: {
  media: GalleryMedia;
  product: Product;
  colorHex: string;
  thumbnail?: boolean;
  enlarged?: boolean;
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
            ? "80px"
            : enlarged
              ? "(max-width: 700px) 100vw, 80vw"
              : "(max-width: 700px) calc(100vw - 40px), 46vw"
        }
        className="gallery-photo"
        draggable={false}
        style={imageFramingStyle(enlarged ? null : media.framing, "contain")}
        loading={thumbnail ? "lazy" : "eager"}
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

export function ProductGallery({
  product,
  color,
  colorHex,
}: {
  product: Product;
  color: string;
  colorHex: string;
}) {
  const media = getProductGallery(product, color);
  const [active, setActive] = useState(0);
  const [enlarged, setEnlarged] = useState(false);
  const current = media[active];
  const dialogRef = useRef<HTMLDialogElement>(null);
  const thumbnails = useRef<(HTMLButtonElement | null)[]>([]);
  const pointer = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const titleId = useId();
  const stageId = useId();
  const hintId = useId();
  const multiple = media.length > 1;

  function move(delta: number) {
    setActive((index) => (index + delta + media.length) % media.length);
  }
  function keyboardIndex(event: KeyboardEvent, index: number) {
    if (event.key === "ArrowRight" || event.key === "ArrowDown")
      return (index + 1) % media.length;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp")
      return (index - 1 + media.length) % media.length;
    if (event.key === "Home") return 0;
    if (event.key === "End") return media.length - 1;
    return null;
  }
  function startSwipe(event: PointerEvent<HTMLElement>) {
    if (!event.isPrimary) {
      if (event.pointerType === "touch" && pointer.current) {
        pointer.current = null;
        suppressClick.current = true;
      }
      return;
    }
    if (event.button !== 0) return;
    suppressClick.current = false;
    pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function updateSwipe(event: PointerEvent<HTMLElement>) {
    const start = pointer.current;
    if (start?.id === event.pointerId && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8)
      start.moved = true;
  }
  function cancelSwipe(event: PointerEvent<HTMLElement>) {
    if (pointer.current?.id !== event.pointerId) return;
    pointer.current = null;
    suppressClick.current = true;
  }
  function endSwipe(event: PointerEvent<HTMLElement>) {
    const start = pointer.current;
    if (start?.id !== event.pointerId) return;
    pointer.current = null;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    suppressClick.current = start.moved || Math.hypot(dx, dy) > 8;
    const direction = gallerySwipeDirection(dx, dy);
    if (direction) move(direction);
  }
  const swipeEvents = multiple ? {
    onPointerDown: startSwipe,
    onPointerMove: updateSwipe,
    onPointerUp: endSwipe,
    onPointerCancel: cancelSwipe,
    onLostPointerCapture: cancelSwipe,
  } : {};
  function openImage(event: MouseEvent<HTMLButtonElement>) {
    if (event.detail > 0 && suppressClick.current) return;
    setEnlarged(true);
    dialogRef.current?.showModal();
  }
  return (
    <section
      className="product-gallery"
      aria-label={`${product.name} image gallery`}
    >
      <div className={`gallery-layout${multiple ? " has-thumbnails" : ""}`}>
        <div
          id={stageId}
          className={`gallery-stage art-${product.category.toLowerCase()}`}
          style={current.kind === "photo" && current.framing ? { aspectRatio: "4 / 5" } : undefined}
        >
          <button
            type="button"
            className={`gallery-open${multiple ? " gallery-swipe" : ""}`}
            aria-label={`Enlarge image ${active + 1}: ${current.label}`}
            aria-describedby={multiple ? hintId : undefined}
            aria-haspopup="dialog"
            onClick={openImage}
            {...swipeEvents}
          >
            <GalleryAsset
              key={current.id}
              media={current}
              product={product}
              colorHex={colorHex}
            />
            <span className="gallery-expand" aria-hidden="true">
              <ExpandIcon />
            </span>
          </button>
          {multiple && (
            <div
              className="gallery-navigation"
              role="group"
              aria-label="Change product image"
            >
              <button
                type="button"
                aria-label="Previous image"
                onClick={() => move(-1)}
              >
                <Chevron previous />
              </button>
              <span aria-hidden="true">
                {String(active + 1).padStart(2, "0")} /{" "}
                {String(media.length).padStart(2, "0")}
              </span>
              <button
                type="button"
                aria-label="Next image"
                onClick={() => move(1)}
              >
                <Chevron />
              </button>
            </div>
          )}
        </div>
        {multiple && (
          <div
            className="gallery-thumbnails"
            role="group"
            aria-label="Product image thumbnails"
          >
            {media.map((item, index) => (
              <button
                key={item.id}
                type="button"
                ref={(node) => {
                  thumbnails.current[index] = node;
                }}
                className={`gallery-thumbnail art-${product.category.toLowerCase()}`}
                aria-label={`View image ${index + 1}: ${item.label}`}
                aria-pressed={index === active}
                aria-controls={stageId}
                onClick={() => setActive(index)}
                onKeyDown={(event) => {
                  const next = keyboardIndex(event, index);
                  if (next === null) return;
                  event.preventDefault();
                  setActive(next);
                  thumbnails.current[next]?.focus();
                }}
              >
                <GalleryAsset
                  media={item}
                  product={product}
                  colorHex={colorHex}
                  thumbnail
                />
                <span className="gallery-thumbnail-number" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="gallery-caption">
        <p role="status" aria-live="polite">
          {current.label} <span>— {color}</span>
        </p>
        <span>
          {current.kind === "illustration" ? "ILLUSTRATED STUDY" : "WONS LINEN"}
        </span>
      </div>
      {multiple && <p id={hintId} className="gallery-swipe-hint">Swipe or drag to browse. Select an image to enlarge it.</p>}
      {current.kind === "illustration" && (
        <p className="gallery-preview-note">
          Concept illustrations. Product photography will follow.
        </p>
      )}
      <dialog
        className="gallery-lightbox"
        ref={dialogRef}
        aria-labelledby={titleId}
        onClose={() => setEnlarged(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialogRef.current?.close();
        }}
        onKeyDown={(event) => {
          const next = keyboardIndex(event, active);
          if (next !== null) {
            event.preventDefault();
            setActive(next);
          }
        }}
      >
        <div className="lightbox-content">
          <div className="lightbox-heading">
            <div>
              <p className="eyebrow">WONS LINEN / {color.toUpperCase()}</p>
              <h2 id={titleId}>{product.name}</h2>
            </div>
            <button
              type="button"
              className="lightbox-close"
              aria-label="Close enlarged image"
              onClick={() => dialogRef.current?.close()}
            >
              ×
            </button>
          </div>
          <div
            className={`lightbox-image art-${product.category.toLowerCase()}${multiple ? " gallery-swipe" : ""}`}
            {...swipeEvents}
          >
            {enlarged && (
              <GalleryAsset
                key={current.id}
                media={current}
                product={product}
                colorHex={colorHex}
                enlarged
              />
            )}
          </div>
          <div className="lightbox-footer">
            <button
              type="button"
              aria-label="Previous enlarged image"
              disabled={!multiple}
              onClick={() => move(-1)}
            >
              <Chevron previous />
            </button>
            <p role="status" aria-live="polite">
              {active + 1} / {media.length}{" "}
              <span>
                · {current.label}
                {current.kind === "illustration" ? " · Illustration" : ""}
              </span>
            </p>
            <button
              type="button"
              aria-label="Next enlarged image"
              disabled={!multiple}
              onClick={() => move(1)}
            >
              <Chevron />
            </button>
          </div>
        </div>
      </dialog>
    </section>
  );
}
