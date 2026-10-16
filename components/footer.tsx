import Link from "next/link";
import { Arrow } from "./icons";
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div>
          <p className="eyebrow">WONS LINEN</p>
          <p className="footer-manifesto">
            Linen, at
            <br />
            <em>your own pace.</em>
          </p>
        </div>
        <div className="footer-column">
          <p className="eyebrow">THE COLLECTION</p>
          <Link href="/women">
            Women <Arrow />
          </Link>
          <Link href="/men">
            Men <Arrow />
          </Link>
          <Link href="/shop">
            Shop All <Arrow />
          </Link>
        </div>
        <div className="footer-column">
          <p className="eyebrow">A LITTLE MORE</p>
          <Link href="/information/our-story">Our story</Link>
          <Link href="/information/client-care">Client care</Link>
          <Link href="/information/privacy">Privacy & your bag</Link>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} WONS LINEN</span>
        <span>
          Collection preview · Illustrative styles & prices · Orders are not
          open
        </span>
        <span>EN / VND</span>
      </div>
    </footer>
  );
}
