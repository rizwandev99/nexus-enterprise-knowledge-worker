const text = " [APPROVAL_REQUEST]{\"name\":\"execute_sql_mutation\",\"args\":{\"query\":\"INSERT INTO docs\\nVALUES(1)\"}}";
const match = text.match(/\[APPROVAL_REQUEST\](.*)/s);
console.log("Match:", match ? match[1] : "null");
try {
  console.log("Parsed:", JSON.parse(match[1]));
} catch (e) {
  console.log("Parse Error:", e.message);
}
