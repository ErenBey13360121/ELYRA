import { redirect } from "next/navigation";
import { customModelProvider, isToolCallUnsupportedModel } from "lib/ai/models";
import { mcpClientsManager } from "lib/ai/mcp/mcp-manager";
import globalLogger from "logger";
import {
  buildMcpServerCustomizationsSystemPrompt,
  buildUserSystemPrompt,
  buildToolCallUnsupportedModelSystemPrompt,
} from "lib/ai/prompts";
import { ChatMetadata } from "app-types/chat";

import { errorIf, safe } from "ts-safe";

const logger = globalLogger.withDefaults({
  message: "Temporary Chat Route API: ",
});

// Placeholder implementations for removed repository functions
export async function selectTemporaryChat(chatId) {
  logger.info(`Selecting temporary chat with ID: ${chatId}`);
  return { id: chatId, messages: [] };
}

export async function POST(request: Request) {
  try {
    const json = await request.json();

    const session = { user: { id: "default-user-id" } }; // Placeholder session

    if (!session?.user.id) {
      return redirect("/sign-in");
    }

    const { messages, chatModel, instructions } = json as {
      messages: UIMessage[];
      chatModel?: {
        provider: string;
        model: string;
      };
      instructions?: string;
    };
    logger.info(`model: ${chatModel?.provider}/${chatModel?.model}`);
    const model = customModelProvider.getModel(chatModel);
    const userPreferences =
      (await userRepository.getPreferences(session.user.id)) || undefined;

    return streamText({
      model,
      system: `${buildUserSystemPrompt(session.user, userPreferences)} ${
        instructions ? `\n\n${instructions}` : ""
      }`.trim(),
      messages: convertToModelMessages(messages),
      experimental_transform: smoothStream({ chunking: "word" }),
    }).toUIMessageStreamResponse();
  } catch (error: any) {
    logger.error(error);
    return new Response(error.message || "Oops, an error occured!", {
      status: 500,
    });
  }
}
