# AuralMusic

AuralMusic is an Electron desktop app built with Vite, React, TypeScript, and Tailwind CSS. It uses Netease Cloud Music APIs to render charts and playlists, with a modern component-driven architecture and a strong focus on developer workflow.

## 🚀 Features

- Electron + Vite for fast desktop development
- React 19 + TypeScript
- Tailwind CSS + shadcn/ui style utilities
- Conventional commits with Commitizen and Commitlint
- Git hooks via Husky and lint-staged
- Cross-platform packaging support via electron-builder

## 🧰 Tech Stack

- `electron-vite` for Electron + Vite integration
- `react` / `react-dom`
- `typescript`
- `tailwindcss` / `@tailwindcss/vite`
- `eslint` / `prettier`
- `axios` for request handling
- `electron-builder` for native builds
- `commitizen` + `cz-git` + `commitlint`
- `release-it` for changelog and release automation

## 📦 Getting Started

```bash
pnpm install
pnpm dev
```

Then open the app from the running Electron process.

## 🧪 Common Scripts

| Command            | Description                                            |
| ------------------ | ------------------------------------------------------ |
| `pnpm dev`         | Run Electron + Vite in development mode                |
| `pnpm dev:web`     | Run Vite web-only development server                   |
| `pnpm build`       | Compile TypeScript and build the Electron app          |
| `pnpm build:win`   | Build Windows installer                                |
| `pnpm build:mac`   | Build macOS app                                        |
| `pnpm build:linux` | Build Linux app                                        |
| `pnpm preview`     | Preview the production build locally                   |
| `pnpm lint`        | Run ESLint across the repository                       |
| `pnpm lint:fix`    | Fix lint issues automatically                          |
| `pnpm format`      | Format code with Prettier                              |
| `pnpm check`       | Run lint and build checks                              |
| `pnpm commit`      | Create a conventional commit using Commitizen          |
| `pnpm release`     | Run `release-it` to generate changelog and tag release |

## 📁 Project Structure

```text
src/
  main/             # Electron main process code
  preload/          # Preload scripts exposed to renderer
  renderer/         # React renderer app
    api/            # API service layer
    app/            # UI application shell and layout
    components/     # Shared UI components and feature blocks
    layout/         # Page and layout wrappers
    pages/          # Route pages and feature pages
    router/         # React Router configuration
    styles/         # Global styles and Tailwind entry
```

### Key directories

- `src/main/` — Electron entry and native window logic
- `src/preload/` — Secure bridge between Electron and renderer
- `src/renderer/main.tsx` — React app bootstrap
- `src/renderer/pages/Charts/` — Charts page and ranking components
- `src/renderer/components/ui/` — reusable UI helpers and primitives

## 🧩 Engineering Conventions

### Coding style

- Use TypeScript for all React components and services
- Prefer `const` / `let` over `var`
- Keep component props typed with interfaces or type aliases
- Keep JSX clean by extracting reusable fragments into small components
- Favor `useEffect` + `async/await` for data fetching

### Formatting & linting

- Run `pnpm format` before commits
- Run `pnpm lint` to catch issues early
- `lint-staged` and Husky are configured to format and lint changed files automatically

### Commit workflow

- Use `pnpm commit` to create commits following Conventional Commits
- Commit message format should be:
  - `feat: ...`
  - `fix: ...`
  - `chore: ...`
  - `docs: ...`
  - `refactor: ...`

### Branching / Pull Requests

- Use feature branches named like `feat/<name>` or `fix/<name>`
- Keep PRs small and focused on a single feature or bug fix
- Include a short description and testing notes in PR description

## 🧪 Development Notes

### UI and component styling

- Tailwind classes are used throughout the renderer UI
- Shared UI primitives live under `src/renderer/components/ui`
- Page-specific components are organized inside `src/renderer/pages`

### API layer

- Requests are centralized in `src/renderer/api`
- Keep API calls thin and return typed responses where possible
- Avoid leaking UI concerns into service functions

### Electron considerations

- Keep main process code isolated in `src/main`
- Use preload scripts for safe renderer access if needed
- Avoid importing React or renderer-only modules in main/preload files

## 🚧 Packaging

To build the production Electron app:

```bash
pnpm build
```

To build platform-specific installers:

```bash
pnpm build:win
pnpm build:mac
pnpm build:linux
```

## ✅ Recommended Workflow

1. `pnpm install`
2. `pnpm dev`
3. Work on one feature or fix at a time
4. `pnpm lint` and `pnpm format`
5. `pnpm commit`

## 📌 Notes

- This repo uses `pnpm` as the package manager
- The project is private by default (`private: true`)
- `electron-builder` handles native app packaging

---

If you want, I can also add a short `CONTRIBUTING.md` for team collaboration rules.

## Playback / Download Source Resolution

### Runtime rules

- Local file playback always uses `sourceUrl` directly and does not enter online resolver dispatch.
- If `musicSourceEnabled = false`, online playback and download only use the `official` family.
- If `musicSourceEnabled = true`, resolver order is decided by login state:
  - Authenticated: `official -> builtinUnblock -> lxMusic -> customApi`
  - Unauthenticated: `builtinUnblock -> lxMusic -> customApi -> official`
