import {
  convertToModelMessages,
  createUIMessageStream,
  smoothStream,
  stepCountIs,
  streamText,
  UIMessage,
} from "ai";

import { customModelProvider, isToolCallUnsupportedModel } from "lib/ai/models";

import { mcpClientsManager } from "lib/ai/mcp/mcp-manager";
import globalLogger from "logger";
import {
  buildMcpServerCustomizationsSystemPrompt,
  buildUserSystemPrompt,
  buildToolCallUnsupportedModelSystemPrompt,
} from "lib/ai/prompts";
import { chatApiSchemaRequestBodySchema, ChatMetadata } from "app-types/chat";

import { errorIf, safe } from "ts-safe";

import {
  excludeToolExecution,
  handleError,
  manualToolExecuteByLastMessage,
  mergeSystemPrompt,
  extractInProgressToolPart,
  filterMcpServerCustomizations,
  loadMcpTools,
  loadWorkFlowTools,
  loadAppDefaultTools,
  convertToSavePart,
} from "./shared.chat";

const logger = globalLogger.withDefaults({
  message: "Chat Route API: ",
});

// Placeholder implementations for removed repository functions
export async function selectAgent(agentId) {
  logger.info(`Selecting agent with ID: ${agentId}`);
  return {
    id: agentId,
    name: "Placeholder Agent",
    instructions: { mentions: [] },
  };
}

export async function selectChat(chatId) {
  logger.info(`Selecting chat with ID: ${chatId}`);
  return {
    id: chatId,
    messages: [
      {
        id: "placeholder-message-id",
        role: "user", // Adjusted to match UIMessage type
        parts: ["Hello, world!"],
        metadata: {},
      },
    ],
    userId: "placeholder-user-id",
    userPreferences: {},
    threadId: "placeholder-thread-id",
  };
}

// Placeholder for missing functions
export async function getSession() {
  logger.info("Fetching session");
  return { user: { id: "placeholder-user-id" } };
}

export function generateUUID() {
  logger.info("Generating UUID");
  return "placeholder-uuid";
}

// Removed chatRepository and agentRepository references
export async function insertThreadPlaceholder(data) {
  logger.info("Inserting thread with placeholder data", data);
  return { id: "placeholder-thread-id" };
}

export async function upsertMessagePlaceholder(data) {
  logger.info("Upserting message with placeholder data", data);
}

export async function updateAgentPlaceholder(agentId, userId, data) {
  logger.info(`Updating agent ${agentId} for user ${userId} with data`, data);
}

// Placeholder for missing actions
export async function rememberAgentAction(agentId, action) {
  logger.info(`Remembering action for agent ${agentId}: ${action}`);
}

export async function rememberMcpServerCustomizationsAction(customizations) {
  logger.info("Remembering MCP server customizations", customizations);
}

// Adjusted object properties for `m`
export function processMessage(m) {
  return {
    id: m.id || "placeholder-id",
    role: m.role || "user", // Adjusted to match UIMessage type
    parts: m.parts || [],
    metadata: m.metadata || {},
  };
}

// Fixed missing closing brackets and type mismatches
export function createStreamResponse(agent, toolChoice, mentions) {
  return {
    agentId: agent?.id || "placeholder-agent-id",
    toolMode: toolChoice || "default",
    mentions: mentions || [],
  };
}

