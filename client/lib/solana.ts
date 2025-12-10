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

const TOKEN_2022_PROGRAM_ID = new PublicKey(
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
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
    const roachyMint = new PublicKey(TOKEN_MINTS.ROACHY);
    const diamondsMint = new PublicKey(TOKEN_MINTS.DIAMONDS);

    const [
      tokenAccounts,
      token2022Accounts,
      roachyAccounts,
      diamondsAccounts,
    ] = await Promise.all([
      connection.getParsedTokenAccountsByOwner(owner, {
        programId: TOKEN_PROGRAM_ID,
      }),
      connection.getParsedTokenAccountsByOwner(owner, {
        programId: TOKEN_2022_PROGRAM_ID,
      }),
      connection.getParsedTokenAccountsByOwner(owner, {
        mint: roachyMint,
      }).catch(() => ({ value: [] })),
      connection.getParsedTokenAccountsByOwner(owner, {
        mint: diamondsMint,
      }).catch(() => ({ value: [] })),
    ]);

    let roachy = 0;
    let diamonds = 0;

    console.log(
      `[Solana] Fetching balances for ${walletAddress.slice(0, 8)}...`
    );
    console.log(
      `[Solana] Token Program accounts: ${tokenAccounts.value.length}, Token2022 accounts: ${token2022Accounts.value.length}`
    );
    console.log(
      `[Solana] Direct mint query - ROACHY accounts: ${roachyAccounts.value.length}, DIAMONDS accounts: ${diamondsAccounts.value.length}`
    );

    for (const account of roachyAccounts.value) {
      const parsedInfo = account.account.data.parsed?.info;
      if (parsedInfo?.tokenAmount?.uiAmount) {
        roachy = parsedInfo.tokenAmount.uiAmount;
        console.log(`[Solana] Found ROACHY via direct query: ${roachy}`);
      }
    }

    for (const account of diamondsAccounts.value) {
      const parsedInfo = account.account.data.parsed?.info;
      if (parsedInfo?.tokenAmount?.uiAmount) {
        diamonds = parsedInfo.tokenAmount.uiAmount;
        console.log(`[Solana] Found DIAMONDS via direct query: ${diamonds}`);
      }
    }

    if (roachy === 0 || diamonds === 0) {
      const allAccounts = [
        ...tokenAccounts.value,
        ...token2022Accounts.value,
      ];

      for (const account of allAccounts) {
        const parsedInfo = account.account.data.parsed?.info;
        if (!parsedInfo) continue;

        const mint = parsedInfo.mint;
        const uiAmount = parsedInfo.tokenAmount?.uiAmount || 0;

        if (mint === TOKEN_MINTS.ROACHY && roachy === 0) {
          roachy = uiAmount;
          console.log(`[Solana] Found ROACHY via program scan: ${roachy}`);
        } else if (mint === TOKEN_MINTS.DIAMONDS && diamonds === 0) {
          diamonds = uiAmount;
          console.log(`[Solana] Found DIAMONDS via program scan: ${diamonds}`);
        }
      }
    }

    console.log(`[Solana] Final balances - ROACHY: ${roachy}, DIAMONDS: ${diamonds}`);
    return { roachy, diamonds };
  } catch (error) {
    console.error("Failed to fetch token balances:", error);
    return { roachy: 0, diamonds: 0 };
  }
}
