import { notFound } from "next/navigation";
import { InformationEditor } from "../../../../components/admin/information-editor";
import { isInformationPage } from "../../../../lib/information-pages";

export default async function InformationAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isInformationPage(id)) notFound();
  return <InformationEditor key={id} id={id} />;
}
