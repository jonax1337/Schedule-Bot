---
name: readme-improver
description: >
  Create, improve, or update README.md files for GitHub repositories following modern best practices.
  Use when the user asks to: write a README, improve/update an existing README, add badges to a README,
  create project documentation, make a README look more professional, or generate a README from a codebase.
  Triggers include: "README", "readme", "project documentation", "add badges", "improve my repo docs",
  "write documentation for my project", "make my repo look professional". Handles both creating READMEs
  from scratch (by analyzing the project) and improving existing ones. Supports shields.io badges
  (tech stack, status, quality), intelligent section generation, and language customization.
---

# README Improver

Create, improve, or update GitHub README files with modern badges, clean structure, and professional presentation.

## Workflow

### 1. Analyze the Project

Before writing, gather context by examining available project files:

- `package.json`, `Cargo.toml`, `pyproject.toml`, `go.mod`, `pom.xml`, `composer.json`, `Gemfile`, etc. — for tech stack, dependencies, scripts, version
- Existing `README.md` — to understand current state and preserve intentional content
- Source code structure — for architecture understanding
- `.github/workflows/` — for CI/CD badge generation
- `LICENSE` — for license badge
- Config files (`.eslintrc`, `tsconfig.json`, `Dockerfile`, `docker-compose.yml`, etc.) — for tooling badges

If the user provides a repo URL, offer to examine it. If files are uploaded or accessible, read them directly.

### 2. Determine Sections

Select sections intelligently based on what the project actually needs. Not every README needs every section.

**Typical section order** (include only what's relevant):

1. **Title + Description** — Always. Project name as H1, concise 1-2 sentence description.
2. **Badges** — Status badges right below title, tech stack badges in a dedicated section or below description.
3. **Visual** (optional) — Screenshot, demo GIF, or banner if the project has a UI.
4. **Features** — Key capabilities, keep concise.
5. **Tech Stack** — With `for-the-badge` style badges grouped logically.
6. **Prerequisites** — Only if non-obvious.
7. **Installation** — Step-by-step with code blocks.
8. **Usage** — Examples, CLI commands, or API snippets.
9. **Configuration / Environment Variables** — If applicable, use a table.
10. **API Reference** — Brief overview or link to full docs.
11. **Project Structure** (optional) — Tree view for complex projects.
12. **Roadmap** (optional) — Future plans.
13. **Contributing** — Or link to CONTRIBUTING.md.
14. **License** — One-liner with badge.
15. **Acknowledgments** (optional) — Credits, inspiration.

**Rules:**
- Skip sections that don't add value (e.g., no "Prerequisites" if it's just Node.js)
- Combine thin sections (e.g., merge Prerequisites into Installation)
- For simple projects, a shorter README is better than a padded one
- For libraries/packages, prioritize Usage and API examples
- For apps, prioritize Installation and Screenshots

### 3. Write the README

#### General Style

- Language: English by default, but adapt if the project or user indicates a different language
- Tone: Professional but approachable, not overly formal
- Keep descriptions concise — no filler text
- Use code blocks with language hints for all commands and code
- Use relative links for repo files (`./docs/API.md` not full GitHub URLs)
- End file with a single newline

#### Badge Placement

**Status badges** (dynamic) go directly under the H1 title, on one line or wrapped naturally:

```markdown
# Project Name

[![License](https://img.shields.io/github/license/USER/REPO?style=flat-square)](LICENSE)
[![Build](https://img.shields.io/github/actions/workflow/status/USER/REPO/ci.yml?style=flat-square)](...)
[![Version](https://img.shields.io/github/v/release/USER/REPO?style=flat-square)](...)
```

Use `flat-square` or `flat` style for status badges. Wrap in links where meaningful.

**Tech stack badges** go in a dedicated "Tech Stack" or "Built With" section using `for-the-badge` style:

```markdown
## Tech Stack

<p>
  <img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
</p>
```

Use `<p>` or `<div>` tags to group badges — this ensures proper wrapping on narrow screens. Separate logical groups (Frontend / Backend / Tools) with line breaks if the stack is large.

**For badge construction details and a full library of common badges**, see [references/badges.md](references/badges.md).

#### Installation Blocks

Always specify the package manager and use tabbed alternatives if the project supports multiple:

````markdown
## Installation

```bash
# Clone the repository
git clone https://github.com/USER/REPO.git
cd REPO

# Install dependencies
npm install

# Start development server
npm run dev
```
````

If the project supports npm, yarn, pnpm, or bun, show at least the primary one. Optionally mention alternatives inline.

#### Environment Variables

Use a table for env vars:

```markdown
| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Yes | — |
| `PORT` | Server port | No | `3000` |
```

#### Project Structure

Use a tree view for complex projects, keep it high-level (max 2-3 levels):

````markdown
## Project Structure

```
src/
├── components/    # Reusable UI components
├── hooks/         # Custom React hooks
├── pages/         # Route pages
├── services/      # API service layer
├── utils/         # Helper functions
└── App.tsx        # Entry point
```
````

### 4. Improve Existing READMEs

When updating an existing README:

- Preserve the author's voice and intentional content choices
- Don't add sections the author deliberately omitted (ask if unsure)
- Fix: outdated badges, broken links, inconsistent formatting, missing code language hints
- Add: badges for detected tech stack, better code examples, table of contents if long
- Improve: vague descriptions, missing installation steps, unclear usage examples
- Keep the existing structure unless a reorganization is clearly beneficial

### 5. Final Checks

Before delivering, verify:

- All badge URLs are valid (correct logo slugs, proper hex colors without `#` in URL)
- Code blocks have language identifiers
- No placeholder text left (`USER/REPO`, `PACKAGE`, etc. are replaced with actuals)
- Links point to correct locations
- File ends with single newline
- Consistent heading hierarchy (no skipped levels)
- Badge styles are consistent within each group