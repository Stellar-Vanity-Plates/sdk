/** Synchronous resolved artwork without styles or network lookup. @module */
import { StrKey } from "@colibri/core/strkey";
import {
  createPlateModel,
  type ResolvedPlateInput,
} from "@/rendering/model.ts";
import { createPlateAppearance } from "@/rendering/appearance.ts";
/** Layout controls shared by HTML and React. */
export interface PlatePresentation {
  /** Enables hover animation; reduced-motion preferences are respected. */ animated?:
    boolean;
  /** Full artwork by default; compact scales screws, picker simplifies the heading. */ variant?:
    | "display"
    | "compact"
    | "picker";
  /** Uses phrasing elements, suitable for embedding in a paragraph. */ inline?:
    boolean;
}
/** Escapes text and attribute values used in a plate, including SVG XHTML. */
export function escapeMarkup(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(
    ">",
    "&gt;",
  ).replaceAll('"', "&quot;");
}

/**
 * Renders the webapp's canonical G/C composition as responsive HTML.
 * Identicons, rim, screws and foil share one composition across all adapters.
 * Install shared CSS separately; this synchronous renderer emits markup only.
 * The caller controls width; the plate retains the app's 2.9 aspect ratio.
 */
export function renderResolvedPlateHtml(
  input: ResolvedPlateInput,
  options: PlatePresentation = {},
): string {
  const model = createPlateModel(input);
  const account = model.kind === "account";
  const bytes = account
    ? StrKey.decodeEd25519PublicKey(model.address)
    : StrKey.decodeContract(model.address);
  const appearance = createPlateAppearance(model.address);
  const icon = appearance.identiconUrl, ink = appearance.ink;
  const variables = `--account-icon:url(&quot;${
    escapeMarkup(icon)
  }&quot;);--account-ink:${ink};--account-band:${appearance.band};--account-band-highlight:${appearance.bandHighlight};--account-badge:${appearance.badge};`;
  const insignia =
    `<span class="plate-insignia" data-insignia-finish="${model.finish}" data-insignia-rarity="${model.rarity}" style="${variables}" aria-hidden="true"><span class="account-plate-identicon"><span class="account-identicon-shape"><img src="${
      escapeMarkup(icon)
    }" alt="" draggable="false" /></span></span><span class="account-plate-lustre"></span></span>`;
  const screws = ["nw", "ne", "sw", "se"].map((corner) =>
    `<span class="plate-screw plate-screw-${corner}" aria-hidden="true"></span>`
  ).join("");
  const label = escapeMarkup(model.label), address = model.address;
  const description = `${label} Stellar ${model.kind} plate. ${address}`;
  const tag = options.inline ? "span" : "div";
  let content: string;
  if (account) {
    const lettering = ["stamped", "script", "mono"][bytes[13] % 3];
    content =
      `<${tag} class="account-plate-container"><${tag} class="account-plate" data-account-finish="${model.finish}" data-account-lettering="${lettering}" data-account-rarity="${model.rarity}" style="${variables}--account-word-limit:${
        66 / model.label.length
      }cqw" role="img" aria-label="${description}">${insignia}<${tag} class="account-plate-face" aria-hidden="true"><span class="account-plate-label">STELLAR ACCOUNT PLATE</span><strong class="account-plate-word">${label}</strong><span class="account-plate-address">${address}</span></${tag}>${screws}</${tag}></${tag}>`;
  } else {
    const lettering = ["registration", "rally", "coach", "slab"][bytes[12] % 4];
    const longWord = model.label.length > 8
      ? ` style="font-size:${
        Math.max(11, Math.min(36, 760 / model.label.length))
      }px"`
      : "";
    content =
      `<${tag} class="plate-stage"><${tag} class="contract-plate" data-lettering="${lettering}" data-plate-rarity="${model.rarity}" data-shared-rarity="${model.rarity}" data-plate-rarity-signature="${model.raritySignature}" data-plate-insignia="${model.finish}" style="--plate-ink:${ink};--finish-ink:${ink};--insignia-word-limit:${
        66 / model.label.length
      }cqw;--finish-word-limit:${
        100 / model.label.length
      }cqw" role="img" aria-label="${description}">${insignia}${screws}<small>STELLAR CONTRACT PLATE</small><strong${longWord}><b class="plate-rarity-word">${label}</b></strong><code>${address}</code></${tag}></${tag}>`;
  }
  const presentation = options.variant === undefined
    ? ""
    : ` data-variant="${escapeMarkup(options.variant)}"`;
  const inline = options.inline ? ' data-inline="true"' : "";
  return `<${tag} class="vnty-plate-root" data-animated="${
    options.animated === true
  }"${presentation}${inline}>${content}</${tag}>`;
}
