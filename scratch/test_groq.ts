import 'dotenv/config';
import { ChatGroq } from '@langchain/groq';

const model1 = new ChatGroq({ model: 'llama-3.3-70b-versatile' });
const res = await model1.invoke("say hi");
console.log(res.content);
