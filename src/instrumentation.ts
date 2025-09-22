import { IS_VERCEL_ENV } from "lib/const";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    if (!IS_VERCEL_ENV) {
      const initMCPManager = await import("./lib/ai/mcp/mcp-manager").then(
        (m) => m.initMCPManager,
      );
      await initMCPManager();
    }
  }
}
