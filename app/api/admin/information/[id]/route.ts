import { revalidatePath } from "next/cache";
import { AdminError, adminError, adminJson, authorizedStaff } from "../../../../../lib/admin-server";
import { informationPageSelect, isInformationPage, parseInformationEdit } from "../../../../../lib/information-pages";

type Context = { params: Promise<{ id: string }> };
const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request, { params }: Context) {
  try {
    const { db } = await authorizedStaff(request, true);
    const { id } = await params;
    if (!isInformationPage(id)) throw new AdminError("Information page not found.", 404);
    const { data, error } = await db.from("information_pages")
      .select(informationPageSelect).eq("id", id).maybeSingle();
    if (error || !data) throw new AdminError("This page could not be loaded. Try again.", 503);
    return Response.json({ page: data }, { headers });
  } catch (error) {
    return adminError(error);
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const { db } = await authorizedStaff(request, true);
    const { id } = await params;
    if (!isInformationPage(id)) throw new AdminError("Information page not found.", 404);
    const { version, copy } = parseInformationEdit(await adminJson(request));
    const { data, error } = await db.from("information_pages").update(copy)
      .eq("id", id).eq("version", version).select(informationPageSelect).maybeSingle();
    if (error?.code === "42501") throw new AdminError("You do not have permission for this action.", 403);
    if (error) throw new AdminError("This page could not be published. Try again.", 503);
    if (!data) throw new AdminError("This page changed in another session. Copy your edits before reloading the latest version.", 409);
    revalidatePath(`/information/${id}`);
    return Response.json({ page: data }, { headers });
  } catch (error) {
    return adminError(error);
  }
}
