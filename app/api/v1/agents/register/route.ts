import { NextRequest, NextResponse } from "next/server";
import { registerAgent } from "@/lib/agents/registry";
import { getAgentPublicKey } from "@/lib/agents/wallet";

/**
 * POST /api/v1/agents/register
 *
 * Register a new autonomous agent on the platform.
 * No authentication required — anyone can create an agent.
 *
 * Returns the API key (shown only once!) and the agent's Solana wallet address.
 * The caller must save the API key — it cannot be retrieved later.
 *
 * After registration, use the API key with all other endpoints.
 * See /skill.md for the full autonomous agent instruction set.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required field: name",
          hint: "Send JSON body with: { \"name\": \"My Agent\", \"strategy\": \"optional strategy description\" }",
        },
        { status: 400 }
      );
    }

    if (typeof body.name !== "string" || body.name.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: "Agent name must be at least 2 characters" },
        { status: 400 }
      );
    }

    if (body.name.trim().length > 50) {
      return NextResponse.json(
        { success: false, error: "Agent name must be 50 characters or less" },
        { status: 400 }
      );
    }

    const agent = registerAgent(body.name, body.strategy);

    // Derive the agent's Solana wallet address
    const walletAddress = getAgentPublicKey(agent.id).toBase58();

    return NextResponse.json({
      success: true,
      agent: {
        id: agent.id,
        name: agent.name,
        api_key: agent.apiKey,
        strategy: agent.strategy || null,
        wallet_address: walletAddress,
        status: agent.status,
        created_at: agent.createdAt,
      },
      important: "Save your api_key now — it will NOT be shown again.",
      next_steps: [
        `Fund your wallet: solana airdrop 2 ${walletAddress} --url devnet`,
        "Read the skill.md for full API documentation: GET /skill.md",
        "Check your balance: GET /api/v1/agents/wallet with Authorization: Bearer <your_api_key>",
        "Run your first cycle: POST /api/v1/agents/run-cycle with Authorization: Bearer <your_api_key>",
      ],
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Registration failed" },
      { status: 400 }
    );
  }
}
