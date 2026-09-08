/** Generated from the public Soroban specification. Regenerate with tools/generate-clients.ts. @module */
/** VanityClaim contract record. */
export interface VanityClaim {
  /** contract address. */
  contract_address: string;
  /** salt. */
  salt: Uint8Array;
  /** suffix. */
  suffix: string;
}
/** CatalogConfig contract record. */
export interface CatalogConfig {
  /** beneficiary. */
  beneficiary: string;
}
/** MintReservation contract record. */
export interface MintReservation {
  /** catalog price. */
  catalog_price: bigint;
  /** contract address. */
  contract_address: string;
  /** expires at ledger. */
  expires_at_ledger: number;
  /** payer. */
  payer: string;
  /** recipient. */
  recipient: string;
  /** suffix. */
  suffix: string;
}
/** ReservationConfig contract record. */
export interface ReservationConfig {
  /** duration ledgers. */
  duration_ledgers: number;
  /** fee. */
  fee: bigint;
  /** treasury. */
  treasury: string;
}
/** VanityClaimRecord contract record. */
export interface VanityClaimRecord {
  /** claim. */
  claim: VanityClaim;
  /** status. */
  status: VanityClaimStatus;
}
/** VanityClaimStatus contract variants. */
export type VanityClaimStatus = { tag: "Active"; values?: undefined } | {
  tag: "Burned";
  values?: undefined;
};
/** Exact method arguments and decoded simulation results for the nft contract. */
export interface NftMethods {
  /** Burns an owned vanity plate NFT and releases its address for future minting. */
  burn: { args: { from: string; token_id: number }; result: void };
  /** Consumes an active reservation and mints its vanity plate NFT. */
  mint: { args: { salt: Uint8Array }; result: number };
  /** Returns the token collection name. */
  name: { args: Record<string, never>; result: string };
  /** Returns the token collection symbol. */
  symbol: { args: Record<string, never>; result: string };
  /** Approves a token spender while renewing its vanity claim and address index. */
  approve: {
    args: {
      approver: string;
      approved: string;
      token_id: number;
      live_until_ledger: number;
    };
    result: void;
  };
  /** Returns the number of tokens owned by `account`. */
  balance: { args: { account: string }; result: number };
  /** Reserves a vanity contract address for the paying recipient. */
  reserve: {
    args: { recipient: string; contract_address: string; suffix: string };
    result: void;
  };
  /** Replaces the NFT implementation with installed Wasm. */
  upgrade: {
    args: { new_wasm_hash: Uint8Array; operator: string };
    result: void;
  };
  /** Returns the RBAC contract used for administrative checks. */
  get_rbac: { args: Record<string, never>; result: string };
  /** Returns a token owner while renewing its vanity claim and address index. */
  owner_of: { args: { token_id: number }; result: string };
  /** Changes the descriptive suffix associated with a claimed address. */
  set_word: {
    args: { contract_address: string; word: string; operator: string };
    result: void;
  };
  /** Transfers an owned token while renewing its vanity claim and address index. */
  transfer: {
    args: { from: string; to: string; token_id: number };
    result: void;
  };
  /** Burns a vanity plate NFT through an approved spender and releases its address. */
  burn_from: {
    args: { spender: string; from: string; token_id: number };
    result: void;
  };
  /** Returns the immutable address and salt plus the latest descriptive suffix for a token. */
  get_claim: { args: { token_id: number }; result: VanityClaim };
  /** Returns the metadata URI for an existing vanity plate NFT. */
  token_uri: { args: { token_id: number }; result: string };
  /** Reserves a vanity contract address for a recipient using a separate payer. */
  reserve_for: {
    args: {
      payer: string;
      recipient: string;
      contract_address: string;
      suffix: string;
    };
    result: void;
  };
  /** Returns the account approved for the token with `token_id`. */
  get_approved: { args: { token_id: number }; result: string | undefined };
  /** Returns the base URI used to construct token metadata URIs. */
  get_base_uri: { args: Record<string, never>; result: string };
  /** Returns the contract used to derive and deploy vanity addresses. */
  get_deployer: { args: Record<string, never>; result: string };
  /** Returns the token ID representing a vanity contract address. */
  get_token_id: { args: { contract_address: string }; result: number };
  /** Replaces the base URI used by existing and future token metadata URIs. */
  set_base_uri: { args: { base_uri: string; operator: string }; result: void };
  /** Changes the treasury that processes reservation fees and cashback. */
  set_treasury: { args: { treasury: string; operator: string }; result: void };
  /** Transfers an approved token while renewing its vanity claim and address index. */
  transfer_from: {
    args: { spender: string; from: string; to: string; token_id: number };
    result: void;
  };
  /** Approve or remove `operator` as an operator for the owner. */
  approve_for_all: {
    args: { owner: string; operator: string; live_until_ledger: number };
    result: void;
  };
  /** Returns the active reservation for a predicted contract address. */
  get_reservation: {
    args: { contract_address: string };
    result: MintReservation | undefined;
  };
  /** Reserves a pre-farmed catalog address at an administrator-approved price. */
  reserve_catalog: {
    args: {
      recipient: string;
      contract_address: string;
      suffix: string;
      catalog_price: bigint;
      operator: string;
    };
    result: void;
  };
  /** Returns a durable vanity claim together with its active or burned status. */
  get_claim_record: { args: { token_id: number }; result: VanityClaimRecord };
  /** Returns the beneficiary receiving administrator-approved catalog prices. */
  get_catalog_config: { args: Record<string, never>; result: CatalogConfig };
  /** Returns the newest token ever minted for a vanity contract address. */
  get_latest_token_id: { args: { contract_address: string }; result: number };
  /** Returns whether the `operator` is allowed to manage all the assets of */
  is_approved_for_all: {
    args: { owner: string; operator: string };
    result: boolean;
  };
  /** Reserves an address while burning reward shares toward the reservation fee. */
  reserve_with_shares: {
    args: {
      recipient: string;
      contract_address: string;
      suffix: string;
      fee_shares: bigint;
    };
    result: void;
  };
  /** Changes the fee charged when creating a reservation. */
  set_reservation_fee: {
    args: { fee: bigint; operator: string };
    result: void;
  };
  /** Derives a vanity contract address from the configured deployer and a salt. */
  get_predicted_address: { args: { salt: Uint8Array }; result: string };
  /** Initializes reservation and catalog configuration after upgrading compatible legacy state. */
  migrate_configuration: {
    args: {
      reservation_config: ReservationConfig;
      catalog_config: CatalogConfig;
      operator: string;
    };
    result: void;
  };
  /** Returns the current reservation fee and duration configuration. */
  get_reservation_config: {
    args: Record<string, never>;
    result: ReservationConfig;
  };
  /** Initializes catalog configuration after upgrading a pre-catalog deployment. */
  migrate_catalog_config: {
    args: { catalog_config: CatalogConfig; operator: string };
    result: void;
  };
  /** Reserves for another recipient while burning the payer's reward shares toward the fee. */
  reserve_for_with_shares: {
    args: {
      payer: string;
      recipient: string;
      contract_address: string;
      suffix: string;
      fee_shares: bigint;
    };
    result: void;
  };
  /** Changes the account receiving catalog prices. */
  set_catalog_beneficiary: {
    args: { beneficiary: string; operator: string };
    result: void;
  };
  /** Changes how many ledgers a reservation remains valid. */
  set_reservation_duration: {
    args: { duration_ledgers: number; operator: string };
    result: void;
  };
  /** Reserves a catalog address while burning reward shares toward the protocol fee. */
  reserve_catalog_with_shares: {
    args: {
      recipient: string;
      contract_address: string;
      suffix: string;
      catalog_price: bigint;
      fee_shares: bigint;
      operator: string;
    };
    result: void;
  };
}
