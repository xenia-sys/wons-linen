import type { Metadata } from "next";
import { Bag } from "../../components/bag";
export const metadata: Metadata = { title: "Your Shopping Bag" };
export default function BagPage() {
  return <Bag />;
}
