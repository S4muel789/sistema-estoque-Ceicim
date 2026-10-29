import { list, put } from "@vercel/blob";
import { NextRequest } from "next/server";
import { getRequestUser, isTrustedMutationRequest, unauthorized, untrustedRequest } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PREFIX = "documentos-estagio/";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function safeFileName(name: string) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120) || "documento";
}

function displayName(pathname: string) {
  const stored = pathname.slice(PREFIX.length);
  return stored.replace(/^\d+-/, "");
}

export async function GET(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return unauthorized();
  const result = await list({ prefix: PREFIX, limit: 1000 });
  const documents = result.blobs
    .map((blob) => ({ pathname: blob.pathname, name: displayName(blob.pathname), size: blob.size, uploadedAt: blob.uploadedAt }))
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  return Response.json({ documents }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: NextRequest) {
  if (!isTrustedMutationRequest(request)) return untrustedRequest();
  const user = await getRequestUser(request);
  if (!user) return unauthorized();
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return Response.json({ error: "Selecione um documento." }, { status: 400 });
  if (file.size > MAX_FILE_SIZE) return Response.json({ error: "O arquivo deve ter no máximo 10 MB." }, { status: 400 });
  if (!ALLOWED_TYPES.has(file.type)) return Response.json({ error: "Envie um arquivo PDF, JPG, PNG, DOC ou DOCX." }, { status: 400 });
  const pathname = `${PREFIX}${Date.now()}-${safeFileName(file.name)}`;
  const blob = await put(pathname, file, { access: "private", addRandomSuffix: false, contentType: file.type });
  return Response.json({ document: { pathname: blob.pathname, name: displayName(blob.pathname), size: file.size, uploadedAt: new Date().toISOString() } }, { status: 201 });
}
