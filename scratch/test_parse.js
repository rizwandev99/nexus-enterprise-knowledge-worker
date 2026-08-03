const text = "[APPROVAL_REQUEST]{\"name\":\"execute_sql_mutation\",\"args\":{\"query\":\"INSERT INTO documents (title, content) VALUES ('Sample Document', 'This is a mock document for testing our graph.')\"},\"id\":\"827281pny\",\"type\":\"tool_call\"}";

if (text.startsWith("[APPROVAL_REQUEST]")) {
  try {
    const parsed = JSON.parse(text.replace("[APPROVAL_REQUEST]", ""));
    console.log("SUCCESS:", parsed);
  } catch (e) {
    console.log("FAIL:", e);
  }
}
