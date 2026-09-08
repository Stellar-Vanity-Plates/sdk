/** Generated from the public Soroban specification. Regenerate with tools/generate-clients.ts. @module */
/** Listing contract record. */
export interface Listing {
  /** contract address. */
  contract_address: string;
  /** fee bps. */
  fee_bps: number;
  /** price. */
  price: bigint;
  /** seller. */
  seller: string;
  /** token id. */
  token_id: number;
  /** word. */
  word: string;
}
/** SellerSalesPage contract record. */
export interface SellerSalesPage {
  /** next cursor. */
  next_cursor: string | undefined;
  /** sales. */
  sales: Array<Listing>;
  /** total count. */
  total_count: number;
}
/** MarketplaceConfig contract record. */
export interface MarketplaceConfig {
  /** nft. */
  nft: string;
  /** protocol fee bps. */
  protocol_fee_bps: number;
  /** rbac. */
  rbac: string;
  /** settlement asset. */
  settlement_asset: string;
  /** treasury. */
  treasury: string;
}
/** Exact method arguments and decoded simulation results for the marketplace contract. */
export interface MarketplaceMethods {
  /** Purchases a listed NFT using the marketplace settlement asset. */
  buy: {
    args: { buyer: string; contract_address: string; expected_price: bigint };
    result: void;
  };
  /** Pauses new sale placement and purchases while preserving cancellation. */
  pause: { args: { operator: string }; result: void };
  /** Restores sale placement and purchases after a pause. */
  unpause: { args: { operator: string }; result: void };
  /** Replaces the marketplace implementation with installed Wasm. */
  upgrade: {
    args: { new_wasm_hash: Uint8Array; operator: string };
    result: void;
  };
  /** Returns the current marketplace configuration. */
  get_config: { args: Record<string, never>; result: MarketplaceConfig };
  /** Returns whether sale placement and purchase are paused. */
  get_paused: { args: Record<string, never>; result: boolean };
  /** Cancels a sale and returns the escrowed NFT to its seller. */
  cancel_sale: {
    args: { contract_address: string; operator: string };
    result: void;
  };
  /** Returns the active sale for a vanity contract address, if one exists. */
  get_listing: {
    args: { contract_address: string };
    result: Listing | undefined;
  };
  /** Changes the treasury that receives protocol fees from future purchases. */
  set_treasury: { args: { treasury: string; operator: string }; result: void };
  /** Transfers an NFT into escrow and opens a sale at a fixed price. */
  place_for_sale: {
    args: { seller: string; contract_address: string; price: bigint };
    result: void;
  };
  /** Purchases a listed NFT while covering part of the protocol fee with VNTY shares. */
  buy_with_shares: {
    args: {
      buyer: string;
      contract_address: string;
      expected_price: bigint;
      fee_shares: bigint;
    };
    result: void;
  };
  /** Changes the fee snapshotted into subsequently opened sales. */
  set_protocol_fee: {
    args: { fee_bps: number; operator: string };
    result: void;
  };
  /** Returns one cursor-based page of active sales opened by a seller. */
  get_sales_by_seller: {
    args: { seller: string; cursor: string | undefined; limit: number };
    result: SellerSalesPage;
  };
  /** Returns the number of active sales opened by a seller. */
  get_seller_sale_count: { args: { seller: string }; result: number };
}
