# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: hero-ingestion.spec.ts >> Hero, Bento Cards, Omni-Input & Document Ingestion Suite >> 2. 4 Bento Showcase Cards render icons, badges, descriptions, support hover, and execute actions
- Location: tests\e2e\hero-ingestion.spec.ts:44:7

# Error details

```
Test timeout of 30000ms exceeded while running "beforeEach" hook.
```

```
Test timeout of 30000ms exceeded.
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - generic [ref=e3]:
      - generic [ref=e4]:
        - generic [ref=e5]:
          - button "Toggle Sidebar Sessions Drawer" [ref=e6] [cursor=pointer]
          - navigation [ref=e10]:
            - button "Start New Chat Session" [ref=e11] [cursor=pointer]
            - button "Toggle Chat Sessions (PostgreSQL Checkpointer)" [ref=e13] [cursor=pointer]
            - button "Live LangGraph State Machine & OTel Traces Inspector" [ref=e16] [cursor=pointer]
            - button "Seed Knowledge Base (3 Enterprise Docs into pgvector)" [ref=e19] [cursor=pointer]
        - link "View Source Code & Architecture on GitHub" [ref=e25] [cursor=pointer]:
          - /url: https://github.com/rizwandev99/nexus-enterprise-knowledge-worker
      - complementary [ref=e28]:
        - generic [ref=e29]:
          - generic [ref=e30]:
            - generic [ref=e31]: Chat Sessions
            - button "Export Current Chat to Markdown" [ref=e33] [cursor=pointer]
          - generic [ref=e37]: No previous sessions yet
    - main [ref=e39]:
      - generic [ref=e40]:
        - generic [ref=e41]:
          - button "Toggle Sessions Drawer" [ref=e42] [cursor=pointer]
          - generic [ref=e45]: Nexus AI
        - generic [ref=e46]:
          - button "Telemetry" [ref=e47] [cursor=pointer]
          - link "GitHub Repository" [ref=e50] [cursor=pointer]:
            - /url: https://github.com/rizwandev99/nexus-enterprise-knowledge-worker
      - generic [ref=e55]:
        - paragraph [ref=e60]: Hi, User
        - heading "Can I help you with anything?" [level=1] [ref=e61]
        - paragraph [ref=e62]: Ready to assist you with anything you need — from enterprise knowledge retrieval to safe database mutations.
        - generic [ref=e63]:
          - 'button "KB: + Seed Sample Docs" [ref=e64] [cursor=pointer]':
            - generic [ref=e66]: "KB:"
            - generic [ref=e67]: + Seed Sample Docs
          - button "Clear KB" [ref=e68] [cursor=pointer]
        - generic [ref=e72]:
          - generic [ref=e73] [cursor=pointer]:
            - generic [ref=e74]: Hybrid RAG Engine
            - heading "Hybrid Search RAG" [level=3] [ref=e80]
            - paragraph [ref=e81]: pgvector cosine similarity + PostgreSQL tsvector keyword ranking with RRF
            - generic [ref=e82]:
              - generic [ref=e83]: "Try: Search enterprise password policies"
              - generic [ref=e84]: →
          - generic [ref=e85] [cursor=pointer]:
            - generic [ref=e86]: LangGraph interrupt()
            - heading "SQL Agent + HITL Approval" [level=3] [ref=e92]
            - paragraph [ref=e93]: Two-phase human authorization boundary for safe database mutations
            - generic [ref=e94]:
              - generic [ref=e95]: "Try: Mutate document status to ARCHIVED"
              - generic [ref=e96]: →
          - generic [ref=e97] [cursor=pointer]:
            - generic [ref=e98]: Auto-Retry (Max 3)
            - heading "Cyclic Self-Correction" [level=3] [ref=e106]
            - paragraph [ref=e107]: Automatic runtime exception catching & query healing across cyclic graph edges
            - generic [ref=e108]:
              - generic [ref=e109]: "Try: Test query with deliberate schema typo"
              - generic [ref=e110]: →
          - generic [ref=e111] [cursor=pointer]:
            - generic [ref=e112]: OpenTelemetry + OTLP
            - heading "State & Telemetry Inspector" [level=3] [ref=e117]
            - paragraph [ref=e118]: Inspect live LangGraph cyclic DAG flow, checkpointer state, and P95 latency
            - generic [ref=e119]:
              - generic [ref=e120]: Open State & Telemetry Inspector
              - generic [ref=e121]: →
      - generic [ref=e124]:
        - generic [ref=e125]:
          - button "Search documents" [ref=e126] [cursor=pointer]
          - button "SQL Mutation" [ref=e127] [cursor=pointer]
          - button "Audit Logs" [ref=e128] [cursor=pointer]
          - button "System SLA" [ref=e129] [cursor=pointer]
        - generic [ref=e131]:
          - textbox "Ask me anything, search knowledge base, or run SQL mutations..." [ref=e132]
          - generic [ref=e133]:
            - generic [ref=e134]:
              - button "Attach Document" [ref=e135] [cursor=pointer]
              - button "Toggle Live Internet Web Search" [ref=e138] [cursor=pointer]
              - button "Enterprise Tools & Integrations" [ref=e143] [cursor=pointer]
            - generic [ref=e148]:
              - button "Groq GPT-OSS 120B ~850 tok/s" [ref=e150] [cursor=pointer]:
                - generic [ref=e154]: Groq GPT-OSS 120B
                - generic [ref=e155]: ~850 tok/s
              - button "Send message" [disabled] [ref=e158]
      - paragraph [ref=e162]: Nexus AI may contain errors. We recommend checking important information.
  - generic "Notifications"
```