import { keccak_256 } from "@noble/hashes/sha3";
import { WHITELIST } from "./whitelist-addresses";

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

function normalizeAddress(address) {
  if (typeof address !== "string" || !ADDRESS_RE.test(address)) {
    throw new Error(`Invalid address: ${address}`);
  }
  return `0x${address.slice(2).toLowerCase()}`;
}

function hexToBytes(hexValue) {
  const clean = hexValue.startsWith("0x") ? hexValue.slice(2) : hexValue;
  if (clean.length % 2 !== 0) {
    throw new Error(`Invalid hex length: ${hexValue}`);
  }
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.slice(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes) {
  let out = "0x";
  for (let i = 0; i < bytes.length; i += 1) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out;
}

function compareBytes32(a, b) {
  for (let i = 0; i < 32; i += 1) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

function hashPair(a, b) {
  let left = a;
  let right = b;
  if (compareBytes32(left, right) > 0) {
    left = b;
    right = a;
  }

  const merged = new Uint8Array(64);
  merged.set(left, 0);
  merged.set(right, 32);
  return keccak_256(merged);
}

function hashLeaf(address) {
  // Solidity side: keccak256(abi.encodePacked(address))
  return keccak_256(hexToBytes(address));
}

function buildLayers(leaves) {
  const layers = [leaves];
  while (layers[layers.length - 1].length > 1) {
    const current = layers[layers.length - 1];
    const next = [];
    for (let i = 0; i < current.length; i += 2) {
      if (i + 1 >= current.length) next.push(current[i]);
      else next.push(hashPair(current[i], current[i + 1]));
    }
    layers.push(next);
  }
  return layers;
}

function buildProof(layers, leafIndex) {
  const proof = [];
  let index = leafIndex;
  for (let depth = 0; depth < layers.length - 1; depth += 1) {
    const level = layers[depth];
    const sibling = index ^ 1;
    if (sibling < level.length) {
      proof.push(bytesToHex(level[sibling]));
    }
    index = Math.floor(index / 2);
  }
  return proof;
}

function initMerkleData() {
  if (!Array.isArray(WHITELIST) || WHITELIST.length === 0) {
    throw new Error("WHITELIST is empty.");
  }

  const addresses = [];
  const addressIndex = new Map();
  const duplicates = [];

  for (const raw of WHITELIST) {
    const normalized = normalizeAddress(raw);
    if (addressIndex.has(normalized)) {
      duplicates.push(normalized);
      continue;
    }
    addressIndex.set(normalized, addresses.length);
    addresses.push(normalized);
  }

  const leaves = addresses.map((addr) => hashLeaf(addr));
  const layers = buildLayers(leaves);
  const merkleRoot = bytesToHex(layers[layers.length - 1][0]);

  return {
    addresses,
    addressIndex,
    leaves,
    layers,
    merkleRoot,
    duplicates,
  };
}

const MERKLE_DATA = initMerkleData();

export function getMerkleRoot() {
  return MERKLE_DATA.merkleRoot;
}

export function getWhitelistProof(targetAddress) {
  const account = normalizeAddress(targetAddress);
  const index = MERKLE_DATA.addressIndex.get(account);
  if (index === undefined) {
    throw new Error(`Address not found in whitelist: ${account}`);
  }

  return {
    account,
    leaf: bytesToHex(MERKLE_DATA.leaves[index]),
    proof: buildProof(MERKLE_DATA.layers, index),
    merkleRoot: MERKLE_DATA.merkleRoot,
  };
}

export function isWhitelistedAddress(targetAddress) {
  try {
    const account = normalizeAddress(targetAddress);
    return MERKLE_DATA.addressIndex.has(account);
  } catch {
    return false;
  }
}

export function getWhitelistStats() {
  return {
    count: MERKLE_DATA.addresses.length,
    merkleRoot: MERKLE_DATA.merkleRoot,
    duplicatesIgnored: MERKLE_DATA.duplicates,
  };
}

