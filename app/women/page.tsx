import type { Metadata } from "next";
import { CollectionPage } from "../../components/collection-page";
export const metadata: Metadata = { title: "Women" };
export default function Women() {
  return <CollectionPage department="Women" />;
}
