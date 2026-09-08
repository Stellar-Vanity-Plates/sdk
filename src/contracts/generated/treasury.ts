/** Generated from the public Soroban specification. Regenerate with tools/generate-clients.ts. @module */
/** FeeReceipt contract record. */
export interface FeeReceipt {
  /** appreciation amount. */
  appreciation_amount: bigint;
  /** beneficiary amount. */
  beneficiary_amount: bigint;
  /** beneficiary shares minted. */
  beneficiary_shares_minted: bigint;
  /** cashback amount. */
  cashback_amount: bigint;
  /** cashback shares minted. */
  cashback_shares_minted: bigint;
  /** fee amount. */
  fee_amount: bigint;
  /** fee asset collected. */
  fee_asset_collected: bigint;
  /** fee shares burned. */
  fee_shares_burned: bigint;
  /** fee shares value. */
  fee_shares_value: bigint;
  /** invested amount. */
  invested_amount: bigint;
  /** payer. */
  payer: string;
  /** realized value. */
  realized_value: bigint;
  /** strategy investments. */
  strategy_investments: Array<StrategyInvestment>;
  /** total shares minted. */
  total_shares_minted: bigint;
}
/** RouteHealth contract record. */
export interface RouteHealth {
  /** amount in. */
  amount_in: bigint;
  /** deviation bps. */
  deviation_bps: number | undefined;
  /** input asset. */
  input_asset: string;
  /** oracle amount out. */
  oracle_amount_out: bigint | undefined;
  /** output asset. */
  output_asset: string;
  /** router amount out. */
  router_amount_out: bigint | undefined;
  /** slippage bps. */
  slippage_bps: number | undefined;
  /** status. */
  status: MarketHealthStatus;
}
/** MarketHealth contract record. */
export interface MarketHealth {
  /** checked at. */
  checked_at: bigint;
  /** max oracle age seconds. */
  max_oracle_age_seconds: bigint;
  /** oldest price timestamp. */
  oldest_price_timestamp: bigint | undefined;
  /** probe amount. */
  probe_amount: bigint;
  /** routes. */
  routes: Array<RouteHealth>;
  /** status. */
  status: MarketHealthStatus;
}
/** TreasuryConfig contract record. */
export interface TreasuryConfig {
  /** appreciation bps. */
  appreciation_bps: number;
  /** beneficiary. */
  beneficiary: string;
  /** beneficiary bps. */
  beneficiary_bps: number;
  /** cashback bps. */
  cashback_bps: number;
  /** defindex vault. */
  defindex_vault: string;
  /** fee asset. */
  fee_asset: string;
  /** rbac. */
  rbac: string;
  /** share asset. */
  share_asset: string;
  /** strategies. */
  strategies: Array<StrategyAllocation>;
}
/** RebalanceReceipt contract record. */
export interface RebalanceReceipt {
  /** invested amount. */
  invested_amount: bigint;
  /** investments. */
  investments: Array<RebalanceInvestment>;
  /** requested amount. */
  requested_amount: bigint;
}
/** StrategyPosition contract record. */
export interface StrategyPosition {
  /** allocation bps. */
  allocation_bps: number;
  /** asset. */
  asset: string;
  /** balance. */
  balance: bigint;
  /** fee value. */
  fee_value: bigint;
}
/** TreasurySnapshot contract record. */
export interface TreasurySnapshot {
  /** idle fee assets. */
  idle_fee_assets: bigint;
  /** share price. */
  share_price: bigint | undefined;
  /** strategy positions. */
  strategy_positions: Array<StrategyPosition>;
  /** strategy value. */
  strategy_value: bigint;
  /** total assets. */
  total_assets: bigint;
  /** total shares. */
  total_shares: bigint;
}
/** RedemptionReceipt contract record. */
export interface RedemptionReceipt {
  /** committed at. */
  committed_at: bigint;
  /** owner. */
  owner: string;
  /** redeemable at. */
  redeemable_at: bigint;
  /** redeemed at. */
  redeemed_at: bigint;
  /** shares burned. */
  shares_burned: bigint;
  /** strategy redemptions. */
  strategy_redemptions: Array<StrategyRedemption>;
}
/** RedemptionRequest contract record. */
export interface RedemptionRequest {
  /** committed at. */
  committed_at: bigint;
  /** owner. */
  owner: string;
  /** redeemable at. */
  redeemable_at: bigint;
  /** shares. */
  shares: bigint;
}
/** MarketHealthStatus contract variants. */
export type MarketHealthStatus =
  | { tag: "Healthy"; values?: undefined }
  | { tag: "DefindexUnavailable"; values?: undefined }
  | { tag: "OracleUnavailable"; values?: undefined }
  | { tag: "OracleStale"; values?: undefined }
  | { tag: "RouterUnavailable"; values?: undefined }
  | { tag: "InvalidPrice"; values?: undefined }
  | { tag: "DeviationExceeded"; values?: undefined }
  | { tag: "SlippageExceeded"; values?: undefined };
