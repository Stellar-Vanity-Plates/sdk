/** Portable, local plate SVG rendering with outlined lettering. @module */
import { Identicon } from "@colibri/identicon";
// @deno-types="@types/opentype.js"
import opentype from "opentype.js";
type Font = ReturnType<typeof opentype.parse>;
import { fontData } from "./vendor/fonts.ts";
import { createPlateModel, type PlateInput } from "./model.ts";
import { VanityError } from "../errors.ts";
export { createPlateModel } from "./model.ts";
export type {
  PlateFinish,
  PlateInput,
  PlateModel,
  PlateRarity,
} from "./model.ts";

/** SVG output settings, shared by the web adapters. */
export interface SvgOptions {
  /** Intrinsic width in pixels, 120–4096. Defaults to 600. */ width?: number;
  /** Enables gentle sheen for rare plates; honors reduced-motion preferences. */ animated?:
    boolean;
  /** Unique prefix for inline SVG definitions. Defaults to the full address. */ idPrefix?:
    string;
}
const fonts = new Map<string, Font>();
function font(name: string): Font {
  if (!fonts.has(name)) {
    fonts.set(
      name,
      opentype.parse(
        Uint8Array.from(atob(fontData[name]), (c) => c.charCodeAt(0)).buffer,
      ),
    );
  }
  return fonts.get(name)!;
}
function escape(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(
    ">",
    "&gt;",
  ).replaceAll('"', "&quot;");
}
function lettering(
  text: string,
  name: string,
  size: number,
  cx: number,
  cy: number,
  maxWidth: number,
  fill: string,
): string {
  const face = font(name);
  const initial = face.getPath(text, 0, 0, size);
  const box = initial.getBoundingBox();
  const scale = Math.min(1, maxWidth / Math.max(1, box.x2 - box.x1));
  const path = face.getPath(text, 0, 0, size * scale);
  const bounds = path.getBoundingBox();
  const x = cx - (bounds.x1 + bounds.x2) / 2,
    y = cy - (bounds.y1 + bounds.y2) / 2;
  // Explicit coordinates avoid opentype 2's optimized serializer producing NaN
  // for some repeated quadratic points. Keep every glyph intact in exported SVGs.
  const data = path.commands.map((command) => {
    const n = (value: number) => value.toFixed(2);
    switch (command.type) {
      case "M":
      case "L":
        return `${command.type}${n(command.x)} ${n(command.y)}`;
      case "Q":
        return `Q${n(command.x1)} ${n(command.y1)} ${n(command.x)} ${
          n(command.y)
        }`;
      case "C":
        return `C${n(command.x1)} ${n(command.y1)} ${n(command.x2)} ${
          n(command.y2)
        } ${n(command.x)} ${n(command.y)}`;
      case "Z":
        return "Z";
    }
  }).join(" ");
  return `<path transform="translate(${x.toFixed(2)} ${
    y.toFixed(2)
  })" d="${data}" fill="${fill}"/>`;
}
/**
 * Generates a standalone SVG with embedded vector art and font outlines.
 * No DOM, filesystem, remote fonts or application backend is used.
 */
export function renderPlateSvg(
  input: PlateInput,
  options: SvgOptions = {},
): string {
  const model = createPlateModel(input), width = options.width ?? 600;
  if (!Number.isInteger(width) || width < 120 || width > 4096) {
    throw new VanityError(
      "VNTY_INVALID_OPTION",
      "Plate width must be an integer from 120 to 4096.",
    );
  }
  const id = options.idPrefix ?? `vnty-${model.address}`;
  if (!/^[A-Za-z][A-Za-z0-9_-]{0,127}$/.test(id)) {
    throw new VanityError(
      "VNTY_INVALID_OPTION",
      "SVG ID prefixes must start with a letter and contain only letters, digits, hyphens or underscores (128 characters maximum).",
    );
  }
  const icon = new Identicon(model.address).toSvg({
    size: 224,
    padding: 14,
    saturation: .8,
    value: .55,
  }).replace(/^<svg[^>]*>/, "<g>").replace(/<\/svg>$/, "</g>");
  const iconAt = (x: number, y: number, size: number, opacity = 1) =>
    `<g transform="translate(${x} ${y}) scale(${
      size / 224
    })" opacity="${opacity}">${icon}</g>`;
  const sided = model.finish === "badge" || model.finish === "sideband",
    cx = sided ? 352 : 300,
    textWidth = sided ? 420 : 516;
  const s = model.patternScale;
  const patterns: Record<string, string> = {
    pinstripe: `<path d="M2 0V${s} M4 0V${s}"/>`,
    microdot:
      `<circle cx="2" cy="2" r=".8" fill="${model.ink}" stroke="none"/>`,
    diagonal: `<path d="M0 ${s}L${s} 0"/>`,
    crosshatch: `<path d="M0 0L${s} ${s}M0 ${s}L${s} 0"/>`,
    horizontal: `<path d="M0 3H${s}"/>`,
    guilloche: `<path d="M0 ${s / 2}Q${s / 2} ${-s / 2} ${s} ${s / 2}T${
      s * 2
    } ${s / 2}"/>`,
  };
  const artwork = model.finish === "badge"
    ? `<rect x="24" y="52" width="83" height="103" rx="34" fill="#eeeede" stroke="${model.band}" stroke-opacity=".18"/>${
      iconAt(30, 65, 72)
    }`
    : model.finish === "sideband"
    ? `<path d="M14 7H110V200H14Z" fill="${model.band}"/><path d="M114 8V199" stroke="${model.band}" stroke-width="2"/><rect x="25" y="65" width="72" height="76" rx="3" fill="#fdfcf6"/>${
      iconAt(25, 67, 72)
    }`
    : model.finish === "watermark"
    ? iconAt(354, -10, 224, .09)
    : `<rect x="8" y="8" width="584" height="191" fill="url(#${id}-weave)" opacity=".08"/>`;
  const rare = model.rarity === "foil" || model.rarity === "aurora" ||
    model.rarity === "pole";
  const animated = options.animated === true && rare;
  const screws = [[16, 16], [584, 16], [16, 191], [584, 191]].map(([x, y]) =>
    `<circle cx="${x}" cy="${y}" r="4.1" fill="url(#${id}-metal)" stroke="#9a9b8c" stroke-width=".7"/><path d="M${
      x - 1.7
    } ${y + 1.7}l3.4-3.4" stroke="#6e746a" stroke-width=".8"/>`
  ).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${
    Math.round(width / 2.9)
  }" viewBox="0 0 600 207" role="img" aria-labelledby="${id}-title" data-kind="${model.kind}" data-rarity="${model.rarity}" data-finish="${model.finish}"><title id="${id}-title">${
    escape(model.label)
  } · Stellar ${model.kind} plate · ${model.address}</title>
