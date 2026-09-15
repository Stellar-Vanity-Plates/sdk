import { NetworkConfig } from "@colibri/core";
import {
  ConflictingNetworkSourceError,
  InvalidRpcUrlError,
  RpcNetworkDiscoveryError,
} from "@/errors.ts";

/** RPC endpoint or Colibri network. Supplying both is ambiguous and rejected. */
export interface NetworkOptions {
  /** RPC URL; the network passphrase is discovered through getNetwork. */
  rpcUrl?: string;
  /** Explicit Colibri network configuration, including its RPC endpoint. */
  networkConfig?: NetworkConfig;
}

/** Resolves the network without inferring it from an endpoint hostname. */
export async function resolveNetwork(
  options: NetworkOptions,
): Promise<NetworkConfig | undefined> {
  if (options.networkConfig !== undefined && options.rpcUrl !== undefined) {
    throw new ConflictingNetworkSourceError();
  }
  if (options.networkConfig !== undefined) return options.networkConfig;
  if (options.rpcUrl === undefined) return undefined;
  let url: URL;
  try {
    url = new URL(options.rpcUrl);
  } catch {
    throw new InvalidRpcUrlError();
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new InvalidRpcUrlError();
  }
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getNetwork" }),
    });
    const body = await response.json();
    if (
      !response.ok || body.jsonrpc !== "2.0" || body.id !== 1 || body.error ||
      typeof body.result?.passphrase !== "string" ||
      !body.result.passphrase.trim()
    ) {
      throw new RpcNetworkDiscoveryError();
    }
    return NetworkConfig.CustomNet({
      networkPassphrase: body.result.passphrase,
      rpcUrl: options.rpcUrl,
      allowHttp: url.protocol === "http:",
    });
  } catch (cause) {
    if (cause instanceof RpcNetworkDiscoveryError) throw cause;
    throw new RpcNetworkDiscoveryError(cause);
  }
}
