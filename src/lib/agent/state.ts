import { BaseMessage } from "@langchain/core/messages";
import { Annotation } from "@langchain/langgraph";

export const AgentState = Annotation.Root({
  // The messages field appends new messages to the existing list (x.concat(y))
  messages: Annotation<BaseMessage[]>({
    value: (x, y) => x.concat(y),
    default: () => [],
  }),
  // Citations replace the previous citations (x, y => y) because 
  // each new query will have its own retrieved context.
  citations: Annotation<Array<{ id: string; title: string; content: string; uri: string }>>({
    value: (x, y) => y,
    default: () => [],
  }),
  // Tracks how many times the agent has tried to auto-heal from an error
  retryCount: Annotation<number>({
    value: (x, y) => y,
    default: () => 0,
  }),
  // Flag for Human-in-the-Loop approval for sensitive tool executions
  isApproved: Annotation<boolean>({
    value: (x, y) => y,
    default: () => false,
  }),
});
