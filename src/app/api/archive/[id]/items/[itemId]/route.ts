export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  try {
    await params;
    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to remove item from archive:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
