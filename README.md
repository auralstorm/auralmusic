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

未登录的情况下走游客登录模式

3. 游客登录
   说明 : 直接调用此接口, 可获取游客 cookie,如果遇到其他接口未登录状态报 400 状态码需要验证的错误,可使用此接口获取游客 cookie 避免报错

接口地址 : /register/anonimous

播放私人fm时，底部控制栏切歌和私人FM卡片切哥逻辑不一致

MV 播放器全屏按钮失效

播放设置增加歌词翻译开关并完成相应功能

基础设置

语言设置（切换中/英/日）默认中文

主题色自定义
播放器背景（关闭/打开/静态封面/动态封面）

播放设置
播放模式记忆：记住上次的循环 / 随机模式（列表循环 / 单曲循环 / 随机播放）

显示歌词翻译功能
是否开启歌词逐行显示效果

倍速播放：0.5x-2.0x 播放速度调节 使用slider调节

系统设置
开机自启：开机自动启动播放器 ---- 待测试

磁盘缓存开关：将播放过的音乐与歌词缓存到本地磁盘，提升二次播放速度

缓存目录选择：设置默认系统缓存目录，右边可以选择设置缓存目录

缓存上限：默认1GB 右侧增加 slider 组件可以设置缓存大小

清理缓存：会清除所有播放过的音乐与歌词缓存
