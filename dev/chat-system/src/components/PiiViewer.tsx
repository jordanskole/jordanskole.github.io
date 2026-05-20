import { useState } from "react";
import { piiScenarios, PiiScenario } from "../data/piiSample";

function Table({
  columns,
  rows,
  highlightPii,
}: {
  columns: { name: string; isPii: boolean }[];
  rows: Record<string, unknown>[];
  highlightPii: boolean;
}) {
  return (
    <table className="cs-table cs-pii-table">
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c.name}>
              {c.name}
              {highlightPii && c.isPii && <span className="cs-pii-flag"> PII</span>}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {columns.map((c) => {
              const val = row[c.name];
              const isToken = typeof val === "string" && /^\[REDACTED_\d+\]$/.test(val);
              return (
                <td key={c.name} className={isToken ? "cs-pii-token" : ""}>
                  {String(val)}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ScenarioView({ scenario }: { scenario: PiiScenario }) {
  return (
    <div className="cs-pii-scenario">
      <div className="cs-pii-sql">
        <div className="cs-pii-sql-label">SQL Claude generated:</div>
        <pre className="cs-code cs-code-small">{scenario.sql}</pre>
      </div>

      <div className="cs-pii-grid">
        <div className="cs-pii-panel">
          <div className="cs-pii-panel-title">
            <span className="cs-pii-step">1</span> Raw DuckDB result (in the browser)
          </div>
          <p className="cs-pii-panel-desc">
            Lives only in the browser. Never sent over the network. The PII columns are flagged
            via <code>field.isPii</code> on the column metadata.
          </p>
          <Table columns={scenario.columns} rows={scenario.rawRows} highlightPii />
        </div>

        <div className="cs-pii-arrow">→ obfuscateRows() →</div>

        <div className="cs-pii-panel">
          <div className="cs-pii-panel-title">
            <span className="cs-pii-step">2</span> What the LLM sees
          </div>
          <p className="cs-pii-panel-desc">
            PII values replaced with stable <code>[REDACTED_N]</code> tokens. The same value
            always maps to the same token across the whole chat session.
          </p>
          <Table columns={scenario.columns} rows={scenario.tokenizedRows} highlightPii={false} />
        </div>
      </div>

      <div className="cs-pii-llm-output">
        <div className="cs-pii-panel-title">
          <span className="cs-pii-step">3</span> Claude's response (tokens still in place)
        </div>
        <p className="cs-pii-tokens-line">{scenario.llmAnalysis}</p>
      </div>

      <div className="cs-pii-arrow-down">↓ deobfuscate() at render time</div>

      <div className="cs-pii-rendered">
        <div className="cs-pii-panel-title">
          <span className="cs-pii-step">4</span> What the user actually sees
        </div>
        <p className="cs-pii-rendered-line">{scenario.renderedAnalysis}</p>
      </div>

      <div className="cs-pii-state">
        <div className="cs-pii-panel-title">Current token map state</div>
        <div className="cs-pii-state-grid">
          {scenario.tokenMap.map((m) => (
            <div key={m.token} className="cs-pii-mapping">
              <code>{m.token}</code>
              <span className="cs-pii-arrow-small">⇄</span>
              <span>{m.value}</span>
            </div>
          ))}
        </div>
        <p className="cs-note">
          The map is a module-level singleton scoped to the chat session.{" "}
          <code>reset()</code> is called when <code>ChatPanel</code> unmounts so tokens never
          leak across sessions.
        </p>
      </div>
    </div>
  );
}

export default function PiiViewer() {
  const [idx, setIdx] = useState(0);
  const scenario = piiScenarios[idx];

  return (
    <div className="cs-pii-viewer">
      <div className="cs-pii-tabs">
        {piiScenarios.map((s, i) => (
          <button
            key={i}
            className={`cs-pii-tab ${i === idx ? "cs-pii-tab-active" : ""}`}
            onClick={() => setIdx(i)}
          >
            {s.title}
          </button>
        ))}
      </div>
      <p className="cs-pii-description">{scenario.description}</p>
      <ScenarioView scenario={scenario} />
    </div>
  );
}
