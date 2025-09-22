import { z } from "zod";

const AddItemSchema = z.object({
  itemId: z.string(),
});

export async function GET(_request: Request) {
  try {
    return Response.json([]);
  } catch (error) {
    console.error("Failed to get archive items:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { itemId } = AddItemSchema.parse(body);

    return Response.json({ success: true, itemId });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Invalid input", details: error.message },
        { status: 400 },
      );
    }

    console.error("Failed to add item to archive:", error);
    return Response.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
