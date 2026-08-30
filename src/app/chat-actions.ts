"use server";

import { prisma } from "../lib/db/prisma";
import { ChatGroq } from "@langchain/groq";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { revalidatePath } from "next/cache";

export async function getChatSessions() {
  return await prisma.chatSession.findMany({
    orderBy: { updatedAt: "desc" },
  });
}

export async function createChatSession() {
  const session = await prisma.chatSession.create({
    data: { title: "New Chat" },
  });
  revalidatePath("/");
  return session;
}

export async function deleteChatSession(id: string) {
  await prisma.chatSession.delete({ where: { id } });
  revalidatePath("/");
}

export async function deleteAllChatSessions() {
  await prisma.chatSession.deleteMany({});
}

export async function renameChatSession(id: string, title: string) {
  await prisma.chatSession.update({
    where: { id },
    data: { title },
  });
  revalidatePath("/");
}

export async function getChatMessages(chatId: string) {
  const messages = await prisma.message.findMany({
    where: { chatId },
    orderBy: { createdAt: "asc" },
  });
  // Return in UIMessage format compatible with @ai-sdk/react v4 useChat hook
  return messages.map((m: Awaited<ReturnType<typeof prisma.message.findMany>>[0]) => ({
    id: m.id,
    role: m.role as "user" | "assistant" | "system" | "tool",
    parts: [{ type: "text" as const, text: m.content }],
    content: m.content, // keep as fallback for rendering
  }));
}


export async function saveMessage(chatId: string, role: string, content: string) {
  const cleanContent = (content || "").replace(/\0/g, "").replace(/\u0000/g, "");
  return await prisma.message.create({
    data: { chatId, role, content: cleanContent },
  });
}

export async function generateChatTitle(chatId: string, firstMessageContent: string) {
  try {
    const model = new ChatGroq({
      model: "llama-3.3-70b-versatile",
      temperature: 0,
    });
    
    const response = await model.invoke([
      new SystemMessage("You are a helpful assistant that generates extremely concise chat titles (2-4 words max) based on the user's first message. Output ONLY the title, no quotes or prefix."),
      new HumanMessage(firstMessageContent)
    ]);

    let title = typeof response.content === "string" ? response.content : "New Chat";
    title = title.trim().replace(/^["']|["']$/g, ""); // strip quotes if any
    
    if (title) {
      await renameChatSession(chatId, title);
    }
    return title;
  } catch (error) {
    console.error("Failed to generate chat title:", error);
    return null;
  }
}
