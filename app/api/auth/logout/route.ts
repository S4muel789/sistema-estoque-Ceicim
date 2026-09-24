import { NextRequest, NextResponse } from "next/server";
import { isTrustedMutationRequest, revokeSession, untrustedRequest } from "@/lib/auth";

export async function POST(request: NextRequest) {
  if (!isTrustedMutationRequest(request)) return untrustedRequest();
  const response = NextResponse.json({ success: true });
  await revokeSession(request, response);
  return response;
}
