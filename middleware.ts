import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * Lightweight middleware for CORS
 * X402 payment handling moved to API route to avoid Edge function size limits
 */
export async function middleware(request: NextRequest) {
  // Apply CORS headers
  const response = NextResponse.next()

  response.headers.set("Access-Control-Allow-Origin", "*")
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Payment-Required")

  return response
}

export const config = {
  matcher: [
    "/:path*",
  ],
}
