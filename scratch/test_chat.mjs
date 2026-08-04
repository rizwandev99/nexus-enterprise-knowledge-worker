

async function main() {
  const res = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: 'execute a database mutation' }]
    })
  });
  
  console.log(`STATUS: ${res.status} ${res.statusText}`);
  const text = await res.text();
  console.log("RESPONSE STREAM:");
  console.log(text);
}
main().catch(console.error);
