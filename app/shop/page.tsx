import type { Metadata } from "next";
import { CollectionPage } from "../../components/collection-page";
export const metadata: Metadata = { title: "Shop All" };
export default function Shop() {
  return <CollectionPage />;
}
