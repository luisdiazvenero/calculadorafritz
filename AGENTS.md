<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# UI / UX Rules

- Every interactive element (button, link, clickable div, select, input) MUST have an explicit `cursor-pointer` class. Never rely on browser defaults — Tailwind resets cursors to `auto` by default.
- Disabled buttons use `cursor-not-allowed` (not `cursor-default` or omitted).
- These rules apply to all new code and must be fixed in any code being edited nearby.
