import { z } from "zod";
import { ArchiveUpdateSchema } from "app-types/archive";

export async function GET(_request: Request) {
  try {
    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to get archive:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const data = ArchiveUpdateSchema.parse(body);

    return Response.json({ success: true, data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Invalid input", details: error.message },
        { status: 400 },
      );
    }

    console.error("Failed to update archive:", error);
    return Response.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(_request: Request) {
  try {
    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to delete archive:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
