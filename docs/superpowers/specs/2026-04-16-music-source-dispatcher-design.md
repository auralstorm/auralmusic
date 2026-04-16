# Music Source Dispatcher Design

## Goal

Make music-source configuration become real runtime strategy input instead of display-only settings, while keeping playback and download resolution aligned but independently implemented.

## Scope

- Introduce a shared music-source policy layer that decides resolver order from config, login state, and scene.
- Turn `musicSourceProviders` into the effective builtin-source allowlist and priority list.
- Remove hard-coded resolver order from playback and download resolution.
- Keep local-file playback separate from online source resolution.
- Preserve the current LX music-source runner and official API integration during the first phase.

## Non-Goals

- Do not implement new real resolvers for `migu`, `kugou`, `pyncmd`, or `bilibili` in phase 1.
- Do not replace the current LX script execution model.
- Do not implement custom music API requests in phase 1.
- Do not merge playback logic and download logic into one service.

## Current State

### Runtime Behavior

- Playback in `src/renderer/components/PlaybackControl/PlaybackEngine.tsx` uses:
  1. local `sourceUrl` when present
  2. official `/song/url/v1`
  3. official `/song/url/v1` with `unblock=true` when `musicSourceEnabled=true`
  4. LX music source fallback
- Renderer download resolution in `src/renderer/services/download/download-source-resolver.ts` uses:
  1. official `/song/download/url/v1`
  2. official `/song/url/v1`
  3. official `/song/url/v1` with `unblock=true`
  4. LX music source fallback
- Main-process download fallback in `src/main/download/download-source-resolver.ts` repeats a similar order.

### Configuration Gap

- `musicSourceProviders` is persisted and exposed in settings, but runtime only checks `includes('lxMusic')`.
- `migu`, `kugou`, `pyncmd`, and `bilibili` do not currently affect source selection.
- `customMusicApiEnabled` and `customMusicApiUrl` are configuration-only and are not wired into resolution.

### Resulting Problems

- Playback and download each hard-code their own resolver order.
- Authenticated and unauthenticated behavior cannot be changed from one place.
- Source-selection UI creates expectations that do not match runtime behavior.
- Adding new resolver types would require touching multiple unrelated code paths.

## Design Principles

- Keep source policy centralized and implementation-specific resolver code decentralized.
- Keep playback and download resolution aligned by shared policy, not by sharing one large resolver.
- Make each file own one clear responsibility.
- Preserve existing working integrations where possible and wrap them behind focused provider interfaces.
- Keep phase 1 small: establish the architecture before adding more provider implementations.

## Architecture

### Shared Policy Layer

Add a shared policy layer under `src/shared/music-source`.

- `src/shared/music-source/types.ts`
  Defines shared types for scene, resolver id, builtin platform id, context, and policy output.
- `src/shared/music-source/builtin-platforms.ts`
  Normalizes `musicSourceProviders` into an ordered builtin-platform list.
- `src/shared/music-source/policy.ts`
  Produces runtime resolver order from config, login state, and scene.

This layer contains no HTTP calls, no renderer hooks, and no Electron dependencies.

### Resolver Families

Runtime source resolution is modeled as two layers:

1. Resolver family order
   - `official`
   - `builtinUnblock`
   - `lxMusic`
   - `customApi`
2. Builtin platform order inside `builtinUnblock`
   - `migu`
   - `kugou`
   - `pyncmd`
   - `bilibili`

This matches the intended configuration semantics more closely than treating every checkbox as a top-level resolver family.

### Playback Resolution

Add `src/renderer/services/music-source/playback-source-resolver.ts` as the playback orchestrator.

Responsibilities:

- Accept track + runtime context.
- Read resolver order from shared policy.
- Try playback providers in order until one succeeds.
- Return the first resolved playable URL and metadata about which resolver succeeded.

`PlaybackEngine.tsx` remains responsible for:

- local-file playback using `sourceUrl`
- audio element lifecycle
- playback state transitions
- progress and error reporting

It no longer owns online source-selection policy.

### Download Resolution

Keep `src/renderer/services/download/download-source-resolver.ts` as the renderer download orchestrator.

Responsibilities:

- Keep existing quality fallback behavior.
- For each quality attempt, read resolver order from shared policy.
- Try download providers in order until one succeeds.
- Return the first resolved downloadable source and metadata.

Main-process fallback in `src/main/download/download-source-resolver.ts` must use the same shared policy so renderer and main process do not drift.

## Configuration Semantics

Phase 1 keeps current config keys but changes their meaning at runtime.

- `musicSourceEnabled`
  Master switch for third-party resolution families.
- `musicSourceProviders`
  Ordered builtin platform list for `builtinUnblock`.
- `luoxueSourceEnabled`
  Enables `lxMusic` family participation.
- `customMusicApiEnabled`
  Enables `customApi` family participation.
- `customMusicApiUrl`
  Required for `customApi` to become eligible.

### Runtime Rules

Recommended default policy:

- Authenticated:
  `official -> builtinUnblock -> lxMusic -> customApi`
