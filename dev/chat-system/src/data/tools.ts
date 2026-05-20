// The four tools Claude can call.
// Source of truth: apps/functions/src/functions/http/chat/chat.ts lines 17-135
// Frontend executors: apps/web/src/domains/chat/tools/

export interface ToolSpec {
  name: string;
  description: string;
  inputSchema: Record<string, { type: string; description: string; enum?: string[] }>;
  requiredFields: string[];
  executor: "browser (DuckDB-WASM)" | "browser (pure)" | "backend proxy" | "browser (UI render)";
  rendersAs: string;
  exampleInput: Record<string, unknown>;
  exampleOutput: unknown;
  notes: string[];
}

export const tools: ToolSpec[] = [
  {
    name: "query_data",
    description:
      "Execute a read-only SQL SELECT query against the user's in-browser DuckDB database. Use table and column names exactly as shown in the data model.",
    inputSchema: {
      sql: {
        type: "string",
        description: "A read-only SQL SELECT query.",
      },
    },
    requiredFields: ["sql"],
    executor: "browser (DuckDB-WASM)",
    rendersAs:
      "Collapsible tool-call card showing the SQL and a preview of the rows returned. The rows are also returned to the LLM as the tool result for further reasoning.",
    exampleInput: {
      sql: "SELECT s.smbId, s.companyName, SUM(p.amountPennies)/100.0 AS revenue FROM payments p JOIN smbs s ON p.smbId = s.smbId WHERE p.paymentDate >= DATE '2026-05-01' GROUP BY 1, 2 ORDER BY revenue DESC LIMIT 5",
    },
    exampleOutput: {
      rows: [
        { smbId: 1142, companyName: "[REDACTED_1]", revenue: 48230 },
        { smbId: 887, companyName: "[REDACTED_2]", revenue: 31480 },
        { smbId: 2014, companyName: "[REDACTED_3]", revenue: 22150 },
      ],
      rowCount: 3,
      columns: ["smbId", "companyName", "revenue"],
      truncated: false,
    },
    notes: [
      "Runs entirely in the browser — no data leaves the user's machine.",
      "Read-only enforced by parsing the SQL through DuckDB's json_serialize_sql() and rejecting anything that isn't SELECT/SHOW/DESCRIBE/EXPLAIN/PRAGMA/CALL.",
      "Result capped at 50 rows. The truncated flag tells the LLM whether more rows exist.",
      "BigInt values (DuckDB's default for integers) are coerced to Number for JSON.",
      "PII columns (e.g. companyName) are replaced with [REDACTED_N] tokens before the rows reach the LLM.",
    ],
  },
  {
    name: "display_visualization",
    description:
      "Render an interactive visualization (stat, chart, or table) inline in the chat. Call query_data first, then use this tool to render the result.",
    inputSchema: {
      type: { type: "string", description: "Visualization type.", enum: ["stat", "chart", "table"] },
      title: { type: "string", description: "Short label shown above the visualization." },
      sql: { type: "string", description: "The SQL that produces the data for this visualization." },
      format: {
        type: "string",
        description: "For stat type: how to format the single number.",
        enum: ["number", "currency", "percent"],
      },
      chartType: {
        type: "string",
        description: "For chart type: which chart variant.",
        enum: ["bar", "line", "area", "dot"],
      },
      xAxis: { type: "string", description: "Column name for the x-axis (chart only)." },
      yAxis: { type: "string", description: "Column name for the y-axis (chart only)." },
      color: { type: "string", description: "Column name to color/group by (chart only, optional)." },
      columns: { type: "array", description: "Column names to display (table only)." },
    },
    requiredFields: ["type", "title", "sql"],
    executor: "browser (UI render)",
    rendersAs:
      "An interactive Tile component (stat card, chart with axes, or data table). Has a 'pin to dashboard' affordance so users can save the tile for later.",
    exampleInput: {
      type: "chart",
      title: "Invoice revenue, last 12 months",
      sql: "SELECT strftime(DATE_TRUNC('month', invoiceCreateDate), '%Y-%m') AS month, SUM(invoiceAmountPennies)/100.0 AS revenue FROM invoices WHERE invoiceCreateDate >= CURRENT_DATE - INTERVAL 12 MONTH GROUP BY 1 ORDER BY 1",
      chartType: "line",
      xAxis: "month",
      yAxis: "revenue",
    },
    exampleOutput: {
      type: "chart",
      title: "Invoice revenue, last 12 months",
      chartType: "line",
      xAxis: "month",
      yAxis: "revenue",
      sql: "SELECT ...",
    },
    notes: [
      "The output schema is validated client-side against TileConfigSchema from @fi-product/schemas/tiles.",
      "The same TileConfig shape powers dashboard tiles — meaning a chat-generated chart can be pinned to a dashboard verbatim.",
      "The system prompt warns Claude that DuckDB returns timestamps as BigInt and instructs it to wrap datetime columns in strftime() before charting.",
    ],
  },
  {
    name: "search_knowledge_base",
    description:
      "Search the Autobooks knowledge base for product features, how-tos, and troubleshooting articles.",
    inputSchema: {
      query: { type: "string", description: "Search terms." },
    },
    requiredFields: ["query"],
    executor: "backend proxy",
    rendersAs:
      "A collapsible card showing the result titles, descriptions, and links to the source articles.",
    exampleInput: {
      query: "how does same-day ACH work in Autobooks",
    },
    exampleOutput: {
      results: [
        {
          title: "Same-Day ACH eligibility",
          description: "Same-Day ACH is available for transactions submitted before 2:45 PM ET.",
          url: "https://kb.autobooks.co/articles/sda-eligibility",
        },
      ],
    },
    notes: [
      "Proxies to the HubSpot knowledge base. Not all queries return results — Claude is expected to summarize what it finds and link the user to the source.",
      "Useful when a user asks a 'how do I' question that data alone can't answer.",
    ],
  },
  {
    name: "propose_smb_navigation",
    description:
      "Propose navigation to an SMB detail page. Does NOT navigate directly — returns a UI button the user clicks to confirm.",
    inputSchema: {
      smbId: { type: "number", description: "The SMB primary key resolved from query_data." },
      companyName: { type: "string", description: "Company name to display in the confirm card." },
    },
    requiredFields: ["smbId", "companyName"],
    executor: "browser (pure)",
    rendersAs:
      "A NavigateToSmbCard component with the company name and a 'Go to detail page' button. The button calls TanStack Router's useNavigate() when clicked.",
    exampleInput: {
      smbId: 1142,
      companyName: "[REDACTED_1]",
    },
    exampleOutput: {
      smbId: 1142,
      companyName: "[REDACTED_1]",
      path: "/!/small-business/1142",
    },
    notes: [
      "The tool executor is 'pure' — it returns { smbId, companyName, path } but does NOT call useNavigate(). This keeps the side effect user-controlled and prevents accidental re-navigations on SSE replay.",
      "The companyName is deobfuscated inside the card before display.",
      "Claude is instructed to call query_data first to resolve the name → id, and to emit acknowledgment text BEFORE this tool call so the card renders below the text.",
    ],
  },
];
