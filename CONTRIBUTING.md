# Contributing to Schedule-Bot

Thank you for your interest in contributing to Schedule-Bot! This guide will help you get started.

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- A Discord bot token ([Discord Developer Portal](https://discord.com/developers/applications))
- Git

### Development Setup

1. **Fork and clone** the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/Schedule-Bot.git
   cd Schedule-Bot
   ```

2. **Install dependencies:**
   ```bash
   npm install
   cd dashboard && npm install && cd ..
   ```

3. **Set up environment:**
   ```bash
   cp .env.example .env
   cp dashboard/.env.example dashboard/.env.local
   ```
   Fill in your Discord bot token, database URL, and other required values. See the [README](README.md) for details.

4. **Set up the database:**
   ```bash
   npx prisma migrate dev
   ```

5. **Start development:**
   ```bash
   # Terminal 1: Backend (bot + API)
   npm run dev

   # Terminal 2: Dashboard
   cd dashboard && npm run dev
   ```

## How to Contribute

### Reporting Bugs

- Use the [Bug Report](https://github.com/jonax1337/Schedule-Bot/issues/new?template=bug_report.yml) issue template
- Include steps to reproduce, expected vs actual behavior
- Include relevant logs from the dashboard Logs panel or console output

### Suggesting Features

- Use the [Feature Request](https://github.com/jonax1337/Schedule-Bot/issues/new?template=feature_request.yml) issue template
- Describe the use case and why it would be useful
- Check existing issues to avoid duplicates

### Submitting Pull Requests

1. **Create a branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following the code style guidelines below

3. **Test your changes:**
   - Verify the bot starts without errors (`npm run dev`)
   - Verify the dashboard builds (`cd dashboard && npm run build`)
   - Test affected Discord commands in a test server
   - Test affected dashboard pages

4. **Commit** with a clear message:
   ```bash
   git commit -m "feat: add support for custom time formats"
   ```

5. **Push and create a PR:**
   ```bash
   git push origin feature/your-feature-name
   ```
   Then open a Pull Request against `main`.

### Commit Message Convention

Use conventional commit prefixes:

| Prefix | Usage |
|--------|-------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `refactor:` | Code restructuring (no behavior change) |
| `docs:` | Documentation changes |
| `style:` | Formatting, whitespace (no logic change) |
| `chore:` | Build process, dependencies, tooling |
| `remove:` | Removing features or code |

## Code Style

### Backend (TypeScript)

- ES Modules (`import`/`export`, not `require`)
- Include `.js` extension in all imports (TypeScript ESM requirement)
- Use `async`/`await` for all async operations
- Use the structured logger (`logger.info()`, `logger.error()`) instead of `console.log`
- Follow the repository pattern for data access
- Follow the service pattern for business logic
- API responses: `res.json({ success: true, data: ... })` or `res.status(code).json({ error: "message" })`

### Frontend (Next.js / React)

- TypeScript strict mode is enabled
- Use Radix UI primitives from `components/ui/`
- Use `apiGet<T>()`, `apiPost<T>()` from `lib/api.ts` for API calls
- Use `sonner` toasts for user feedback (`toast.success()`, `toast.error()`)
- Use `cn()` utility from `lib/utils.ts` for conditional Tailwind classes
- Follow the component organization: `admin/`, `user/`, `shared/`, `ui/`

### Date Format

Always use `DD.MM.YYYY` format (e.g., "24.01.2026") for dates. The database stores dates as text in this format.

## Architecture Overview

See [CLAUDE.md](CLAUDE.md) for detailed architecture documentation, including:

- Directory structure
- Data flow patterns
- Settings management
- Database schema
- Key design decisions

## Need Help?

- Open a [Discussion](https://github.com/jonax1337/Schedule-Bot/discussions) for questions
- Check the [README](README.md) for setup and usage documentation
- Review [CLAUDE.md](CLAUDE.md) for architecture details