- `builtinUnblock` is the enhanced API auto-unlock family. It participates whenever `musicSourceEnabled = true`.
- `lxMusic` only participates when `luoxueSourceEnabled = true`.
- `customApi` only enters the order when `customMusicApiEnabled = true` and `customMusicApiUrl` is non-empty.
- `musicSourceProviders` is now a deprecated compatibility field. It no longer controls resolver behavior and is cleared when source settings are saved.

### Playback / Download Comparison

| Scene           | Login           | `musicSourceEnabled` | `luoxueSourceEnabled` | `customApi` enabled + URL | Resolver family order                                | Actual family behavior                                                                |
| --------------- | --------------- | -------------------- | --------------------- | ------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Local playback  | Any             | Any                  | Any                   | Any                       | No resolver dispatch                                 | `sourceUrl` direct playback                                                           |
| Online playback | Any             | `false`              | Any                   | Any                       | `official`                                           | `/song/url/v1?unblock=false`                                                          |
| Online playback | Authenticated   | `true`               | `false`               | Off / empty               | `official -> builtinUnblock`                         | `official: /song/url/v1?unblock=false`; `builtinUnblock: /song/url/v1?unblock=true`   |
| Online playback | Authenticated   | `true`               | `true`                | Off / empty               | `official -> builtinUnblock -> lxMusic`              | `lxMusic` uses the active LX script                                                   |
| Online playback | Authenticated   | `true`               | `false`               | On + non-empty            | `official -> builtinUnblock -> customApi`            | `customApi` currently returns `null`                                                  |
| Online playback | Authenticated   | `true`               | `true`                | On + non-empty            | `official -> builtinUnblock -> lxMusic -> customApi` | Same as above                                                                         |
| Online playback | Unauthenticated | `true`               | `false`               | Off / empty               | `builtinUnblock -> official`                         | `builtinUnblock` runs before official                                                 |
| Online playback | Unauthenticated | `true`               | `true`                | Off / empty               | `builtinUnblock -> lxMusic -> official`              | Same as above                                                                         |
| Online playback | Unauthenticated | `true`               | `false`               | On + non-empty            | `builtinUnblock -> customApi -> official`            | `customApi` currently returns `null`                                                  |
| Online playback | Unauthenticated | `true`               | `true`                | On + non-empty            | `builtinUnblock -> lxMusic -> customApi -> official` | Same as above                                                                         |
| Online download | Any             | `false`              | Any                   | Any                       | `official`                                           | `/song/download/url/v1`, then `/song/url/v1?unblock=false`                            |
| Online download | Authenticated   | `true`               | `false`               | Off / empty               | `official -> builtinUnblock`                         | `official: download url -> playback url(false)`; `builtinUnblock: playback url(true)` |
| Online download | Authenticated   | `true`               | `true`                | Off / empty               | `official -> builtinUnblock -> lxMusic`              | `lxMusic` uses LX resolution                                                          |
| Online download | Authenticated   | `true`               | `false`               | On + non-empty            | `official -> builtinUnblock -> customApi`            | `customApi` currently returns `null`                                                  |
| Online download | Authenticated   | `true`               | `true`                | On + non-empty            | `official -> builtinUnblock -> lxMusic -> customApi` | Same as above                                                                         |
| Online download | Unauthenticated | `true`               | `false`               | Off / empty               | `builtinUnblock -> official`                         | `builtinUnblock` runs before official family                                          |
| Online download | Unauthenticated | `true`               | `true`                | Off / empty               | `builtinUnblock -> lxMusic -> official`              | Same as above                                                                         |
| Online download | Unauthenticated | `true`               | `false`               | On + non-empty            | `builtinUnblock -> customApi -> official`            | `customApi` currently returns `null`                                                  |
| Online download | Unauthenticated | `true`               | `true`                | On + non-empty            | `builtinUnblock -> lxMusic -> customApi -> official` | Same as above                                                                         |

### Current source meanings

- `official`
  - Playback: `/song/url/v1?unblock=false`
  - Download: `/song/download/url/v1`, then `/song/url/v1?unblock=false`
- `builtinUnblock`
  - Playback and download both use `/song/url/v1?unblock=true`
  - This family is backed by the enhanced API auto-unlock flow rather than per-provider selection
- `lxMusic`
  - Separate resolver family
  - Internal source selection is still handled by the LX script runtime
- `customApi`
  - Participates in ordering when enabled
  - Current phase-1 implementation always returns `null`

接口地址 : /register/anonimous

播放私人fm时，底部控制栏切歌和私人FM卡片切哥逻辑不一致

MV 播放器全屏按钮失效

基础设置

语言设置（切换中/英/日）默认中文

系统设置
开机自启：开机自动启动播放器 ---- 待测试

bug: 歌曲播放到结尾，播放器整体会上移动

F:\code-demo\AuralMusic\aural-music-downloads.json
F:\code-demo\AuralMusic\aural-music-config.json
F:\code-demo\AuralMusic\aural-music-auth.json
当前系统中，这三块信息存储的方式还是项目中的json文件，梳理使用better-sqlite3 + zustand 方案
