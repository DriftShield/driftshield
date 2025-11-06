import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * Middleware for CORS headers
 * X402 payment handling is done in the route handler using x402-solana
 */
export async function middleware(request: NextRequest) {
  // Apply CORS headers
  const response = NextResponse.next()

  response.headers.set("Access-Control-Allow-Origin", "*")
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Payment")

  return response
}

export const config = {
  matcher: [
    "/:path*",
    "/api/x402-bet/:path*",
  ],
}
