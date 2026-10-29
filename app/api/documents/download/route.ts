import { get } from "@vercel/blob";
import { NextRequest } from "next/server";
import { getRequestUser, unauthorized } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return unauthorized();
  const pathname = request.nextUrl.searchParams.get("pathname") ?? "";
  if (!pathname.startsWith("documentos-estagio/") || pathname.includes("..")) return Response.json({ error: "Documento inválido." }, { status: 400 });
  const result = await get(pathname, { access: "private" });
  if (!result || result.statusCode !== 200) return Response.json({ error: "Documento não encontrado." }, { status: 404 });
  const filename = pathname.split("/").pop()?.replace(/^\d+-/, "") || "documento";
  return new Response(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType || "application/octet-stream",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
