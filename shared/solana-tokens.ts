import { PublicKey } from "@solana/web3.js";

export const SOLANA_TOKENS = {
  ROACHY: {
    name: "ROACHY",
    symbol: "ROACHY",
    mint: "BJqV6DGuHY8U8KYpBGHVV74YMjJYHdYMPfb1g7dppump",
    decimals: 6,
    description: "Main game token earned through gameplay",
  },
  DIAMOND: {
    name: "Diamond",
    symbol: "DIAMOND",
    mint: "28AUaEftPy8L9bhuFusG84RYynFwjnNCVwT2jkyTz6CA",
    decimals: 9,
    description: "Premium currency (Token-2022)",
  },
} as const;

export const SOLANA_RPC_ENDPOINTS = {
  mainnet: "https://api.mainnet-beta.solana.com",
  devnet: "https://api.devnet.solana.com",
} as const;

export const ACTIVE_NETWORK: keyof typeof SOLANA_RPC_ENDPOINTS = "mainnet";

export function getTokenMintPublicKey(token: keyof typeof SOLANA_TOKENS): PublicKey {
  return new PublicKey(SOLANA_TOKENS[token].mint);
}
