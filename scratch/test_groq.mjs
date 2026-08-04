import 'dotenv/config';
import { ChatGroq } from '@langchain/groq';

const model = new ChatGroq({ model: 'llama-3.3-70b-versatile' }).bindTools([
  {
    name: "my_tool",
    description: "test tool",
    schema: { type: "object", properties: { x: { type: "string" } } }
  }
]);
try {
  const res = await model.invoke("say hi");
  console.log(res.content);
} catch (e) {
  console.log("Error invoking model:", e.message);
}
