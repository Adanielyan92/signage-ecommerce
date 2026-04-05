// src/app/api/v1/pricing/script-test/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { executeScript } from "@/engine/script-sandbox";

/**
 * POST: Test a pricing script without saving it.
 * Admin-only endpoint.
 */
export async function POST(request: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { scriptBody, opts, params } = await request.json();

    if (!scriptBody || typeof scriptBody !== "string") {
      return NextResponse.json(
        { success: false, error: "scriptBody is required" },
        { status: 400 },
      );
    }

    const result = await executeScript({
      scriptBody,
      opts: opts ?? {},
      params: params ?? {},
      timeoutMs: 3000,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Script test error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
