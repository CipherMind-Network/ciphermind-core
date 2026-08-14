import { nativeToScVal, xdr } from '@stellar/stellar-sdk';
import type { ProofResponse } from './types';

/**
 * Strips a leading `0x` prefix from a hex string, if present.
 */
export function stripHexPrefix(hex: string): string {
  return hex.startsWith('0x') ? hex.slice(2) : hex;
}

/**
 * Converts a hex string (optionally `0x`-prefixed) into a byte buffer.
 */
export function hexToBuffer(hex: string): Buffer {
  const clean = stripHexPrefix(hex);
  if (clean.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(clean)) {
    throw new Error(`Invalid hexadecimal string: "${hex}"`);
  }
  return Buffer.from(clean, 'hex');
}

/**
 * Converts a hex-encoded proof into a Soroban `Bytes` ScVal.
 */
export function proofToScVal(proof: string): xdr.ScVal {
  return nativeToScVal(hexToBuffer(proof));
}

/**
 * Converts a model/circuit hash into a Soroban `Bytes` ScVal.
 */
export function modelHashToScVal(modelHash: string): xdr.ScVal {
  return nativeToScVal(hexToBuffer(modelHash));
}

/**
 * Converts an array of numbers into a Soroban vector ScVal.
 *
 * @param inputs      public inputs to encode
 * @param valueType   ScVal integer width for each element (defaults to `i128`)
 */
export function inputsToScVal(
  inputs: number[],
  valueType: 'i128' | 'u128' | 'i64' | 'u64' = 'i128',
): xdr.ScVal {
  return xdr.ScVal.scvVec(
    inputs.map((value) => nativeToScVal(value, { type: valueType })),
  );
}

/**
 * Builds the ordered ScVal arguments expected by the `verify_and_execute`
 * contract method from a backend proof response.
 */
export function buildVerifyArgs(proofResponse: ProofResponse): xdr.ScVal[] {
  return [
    proofToScVal(proofResponse.proof),
    inputsToScVal(proofResponse.inputs),
    modelHashToScVal(proofResponse.modelHash),
  ];
}
