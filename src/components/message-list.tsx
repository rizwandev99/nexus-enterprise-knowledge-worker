"use client";

import type { UIMessage } from "@ai-sdk/react";
import MessageBubble from "./message-bubble";

interface MessageListProps {
  messages: UIMessage[];
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export default function MessageList({ messages, messagesEndRef }: MessageListProps) {
  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col">
      <div className="max-w-3xl mx-auto w-full space-y-8">
        {messages.length === 0 && (
          <div className="text-center text-mute mt-32">
            <h2 className="text-2xl font-semibold tracking-tight text-ink mb-2">Welcome to Nexus</h2>
            <p className="text-[16px] text-body">Send a message to start querying your enterprise data.</p>
          </div>
        )}

        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} isUser={m.role === "user"} />
        ))}
        
        <div ref={messagesEndRef} className="h-4" />
      </div>
    </div>
  );
}
