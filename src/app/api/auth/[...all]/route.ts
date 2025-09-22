import { auth } from "auth/server";
// ...existing code...

export const { GET, POST } = toNextJsHandler(auth.handler);
