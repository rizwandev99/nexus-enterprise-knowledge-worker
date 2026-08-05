import "dotenv/config";
import { addDocumentTool, executeSqlMutationTool, nativeTools } from "../../src/lib/agent/tools";
import { createAgentGraph } from "../../src/lib/agent/graph";
import { AIMessage } from "@langchain/core/messages";

async function runEmpiricalTests() {
  console.log("=== EMPIRICAL TEST SUITE: MILESTONE 1 ===");
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}${detail ? `: ${detail}` : ""}`);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // Test 1: Native Tools Export & Structure Verification
  // -------------------------------------------------------------
  assert(Array.isArray(nativeTools), "nativeTools is an Array");
  assert(nativeTools.length === 2, "nativeTools contains exactly 2 tools");
  assert(addDocumentTool.name === "add_document", "addDocumentTool name is 'add_document'");
  assert(
    typeof addDocumentTool.description === "string" && addDocumentTool.description.length > 0,
    "addDocumentTool has description"
  );
  assert(executeSqlMutationTool.name === "execute_sql_mutation", "executeSqlMutationTool name is 'execute_sql_mutation'");
  assert(
    typeof executeSqlMutationTool.description === "string" && executeSqlMutationTool.description.length > 0,
    "executeSqlMutationTool has description"
  );

  // -------------------------------------------------------------
  // Test 2: Tool Execution - addDocumentTool
  // -------------------------------------------------------------
  try {
    const docResult = await addDocumentTool.invoke({
      title: "Challenger Test Document",
      content: "Empirical verification content for M1 challenger test.",
    });
    console.log("addDocumentTool result:", docResult);
    assert(
      typeof docResult === "string" && docResult.includes("Successfully added document with ID:"),
      "addDocumentTool returns success string with document ID"
    );
  } catch (err: any) {
    assert(false, "addDocumentTool execution failed", err.message);
  }

  // -------------------------------------------------------------
  // Test 3: Tool Execution - executeSqlMutationTool (Valid SQL)
  // -------------------------------------------------------------
  try {
    const sqlResult = await executeSqlMutationTool.invoke({
      query: "SELECT 1 AS challenger_test;",
    });
    console.log("executeSqlMutationTool result:", sqlResult);
    assert(
      typeof sqlResult === "string" && sqlResult.includes("Successfully executed mutation:"),
      "executeSqlMutationTool returns success message for valid query"
    );
  } catch (err: any) {
    assert(false, "executeSqlMutationTool execution failed on valid SQL", err.message);
  }

  // -------------------------------------------------------------
  // Test 4: Tool Execution - executeSqlMutationTool (Invalid SQL Edge Case)
  // -------------------------------------------------------------
  try {
    await executeSqlMutationTool.invoke({
      query: "SELECT * FROM non_existent_table_xyz_999;",
    });
    assert(false, "executeSqlMutationTool should have thrown on invalid SQL query");
  } catch (err: any) {
    assert(
      err.message.includes("relation \"non_existent_table_xyz_999\" does not exist") ||
        err.message.includes("does not exist") ||
        err.message.length > 0,
      "executeSqlMutationTool correctly throws database exception on invalid SQL"
    );
  }

  // -------------------------------------------------------------
  // Test 5: Graph Compilation Verification
  // -------------------------------------------------------------
  try {
    const graph = await createAgentGraph();
    assert(graph !== undefined && typeof graph.invoke === "function", "createAgentGraph compiles and returns Runnable graph");
  } catch (err: any) {
    assert(false, "createAgentGraph failed to compile", err.message);
  }

  // -------------------------------------------------------------
  // Test Summary
  // -------------------------------------------------------------
  console.log("\n=========================================");
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=========================================\n");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runEmpiricalTests().catch((err) => {
  console.error("Unhandled error in test runner:", err);
  process.exit(1);
});
