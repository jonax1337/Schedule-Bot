# Badges Reference

## URL Format

All badges use shields.io. Base URL: `https://img.shields.io/badge/`

### Static Tech Badges (for-the-badge style)

Format: `<img src="https://img.shields.io/badge/LABEL-COLOR?style=for-the-badge&logo=LOGO_SLUG&logoColor=white" alt="LABEL" />`

- Logo slugs from [Simple Icons](https://simpleicons.org/) (lowercase, hyphens for spaces)
- Use the brand's official hex color (without `#`)

### Dynamic Badges

Format: `![Alt](https://img.shields.io/PROVIDER/METRIC/PARAMS?style=for-the-badge)`

## Badge Categories & Examples

### Project Status Badges

```html
<!-- License -->
<img src="https://img.shields.io/github/license/USER/REPO?style=for-the-badge" alt="License" />

<!-- Version / Release -->
<img src="https://img.shields.io/github/v/release/USER/REPO?style=for-the-badge" alt="Release" />

<!-- Build Status (GitHub Actions) -->
<img src="https://img.shields.io/github/actions/workflow/status/USER/REPO/WORKFLOW.yml?style=for-the-badge" alt="Build Status" />

<!-- Last Commit -->
<img src="https://img.shields.io/github/last-commit/USER/REPO?style=for-the-badge" alt="Last Commit" />

<!-- Open Issues -->
<img src="https://img.shields.io/github/issues/USER/REPO?style=for-the-badge" alt="Issues" />

<!-- Stars -->
<img src="https://img.shields.io/github/stars/USER/REPO?style=for-the-badge" alt="Stars" />

<!-- Contributors -->
<img src="https://img.shields.io/github/contributors/USER/REPO?style=for-the-badge" alt="Contributors" />
```

### Package Manager Badges

```html
<!-- npm version -->
<img src="https://img.shields.io/npm/v/PACKAGE?style=for-the-badge&logo=npm&logoColor=white" alt="npm" />

<!-- npm downloads -->
<img src="https://img.shields.io/npm/dm/PACKAGE?style=for-the-badge&logo=npm&logoColor=white" alt="Downloads" />

<!-- PyPI -->
<img src="https://img.shields.io/pypi/v/PACKAGE?style=for-the-badge&logo=pypi&logoColor=white" alt="PyPI" />

<!-- crates.io -->
<img src="https://img.shields.io/crates/v/PACKAGE?style=for-the-badge&logo=rust&logoColor=white" alt="Crates.io" />
```

### Code Quality Badges

```html
<!-- Code Coverage (Codecov) -->
<img src="https://img.shields.io/codecov/c/github/USER/REPO?style=for-the-badge&logo=codecov&logoColor=white" alt="Coverage" />

<!-- Code Coverage (Coveralls) -->
<img src="https://img.shields.io/coveralls/github/USER/REPO?style=for-the-badge" alt="Coverage" />
```

### Common Tech Stack Badges

Use brand colors from Simple Icons. Common examples:

```html
<!-- Languages -->
<img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
<img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript" />
<img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
<img src="https://img.shields.io/badge/Rust-000000?style=for-the-badge&logo=rust&logoColor=white" alt="Rust" />
<img src="https://img.shields.io/badge/Go-00ADD8?style=for-the-badge&logo=go&logoColor=white" alt="Go" />
<img src="https://img.shields.io/badge/Java-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white" alt="Java" />
<img src="https://img.shields.io/badge/C%23-239120?style=for-the-badge&logo=csharp&logoColor=white" alt="C#" />
<img src="https://img.shields.io/badge/PHP-777BB4?style=for-the-badge&logo=php&logoColor=white" alt="PHP" />
<img src="https://img.shields.io/badge/Swift-FA7343?style=for-the-badge&logo=swift&logoColor=white" alt="Swift" />
<img src="https://img.shields.io/badge/Kotlin-7F52FF?style=for-the-badge&logo=kotlin&logoColor=white" alt="Kotlin" />
<img src="https://img.shields.io/badge/Dart-0175C2?style=for-the-badge&logo=dart&logoColor=white" alt="Dart" />

<!-- Frontend Frameworks -->
<img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
<img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
<img src="https://img.shields.io/badge/Vue.js-4FC08D?style=for-the-badge&logo=vuedotjs&logoColor=white" alt="Vue.js" />
<img src="https://img.shields.io/badge/Nuxt.js-00DC82?style=for-the-badge&logo=nuxtdotjs&logoColor=white" alt="Nuxt.js" />
<img src="https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white" alt="Angular" />
<img src="https://img.shields.io/badge/Svelte-FF3E00?style=for-the-badge&logo=svelte&logoColor=white" alt="Svelte" />
<img src="https://img.shields.io/badge/Astro-BC52EE?style=for-the-badge&logo=astro&logoColor=white" alt="Astro" />

<!-- Backend / Runtime -->
<img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
<img src="https://img.shields.io/badge/Deno-000000?style=for-the-badge&logo=deno&logoColor=white" alt="Deno" />
<img src="https://img.shields.io/badge/Bun-000000?style=for-the-badge&logo=bun&logoColor=white" alt="Bun" />
<img src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
<img src="https://img.shields.io/badge/FastAPI-009485?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
<img src="https://img.shields.io/badge/Django-092E20?style=for-the-badge&logo=django&logoColor=white" alt="Django" />
<img src="https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white" alt="Flask" />
<img src="https://img.shields.io/badge/Spring Boot-6DB33F?style=for-the-badge&logo=springboot&logoColor=white" alt="Spring Boot" />
<img src="https://img.shields.io/badge/Laravel-FF2D20?style=for-the-badge&logo=laravel&logoColor=white" alt="Laravel" />

<!-- Mobile -->
<img src="https://img.shields.io/badge/React Native-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React Native" />
<img src="https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white" alt="Expo" />
<img src="https://img.shields.io/badge/Flutter-02569B?style=for-the-badge&logo=flutter&logoColor=white" alt="Flutter" />

<!-- Styling -->
<img src="https://img.shields.io/badge/Tailwind CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
<img src="https://img.shields.io/badge/Sass-CC6699?style=for-the-badge&logo=sass&logoColor=white" alt="Sass" />

<!-- Databases -->
<img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
<img src="https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
<img src="https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white" alt="MySQL" />
<img src="https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis" />
<img src="https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite" />
<img src="https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
<img src="https://img.shields.io/badge/Firebase-DD2C00?style=for-the-badge&logo=firebase&logoColor=white" alt="Firebase" />

<!-- Cloud & DevOps -->
<img src="https://img.shields.io/badge/AWS-232F3E?style=for-the-badge&logo=amazonwebservices&logoColor=white" alt="AWS" />
<img src="https://img.shields.io/badge/Google Cloud-4285F4?style=for-the-badge&logo=googlecloud&logoColor=white" alt="Google Cloud" />
<img src="https://img.shields.io/badge/Azure-0078D4?style=for-the-badge&logo=microsoftazure&logoColor=white" alt="Azure" />
<img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
<img src="https://img.shields.io/badge/Kubernetes-326CE5?style=for-the-badge&logo=kubernetes&logoColor=white" alt="Kubernetes" />
<img src="https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel" />
<img src="https://img.shields.io/badge/Netlify-00C7B7?style=for-the-badge&logo=netlify&logoColor=white" alt="Netlify" />
<img src="https://img.shields.io/badge/Cloudflare-F38020?style=for-the-badge&logo=cloudflare&logoColor=white" alt="Cloudflare" />
<img src="https://img.shields.io/badge/Railway-0B0D0E?style=for-the-badge&logo=railway&logoColor=white" alt="Railway" />

<!-- AI / ML -->
<img src="https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white" alt="OpenAI" />
<img src="https://img.shields.io/badge/Claude-D97757?style=for-the-badge&logo=claude&logoColor=white" alt="Claude" />
<img src="https://img.shields.io/badge/TensorFlow-FF6F00?style=for-the-badge&logo=tensorflow&logoColor=white" alt="TensorFlow" />
<img src="https://img.shields.io/badge/PyTorch-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white" alt="PyTorch" />

<!-- Tools -->
<img src="https://img.shields.io/badge/Git-F05032?style=for-the-badge&logo=git&logoColor=white" alt="Git" />
<img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub" />
<img src="https://img.shields.io/badge/GitHub Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white" alt="GitHub Actions" />
<img src="https://img.shields.io/badge/VS Code-007ACC?style=for-the-badge&logo=visualstudiocode&logoColor=white" alt="VS Code" />
<img src="https://img.shields.io/badge/ESLint-4B32C3?style=for-the-badge&logo=eslint&logoColor=white" alt="ESLint" />
<img src="https://img.shields.io/badge/Prettier-F7B93E?style=for-the-badge&logo=prettier&logoColor=black" alt="Prettier" />
```

### Custom Badge Construction

For technologies not listed above, construct badges using:

1. Visit [simpleicons.org](https://simpleicons.org) to find the logo slug and brand color
2. Use format: `https://img.shields.io/badge/NAME-HEXCOLOR?style=for-the-badge&logo=SLUG&logoColor=white`
3. Use `logoColor=black` when badge background is light (e.g. JavaScript yellow)

### Badge Styles

- `for-the-badge` — Large, bold (preferred for tech stack sections)
- `flat` — Standard flat (good for status badges at the top)
- `flat-square` — Compact flat
- `plastic` — Glossy 3D look

Prefer `for-the-badge` for tech stack badges and `flat` or `flat-square` for dynamic/status badges. Keep style consistent within each badge group.