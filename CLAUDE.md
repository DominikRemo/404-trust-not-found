# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
We are building a serverless, peer-to-peer social deduction game called "404: Trust Not Found".

## Tech Stack & Architecture
- **Build Tool:** Vite
- **Frontend Framework:** Vue 3 (Composition API, `<script setup>`)
- **Network:** PeerJS (WebRTC) for 100% decentralized P2P communication.
- **Rule #1 (CRITICAL):** NO backend, NO Node.js server, NO databases. The game must run entirely in the browser as a static site hosted on GitHub Pages.
- **Rule #2 (CRITICAL):** Keep components modular. Separate logic into Vue composables (e.g., `useNetwork.js`, `useGameLogic.js`) where appropriate.

## Code Structure (src/)
- `App.vue`: Main entry point and state coordinator.
- `components/`: UI components (e.g., `Lobby.vue`, `GameBoard.vue`, `PlayerCard.vue`).
- `composables/`: Reusable state and logic (e.g., PeerJS connection handling).
- `assets/`: Static assets and global CSS (`style.css`).

## UI / UX Design Guidelines
- **Theme:** Modern, clean, professional "Hacker" corporate identity. 
- **Colors:** White/off-white backgrounds, dark grey/charcoal for text to ensure high readability. Use dark corporate blue for primary actions/buttons.
- **Typography:** Clean, modern Sans-Serif fonts (e.g., system-ui, Inter, Roboto).
- **Anti-Pattern:** Do NOT use the cliché "Matrix Hacker" aesthetic (no black backgrounds with neon-green monospace fonts). Keep it light and spacious with gentle drop shadows and rounded corners.

## Git Workflow
Whenever you are asked to commit code, ALWAYS follow these rules:
1. Stage all relevant changes.
2. Write a clear, descriptive commit message.
3. Use the local git user as the primary author.
4. Append this exact Co-authored-by trailer at the very end of the commit message to include yourself:
`Co-authored-by: Claude AI <noreply@anthropic.com>`

## Commands

All commands run from the project root:

```bash
npm install       # install dependencies
npm run dev       # start dev server with HMR
npm run build     # production build to dist/
npm run preview   # preview production build
```
