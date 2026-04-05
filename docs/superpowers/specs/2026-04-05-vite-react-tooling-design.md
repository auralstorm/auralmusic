# Vite React Tooling Design

## Background

The project will be initialized from scratch as a front-end engineering baseline for a music client application.

The user requires the following stack and workflows:

- `Vite`
- `React`
- `TypeScript`
- `ESLint`
- `Prettier`
- `Husky`
- `lint-staged`
- `commitlint`
- `cz`
- `release-it`
- Automatic code linting and formatting during Git commits
- Commit message validation based on Conventional Commits
- Automated release flow with generated `CHANGELOG.md`

The current workspace is effectively empty and is not yet a Git repository, so this document defines the target setup before implementation begins.

## Goals

- Initialize a `Vite + React + TypeScript` project using `pnpm`
- Establish clear and isolated configuration boundaries for formatting, linting, commit validation, and release automation
- Ensure Git commit flow automatically formats and validates staged files
- Ensure commit messages are generated and validated using a single Conventional Commits standard
- Provide a release workflow that can increment versions and generate `CHANGELOG.md`
- Keep the initial setup maintainable and easy to extend

## Non-Goals

- No test framework is included in this phase
- No CI pipeline is included in this phase
- No backend, API, or music business modules are included in this phase
- No GitHub Release integration is required in the first version unless later requested

## Chosen Approach

The project will use an engineering-oriented single-app structure with independent config files instead of packing all tooling into `package.json`.

This is preferred over a minimal setup because the requested toolchain spans formatting, linting, Git hooks, commit authoring, and release automation. Keeping each concern in a dedicated configuration file reduces coupling and avoids future refactor churn.

## Project Structure

The initial project structure will follow this layout:

```text
.
|-- .husky/
|   |-- pre-commit
|   `-- commit-msg
|-- docs/
|   `-- superpowers/
|       `-- specs/
|-- src/
|   |-- app/
|   |-- assets/
|   |-- components/
|   |-- features/
|   |-- lib/
|   |-- pages/
|   `-- styles/
|-- .czrc
|-- .gitignore
|-- .lintstagedrc.json
|-- .prettierignore
|-- .prettierrc.json
|-- .release-it.json
|-- commitlint.config.js
|-- eslint.config.js
|-- package.json
|-- tsconfig.app.json
|-- tsconfig.json
|-- tsconfig.node.json
|-- vite.config.ts
`-- CHANGELOG.md
```

## Responsibility Boundaries

### Application Code

- `src/app`: application bootstrapping, providers, global composition
- `src/pages`: route-level containers
- `src/features`: business-level functional modules
- `src/components`: reusable presentation components
- `src/lib`: shared helpers, utilities, and wrappers
- `src/styles`: global styling and style primitives
- `src/assets`: static assets

This split is intentional. Shared UI and shared logic are separated from page-level and feature-level concerns to preserve high cohesion and reuse.

### Tooling Configuration

- `eslint.config.js`: code quality rules only
- `.prettierrc.json`: formatting rules only
- `.lintstagedrc.json`: staged-file command routing only
- `commitlint.config.js`: commit message schema only
- `.czrc`: interactive commit authoring behavior only
- `.release-it.json`: release and changelog behavior only
- `.husky/*`: hook entrypoints only

Each config file owns one tool and one responsibility. No cross-tool rules should be duplicated unless integration requires it.

## Tooling Decisions

### Package Manager

The project will use `pnpm`.

### Framework Baseline

The project will be initialized from the `Vite + React + TypeScript` template.

### ESLint

ESLint will use the modern flat-config approach. It will enforce code quality and consistency but will not absorb Prettier formatting responsibilities.

### Prettier

Prettier will be configured separately and used as the single source of truth for formatting. This keeps formatting deterministic and avoids rule conflicts with ESLint.

### Husky and lint-staged

`husky` will manage Git hooks.

`lint-staged` will run during `pre-commit` and only process staged files. It will:

- run `eslint --fix`
- run `prettier --write`

This ensures commit-time validation stays fast and focused on changed files.

### commitlint and cz

`commitlint` will validate commit messages against the Conventional Commits specification.

`cz` will provide an interactive commit entry flow via `pnpm commit`, ensuring users can generate valid commit messages instead of composing them manually every time.

Both tools will share the same commit message standard so authoring and validation remain aligned.

### release-it

`release-it` will be configured for local Git-based release automation:

- bump version
- create or update `CHANGELOG.md`
- create Git tag

The first version will not assume GitHub release publishing. That can be added later if needed.

## Git Hook Flow

The Git workflow will be:

1. Developer runs `git commit`
2. `.husky/pre-commit` triggers
3. `lint-staged` runs against staged files
4. Staged files are auto-fixed and formatted where possible
5. Git proceeds to commit message validation
6. `.husky/commit-msg` triggers
7. `commitlint` validates the commit message

For interactive message generation, the developer can run:

```bash
pnpm commit
```

## Script Design

The project will expose these scripts:

- `dev`: start Vite dev server
- `build`: run TypeScript build and Vite build
- `preview`: preview build output
- `lint`: run ESLint on the codebase
- `format`: run Prettier on the codebase
- `check`: run full project verification, at minimum `lint` and `build`
- `prepare`: install Husky hooks
- `commit`: run `cz`
- `release`: run `release-it`

## Verification Strategy

Implementation will be considered valid only if all of the following are verified after setup:

- `pnpm lint` passes
- `pnpm build` passes
- `git commit` triggers staged-file formatting and linting
- invalid commit messages are blocked by `commitlint`
- `pnpm commit` launches the commit helper successfully
- release flow can at least complete a local dry-run or equivalent non-destructive verification

## Performance and DX Constraints

- Type checking will not run inside `lint-staged`
- Prettier and ESLint must remain decoupled by responsibility
- Hook execution should stay fast enough for normal local development
- Config should remain readable without hiding behavior inside large script chains

## Risks

### Git Not Yet Initialized

The current workspace is not a Git repository, so hook behavior cannot be verified until initialization is completed during implementation.

### release-it Depends on Git State

Release automation depends on a valid Git repository and commit history. Initial setup should therefore create a clean baseline before release verification is attempted.

### Tool Version Compatibility

The implementation should use compatible current versions of `Vite`, `React`, `TypeScript`, and the commit/release tooling. Any incompatibility should be resolved in favor of stable integration over novelty.

## Implementation Scope

This setup phase will include:

- project initialization
- dependency installation
- config file creation
- hook creation
- baseline source structure cleanup
- verification command execution

This phase will not include business feature development.

## Acceptance Criteria

The design is accepted when the implementation produces a project that:

- boots with `pnpm dev`
- builds with `pnpm build`
- lints with `pnpm lint`
- formats with `pnpm format`
- enforces staged-file checks on commit
- enforces commit message rules
- supports interactive commit generation
- supports changelog-oriented release automation