<defs><linearGradient id="${id}-metal" x2="1" y2="1"><stop stop-color="#faf9ef"/><stop offset=".5" stop-color="#b7b9ad"/><stop offset="1" stop-color="#eeeee5"/></linearGradient><linearGradient id="${id}-sheen"><stop stop-color="#8cd7c4" stop-opacity="0"/><stop offset=".35" stop-color="#94b8ee" stop-opacity=".2"/><stop offset=".5" stop-color="#fff" stop-opacity=".55"/><stop offset=".65" stop-color="#e4b9da" stop-opacity=".23"/><stop offset="1" stop-color="#ebca79" stop-opacity="0"/></linearGradient><clipPath id="${id}-clip"><rect x="7" y="7" width="586" height="193" rx="8"/></clipPath><pattern id="${id}-lines" width="${s}" height="${s}" patternUnits="userSpaceOnUse" fill="none" stroke="${model.ink}" stroke-width=".6">${
    patterns[model.pattern]
  }</pattern><pattern id="${id}-weave" width="74" height="74" patternUnits="userSpaceOnUse">${
    iconAt(0, 0, 74)
  }</pattern></defs>
${
    animated
      ? `<style>@media(prefers-reduced-motion:no-preference){#${id}-shine{animation:${id}-glide 8s ease-in-out infinite;transform-origin:center}}@keyframes ${id}-glide{0%,100%{transform:translateX(-260px)}50%{transform:translateX(260px)}}</style>`
      : ""
  }
<rect x="3" y="5" width="594" height="199" rx="11" fill="#bdb7a1"/><rect x="3" y="2" width="594" height="199" rx="11" fill="#fdfcf6" stroke="#b5ac87" stroke-width="3"/><rect x="7" y="6" width="586" height="191" rx="8" fill="none" stroke="#8a9484" stroke-width=".65"/>
<g clip-path="url(#${id}-clip)">${
    model.kind === "contract"
      ? `<rect x="8" y="8" width="584" height="190" fill="url(#${id}-lines)" opacity=".065"/>`
      : ""
  }${artwork}${
    rare
      ? `<rect id="${id}-shine" x="60" y="7" width="460" height="193" fill="url(#${id}-sheen)" opacity=".7"/>`
      : ""
  }</g>
${
    lettering(
      model.kind === "contract"
        ? "STELLAR CONTRACT PLATE"
        : "STELLAR ACCOUNT PLATE",
      "mono",
      10,
      cx,
      43,
      textWidth,
      "#737968",
    )
  }
${
    lettering(
      model.label,
      model.configured ? model.lettering : "mono",
      model.lettering === "rally" ? 82 : 65,
      cx,
      102,
      textWidth,
      model.ink,
    )
  }
${
    lettering(
      model.address,
      "mono",
      sided ? 10.2 : 12,
      cx,
      155,
      textWidth,
      "#697063",
    )
  }
${
    lettering(
      `${
        model.configured ? "VANITY PLATES" : "UNCONFIGURED ACCOUNT"
      }  /  ${model.rarity.toUpperCase()}`,
      "mono",
      7.2,
      cx,
      178,
      textWidth,
      "#8b8c7d",
    )
  }${screws}</svg>`;
}
