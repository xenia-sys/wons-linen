import test from "node:test";
import assert from "node:assert/strict";
import { defaultFraming, frameOverflow, imageFramingStyle, moveFraming, parseImageFraming } from "../lib/image-framing.ts";
import { getProductGallery } from "../lib/product-gallery.ts";
import { activityAction, activityValue } from "../lib/admin-activity.ts";
import type { Product } from "../lib/types.ts";

test("framing validates finite coordinates and zoom before they reach the database", () => {
  assert.deepEqual(parseImageFraming({ x: 0, y: 100, zoom: 3, role: "owner" }), { x: 0, y: 100, zoom: 3 });
  assert.equal(parseImageFraming(null), null);
  assert.equal(parseImageFraming(undefined), null);
  for (const value of [[], "50%", {}, { x: "50", y: 50, zoom: 1 },
    { x: -1, y: 50, zoom: 1 }, { x: 50, y: 101, zoom: 1 },
    { x: NaN, y: 50, zoom: 1 }, { x: 50, y: Infinity, zoom: 1 },
    { x: 50, y: 50, zoom: 0.9 }, { x: 50, y: 50, zoom: 3.01 }]) {
    assert.throws(() => parseImageFraming(value));
  }
});
test("unframed images retain the original fit while custom crops share position and zoom origin", () => {
  assert.deepEqual(imageFramingStyle(null, "contain"), { objectFit: "contain" });
  assert.deepEqual(imageFramingStyle(undefined), { objectFit: "cover" });
  assert.deepEqual(imageFramingStyle({ x: 20, y: 80, zoom: 1.5 }), {
    objectFit: "cover", objectPosition: "20% 80%", transform: "scale(1.5)", transformOrigin: "20% 80%",
  });
});
test("dragging follows the pointer and stops at both edges without exposing blank areas", () => {
  const overflow = frameOverflow({ width: 200, height: 100 }, { width: 100, height: 125 }, 1);
  assert.deepEqual(overflow, { x: 150, y: 0 });
  assert.equal(moveFraming(defaultFraming, { x: 30, y: 40 }, overflow).x, 30);
  assert.equal(moveFraming(defaultFraming, { x: 30, y: 40 }, overflow).y, 50);
  assert.equal(moveFraming(defaultFraming, { x: 999, y: 0 }, overflow).x, 0);
  assert.equal(moveFraming(defaultFraming, { x: -999, y: 0 }, overflow).x, 100);
  assert.deepEqual(frameOverflow({ width: 100, height: 200 }, { width: 100, height: 125 }, 1), { x: 0, y: 75 });
});
test("zoom permits movement on a matching aspect ratio and cropping stays within image bounds", () => {
  assert.deepEqual(frameOverflow({ width: 80, height: 100 }, { width: 320, height: 400 }, 1), { x: 0, y: 0 });
  assert.deepEqual(frameOverflow({ width: 80, height: 100 }, { width: 320, height: 400 }, 2), { x: 320, y: 400 });
  for (const image of [{ width: 200, height: 100 }, { width: 100, height: 200 }, { width: 80, height: 100 }]) {
    for (const zoom of [1, 1.5, 3]) {
      const overflow = frameOverflow(image, { width: 320, height: 400 }, zoom);
      for (const value of [0, 50, 100]) {
        const frame = moveFraming({ x: value, y: value, zoom }, { x: -800, y: 800 }, overflow);
        assert.ok(frame.x >= 0 && frame.x <= 100 && frame.y >= 0 && frame.y <= 100);
        assert.ok(-overflow.x * frame.x / 100 <= 0);
        assert.ok(320 + overflow.x - overflow.x * frame.x / 100 >= 320);
        assert.ok(400 + overflow.y - overflow.y * frame.y / 100 >= 400);
      }
    }
  }
});
test("framing survives colour-specific gallery selection and appears in audit descriptions", () => {
  const framing = { x: 20, y: 70, zoom: 1.4 };
  const product = { name: "Linen shirt", images: [
    { id: "ivory", src: "/ivory.webp", alt: "Ivory front", color: "Ivory", framing },
    { id: "brown", src: "/brown.webp", alt: "Brown front", color: "Brown" },
  ] } as Product;
  const gallery = getProductGallery(product, "Ivory");
  assert.equal(gallery.length, 1);
  assert.equal(gallery[0].kind === "photo" && gallery[0].framing, framing);
  assert.equal(activityValue("framing", framing), "Position 20% / 70% · Zoom 140%");
  assert.equal(activityAction({ id: 1, actor_email: null, entity_type: "product_images", entity_id: "photo", action: "UPDATE",
    before_data: { framing: null }, after_data: { framing }, created_at: "2026-10-22T00:00:00Z" }), "Image reframed");
});
