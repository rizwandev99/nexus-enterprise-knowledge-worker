import * as ai from 'ai';
const keys = Object.keys(ai).filter(k => k.startsWith('create') || k.includes('DataStream') || k.includes('Stream') || k.includes('Message'));
console.log(keys);
