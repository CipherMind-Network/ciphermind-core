/**
 * Configuration required to initialize a {@link CipherMindClient}.
 */
export interface CipherMindConfig {
  /** Base URL of the CipherMind off-chain proving backend. */
  backendUrl: string;
  /** Soroban RPC endpoint used to submit and query transactions. */
  sorobanRpcUrl: string;
  /** Stellar contract ID (C...) that exposes `verify_and_execute`. */
  contractId: string;
  /** Network passphrase. Defaults to the public network passphrase. */
  networkPassphrase?: string;
}

/**
 * Payload sent to the proving backend to request a ZK-proof.
 */
export interface ProofRequest {
  /** Stellar public key (G...) of the requesting user. */
  userAddress: string;
  /** Private inputs fed into the proving circuit. */
  inputData: number[];
}

/**
 * Response returned by the proving backend after a successful proof.
 */
export interface ProofResponse {
  /** Backend status, e.g. `"success"`. */
  status: string;
  /** Hex-encoded proof, ready to be passed to the verifier contract. */
  proof: string;
  /** Public inputs that must accompany the proof on-chain. */
  inputs: number[];
  /** Hash of the model/circuit the proof was generated against. */
  modelHash: string;
}
