import { StrKey } from "@stellar/stellar-sdk";
import { deriveAccountPlateRarity } from "@reference/src/domain/account-plate-rarity.ts";
import { derivePlateInsignia } from "@reference/src/browser/ui/PlateInsignia.tsx";
export {
  PLATE_IDENTICON_OPTIONS as ACCOUNT_IDENTICON_OPTIONS,
  PLATE_INSIGNIA_FINISHES as ACCOUNT_PLATE_FINISHES,
} from "@reference/src/browser/ui/PlateInsignia.tsx";

export const ACCOUNT_PLATE_LETTERING = [
  { id: "mono", label: "Registration" },
  { id: "stamped", label: "Rally condensed" },
  { id: "script", label: "Coach script" },
  { id: "slab", label: "Garage slab" },
] as const;

export function deriveAccountPlateAppearance(address: string) {
  if (!StrKey.isValidEd25519PublicKey(address)) return undefined;
  const bytes = StrKey.decodeEd25519PublicKey(address);
  return {
    ...derivePlateInsignia(address)!,
    rarity: deriveAccountPlateRarity(address)!,
    lettering:
      ACCOUNT_PLATE_LETTERING[bytes[6] & 3],
  };
}
