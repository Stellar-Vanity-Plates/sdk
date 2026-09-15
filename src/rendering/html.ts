import { type PlateInput, resolvePlateInput } from "@/rendering/resolve.ts";
import { Identicon } from "@colibri/identicon";
import { StrKey } from "@colibri/core";
import {
  createPlateModel,
  type ResolvedPlateInput,
} from "@/rendering/model.ts";
import { plateStyles } from "@/rendering/vendor/plate-styles.ts";
import { webFonts } from "@/rendering/vendor/web-fonts.ts";

/** Canonical app styles and embedded fonts. No network requests or global installation. */
export const plateCss: string = webFonts + plateStyles;

/** Options for the responsive canonical HTML plate. */
export interface HtmlOptions {
  /** Enables the webapp's hover effects. Defaults to false; respects reduced motion. */
  animated?: boolean;
  /** Includes scoped CSS and embedded fonts. Defaults to true. */
  includeStyles?: boolean;
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
 * Self-contained fonts, identicons, rim, screws, foil and hover animations are
 * shared by the web component, React adapter and browser SVG/PNG exports.
 * The caller controls width; the plate retains the app's 2.9 aspect ratio.
 */
export function renderResolvedPlateHtml(
  input: ResolvedPlateInput,
  options: HtmlOptions = {},
): string {
  const model = createPlateModel(input);
  const account = model.kind === "account";
  const bytes = account
    ? StrKey.decodeEd25519PublicKey(model.address)
    : StrKey.decodeContract(model.address);
  const hue = bytes[1] / 255 * 360;
  const icon = `data:image/svg+xml,${
    encodeURIComponent(
      new Identicon(model.address).toSvg({
        size: 224,
        padding: 14,
        saturation: .8,
        value: .55,
      }),
    )
  }`;
  const ink = account
    ? `hsl(${hue} 80% 23%)`
    : `hsl(${Math.round(((bytes[0] << 8) | bytes[1]) / 65535 * 359)} ${
      34 + bytes[3] % 9
    }% ${27 + bytes[4] % 7}%)`;
  const variables = `--account-icon:url(&quot;${
    escapeMarkup(icon)
  }&quot;);--account-ink:${ink};--account-band:hsl(${hue} 80% 23%);--account-band-highlight:hsl(${hue} 80% 32%);--account-badge:hsl(${hue} 35% 93%);`;
  const insignia =
    `<span class="plate-insignia" data-insignia-finish="${model.finish}" data-insignia-rarity="${model.rarity}" style="${variables}" aria-hidden="true"><span class="account-plate-identicon"><span class="account-identicon-shape"><img src="${
      escapeMarkup(icon)
    }" alt="" draggable="false" /></span></span><span class="account-plate-lustre"></span></span>`;
  const screws = ["nw", "ne", "sw", "se"].map((corner) =>
    `<span class="plate-screw plate-screw-${corner}" aria-hidden="true"></span>`
  ).join("");
  const label = escapeMarkup(model.label), address = model.address;
  const description = `${label} Stellar ${model.kind} plate. ${address}`;
  let content: string;
  if (account) {
    const lettering = ["stamped", "script", "mono"][bytes[13] % 3];
    content =
      `<div class="account-plate-container"><div class="account-plate" data-account-finish="${model.finish}" data-account-lettering="${lettering}" data-account-rarity="${model.rarity}" style="${variables}--account-word-limit:${
        66 / model.label.length
      }cqw" role="img" aria-label="${description}">${insignia}<div class="account-plate-face" aria-hidden="true"><span class="account-plate-label">STELLAR ACCOUNT PLATE</span><strong class="account-plate-word">${label}</strong><span class="account-plate-address">${address}</span></div>${screws}</div></div>`;
  } else {
    const lettering = ["registration", "rally", "coach", "slab"][bytes[12] % 4];
    const longWord = model.label.length > 8
      ? ` style="font-size:${
        Math.max(11, Math.min(36, 760 / model.label.length))
      }px"`
      : "";
    content =
      `<div class="plate-stage"><div class="contract-plate" data-lettering="${lettering}" data-plate-rarity="${model.rarity}" data-shared-rarity="${model.rarity}" data-plate-rarity-signature="${model.raritySignature}" data-plate-insignia="${model.finish}" style="--plate-ink:${ink};--finish-ink:${ink};--insignia-word-limit:${
        66 / model.label.length
      }cqw;--finish-word-limit:${
        100 / model.label.length
      }cqw" role="img" aria-label="${description}">${insignia}${screws}<small>STELLAR CONTRACT PLATE</small><strong${longWord}><b class="plate-rarity-word">${label}</b></strong><code>${address}</code></div></div>`;
  }
  return `${
    options.includeStyles === false ? "" : `<style>${plateCss}</style>`
  }<div class="vnty-plate-root" data-animated="${
    options.animated === true
  }">${content}</div>`;
}

/** Resolves on-chain display data when configured, then renders canonical HTML. */
export async function renderPlateHtml(
  input: PlateInput,
  options: HtmlOptions = {},
): Promise<string> {
  return renderResolvedPlateHtml(await resolvePlateInput(input), options);
}
