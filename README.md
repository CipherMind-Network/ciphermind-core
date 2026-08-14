# @ciphermind/core

Lightweight TypeScript client SDK for the **CipherMind** off-chain proving
backend and the on-chain Soroban verifier contract. It lets you request ZK-proofs
from the backend and submit `verify_and_execute` transactions to Soroban with a
few lines of code.

## Installation

```bash
npm install @ciphermind/core
```

Requires Node.js `>=18`.

## Quick start

```ts
import { CipherMindClient } from '@ciphermind/core';

const client = new CipherMindClient({
  backendUrl: 'https://prover.ciphermind.example',
  sorobanRpcUrl: 'https://soroban-testnet.stellar.org',
  contractId: 'CBIROOQ5S7BXOBPCT33Y2XY4HW7SRPVVAWV5UCHQNXT4LJ5XGAAAAAAAA',
  networkPassphrase: 'Test SDF Network ; September 2015',
});

// 1. Request a proof from the off-chain backend.
const proof = await client.requestProof({
  userAddress: 'GDJ2...',
  inputData: [1, 2, 3],
});

// 2. Submit the proof to the verifier contract on Soroban.
const txHash = await client.verifyProofOnChain(proof, 'S...');
console.log('Submitted transaction:', txHash);
```

## Configuration

| Option               | Type     | Required | Description                                           |
| -------------------- | -------- | -------- | ----------------------------------------------------- |
| `backendUrl`         | `string` | yes      | Base URL of the CipherMind proving backend.           |
| `sorobanRpcUrl`      | `string` | yes      | Soroban RPC endpoint.                                 |
| `contractId`         | `string` | yes      | Contract ID (`C...`) exposing `verify_and_execute`.   |
| `networkPassphrase`  | `string` | no       | Network passphrase. Defaults to the public network.   |

## API

### `CipherMindClient`

#### `requestProof(req: ProofRequest): Promise<ProofResponse>`

Posts a `ProofRequest` to `POST {backendUrl}/api/generate-proof` and returns the
proof payload.

```ts
interface ProofRequest {
  userAddress: string;
  inputData: number[];
}

interface ProofResponse {
  status: string;
  proof: string;      // hex-encoded proof
  inputs: number[];   // public inputs
  modelHash: string;  // hash of the model/circuit
}
```

#### `verifyProofOnChain(proofResponse, signerKeypairOrSecret): Promise<string>`

Builds and submits a Soroban `verify_and_execute` transaction signed by the
provided secret seed (`S...`), returning the transaction hash.

### Contract helpers

Helpers are exported to convert proof payloads into Soroban `ScVal` arguments:

- `proofToScVal(proof: string): xdr.ScVal` — hex proof → `Bytes` ScVal.
- `modelHashToScVal(modelHash: string): xdr.ScVal` — hash → `Bytes` ScVal.
- `inputsToScVal(inputs: number[], valueType?): xdr.ScVal` — numbers → `Vec<i128>`.
- `buildVerifyArgs(proofResponse): xdr.ScVal[]` — ordered args for the contract.
- `hexToBuffer(hex: string): Buffer`, `stripHexPrefix(hex: string): string`.

## Development

```bash
npm install   # install dependencies
npm run build # bundle CJS + ESM + type declarations (tsup)
npm test      # run the vitest suite
npm run dev   # watch mode
```

## License

MIT
