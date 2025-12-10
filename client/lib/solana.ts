import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";

const RPC_ENDPOINT = "https://api.mainnet-beta.solana.com";

let connectionInstance: Connection | null = null;

export function getConnection(): Connection {
  if (!connectionInstance) {
    connectionInstance = new Connection(RPC_ENDPOINT, "confirmed");
  }
  return connectionInstance;
}

export const TOKEN_MINTS = {
  ROACHY: "BJqV6DGuHY8U8KYpBGHVV74YMjJYHdYMPfb1g7dppump",
  DIAMONDS: "28AUaEftPy8L9bhuFusG84RYynFwjnNCVwT2jkyTz6CA",
};

const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);

export interface TokenBalances {
  roachy: number;
  diamonds: number;
}

export async function fetchTokenBalances(
  walletAddress: string
): Promise<TokenBalances> {
  const connection = getConnection();
  const owner = new PublicKey(walletAddress);

  try {
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      owner,
      { programId: TOKEN_PROGRAM_ID }
    );

    let roachy = 0;
    let diamonds = 0;

    for (const account of tokenAccounts.value) {
      const parsedInfo = account.account.data.parsed?.info;
      if (!parsedInfo) continue;

      const mint = parsedInfo.mint;
      const uiAmount = parsedInfo.tokenAmount?.uiAmount || 0;

      if (mint === TOKEN_MINTS.ROACHY) {
        roachy = uiAmount;
      } else if (mint === TOKEN_MINTS.DIAMONDS) {
        diamonds = uiAmount;
      }
    }

    return { roachy, diamonds };
  } catch (error) {
    console.error("Failed to fetch token balances:", error);
    return { roachy: 0, diamonds: 0 };
  }
}
