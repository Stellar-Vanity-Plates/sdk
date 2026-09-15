import {
  Contract,
  type ContractConstructorArgs,
  Spec as NativeSpec,
  type TransactionConfig,
} from "@colibri/core";
/** Native Stellar ABI specification accepted by compatibility checks. */
export type Spec = NativeSpec;
import { isPlateAddress } from "@/validation.ts";
import {
  IncompatibleContractSpecError,
  InvalidProtocolContractAddressError,
} from "@/errors.ts";

/** Connection and Colibri pipeline extensions for a single protocol contract. */
export interface ClientOptions {
  /** Explicit network; no implicit Testnet or Mainnet selection. */
  networkConfig: ContractConstructorArgs["networkConfig"];
  /** Checksum-valid C address for this contract. */
  contractId: string;
  /** Optional Colibri-compatible Stellar RPC server. */
  rpc?: ContractConstructorArgs["rpc"];
  /** Plugins attached to the owned read and invoke pipelines. */
  plugins?: ContractConstructorArgs["contractConfig"]["plugins"];
}

function abi(entries: readonly unknown[]): Map<string, string> {
  const normalized = JSON.parse(
    JSON.stringify(
      entries,
      (key, value) => key === "doc" || key === "lib" ? undefined : value,
    ),
  ) as Record<string, { name?: string }>[];
  return new Map(normalized.flatMap((entry) => {
    const [kind, value] = Object.entries(entry)[0];
    return value.name && value.name !== "__constructor" &&
        (kind === "function_v0" || kind.startsWith("udt_"))
      ? [[`${kind}:${value.name}`, JSON.stringify(value)]]
      : [];
  }));
}

/** Verifies the bundled ABI against a loaded contract; additive methods are allowed. */
export function assertCompatibleSpec(expected: Spec, actual: Spec): void {
  const found = abi(actual.entries);
  for (const [name, shape] of abi(expected.entries)) {
    if (found.get(name) !== shape) {
      throw new IncompatibleContractSpecError(name);
    }
  }
}

/** Typed invocation arguments, including explicit transaction authorization. */
export type InvocationOptions = {
  /** Colibri fee, source, timeout and signer configuration. */
  config: TransactionConfig;
  /** Optional pre-built Soroban authorization entries. */
  auth?: Parameters<Contract["invoke"]>[0]["auth"];
};

/** Adapts canonical Colibri inputs/outputs to the existing SDK method-map names. */
export type MethodMap<
  M extends { [K in keyof M]: { input: object; output: unknown } },
> = {
  [K in keyof M]: { args: M[K]["input"]; result: M[K]["output"] };
};

/** A typed facade over Colibri's owned read and invoke pipelines. */
export class ProtocolClient<
  M extends { [K in keyof M]: { args: object; result: unknown } },
> {
  /** Underlying Colibri contract for advanced pipelines and plugins. */
  readonly contract: Contract;
  private readonly expected: Spec;
  private initialization?: Promise<void>;

  /** Binds an explicit deployment to a captured public specification; performs no network request. */
  constructor(
    options: ClientOptions,
    entries: readonly string[],
    createContract: (args: ContractConstructorArgs) => Contract = (args) =>
      new Contract(args),
  ) {
    if (!isPlateAddress(options.contractId, "contract")) {
      throw new InvalidProtocolContractAddressError();
    }
    this.expected = new NativeSpec([...entries]);
    this.contract = createContract({
      networkConfig: options.networkConfig,
      rpc: options.rpc,
      contractConfig: {
        contractId: options.contractId,
        spec: this.expected,
        plugins: options.plugins,
      },
    });
  }

  /** Loads and checks the live ABI once per client. Recreate the client after a contract upgrade. */
  async ready(): Promise<void> {
    if (!this.initialization) {
      this.initialization = this.contract.loadSpecFromNetwork().then(() => {
        assertCompatibleSpec(this.expected, this.contract.getSpec());
      }).catch((error) => {
        this.initialization = undefined;
        throw error;
      });
    }
    await this.initialization;
  }

  /** Simulates and decodes a method without signing or submitting a transaction. */
  async read<K extends keyof M & string>(
    method: K,
    args: M[K]["args"],
  ): Promise<M[K]["result"]> {
    await this.ready();
    return await this.contract.read({
      method,
      methodArgs: args,
    }) as M[K]["result"];
  }

  /** Simulates, signs and submits through Colibri. Returns its transaction receipt, not a simulated result. */
  async invoke<K extends keyof M & string>(
    method: K,
    args: M[K]["args"],
    options: InvocationOptions,
  ): Promise<Awaited<ReturnType<Contract["invoke"]>>> {
    await this.ready();
    return await this.contract.invoke({ method, methodArgs: args, ...options });
  }
}
