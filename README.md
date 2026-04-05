# AuralMusic

## Local workflow

- `pnpm dev` starts the Vite dev server.
- `pnpm build` runs TypeScript build mode and produces a production bundle.
- `pnpm preview` serves the built app locally.
- `pnpm lint` runs ESLint across the project.
- `pnpm format` rewrites files with Prettier.
- `pnpm check` runs `pnpm lint` and `pnpm build`.
- `pnpm commit` opens the Commitizen prompt for conventional commits.
- `pnpm release` runs release-it, updates `CHANGELOG.md`, and creates the version tag.

## Git hooks

- `pre-commit` runs `lint-staged` on staged files, so only changed files are linted or formatted before the commit is created.
- `commit-msg` runs `commitlint` against the commit message, so `pnpm commit` and manual commits must follow the conventional commit format.
