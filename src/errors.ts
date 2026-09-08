import { ColibriError } from "@colibri/core";

/** Stable SDK error codes; Colibri transport and contract errors retain their own codes. */
export type VanityErrorCode =
  | "VNTY_INVALID_ADDRESS"
  | "VNTY_INVALID_SUFFIX"
  | "VNTY_INVALID_OPTION"
  | "VNTY_ABORTED"
  | "VNTY_INCOMPATIBLE_CONTRACT"
  | "VNTY_RENDER_FAILED";

/** A caller-correctable SDK error. Secret material is never attached as metadata. */
export class VanityError extends ColibriError<VanityErrorCode> {
  /** Constructs a stable, Colibri-compatible SDK error. */
  constructor(code: VanityErrorCode, message: string) {
    super({ domain: "core", source: "@vanity-plates/sdk", code, message });
  }
}
