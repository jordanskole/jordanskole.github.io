// Mock sample showing the three views of PII: raw → tokenized → rendered.
// Source: apps/web/src/domains/chat/tools/piiTokenMap.ts

export interface ColumnMeta {
  name: string;
  isPii: boolean;
}

export interface PiiScenario {
  title: string;
  description: string;
  sql: string;
  columns: ColumnMeta[];
  rawRows: Record<string, unknown>[];
  tokenizedRows: Record<string, unknown>[];
  tokenMap: Array<{ token: string; value: string }>;
  llmAnalysis: string;
  renderedAnalysis: string;
}

export const piiScenarios: PiiScenario[] = [
  {
    title: "Top 3 SMBs by revenue (May 2026)",
    description:
      "User asks 'who are our top businesses this month?' Claude calls query_data with a SQL aggregate. The result contains companyName — marked isPii: true in the schema — so the token map kicks in.",
    sql: "SELECT s.smbId, s.companyName, SUM(p.amountPennies)/100.0 AS revenue FROM payments p JOIN smbs s ON p.smbId = s.smbId WHERE p.paymentDate >= DATE '2026-05-01' GROUP BY 1, 2 ORDER BY revenue DESC LIMIT 3",
    columns: [
      { name: "smbId", isPii: false },
      { name: "companyName", isPii: true },
      { name: "revenue", isPii: false },
    ],
    rawRows: [
      { smbId: 1142, companyName: "Acme Corp", revenue: 48230 },
      { smbId: 887, companyName: "Pied Piper LLC", revenue: 31480 },
      { smbId: 2014, companyName: "Stark Industries", revenue: 22150 },
    ],
    tokenizedRows: [
      { smbId: 1142, companyName: "[REDACTED_1]", revenue: 48230 },
      { smbId: 887, companyName: "[REDACTED_2]", revenue: 31480 },
      { smbId: 2014, companyName: "[REDACTED_3]", revenue: 22150 },
    ],
    tokenMap: [
      { token: "[REDACTED_1]", value: "Acme Corp" },
      { token: "[REDACTED_2]", value: "Pied Piper LLC" },
      { token: "[REDACTED_3]", value: "Stark Industries" },
    ],
    llmAnalysis:
      "Your top three SMBs by revenue this month are **[REDACTED_1]** ($48,230), **[REDACTED_2]** ($31,480), and **[REDACTED_3]** ($22,150). [REDACTED_1] is your clear leader — about 50% above [REDACTED_2].",
    renderedAnalysis:
      "Your top three SMBs by revenue this month are **Acme Corp** ($48,230), **Pied Piper LLC** ($31,480), and **Stark Industries** ($22,150). Acme Corp is your clear leader — about 50% above Pied Piper LLC.",
  },
  {
    title: "Token reuse across queries (same session)",
    description:
      "When the user follows up with another query that returns the same SMB, the token map reuses the existing token. This means 'Acme Corp' is consistently [REDACTED_1] across the whole chat session — Claude can refer to it by token and the user always sees the same name on the other side.",
    sql: "SELECT smbId, companyName, primaryOwnerEmail FROM smbs WHERE smbId = 1142",
    columns: [
      { name: "smbId", isPii: false },
      { name: "companyName", isPii: true },
      { name: "primaryOwnerEmail", isPii: true },
    ],
    rawRows: [
      {
        smbId: 1142,
        companyName: "Acme Corp",
        primaryOwnerEmail: "wile@acme.example",
      },
    ],
    tokenizedRows: [
      {
        smbId: 1142,
        companyName: "[REDACTED_1]",
        primaryOwnerEmail: "[REDACTED_4]",
      },
    ],
    tokenMap: [
      { token: "[REDACTED_1]", value: "Acme Corp" },
      { token: "[REDACTED_2]", value: "Pied Piper LLC" },
      { token: "[REDACTED_3]", value: "Stark Industries" },
      { token: "[REDACTED_4]", value: "wile@acme.example" },
    ],
    llmAnalysis:
      "[REDACTED_1] is owned by [REDACTED_4]. Want me to pull their invoice history next?",
    renderedAnalysis:
      "Acme Corp is owned by wile@acme.example. Want me to pull their invoice history next?",
  },
];
