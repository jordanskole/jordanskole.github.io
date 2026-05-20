import { useState } from "react";
import { tools, ToolSpec } from "../data/tools";

function ToolCard({ tool }: { tool: ToolSpec }) {
  const [showOutput, setShowOutput] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  return (
    <div className="cs-tool-card">
      <div className="cs-tool-header">
        <code className="cs-tool-name">{tool.name}</code>
        <span className="cs-pill cs-pill-executor">runs in: {tool.executor}</span>
      </div>

      <p className="cs-tool-desc">{tool.description}</p>

      <div className="cs-tool-section">
        <div className="cs-tool-section-title">Input schema</div>
        <div className="cs-tool-schema">
          {Object.entries(tool.inputSchema).map(([name, spec]) => {
            const required = tool.requiredFields.includes(name);
            return (
              <div key={name} className="cs-schema-row">
                <code className="cs-schema-field">
                  {name}
                  {required ? <span className="cs-required">*</span> : null}
                </code>
                <span className="cs-schema-type">{spec.type}</span>
                {spec.enum && (
                  <span className="cs-schema-enum">enum: {spec.enum.join(" | ")}</span>
                )}
                <div className="cs-schema-desc">{spec.description}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="cs-tool-section">
        <div className="cs-tool-section-title">Example call</div>
        <pre className="cs-code">{JSON.stringify(tool.exampleInput, null, 2)}</pre>
      </div>

      <div className="cs-tool-section">
        <button className="cs-disclose" onClick={() => setShowOutput((v) => !v)}>
          {showOutput ? "▾" : "▸"} Example output
        </button>
        {showOutput && (
          <pre className="cs-code">{JSON.stringify(tool.exampleOutput, null, 2)}</pre>
        )}
      </div>

      <div className="cs-tool-section">
        <div className="cs-tool-section-title">Renders as</div>
        <p className="cs-tool-rendersas">{tool.rendersAs}</p>
      </div>

      <div className="cs-tool-section">
        <button className="cs-disclose" onClick={() => setShowNotes((v) => !v)}>
          {showNotes ? "▾" : "▸"} Implementation notes ({tool.notes.length})
        </button>
        {showNotes && (
          <ul className="cs-notes">
            {tool.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function ToolCatalog() {
  return (
    <div className="cs-tool-catalog">
      {tools.map((tool) => (
        <ToolCard key={tool.name} tool={tool} />
      ))}
    </div>
  );
}
