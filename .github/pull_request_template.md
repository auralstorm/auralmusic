## Summary

<!-- Briefly describe what changed and why. -->

## Change Type

- [ ] feat
- [ ] fix
- [ ] refactor
- [ ] perf
- [ ] docs
- [ ] ci
- [ ] chore

## Scope

<!-- List main modules/files affected. -->

-

## Validation

<!-- Paste key command outputs or screenshots if relevant. -->

- [ ] `pnpm lint`
- [ ] `pnpm build`
- [ ] Manual verification completed

## Risk & Rollback

<!-- Explain possible regression risk and rollback plan. -->

- Risk:
- Rollback:

## Reviewer Checklist

- [ ] Changes match PR title and description
- [ ] No debug code / temporary logs left
- [ ] Architecture is clear (single responsibility, low coupling)
- [ ] UI and business logic are separated where needed
- [ ] Performance-sensitive paths reviewed (playback/progress/image loading)
- [ ] No breaking config change without explicit note

## Release Impact

- [ ] No release impact
- [ ] Requires release note entry
- [ ] Affects packaging / CI workflow
- [ ] Requires `pnpm run release` after merge
