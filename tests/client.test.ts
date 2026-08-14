import { afterEach, describe, expect, it, vi } from 'vitest';
import { xdr } from '@stellar/stellar-sdk';
import { CipherMindClient } from '../src/client';
import {
  buildVerifyArgs,
  hexToBuffer,
  inputsToScVal,
  proofToScVal,
  stripHexPrefix,
} from '../src/contract';
import type { CipherMindConfig, ProofResponse } from '../src/types';

const config: CipherMindConfig = {
  backendUrl: 'https://backend.ciphermind.example',
  sorobanRpcUrl: 'https://soroban-testnet.stellar.org',
  contractId:
    'CBIROOQ5S7BXOBPCT33Y2XY4HW7SRPVVAWV5UCHQNXT4LJ5XGAAAAAAAA',
  networkPassphrase: 'Test SDF Network ; September 2015',
};

const mockProof: ProofResponse = {
  status: 'success',
  proof: '0xdeadbeef',
  inputs: [1, 2, 3],
  modelHash: '0xabcdef',
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('CipherMindClient', () => {
  it('instantiates with a valid config', () => {
    const client = new CipherMindClient(config);
    expect(client).toBeInstanceOf(CipherMindClient);
    expect(client.backendUrl).toBe(config.backendUrl);
    expect(client.contractId).toBe(config.contractId);
  });

  it('requests a proof from the backend', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockProof,
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new CipherMindClient(config);
    const result = await client.requestProof({
      userAddress: 'GDJ2B5NJ6M4Z2Y6Z3N7W7W7W7W7W7W7W7W7W7W7W7W7W7W7W7W7W7W7W',
      inputData: [1, 2, 3],
    });

    expect(result).toEqual(mockProof);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://backend.ciphermind.example/api/generate-proof',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      userAddress: expect.any(String),
      inputData: [1, 2, 3],
    });
  });

  it('strips trailing slashes from the backend URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockProof,
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = new CipherMindClient({
      ...config,
      backendUrl: 'https://backend.ciphermind.example///',
    });
    await client.requestProof({ userAddress: 'G', inputData: [] });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://backend.ciphermind.example/api/generate-proof',
      expect.any(Object),
    );
  });

  it('throws when the backend returns a non-OK status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'internal error',
      }),
    );

    const client = new CipherMindClient(config);
    await expect(
      client.requestProof({ userAddress: 'G', inputData: [] }),
    ).rejects.toThrow('CipherMind backend request failed (500)');
  });
});

describe('contract helpers', () => {
  it('strips the 0x prefix', () => {
    expect(stripHexPrefix('0xdeadbeef')).toBe('deadbeef');
    expect(stripHexPrefix('deadbeef')).toBe('deadbeef');
  });

  it('converts hex to a buffer', () => {
    expect(hexToBuffer('0xdeadbeef').toString('hex')).toBe('deadbeef');
  });

  it('rejects invalid hex', () => {
    expect(() => hexToBuffer('zz')).toThrow('Invalid hexadecimal string');
    expect(() => hexToBuffer('abc')).toThrow('Invalid hexadecimal string');
  });

  it('converts a proof into a Bytes ScVal', () => {
    const scval = proofToScVal('0xdeadbeef');
    expect(scval.switch()).toBe(xdr.ScValType.scvBytes());
  });

  it('converts inputs into a Vec<i128> ScVal', () => {
    const scval = inputsToScVal([1, -2, 3]);
    expect(scval.switch()).toBe(xdr.ScValType.scvVec());
    expect(scval.vec()).toHaveLength(3);
  });

  it('builds ordered verify args from a proof response', () => {
    const args = buildVerifyArgs(mockProof);
    expect(args).toHaveLength(3);
    expect(args[0].switch()).toBe(xdr.ScValType.scvBytes());
    expect(args[1].switch()).toBe(xdr.ScValType.scvVec());
    expect(args[2].switch()).toBe(xdr.ScValType.scvBytes());
  });
});
