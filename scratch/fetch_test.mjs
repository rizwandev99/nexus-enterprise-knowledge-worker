
import { readUIMessageStream } from 'ai';

async function main() {
  const res = await fetch('http://localhost:3000/api/test');
  const stream = readUIMessageStream({ stream: res.body });
  for await (const chunk of stream) {
    console.log(JSON.stringify(chunk, null, 2));
  }
}
main().catch(console.error);
