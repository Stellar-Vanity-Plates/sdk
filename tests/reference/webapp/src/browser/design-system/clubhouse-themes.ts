export const SHOWROOM_THEME_KEY = "vanity-club-showroom-theme-v1";
export const DEFAULT_THEME = "clubhouse";

const clubhouse = {
  "--paper": "#f5f4ed",
  "--surface": "#fcfbf6",
  "--green": "#173f35",
  "--green-hover": "#245345",
  "--green-wash": "#e8ede4",
  "--ink": "#202925",
  "--muted": "#5f685d",
  "--brass": "#b4a57a",
  "--silver": "#cdd2c8",
  "--line": "#dcded3",
  "--warm": "#eae7dd",
  "--amber": "#8c611f",
  "--danger": "#ae4335",
  "--success": "#397153",
  "--on-accent": "#fcfbf6",
  "--inverse-surface": "#173f35",
  "--inverse-ink": "#eff2e7",
  "--font": '"Instrument Sans", sans-serif',
  "--heading-font": '"Barlow Semi Condensed", "Instrument Sans", sans-serif',
  "--serif": '"Yellowtail", "Instrument Serif", cursive',
  "--mono": '"DM Mono", monospace',
  "--heading-weight": "600",
  "--heading-tracking": "-0.02em",
  "--radius-sm": "4px",
  "--radius": "8px",
  "--radius-lg": "12px",
  "--panel-border": "1px",
  "--panel-shadow": "none",
  "--scheme": "light",
};

export const showroomThemes = [
  {
    id: DEFAULT_THEME,
    name: "Clubhouse",
    description: "Racing green, warm enamel, quiet brass.",
    detail: "Enamel finishes · coachwork lettering",
    tokens: clubhouse,
  },
  {
    id: "paddock",
    name: "Paddock",
    description: "Race-day red with a crisp technical edge.",
    detail: "Square edges · condensed headings",
    tokens: {
      ...clubhouse,
      "--paper": "#f3f1eb",
      "--surface": "#fdfcf8",
      "--green": "#a53228",
      "--green-hover": "#84271f",
      "--green-wash": "#f2e4de",
      "--ink": "#272726",
      "--muted": "#68655f",
      "--brass": "#b69a73",
      "--silver": "#c9c7c0",
      "--line": "#c6c3b9",
      "--warm": "#e8e5dc",
      "--inverse-surface": "#a53228",
      "--inverse-ink": "#fdfcf8",
      "--heading-font": '"Barlow Condensed", "Instrument Sans", sans-serif',
      "--serif": '"Barlow Condensed", "Instrument Sans", sans-serif',
      "--heading-weight": "600",
      "--heading-tracking": "0em",
      "--radius-sm": "2px",
      "--radius": "2px",
      "--radius-lg": "3px",
      "--panel-border": "1.5px",
      "--panel-shadow": "3px 3px 0 #dcd8ce",
    },
  },
  {
    id: "riviera",
    name: "Riviera",
    description: "Coastal blue and the ease of a grand tour.",
    detail: "Rounded surfaces · literary serif",
    tokens: {
      ...clubhouse,
      "--paper": "#f0f4f3",
      "--surface": "#fbfcf9",
      "--green": "#245675",
      "--green-hover": "#1b435d",
      "--green-wash": "#e0ebef",
      "--ink": "#24353d",
      "--muted": "#586973",
      "--brass": "#bb9d70",
      "--silver": "#c8d6d9",
      "--line": "#d1dfe1",
      "--warm": "#e4eded",
      "--inverse-surface": "#245675",
      "--inverse-ink": "#fbfcf9",
      "--heading-font": '"Lora", Georgia, serif',
      "--serif": '"Lora", Georgia, serif',
      "--heading-weight": "500",
      "--heading-tracking": "-0.04em",
      "--radius-sm": "12px",
      "--radius": "18px",
      "--radius-lg": "24px",
      "--panel-shadow": "0 8px 28px -16px #24567538",
    },
  },
  {
    id: "midnight",
    name: "Midnight",
    description: "Graphite surfaces and amber instruments.",
    detail: "Fine outlines · precise sans serif",
    tokens: {
      ...clubhouse,
      "--paper": "#181d20",
      "--surface": "#22292d",
      "--green": "#e4bb76",
      "--green-hover": "#f0cd94",
      "--green-wash": "#303332",
      "--ink": "#ecece3",
      "--muted": "#acb5b4",
      "--brass": "#aa9981",
      "--silver": "#697b80",
      "--line": "#3e4c50",
      "--warm": "#2d383c",
      "--amber": "#e5c38a",
      "--danger": "#f39d90",
      "--success": "#98c7a9",
      "--on-accent": "#181d20",
      "--inverse-surface": "#2a3438",
      "--inverse-ink": "#ecece3",
      "--font": '"IBM Plex Sans", sans-serif',
      "--heading-font": '"IBM Plex Sans", sans-serif',
      "--serif": '"IBM Plex Sans", sans-serif',
      "--heading-weight": "500",
      "--heading-tracking": "-0.025em",
      "--radius-sm": "6px",
      "--radius": "10px",
      "--radius-lg": "14px",
      "--scheme": "dark",
    },
  },
] as const;

export type ShowroomThemeId = (typeof showroomThemes)[number]["id"];
export type ShowroomTheme = (typeof showroomThemes)[number];

export function isShowroomTheme(value: unknown): value is ShowroomThemeId {
  return showroomThemes.some((theme) => theme.id === value);
}

export function getShowroomTheme(id: ShowroomThemeId): ShowroomTheme {
  return showroomThemes.find((theme) => theme.id === id) ?? showroomThemes[0];
}

export function readShowroomTheme(
  storage?: Pick<Storage, "getItem">,
): ShowroomThemeId {
  try {
    const saved = storage?.getItem(SHOWROOM_THEME_KEY);
    return isShowroomTheme(saved) ? saved : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function saveShowroomTheme(
  id: ShowroomThemeId,
  storage?: Pick<Storage, "setItem">,
) {
  if (!isShowroomTheme(id)) return;
  try {
    storage?.setItem(SHOWROOM_THEME_KEY, id);
  } catch {
    return;
  }
}

export function showroomThemeStyles(): string {
  return showroomThemes.map((theme) =>
    `:root[data-showroom-theme="${theme.id}"]{${
      Object.entries(theme.tokens).map(([key, value]) => `${key}:${value};`)
        .join("")
    }}`
  ).join("\n");
}
