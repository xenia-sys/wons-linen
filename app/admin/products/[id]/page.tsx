import { ProductEditor } from "../../../../components/admin/product-editor";
export default async function EditProduct({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProductEditor key={id} id={id} />;
}
