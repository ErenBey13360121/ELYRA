import { z } from "zod";
import { ArchiveCreateSchema } from "app-types/archive";

export async function GET() {
  try {
    return Response.json([]);
  } catch (error) {
    console.error("Failed to fetch archives:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const _data = ArchiveCreateSchema.parse(body);
    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Invalid input", details: error.message },
        { status: 400 },
      );
    }

    console.error("Failed to create archive:", error);
    return Response.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
