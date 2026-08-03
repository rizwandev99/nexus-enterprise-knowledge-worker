"use client";

import { useChat } from "@ai-sdk/react";

export default function ChatPage() {
  // This single line handles the entire chat state and streaming connection!
  const { messages, input, handleInputChange, handleSubmit } = useChat();

  return (
    <div className="flex flex-col h-screen bg-[#fafafa] text-[#171717] font-sans">
      
      {/* Header */}
      <header className="flex h-16 items-center px-6 bg-white border-b border-[#ebebeb]">
        <h1 className="text-xl font-semibold tracking-tight">Nexus Knowledge Worker</h1>
      </header>

      {/* Chat Messages Area */}
      <main className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full space-y-6">
        {messages.length === 0 && (
          <div className="text-center text-[#888888] mt-20">
            Send a message to start chatting with the enterprise AI.
          </div>
        )}
        
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`p-4 rounded-xl max-w-[80%] shadow-[0px_1px_1px_#00000005,0px_2px_2px_#0000000a] border border-[#ebebeb] ${
              m.role === 'user' 
                ? 'bg-[#171717] text-white' 
                : 'bg-white text-[#171717]'
            }`}>
              <div className="text-xs font-medium mb-1 opacity-70 uppercase tracking-wider">
                {m.role === 'user' ? 'You' : 'Nexus AI'}
              </div>
              <div className="text-sm leading-relaxed whitespace-pre-wrap">
                {m.content}
              </div>
            </div>
          </div>
        ))}
      </main>

      {/* Input Form Area */}
      <div className="p-6 bg-white border-t border-[#ebebeb]">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto flex gap-3">
          <input
            className="flex-1 h-12 px-4 rounded-lg border border-[#ebebeb] bg-[#fafafa] text-sm focus:outline-none focus:border-[#171717] transition-colors"
            value={input}
            placeholder="Ask a question about your enterprise data..."
            onChange={handleInputChange}
          />
          <button 
            type="submit"
            className="h-12 px-6 rounded-full bg-[#171717] text-white font-medium text-sm hover:bg-black transition-colors"
          >
            Send
          </button>
        </form>
      </div>
      
    </div>
  );
}
