# Chat / LLM System — Verbose Writeup

A standalone MDX explainer of how the LLM-powered chat works inside Autobooks Hub. Aimed at a semi-technical stakeholder. Far more verbose than the wiki.

The MDX file is paired with four small React components that visualize the system in motion:

- **SystemPromptExplorer** — collapsible viewer for every section of the prompt sent to Claude
- **ToolCatalog** — schema, sample I/O, and notes for each of the four tools Claude can call
- **ToolCallTimeline** — stepped/animated playback of the SSE event stream during a tool-using turn
- **PiiViewer** — side-by-side comparison of raw rows, the tokenized rows the LLM sees, and what the user actually sees rendered

All four components ship with mock data so this artifact runs without any backend.

## Run it

You'll need Node 20+. The components are plain React 19 — no Chakra, no Tailwind, no auth.

```bash
npm install
npm run dev
```

You can also import the MDX into any framework that compiles MDX (Next.js, Astro, Docusaurus, Storybook, etc.). The components live in `components/` and the mock data in `data/`.

## Files

```
chat-system/
├── README.md             ← you are here
├── package.json
├── styles.css            ← all styling; no design system
├── chat-system.mdx       ← the writeup
├── components/
│   ├── SystemPromptExplorer.tsx
│   ├── ToolCatalog.tsx
│   ├── ToolCallTimeline.tsx
│   └── PiiViewer.tsx
└── data/
    ├── systemPrompt.ts   ← the prompt, broken into sections
    ├── tools.ts          ← the 4 tool specs
    ├── sseEvents.ts      ← mock SSE event sequence
    └── piiSample.ts      ← mock PII redaction scenarios
```

The mock data is faithful to the real system — tool names, event names, prompt section headers, and JSON shapes match the production code as of May 2026. Company names and amounts are fabricated.