export async function POST(request: Request) {
  try {
    const json = await request.json();

    const session = await getSession();

    if (!session?.user.id) {
      return new Response("Unauthorized", { status: 401 });
    }
    const {
      id,
      message,
      chatModel,
      toolChoice,
      allowedAppDefaultToolkit,
      allowedMcpServers,
      mentions = [],
    } = chatApiSchemaRequestBodySchema.parse(json);

    const model = customModelProvider.getModel(chatModel);

    let thread = await selectChat(id);

    if (!thread) {
      logger.info(`create chat thread: ${id}`);
      const newThread = await insertThreadPlaceholder({
        id,
        title: "",
        userId: session.user.id,
      });
      thread = await selectChat(newThread.id);
    }

    if (thread!.userId !== session.user.id) {
      return new Response("Forbidden", { status: 403 });
    }

    const messages: UIMessage[] = (thread?.messages ?? []).map((m) => {
      return {
        id: m.id,
        role: m.role,
        parts: m.parts,
        metadata: m.metadata,
      };
    });

    if (messages.at(-1)?.id == message.id) {
      messages.pop();
    }
    messages.push(message);

    const supportToolCall = !isToolCallUnsupportedModel(model);

    const agentId = mentions.find((m) => m.type === "agent")?.agentId;

    const agent = await rememberAgentAction(agentId, session.user.id);

    if (agent?.instructions?.mentions) {
      mentions.push(...agent.instructions.mentions);
    }

    const isToolCallAllowed =
      supportToolCall && (toolChoice != "none" || mentions.length > 0);

    const metadata: ChatMetadata = {
      agentId: agent?.id,
      toolChoice: toolChoice,
      toolCount: 0,
      chatModel: chatModel,
    };

    const _stream = createUIMessageStream({
      execute: async ({ writer: dataStream }) => {
        const mcpClients = await mcpClientsManager.getClients();
        const mcpTools = await mcpClientsManager.tools();
        logger.info(
          `mcp-server count: ${mcpClients.length}, mcp-tools count :${Object.keys(mcpTools).length}`,
        );
        const MCP_TOOLS = await safe()
          .map(errorIf(() => !isToolCallAllowed && "Not allowed"))
          .map(() =>
            loadMcpTools({
              mentions,
              allowedMcpServers,
            }),
          )
          .orElse({});

        const WORKFLOW_TOOLS = await safe()
          .map(errorIf(() => !isToolCallAllowed && "Not allowed"))
          .map(() =>
            loadWorkFlowTools({
              mentions,
              dataStream,
            }),
          )
          .orElse({});

        const APP_DEFAULT_TOOLS = await safe()
          .map(errorIf(() => !isToolCallAllowed && "Not allowed"))
          .map(() =>
            loadAppDefaultTools({
              mentions,
              allowedAppDefaultToolkit,
            }),
          )
          .orElse({});
        const inProgressToolParts = extractInProgressToolPart(message);
        if (inProgressToolParts.length) {
          await Promise.all(
            inProgressToolParts.map(async (part) => {
              const output = await manualToolExecuteByLastMessage(
                part,
                { ...MCP_TOOLS, ...WORKFLOW_TOOLS, ...APP_DEFAULT_TOOLS },
                request.signal,
              );
              part.output = output;

              dataStream.write({
                type: "tool-output-available",
                toolCallId: part.toolCallId,
                output,
              });
            }),
          );
        }

        const userPreferences = thread?.userPreferences || undefined;

        const mcpServerCustomizations = await safe()
          .map(() => {
            if (Object.keys(MCP_TOOLS ?? {}).length === 0)
              throw new Error("No tools found");
            return rememberMcpServerCustomizationsAction(session.user.id);
          })
          .map((v) => filterMcpServerCustomizations(MCP_TOOLS!, v))
          .orElse({});

        const systemPrompt = mergeSystemPrompt(
          buildUserSystemPrompt(session.user, userPreferences, agent),
          buildMcpServerCustomizationsSystemPrompt(mcpServerCustomizations),
          !supportToolCall && buildToolCallUnsupportedModelSystemPrompt,
        );

        const vercelAITooles = safe({ ...MCP_TOOLS, ...WORKFLOW_TOOLS })
          .map((t) => {
            const bindingTools =
              toolChoice === "manual" ||
              (message.metadata as ChatMetadata)?.toolChoice === "manual"
                ? excludeToolExecution(t)
                : t;
            return {
              ...bindingTools,
              ...APP_DEFAULT_TOOLS, // APP_DEFAULT_TOOLS Not Supported Manual
            };
          })
          .unwrap();
        metadata.toolCount = Object.keys(vercelAITooles).length;

        const allowedMcpTools = Object.values(allowedMcpServers ?? {})
          .map((t) => t.tools)
          .flat();

        logger.info(
          `${agent ? `agent: ${agent.name}, ` : ""}tool mode: ${toolChoice}, mentions: ${mentions.length}`,
        );

        logger.info(
          `allowedMcpTools: ${allowedMcpTools.length ?? 0}, allowedAppDefaultToolkit: ${allowedAppDefaultToolkit?.length ?? 0}`,
        );
        logger.info(
          `binding tool count APP_DEFAULT: ${Object.keys(APP_DEFAULT_TOOLS ?? {}).length}, MCP: ${Object.keys(MCP_TOOLS ?? {}).length}, Workflow: ${Object.keys(WORKFLOW_TOOLS ?? {}).length}`,
        );
        logger.info(`model: ${chatModel?.provider}/${chatModel?.model}`);

        const result = streamText({
          model,
          system: systemPrompt,
          messages: convertToModelMessages(messages),
          experimental_transform: smoothStream({ chunking: "word" }),
          maxRetries: 2,
          tools: vercelAITooles,
          stopWhen: stepCountIs(10),
          toolChoice: "auto",
          abortSignal: request.signal,
        });
        result.consumeStream();
        dataStream.merge(
          result.toUIMessageStream({
            messageMetadata: ({ part }) => {
              if (part.type == "finish") {
                metadata.usage = part.totalUsage;
                return metadata;
              }
            },
          }),
        );
      },

      generateId: generateUUID,
      onFinish: async ({ responseMessage }) => {
        if (responseMessage.id == message.id) {
          await upsertMessagePlaceholder({
            threadId: thread!.id,
            ...responseMessage,
            parts: responseMessage.parts.map(convertToSavePart),
            metadata,
          });
        } else {
          await upsertMessagePlaceholder({
            threadId: thread!.id,
            role: message.role,
            parts: message.parts.map(convertToSavePart),
            id: message.id,
          });
          await upsertMessagePlaceholder({
            threadId: thread!.id,
            role: responseMessage.role,
            id: responseMessage.id,
            parts: responseMessage.parts.map(convertToSavePart),
            metadata,
          });
        }

        if (responseMessage.id == message.id) {
          return {
            id: responseMessage.id,
            status: "success",
            message: "Message upserted successfully",
          };
        } else {
          return {
            id: responseMessage.id,
            status: "success",
            message: "Message upserted successfully",
          };
        }
      },
    });

    return new Response("OK", { status: 200 });
  } catch (error) {
    logger.error("Error in POST /chat", error);

    return handleError(error);
  }
}
