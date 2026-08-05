import "dotenv/config";
import { addDocumentTool, executeSqlMutationTool, nativeTools } from "../../src/lib/agent/tools";
import { createAgentGraph } from "../../src/lib/agent/graph";

async function runAdversarialTests() {
  console.log("=== ADVERSARIAL STRESS TEST SUITE: MILESTONE 1 ===");
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
  // Test 1: Special Characters & Injection Resilience in addDocumentTool
  // -------------------------------------------------------------
  try {
    const specialTitle = "Doc with 'quotes' & \"double quotes\" + SQL '; DROP TABLE test; --";
    const specialContent = "Unicode test: 🚀 🤖 💻 with HTML <script>alert('xss')</script>";
    const res = await addDocumentTool.invoke({ title: specialTitle, content: specialContent });
    assert(
      typeof res === "string" && res.includes("Successfully added document with ID:"),
      "addDocumentTool handles special characters and quotes safely"
    );
  } catch (err: any) {
    assert(false, "addDocumentTool failed on special characters", err.message);
  }

  // -------------------------------------------------------------
  // Test 2: SQL Mutation Tool Parameter Serialization Edge Case
  // -------------------------------------------------------------
  try {
    // Pass query with semicolon & comments
    const query = "SELECT 42 AS val; -- stress test comment";
    const res = await executeSqlMutationTool.invoke({ query });
    assert(
      typeof res === "string" && res.includes("Successfully executed mutation:"),
      "executeSqlMutationTool executes queries with comments and semicolons"
    );
  } catch (err: any) {
    assert(false, "executeSqlMutationTool failed on commented SQL", err.message);
  }

  // -------------------------------------------------------------
  // Test 3: Graph Graphviz / Topology Inspection
  // -------------------------------------------------------------
  try {
    const graph = await createAgentGraph();
    const drawable = graph.getGraph();
    const nodeIds = Object.keys(drawable.nodes);
    console.log("Graph Nodes:", nodeIds);
    assert(nodeIds.includes("rag"), "Graph contains 'rag' node");
    assert(nodeIds.includes("reasoning"), "Graph contains 'reasoning' node");
    assert(nodeIds.includes("approval"), "Graph contains 'approval' node");
    assert(nodeIds.includes("tools"), "Graph contains 'tools' node");
  } catch (err: any) {
    assert(false, "Graph topology inspection failed", err.message);
  }

  console.log("\n=========================================");
  console.log(`ADVERSARIAL RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=========================================\n");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAdversarialTests().catch((err) => {
  console.error("Unhandled error in adversarial test runner:", err);
  process.exit(1);
});