/** StrategyAllocation contract record. */
export interface StrategyAllocation {
  /** asset. */
  asset: string;
  /** bps. */
  bps: number;
  /** strategy. */
  strategy: string;
}
/** StrategyInvestment contract record. */
export interface StrategyInvestment {
  /** amount in. */
  amount_in: bigint;
  /** amount out. */
  amount_out: bigint;
  /** asset. */
  asset: string;
}
/** StrategyRedemption contract record. */
export interface StrategyRedemption {
  /** amount. */
  amount: bigint;
  /** asset. */
  asset: string;
}
/** RebalanceInvestment contract record. */
export interface RebalanceInvestment {
  /** amount. */
  amount: bigint;
  /** strategy. */
  strategy: string;
}
/** AccountingParameters contract record. */
export interface AccountingParameters {
  /** virtual assets. */
  virtual_assets: bigint;
  /** virtual shares. */
  virtual_shares: bigint;
}
/** Exact method arguments and decoded simulation results for the treasury contract. */
export interface TreasuryMethods {
  /** Pauses new fee collection, commitments, and investment, not mature exits. */
  pause: { args: { operator: string }; result: void };
  /** Burns mature VNTY and transfers dfTokens without market valuation. */
  redeem: { args: { owner: string }; result: RedemptionReceipt };
  /** Resumes new fee collection, commitments, and investment. */
  unpause: { args: { operator: string }; result: void };
  /** Replaces Treasury code; migrating legacy direct-asset storage is not supported. */
  upgrade: {
    args: { new_wasm_hash: Uint8Array; operator: string };
    result: void;
  };
  /** Invests live idle USDC toward existing whole-vault strategy shortfalls. */
  rebalance: {
    args: { amount: bigint; operator: string };
    result: RebalanceReceipt;
  };
  /** Reads the Treasury's vault and distribution configuration. */
  get_config: { args: Record<string, never>; result: TreasuryConfig };
  /** Reads whether new fees, commitments, and investment are paused. */
  get_paused: { args: Record<string, never>; result: boolean };
  /** Deposits a cash fee idle in DeFindex and issues VNTY rewards. */
  collect_fee: { args: { payer: string; amount: bigint }; result: FeeReceipt };
  /** Values only Treasury's dfToken position, including idle USDC inside DeFindex. */
  get_snapshot: { args: Record<string, never>; result: TreasurySnapshot };
  /** Reads the configured USDC Stellar Asset Contract address. */
  get_fee_asset: { args: Record<string, never>; result: string };
  /** Changes all VNTY distribution portions atomically. */
  set_fee_split: {
    args: {
      beneficiary_bps: number;
      cashback_bps: number;
      appreciation_bps: number;
      operator: string;
    };
    result: void;
  };
  /** Reads a holder's optional redemption commitment. */
  get_redemption: {
    args: { owner: string };
    result: RedemptionRequest | undefined;
  };
  /** Pauses one configured strategy through the DeFindex vault. */
  pause_strategy: {
    args: { strategy: string; operator: string };
    result: void;
  };
  /** Estimates cashback VNTY using current guarded net position value. */
  preview_shares: { args: { amount: bigint }; result: bigint };
  /** Refreshes reports for the configured DeFindex vault. */
  report_defindex: { args: { operator: string }; result: void };
  /** Rescues one configured strategy into the DeFindex vault. */
  rescue_strategy: {
    args: { strategy: string; operator: string };
    result: void;
  };
  /** Changes the VNTY beneficiary without changing DeFindex's fee receiver. */
  set_beneficiary: {
    args: { beneficiary: string; operator: string };
    result: void;
  };
  /** Reads accounted VNTY supply, including committed shares. */
  get_total_shares: { args: Record<string, never>; result: bigint };
  /** Unpauses one configured strategy through the DeFindex vault. */
  unpause_strategy: {
    args: { strategy: string; operator: string };
    result: void;
  };
  /** Upgrades the configured DeFindex vault, not this Treasury contract. */
  upgrade_defindex: {
    args: { new_wasm_hash: Uint8Array; operator: string };
    result: void;
  };
  /** Returns committed VNTY even while paused or markets are unavailable. */
  cancel_redemption: { args: { owner: string }; result: RedemptionRequest };
  /** Escrows VNTY for a fixed thirty-day redemption cooldown. */
  commit_redemption: {
    args: { owner: string; shares: bigint };
    result: RedemptionRequest;
  };
  /** Reports guarded net-valuation availability, not an amount-specific swap guarantee. */
  get_market_health: { args: Record<string, never>; result: MarketHealth };
  /** Locks accrued fees before optionally changing the future DeFindex fee rate. */
  lock_defindex_fees: {
    args: { new_fee_bps: number | undefined; operator: string };
    result: void;
  };
  /** Previews a balance-only dfToken exit, without promising cash liquidity. */
  preview_redemption: {
    args: { shares: bigint };
    result: Array<StrategyRedemption>;
  };
  /** Changes one configured StableBond strategy's pricing safety parameters. */
  set_strategy_pricing: {
    args: {
      strategy: string;
      max_spread_bps: number;
      quote_ttl_seconds: bigint;
      slippage_bps: number;
      operator: string;
    };
    result: void;
  };
  /** Changes one configured StableBond strategy's total-value cap. */
  set_strategy_tvl_cap: {
    args: { strategy: string; amount: bigint; operator: string };
    result: void;
  };
  /** Accepts keeper authority for one configured StableBond strategy. */
  claim_strategy_keeper: {
    args: { strategy: string; operator: string };
    result: void;
  };
  /** Releases locked DeFindex fees for one configured strategy. */
  release_defindex_fees: {
    args: { strategy: string; amount: bigint; operator: string };
    result: void;
  };
  /** Allows one depositor on a configured StableBond strategy. */
  add_strategy_depositor: {
    args: { strategy: string; depositor: string; operator: string };
    result: void;
  };
  /** Burns VNTY toward a fee and deposits only its uncovered cash remainder. */
  collect_fee_with_shares: {
    args: { payer: string; amount: bigint; fee_shares: bigint };
    result: FeeReceipt;
  };
  /** Distributes locked fees under the configured DeFindex fee policy. */
  distribute_defindex_fees: { args: { operator: string }; result: void };
  /** Changes investment targets without buying, selling, or replacing the vault. */
  set_strategy_allocations: {
    args: { allocations: Array<StrategyAllocation>; operator: string };
    result: void;
  };
  /** Changes one configured StableBond strategy's per-deposit cap. */
  set_strategy_deposit_cap: {
    args: { strategy: string; amount: bigint; operator: string };
    result: void;
  };
  /** Allows one depositor Wasm hash on a configured StableBond strategy. */
  add_strategy_allowed_hash: {
    args: { strategy: string; hash: Uint8Array; operator: string };
    result: void;
  };
  /** Reads the immutable virtual offsets used by this Treasury instance. */
  get_accounting_parameters: {
    args: Record<string, never>;
    result: AccountingParameters;
  };
  /** Removes one depositor from a configured StableBond strategy. */
  remove_strategy_depositor: {
    args: { strategy: string; depositor: string; operator: string };
    result: void;
  };
  /** Changes the configured DeFindex vault's performance-fee receiver. */
  set_defindex_fee_receiver: {
    args: { receiver: string; operator: string };
    result: void;
  };
  /** Removes one depositor Wasm hash from a configured StableBond strategy. */
  remove_strategy_allowed_hash: {
    args: { strategy: string; hash: Uint8Array; operator: string };
    result: void;
  };
  /** Changes whether one configured StableBond strategy accepts deposits. */
  set_strategy_deposits_paused: {
    args: { strategy: string; paused: boolean; operator: string };
    result: void;
  };
}
