import Link from "next/link";
import Image from "next/image";
import { getCatalog } from "../lib/catalog";
import { getStorefrontImages } from "../lib/storefront-content";
import { storefrontImageUrl } from "../lib/storefront-images";
import { GarmentArt } from "../components/garment-art";
import { ProductCard } from "../components/product-card";
import { Arrow } from "../components/icons";
export default async function Home() {
  const [products, covers] = await Promise.all([getCatalog(), getStorefrontImages()]);
  const heroCover = covers["home-hero"];
  const womenCover = covers["home-women"];
  const menCover = covers["home-men"];
  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">THE WONS LINEN EDIT / 01</p>
          <h1 id="hero-title">
            The art of
            <br />
            living <em>lightly.</em>
          </h1>
          <p className="hero-description">
            Easy silhouettes. Natural textures.
            <br />A little room to breathe.
          </p>
          <div className="hero-buttons">
            <Link href="/women" className="button light">
              Explore Women <Arrow />
            </Link>
            <Link href="/men" className="hero-men">
              Explore Men <Arrow />
            </Link>
          </div>
        </div>
        {heroCover ? <div className="hero-scene hero-scene-photo">
          <Image src={storefrontImageUrl(heroCover.storage_path)} alt={heroCover.alt} fill
            sizes="(max-width: 700px) 100vw, 60vw" className="home-cover-image" loading="eager" />
        </div> : <div
          className="hero-scene"
          role="img"
          aria-label="Illustrated linen shirt and trousers in a sunlit, neutral setting"
        >
          <div className="scene-arch" />
          <div className="scene-fabric" />
          <div className="hero-garment-back">
            <GarmentArt category="Trousers" color="#a6a38a" />
          </div>
          <div className="hero-garment-front">
            <GarmentArt category="Shirts" color="#eee7d7" />
          </div>
          <span className="scene-caption">AN ILLUSTRATED LINEN STUDY</span>
        </div>}
        <div className="hero-bottom">
          <span>FOR HER. FOR HIM. FOR EVERYDAY.</span>
          <span>01 — THE FIRST EDIT</span>
        </div>
      </section>
      <section className="intro-strip">
        <span className="eyebrow">LESS HURRY, MORE EASE.</span>
        <p>
          Made for the moments
          <br />
          you want to <em>linger in.</em>
        </p>
        <span className="intro-mark" aria-hidden="true">
          W.
        </span>
      </section>
      <section className="home-edit section-space">
        <div className="section-heading">
          <div>
            <p className="eyebrow">A CONSIDERED WARDROBE</p>
            <h2>The Linen Edit</h2>
          </div>
          <Link href="/shop" className="underlined-link">
            Discover all styles <Arrow />
          </Link>
        </div>
        <div className="product-grid">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        <p className="catalog-note">
          Collection preview · Sample prices · Original illustrations, with
          product photography to follow.
        </p>
      </section>
      <section className="department-stories">
        <Link href="/women" className="department-story women-story">
          {womenCover ? <div className="story-photo">
            <Image src={storefrontImageUrl(womenCover.storage_path)} alt={womenCover.alt} fill
              sizes="(max-width: 700px) 100vw, 50vw" className="home-cover-image" />
          </div> : <div className="story-art">
            <GarmentArt category="Dresses" color="#b7a08a" />
          </div>}
          <div className="story-copy">
            <span className="eyebrow">THE WOMEN’S EDIT</span>
            <h2>
              Softness,
              <br />
              <em>in your own way.</em>
            </h2>
            <span className="underlined-link">
              Discover Women <Arrow />
            </span>
          </div>
        </Link>
        <Link href="/men" className="department-story men-story">
          {menCover ? <div className="story-photo">
            <Image src={storefrontImageUrl(menCover.storage_path)} alt={menCover.alt} fill
              sizes="(max-width: 700px) 100vw, 50vw" className="home-cover-image" />
          </div> : <div className="story-art">
            <GarmentArt category="Shirts" color="#e7e0cf" />
          </div>}
          <div className="story-copy">
            <span className="eyebrow">INTRODUCING THE MEN’S EDIT</span>
            <h2>
              Ease,
              <br />
              <em>in every detail.</em>
            </h2>
            <span className="underlined-link">
              Discover Men <Arrow />
            </span>
          </div>
        </Link>
      </section>
      <section className="brand-note section-space">
        <p className="eyebrow">THE WONS WAY</p>
        <h2>
          A quieter kind
          <br />
          of <em>everyday.</em>
        </h2>
        <p>
          We’re shaping a wardrobe around simple lines, a softer palette and the
          freedom to move at your own pace. This is a first look at what comes
          next.
        </p>
        <Link href="/information/our-story" className="underlined-link">
          Meet WONS <Arrow />
        </Link>
      </section>
    </>
  );
}
