import { z } from "zod";

const BookmarkSchema = z.object({
  itemId: z.string().min(1),
  itemType: z.enum(["agent", "workflow"]),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { itemId, itemType } = BookmarkSchema.parse(body);

    // Simulate access check and bookmark creation
    const hasAccess = true; // Replace with actual logic if needed

    if (!hasAccess) {
      return Response.json(
        { error: `Access denied for item ${itemId} of type ${itemType}` },
        { status: 404 },
      );
    }

    return Response.json({ success: true, itemId, itemType });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Invalid input", details: error.message },
        { status: 400 },
      );
    }

    console.error("Failed to create bookmark:", error);
    return Response.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { itemId, itemType } = BookmarkSchema.parse(body);

    // Simulate bookmark removal
    const hasAccess = true; // Replace with actual logic if needed

    if (!hasAccess) {
      return Response.json(
        { error: `Access denied for item ${itemId} of type ${itemType}` },
        { status: 404 },
      );
    }

    return Response.json({ success: true, itemId, itemType });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Invalid input", details: error.message },
        { status: 400 },
      );
    }

    console.error("Failed to delete bookmark:", error);
    return Response.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
