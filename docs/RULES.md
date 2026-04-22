# 404: Trust Not Found — Game Rules

> **INCIDENT REPORT — SEVERITY: CRITICAL**
> All hands on deck. Version 9.0.0 is in the pipeline and the entire company is watching.
> The sprint board is overflowing. The Slack channel is on fire. And somewhere in this team —
> someone is shipping Bugs on purpose.
>
> You have 4 Sprints. You have a deadline. You have colleagues you thought you could trust.
> Merge wisely. Or watch production burn.

---

## Overview

**404: Trust Not Found** is a hidden-role social deduction game for **3–10 players**.
One team of **Good Devs** is racing to release version 9.0.0 by merging all the **Features** in the codebase.
A hidden team of **Bad Devs** is trying to sabotage the release — either by sneaking in enough **Bugs** to crash production, or simply by stalling until the deadline runs out.

A single **Reviewer** is active each turn. They must choose whose PR to merge next — and they'd better choose carefully.

---

## Roles

At the start of the game, each player is secretly dealt one role card. Roles are never revealed unless a win condition is triggered.

| Role | Team | Goal |
|---|---|---|
| **Good Dev** | Good Devs | Merge all Features before the deadline |
| **Bad Dev** | Bad Devs | Merge enough Bugs — or run out the clock |

### Role Distribution by Player Count

| Players | Good Devs | Bad Devs | Total Dealt               |
|---|---|---|---------------------------|
| 3 | 2 | 2 | 3 (1 discarded secretly)  |
| 4 | 3 | 2 | 4 (1 discarded secretly)  |
| 5 | 3 | 2 | 5                         |
| 6 | 4 | 2 | 6                         |
| 7 | 5 | 3 | 7 (1 discarded secretly)  |
| 8 | 6 | 3 | 8 (1 discarded secretly)  |
| 9 | 6 | 3 | 9                         |
| 10 | 7 | 4 | 10 (1 discarded secretly) |

> The role pool is shuffled, one card is dealt to each player, and the remainder is discarded face-down. No one learns what was discarded.

---

## PR Cards

Every turn, players hold a hand of PR cards. There are three types:

| Card | Description | Effect |
|---|---|---|
| **Feature** | A genuine improvement toward v9.0.0 | Counts toward the Good Devs' win condition |
| **Bug** | Malicious code disguised as a fix | Counts toward the Bad Devs' win condition |
| **Chore** | Refactors, linter fixes, dependency bumps | Neutral — wastes time without contributing to the release |

### Deck Composition by Player Count

| Players | Features | Bugs | Chores | Total |
|---|---|---|---|---|
| 3  | 5  | 2 | 8  | 15 |
| 4  | 6  | 2 | 12 | 20 |
| 5  | 7  | 2 | 16 | 25 |
| 6  | 8  | 2 | 20 | 30 |
| 7  | 7  | 2 | 26 | 35 |
| 8  | 8  | 2 | 30 | 40 |
| 9  | 9  | 2 | 34 | 45 |
| 10 | 10 | 3 | 37 | 50 |

---

## The Sprint System

The game is divided into exactly **4 Sprints**. Each Sprint represents a development cycle under deadline pressure.

### Hand Size per Sprint

| Sprint | Cards per Player |
|---|---|
| Sprint 1 | 5 cards |
| Sprint 2 | 4 cards |
| Sprint 3 | 3 cards |
| Sprint 4 | 2 cards |

### Sprint Flow

1. At the start of each Sprint, all **unmerged** cards are gathered, thoroughly shuffled, and re-dealt evenly to all players.
2. The **Reviewer** picks a player and merges one of their PR cards.
3. The card is revealed publicly and placed in the **Main Repository**.
4. The player whose card was just merged becomes the new **Reviewer** for the next turn.
5. When the number of merged PRs in a Sprint equals the total number of players, the Sprint ends.
6. A new Sprint begins immediately, and all unmerged cards are reshuffled and re-dealt.

> **No one can review their own PR.** The active Reviewer must always choose a card belonging to another player.

---

## The Main Repository

The **Main Repository** is the public record of all merged PRs. Every merged card is visible to all players, grouped by Sprint. Use this history to deduce who is sabotaging the release.

---

## Win Conditions

### Good Devs Win — Version 9.0.0 Ships!
All **Features** in the entire game have been merged into the Main Repository.
The release goes live. The team survives the crunch. Champagne emoji in Slack.

### Bad Devs Win — Production is Down!
Either of the following occurs:
- All **Bugs** in the game have been merged into the Main Repository (production crashes), **OR**
- All **4 Sprints** end without all Features being merged (the deadline expires — the release is cancelled).

Win conditions are checked immediately after every merge.

---

## Strategy Notes

**For Good Devs:** Track the Features and Bugs in the Main Repository. If Bugs are being merged faster than Features, someone on the team is steering toward them. Trust is a vulnerability.

**For Bad Devs:** Blend in. Merge Chores when it looks natural. Push Bugs only when you can plausibly blame someone else. The deadline is your friend — stalling is a valid strategy.

**For everyone:** The Reviewer is the most powerful role each turn. Use it to apply social pressure, signal your alignment, or quietly execute a plan. Choose carefully.

---

## Glossary

| Term | Meaning |
|---|---|
| **Sprint** | One of 4 rounds; ends when N PRs have been merged (N = player count) |
| **Reviewer** | The active player whose turn it is to choose which PR to merge |
| **Main Repository** | The shared log of all merged PR cards |
| **Feature** | A PR card that advances the v9.0.0 release |
| **Bug** | A PR card that sabotages production |
| **Chore** | A neutral PR card that wastes time |
| **Good Dev** | A player on the team trying to ship the release |
| **Bad Dev** | A hidden saboteur trying to crash production or delay the release |