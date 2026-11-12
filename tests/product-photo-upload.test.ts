import test from "node:test";
import assert from "node:assert/strict";
import { prepareImage } from "../lib/prepare-image.ts";
import { OPTIMIZED_PHOTO_BYTES, uploadProductPhotoBatch } from "../lib/product-photo-upload.ts";

const file = (name: string) => new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0])], name);

test("a bad fourth file does not discard previous photos or block the fifth", async () => {
  const uploaded: string[] = [];
  const result = await uploadProductPhotoBatch([file("fourth.png"), file("fifth.png")], 3, {
    progress: () => {},
    upload: async image => {
      if (image.name === "fourth.png") throw Error("Image could not be opened.");
      uploaded.push(image.name);
    },
  });
  assert.deepEqual(uploaded, ["fifth.png"]);
  assert.equal(result.added, 1);
  assert.deepEqual(result.failed, [{ name: "fourth.png", message: "Image could not be opened." }]);
});

test("a selection fills the remaining gallery slots and skips only the excess", async () => {
  const files = Array.from({ length: 20 }, (_, i) => file(`${i + 4}.png`));
  const uploaded: string[] = [];
  const result = await uploadProductPhotoBatch(files, 3, {
    progress: () => {},
    upload: async image => { uploaded.push(image.name); },
  });
  assert.equal(result.added, 17);
  assert.equal(result.overLimit, 3);
  assert.equal(uploaded.at(-1), "20.png");
});

test("a readable file without MIME metadata is resized again when its first encoding is too large", async t => {
  const descriptors = ["createImageBitmap", "document"].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
  t.after(() => {
    for (const [key, descriptor] of descriptors)
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
  });
  let released = false;
  let count = 0;
  const canvas = {
    width: 0, height: 0,
    getContext: () => ({ drawImage: () => {} }),
    toBlob: (finish: (value: Blob) => void) => {
      const size = ++count < 3 ? OPTIMIZED_PHOTO_BYTES + 1 : 900_000;
      if (count === 3) assert.equal(canvas.width, 1600);
      finish(new Blob([new Uint8Array(size)], { type: "image/webp" }));
    },
  };
  Object.defineProperty(globalThis, "createImageBitmap", { configurable: true, value: async (blob: Blob) => {
    assert.equal(blob.type, "image/png");
    return { width: 4000, height: 3000, close: () => { released = true; } };
  } });
  Object.defineProperty(globalThis, "document", { configurable: true, value: { createElement: () => canvas } });
  const optimized = await prepareImage(file("product.png"), { productPhoto: true });
  assert.equal(optimized.type, "image/webp");
  assert.equal(optimized.size, 900_000);
  assert.equal(count, 3);
  assert.equal(released, true);
});
