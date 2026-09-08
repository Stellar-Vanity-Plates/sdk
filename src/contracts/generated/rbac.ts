/** Generated from the public Soroban specification. Regenerate with tools/generate-clients.ts. @module */
/** Role contract variants. */
export type Role =
  | { tag: "Admin"; values?: undefined }
  | { tag: "Minter"; values?: undefined }
  | { tag: "Treasurer"; values?: undefined }
  | { tag: "Rebalancer"; values?: undefined }
  | { tag: "Upgrader"; values?: undefined };
/** Exact method arguments and decoded simulation results for the rbac contract. */
export interface RbacMethods {
  /** Replaces the RBAC implementation with installed Wasm. */
  upgrade: {
    args: { new_wasm_hash: Uint8Array; operator: string };
    result: void;
  };
  /** Returns the address currently assigned to a role. */
  get_role: { args: { role: Role }; result: string };
  /** Checks whether an operator is assigned to a role without requiring authorization. */
  has_role: { args: { role: Role; operator: string }; result: boolean };
  /** Replaces the address assigned to the minter role. */
  set_minter: { args: { new_minter: string; operator: string }; result: void };
  /** Accepts an active administrator proposal for the proposed address. */
  accept_admin: { args: { operator: string }; result: void };
  /** Cancels the active administrator proposal. */
  cancel_admin: { args: { operator: string }; result: void };
  /** Requires an operator to authorize the invocation and hold the requested role. */
  require_role: { args: { role: Role; operator: string }; result: void };
  /** Replaces the address assigned to the upgrader role. */
  set_upgrader: {
    args: { new_upgrader: string; operator: string };
    result: void;
  };
  /** Proposes an address as the next administrator. */
  propose_admin: {
    args: { new_admin: string; operator: string };
    result: void;
  };
  /** Replaces the address assigned to the treasurer role. */
  set_treasurer: {
    args: { new_treasurer: string; operator: string };
    result: void;
  };
  /** Assigns the dedicated rebalance operator. */
  set_rebalancer: {
    args: { new_rebalancer: string; operator: string };
    result: void;
  };
}
