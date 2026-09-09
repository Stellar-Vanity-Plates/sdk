import { showroomThemes } from "@reference/src/browser/design-system/clubhouse-themes.ts";

export function clubhouseComponentStyles(source: string): string {
  const keyframes: string[] = [];
  const rules = source.replaceAll(
    /@keyframes\s+[\w-]+\s*\{(?:[^{}]|\{[^{}]*\})*\}/g,
    (definition) => {
      keyframes.push(definition);
      return "";
    },
  ).replaceAll(/:root\b/g, "&");
  return `${keyframes.join("\n")}\nhtml[data-clubhouse-theme] {\n${rules}\n}\n`;
}

export function clubhouseThemeStyles(): string {
  return showroomThemes.map(({ id, tokens }) => {
    const palette = {
      ...tokens,
      "--ds-canvas": tokens["--paper"],
      "--ds-surface": tokens["--surface"],
      "--ds-surface-raised": tokens["--surface"],
      "--ds-surface-wash": tokens["--green-wash"],
      "--ds-ink": tokens["--ink"],
      "--ds-muted": tokens["--muted"],
      "--ds-faint": tokens["--muted"],
      "--ds-primary": tokens["--green"],
      "--ds-primary-hover": tokens["--green-hover"],
      "--ds-primary-contrast": tokens["--on-accent"],
      "--ds-accent": tokens["--green"],
      "--ds-accent-soft": tokens["--green-wash"],
      "--ds-success": tokens["--success"],
      "--ds-danger": tokens["--danger"],
      "--ds-warning": tokens["--amber"],
      "--ds-metal": tokens["--brass"],
      "--ds-border": tokens["--line"],
      "--ds-border-strong": tokens["--silver"],
      "--ds-focus": tokens["--green"],
      "--ds-font-sans": tokens["--font"],
      "--ds-font-display": tokens["--heading-font"],
      "--ds-font-control": tokens["--font"],
      "--ds-radius-control": tokens["--radius-sm"],
      "--ds-radius-panel": tokens["--radius"],
      "--ds-shadow-sm": "none",
      "--ds-shadow-md": "none",
      "--ds-shadow-float": "0 24px 70px #10201a24",
      "--ds-control-height": "2.75rem",
      "--ds-canvas-texture": "none",
      "--ds-density": "1",
      "--ds-border-width": tokens["--panel-border"],
    };
    return `:root[data-clubhouse-theme="${id}"]{${
      Object.entries(palette).map(([key, value]) => `${key}:${value};`).join("")
    }color-scheme:${tokens["--scheme"]};}`;
  }).join("\n");
}
