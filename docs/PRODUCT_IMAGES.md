# Product image gallery

Product detail pages display a large image with a vertical thumbnail rail on desktop. On screens up to 700px, thumbnails move below the image and can scroll horizontally. Customers can choose a thumbnail, use previous/next controls, swipe, or open the image in a modal. Thumbnail arrow keys and Home/End change the selected image; Escape closes the modal and restores focus to its opener.

## Add photography through administration

Owner and Marketing Editor can upload, reorder, colour-tag and describe photos at `/admin/products`. Database image links take precedence over the local manifest and appear in the catalog, product gallery and bag. The first linked image is the cover. Save a new product as Hidden before uploading; save again to attach uploaded images. See [ADMIN.md](ADMIN.md) for activation, file limits and the publishing workflow. Only the dedicated WONS Supabase Storage image path is allowed as a remote image source.

## Optional source-controlled photography

1. Place approved image files in `public/products/<product-slug>/`. Use JPG, PNG, WebP or AVIF with a consistent 4:5 composition. Keep full-resolution originals separately.
2. Add entries to the matching slug in `content/product-images.json`, in the desired display order. IDs must be unique within a product. Paths are relative to `public`, so a file at `public/products/relaxed-linen-shirt/ivory-front.webp` uses `/products/relaxed-linen-shirt/ivory-front.webp`.
3. Use descriptive English alt text and specify `color` when a photo belongs to one colour. The value must match the variant colour exactly, such as `Ivory` or `Sand`. Omit it for a shared detail image. An example entry is:

```json
{
  "id": "ivory-front",
  "src": "/products/relaxed-linen-shirt/ivory-front.webp",
  "alt": "Relaxed Linen Shirt in Ivory, front view",
  "color": "Ivory"
}
```

4. Repeat for the back, fit/styling and fabric/detail shots. Run typecheck and build, then verify every image in the gallery and modal. All local paths must point to files included in the repository. This manifest is a fallback when the product has no database gallery links.

Changing colour resets the gallery to its first matching image. Shared photos remain available; photos belonging to another colour are excluded. The gallery supports a single photo without showing redundant navigation. If an image fails to load, a visible unavailable message appears while the remaining gallery remains usable.

## Current preview assets

No approved WONS product photographs have been supplied for this update. The manifest therefore starts empty. Each product shows four clearly labelled original illustrations: full silhouette, back view, a closer look and texture study. These are concepts, not verified garment construction or fabric photography. The user's uploaded screenshot is a layout reference and is not used as a product image.

Product administration adds gallery links and Storage upload policies. Checkout and payments remain closed.
