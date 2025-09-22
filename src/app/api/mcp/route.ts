import { NextResponse } from "next/server";
import { saveMcpClientAction } from "./actions";

// Placeholder for removed `getSession` function
export async function getSession() {
  return { user: { id: "placeholder-user-id" } };
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const json = (await request.json()) as { name: string };

  try {
    await saveMcpClientAction(json);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Failed to save MCP client" },
      { status: 500 },
    );
  }
}
