# shadcn/ui + Base UI Setup — Design

Date: 2026-09-19
Status: Approved (pending written-spec review)

## Goal

Enable the shadcn CLI in `client/` using Base UI as the primitive library, so new
shadcn components can be added going forward, without migrating or rewriting the
existing hand-rolled UI primitives or the existing theme.

## Context

- `client/` is Next.js 16.3.2, React 19.2.8, Tailwind CSS v4 (`@tailwindcss/postcss`),
  TypeScript.
- There is currently no `components.json`, and no Radix or Base UI dependency.
- `client/src/components/ui/` contains hand-rolled, shadcn-style primitives:
  `avatar`, `button`, `card`, `dialog`, `empty-state`, `form-error`, `form-field`,
  `input`, `input-otp`, `label`, `screen`, `skeleton`, `spinner`, `sub-page-header`,
  `switch`, `toggle-option`, `user-row`.
- `client/src/lib/utils.ts` already exports `cn` (clsx + tailwind-merge).
- `client/src/app/globals.css` already defines shadcn-style CSS variables in HSL
  triplet form (`--background`, `--foreground`, `--card`, `--popover`, `--primary`,
  `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`,
  `--ring`, `--radius`, plus a project-specific `--link`) for both `:root` and
  `.dark`, mapped through `@theme inline` with `hsl(var(--…))`.
- shadcn/ui added first-class Base UI support; as of July 2026 Base UI is the
  default for new projects. The npm package is `@base-ui/react` (v1.x).
- `components.json` has a `base` field whose value is `radix` or `base`.

## Scope

In scope:

- Create `client/components.json` configured for Base UI, Tailwind v4, RSC, and
  the existing aliases.
- Add the `@base-ui/react` dependency (installed by the CLI when components are
  added).
- Validate the setup by adding one component: `tooltip`.

Out of scope:

- Migrating or replacing existing hand-rolled primitives.
- Changing the existing theme tokens or `globals.css`.
- Using the new component anywhere in the app.
- Any server-side change.

## Approach

Chosen: **CLI `init` then restore theme.**

1. Run `npx shadcn@latest init --base base` inside `client/`.
2. Let it generate `components.json`, install dependencies, and update
   `globals.css`.
3. Inspect `git diff client/src/app/globals.css` and revert that file to its
   current content. The existing tokens already satisfy what shadcn components
   reference, so no theme change is needed. If a future component requires a CSS
   variable that is genuinely missing, add it explicitly and document why rather
   than accepting a wholesale theme rewrite.
4. Validate with `npx shadcn@latest add tooltip`.

Alternatives considered:

- Hand-writing `components.json`: rejected because the schema values (`base`,
  `style`, `registries`) are CLI-version-dependent, and guessing risks a broken
  `add` command.
- Hybrid (init in a throwaway directory, copy config): rejected as unnecessary
  given git makes reverting `globals.css` trivial.

## Configuration detail

`client/components.json` (final values verified against the CLI output, expected
to be):

- `base`: `base`
- `style` / `baseColor`: CLI-generated defaults for Tailwind v4 (expected
  `new-york-v4` / `neutral`, matching the current neutral theme)
- `rsc`: `true`
- `tsx`: `true`
- `tailwind.config`: `""` (Tailwind v4 marker)
- `tailwind.css`: `src/app/globals.css`
- `cssVariables`: `true`
- `iconLibrary`: `lucide-react`
- `aliases`: `components → @/components`, `ui → @/components/ui`,
  `utils → @/lib/utils`, `lib → @/lib`, `hooks → @/hooks`

Dependency: `@base-ui/react` added by the CLI.

## Naming policy

Do not run `shadcn add <name>` for any name that already exists in
`client/src/components/ui/`. Existing names are reserved for the hand-rolled
primitives:

`avatar`, `button`, `card`, `dialog`, `empty-state`, `form-error`, `form-field`,
`input`, `input-otp`, `label`, `screen`, `skeleton`, `spinner`, `sub-page-header`,
`switch`, `toggle-option`, `user-row`.

New shadcn/Base UI components are limited to names not present there, for
example: `tooltip`, `popover`, `dropdown-menu`, `select`, `tabs`, `sheet`,
`command`, `sidebar`, `menubar`.

## Validation

1. `npx shadcn@latest add tooltip` succeeds.
2. `client/src/components/ui/tooltip.tsx` exists and imports from `@base-ui/react`
   (not `@radix-ui` or `radix-ui`).
3. `npx eslint` on the new file reports no errors.
4. `client/components.json` contains `"base": "base"` and correct aliases.
5. `git diff client/src/app/globals.css` is empty after the restore step.

No full `next build` or project-wide `tsc` is part of this task.

## Risks

- `init` may attempt to overwrite `globals.css`; mitigated by the revert step and
  git history.
- `init` may create or modify `lib/utils.ts`; it already exists and is correct, so
  any rewrite should be reviewed and reverted if it changes behavior.
- Future `add` commands for reserved names would overwrite custom files; mitigated
  by the naming policy above.
- The CLI is versioned; exact generated `style`/`baseColor` values may differ from
  the expectation above. The resulting file is verified in validation step 4.
