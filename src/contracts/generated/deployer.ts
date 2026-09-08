/** Generated from the public Soroban specification. Regenerate with tools/generate-clients.ts. @module */
/** Exact method arguments and decoded simulation results for the deployer contract. */
export interface DeployerMethods {
  /** Burns a vanity plate NFT and deploys its claimed contract address. */
  deploy: {
    args: {
      token_id: number;
      wasm_hash: Uint8Array;
      constructor_args: Array<unknown>;
      operator: string;
    };
    result: string;
  };
  /** Returns the NFT contract linked to the deployer. */
  get_nft: { args: Record<string, never>; result: string };
  /** Links the single NFT contract whose claims may be redeemed through this deployer. */
  set_nft: { args: { nft: string; operator: string }; result: void };
  /** Replaces the deployer implementation with installed Wasm. */
  upgrade: {
    args: { new_wasm_hash: Uint8Array; operator: string };
    result: void;
  };
  /** Returns the RBAC contract used by the deployer. */
  get_rbac: { args: Record<string, never>; result: string };
  /** Derives the contract address this deployer would create from a salt. */
  get_predicted_address: { args: { salt: Uint8Array }; result: string };
}
