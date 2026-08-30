# Contributing

Thanks for considering a contribution! This is a small project, so the process is intentionally lightweight.

## Getting started

1. Fork the repository and clone your fork.
2. Install dependencies: `npm install`.
3. Copy `.dev.vars.example` to `.dev.vars` and fill in test credentials.
4. Run the bot locally: `npm run dev` (see the README's "Local development" section).
5. Run the test suite: `npm test`.

## Before opening a pull request

- Run `npm run format` to apply Prettier formatting.
- Run `npm test` and make sure every test passes.
- Keep pull requests focused — one logical change per PR is easier to review.
- Update `README.md` if you change setup steps, environment variables, or user-facing behavior.
- Describe **what** changed and **why** in the PR description; link any related issue.

## Reporting bugs / requesting features

Please open a GitHub issue with:

- What you expected to happen vs. what actually happened.
- Steps to reproduce (for bugs).
- Relevant logs from `wrangler tail`, with any tokens/secrets redacted.

## Code style

- Plain, modern JavaScript (ES modules) — no build step, no TypeScript, no framework.
- Keep modules focused: `telegram.js` only talks to the Bot API, `scraper.js` only talks to the companion search API, `handlers.js` contains the bot's decision logic, and so on.
- User-facing text lives in `src/messages.js`, not scattered inline.

By contributing, you agree that your contributions will be licensed under this project's [MIT License](LICENSE).
