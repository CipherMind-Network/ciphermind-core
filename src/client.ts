import {
  Contract,
  Keypair,
  Networks,
  TransactionBuilder,
  rpc,
} from '@stellar/stellar-sdk';
import { buildVerifyArgs } from './contract';
import type { CipherMindConfig, ProofRequest, ProofResponse } from './types';

/**
 * Client for the CipherMind off-chain proving backend and the on-chain
 * Soroban verifier contract.
 */
export class CipherMindClient {
  private readonly config: CipherMindConfig;
  private readonly server: rpc.Server;

  constructor(config: CipherMindConfig) {
    this.config = config;
    this.server = new rpc.Server(config.sorobanRpcUrl);
  }

  /** Base URL of the configured proving backend. */
  get backendUrl(): string {
    return this.config.backendUrl;
  }

  /** Soroban contract ID exposing `verify_and_execute`. */
  get contractId(): string {
    return this.config.contractId;
  }

  /**
   * Requests a ZK-proof from the CipherMind backend.
   *
   * @param req proof request containing the user address and private inputs
   */
  async requestProof(req: ProofRequest): Promise<ProofResponse> {
    const url = `${this.config.backendUrl.replace(/\/+$/, '')}/api/generate-proof`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `CipherMind backend request failed (${response.status}): ${body}`,
      );
    }

    return (await response.json()) as ProofResponse;
  }

  /**
   * Submits a `verify_and_execute` transaction to the Soroban verifier
   * contract, signed by the provided keypair secret.
   *
   * @param proofResponse       proof payload returned by {@link requestProof}
   * @param signerKeypairOrSecret Stellar secret seed (S...) used to sign the tx
   * @returns the submitted transaction hash
   */
  async verifyProofOnChain(
    proofResponse: ProofResponse,
    signerKeypairOrSecret: string,
  ): Promise<string> {
    const sourceKeypair = Keypair.fromSecret(signerKeypairOrSecret);
    const networkPassphrase = this.config.networkPassphrase ?? Networks.PUBLIC;

    const sourceAccount = await this.server.getAccount(
      sourceKeypair.publicKey(),
    );

    const contract = new Contract(this.config.contractId);
    const args = buildVerifyArgs(proofResponse);

    const transaction = new TransactionBuilder(sourceAccount, {
      fee: '100000',
      networkPassphrase,
    })
      .addOperation(contract.call('verify_and_execute', ...args))
      .setTimeout(30)
      .build();

    const prepared = await this.server.prepareTransaction(transaction);
    prepared.sign(sourceKeypair);

    const sendResponse = await this.server.sendTransaction(prepared);

    if (sendResponse.status === 'ERROR') {
      const errorResult = sendResponse.errorResult?.toXDR('base64') ?? 'unknown';
      throw new Error(
        `Failed to submit verify_and_execute transaction: ${errorResult}`,
      );
    }

    return sendResponse.hash;
  }
}
