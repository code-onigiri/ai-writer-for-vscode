# Product Overview

AI Writer for VS Code helps authors co-create long-form drafts with language models inside the editor. The repository currently holds the base iteration engine and reference documentation for integrating with VS Code's AI extensibility APIs.

## Core Capabilities

- Iterative drafting loop that alternates between generate and critique steps via the iteration engine.
- Reference documentation and patterns for wiring VS Code chat participants and language models into writing workflows.
- Monorepo setup that allows additional extension packages or engines to be added without disrupting existing flows.

## Target Use Cases

- Individual writers who want structured AI assistance while drafting articles or books in VS Code.
- Extension developers experimenting with AI-assisted writing flows before shipping a full UI surface.
- Teams documenting AI workflow patterns for downstream VS Code participants or tools.

## Value Proposition

- Encapsulates AI writing logic in a reusable engine that keeps iteration steps predictable.
- Aligns documentation, code, and testing around VS Code AI extensibility so new features follow the same mental model.
- Lightweight JavaScript implementation that is easy to extend or replace while the product vision evolves.

---
_Focus on patterns and purpose, not exhaustive feature lists_
