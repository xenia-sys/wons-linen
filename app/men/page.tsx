import type { Metadata } from "next";
import { CollectionPage } from "../../components/collection-page";
export const metadata: Metadata = { title: "Men" };
export default function Men() {
  return <CollectionPage department="Men" />;
}