- Unauthenticated:
  `builtinUnblock -> lxMusic -> customApi -> official`

Changing this rule later should only require editing `src/shared/music-source/policy.ts`.

## Module Responsibilities

### Shared

- `src/shared/music-source/types.ts`
  Shared contracts only.
- `src/shared/music-source/builtin-platforms.ts`
  Provider normalization only.
- `src/shared/music-source/policy.ts`
  Resolver order decision only.

### Renderer Playback

- `src/renderer/services/music-source/playback-source-resolver.ts`
  Playback orchestration only.
- `src/renderer/services/music-source/providers/official-playback-provider.ts`
  Official playback URL resolution only.
- `src/renderer/services/music-source/providers/builtin-unblock-playback-provider.ts`
  Builtin unblock playback resolution only.
- `src/renderer/services/music-source/providers/lx-playback-provider.ts`
  Adapter around current LX resolver only.
- `src/renderer/services/music-source/providers/custom-api-playback-provider.ts`
  Custom API playback resolution only.

### Renderer Download

- `src/renderer/services/download/download-source-resolver.ts`
  Download orchestration only.
- `src/renderer/services/download/providers/official-download-provider.ts`
  Official download URL resolution only.
- `src/renderer/services/download/providers/builtin-unblock-download-provider.ts`
  Builtin unblock download resolution only.
- `src/renderer/services/download/providers/lx-download-provider.ts`
  LX download resolution only.
- `src/renderer/services/download/providers/custom-api-download-provider.ts`
  Custom API download resolution only.

### Main Process

- `src/main/download/download-source-resolver.ts`
  Main-process fallback orchestration aligned to shared policy.

## Phase 1 Implementation

Phase 1 focuses on architecture and runtime alignment, not on adding new external integrations.

### What Phase 1 Delivers

- Shared resolver policy layer.
- Playback path moved onto a dedicated playback resolver orchestrator.
- Download path moved onto shared policy-based ordering.
- `musicSourceProviders` becomes a real input to `builtinUnblock`.
- Logged-in and logged-out resolver precedence becomes centrally configurable.

### What Phase 1 Does Not Deliver

- Real standalone implementations for `migu`, `kugou`, `pyncmd`, or `bilibili`.
- Real custom API resolver execution.
- LX internal source-selection changes.

### Phase 1 Provider Behavior

- `official`
  Continues to use current official endpoints.
- `builtinUnblock`
  Phase 1 may still map to the current official `unblock=true` behavior, but now receives ordered builtin platform metadata so future expansion does not require a new policy refactor.
- `lxMusic`
  Wraps the existing LX resolver.
- `customApi`
  May return `null` in phase 1 as an intentional placeholder family.

## Data Flow

### Playback

1. `PlaybackEngine` receives a track.
2. If `track.sourceUrl` exists, play local media directly.
3. Otherwise build `ResolveContext`.
4. `playback-source-resolver` loads `ResolverPolicy`.
5. Playback providers are attempted in policy order.
6. First successful provider returns a playable URL.
7. `PlaybackEngine` loads the URL into the audio element.

### Download

1. Download entry code builds runtime context.
2. Download resolver loads `ResolverPolicy`.
3. For each requested quality candidate, providers are attempted in policy order.
4. First successful provider returns URL, resolver id, and effective quality.
5. Download task is enqueued with resolved source metadata.
6. Main-process fallback uses the same shared policy if renderer-side resolution is absent or fails.

## Error Handling

- Unknown or unsupported values in `musicSourceProviders` are ignored.
- Duplicate builtin providers are removed while preserving order.
- If all third-party families are disabled or unavailable, policy returns `official`.
- If a provider throws, the orchestrator records failure and continues to the next eligible provider.
- Local-file playback never falls into online resolver policy.

## Testing Strategy

### Shared Policy Tests

- Unauthenticated policy order with all third-party families enabled.
- Authenticated policy order with all third-party families enabled.
- `musicSourceEnabled=false` falls back to `official` only.
- Builtin provider normalization filters invalid entries, removes duplicates, and preserves order.

### Playback Tests

- Unauthenticated playback tries non-official resolvers before official.
- Authenticated playback keeps official first.
- Local `sourceUrl` bypasses online resolution.
- Resolver fallback stops after first success.

### Download Tests

- Download resolver uses policy order for each quality attempt.
- Quality fallback remains intact after policy extraction.
- Provider failure continues to the next provider.
- Renderer and main fallback consume the same resolver-order rule.

## Risks

- Phase 1 introduces new structural files without delivering new external providers immediately, so value is architectural first and user-visible second.
- If main-process fallback is not aligned with the shared policy, runtime behavior will remain inconsistent.
- If `builtinUnblock` remains only a wrapper over current `unblock=true`, the UI will still over-promise individual builtin platform behavior until phase 2 lands.

## Future Work

- Implement real builtin platform resolvers behind `builtinUnblock`.
- Add real custom API provider implementation.
- Expose resolver family priority as a first-class config field if users need manual family ordering.
- Decide whether LX internal source preference should eventually map to user configuration as well.
