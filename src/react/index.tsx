/** React plates and shared TanStack queries. Core/image/farming entrypoints remain React-free. @module */
export { Plate } from "@/react/plate.tsx";
export type { PlateProps } from "@/react/plate.tsx";
export { usePlate } from "@/react/use-plate.ts";
export type {
  PlateSource,
  UsePlateOptions,
  UsePlateResult,
} from "@/react/use-plate.ts";
export { VanityProvider } from "@/react/provider.tsx";
export type { PlateNetwork, VanityProviderProps } from "@/react/provider.tsx";
export {
  createPlateQueryClient,
  plateQueryKey,
  plateQueryOptions,
} from "@/react/query.ts";
export type {
  PlateData,
  PlateQueryClient,
  PlateQueryDefinition,
} from "@/react/query.ts";
