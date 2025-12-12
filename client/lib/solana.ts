import { Connection, PublicKey } from "@solana/web3.js";

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

const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
);

export interface TokenBalances {
  roachy: number;
  diamonds: number;
}

export interface TokenPrices {
  roachyPrice: number;
  roachyPriceChange24h: number;
}

export async function fetchRoachyPrice(): Promise<TokenPrices> {
  try {
    const response = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${TOKEN_MINTS.ROACHY}`
    );
    
    if (!response.ok) {
      throw new Error(`DexScreener API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.pairs && data.pairs.length > 0) {
      const pair = data.pairs[0];
      const price = parseFloat(pair.priceUsd) || 0;
      const priceChange = parseFloat(pair.priceChange?.h24) || 0;
      
      console.log(`[DexScreener] ROACHY price: $${price}, 24h change: ${priceChange}%`);
      
      return {
        roachyPrice: price,
        roachyPriceChange24h: priceChange,
      };
    }
    
    console.log("[DexScreener] No pairs found for ROACHY token");
    return { roachyPrice: 0, roachyPriceChange24h: 0 };
  } catch (error) {
    console.error("[DexScreener] Failed to fetch ROACHY price:", error);
    return { roachyPrice: 0, roachyPriceChange24h: 0 };
  }
}

function getAssociatedTokenAddress(
  mint: PublicKey,
  owner: PublicKey,
  programId: PublicKey
): PublicKey {
  const [address] = PublicKey.findProgramAddressSync(
    [owner.toBytes(), programId.toBytes(), mint.toBytes()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  return address;
}

async function getTokenBalance(
  connection: Connection,
  owner: PublicKey,
  mint: PublicKey,
  programId: PublicKey
): Promise<number> {
  try {
    const ata = getAssociatedTokenAddress(mint, owner, programId);
    const accountInfo = await connection.getParsedAccountInfo(ata);
    
    if (accountInfo.value) {
      const data = accountInfo.value.data as any;
      if (data?.parsed?.info?.tokenAmount?.uiAmount !== undefined) {
        return data.parsed.info.tokenAmount.uiAmount;
      }
    }
    return 0;
  } catch {
    return 0;
  }
}

export async function fetchTokenBalances(
  walletAddress: string
): Promise<TokenBalances> {
  const connection = getConnection();
  const owner = new PublicKey(walletAddress);
  const roachyMint = new PublicKey(TOKEN_MINTS.ROACHY);
  const diamondsMint = new PublicKey(TOKEN_MINTS.DIAMONDS);

  console.log(`[Solana] Fetching balances for ${walletAddress.slice(0, 8)}...`);

  try {
    const [roachyBalance, diamondsBalance] = await Promise.all([
      getTokenBalance(connection, owner, roachyMint, TOKEN_PROGRAM_ID),
      getTokenBalance(connection, owner, diamondsMint, TOKEN_2022_PROGRAM_ID),
    ]);

    console.log(`[Solana] ROACHY (Token Program): ${roachyBalance}`);
    console.log(`[Solana] DIAMONDS (Token 2022): ${diamondsBalance}`);

    let roachy = roachyBalance;
    let diamonds = diamondsBalance;

    if (roachy === 0 || diamonds === 0) {
      console.log(`[Solana] Fallback: scanning all token accounts...`);
      
      const [tokenAccounts, token2022Accounts] = await Promise.all([
        connection.getParsedTokenAccountsByOwner(owner, {
          programId: TOKEN_PROGRAM_ID,
        }),
        connection.getParsedTokenAccountsByOwner(owner, {
          programId: TOKEN_2022_PROGRAM_ID,
        }),
      ]);

      const allAccounts = [...tokenAccounts.value, ...token2022Accounts.value];
      console.log(`[Solana] Found ${allAccounts.length} total token accounts`);

      for (const account of allAccounts) {
        const parsedInfo = account.account.data.parsed?.info;
        if (!parsedInfo) continue;

        const mint = parsedInfo.mint;
        const uiAmount = parsedInfo.tokenAmount?.uiAmount || 0;

        console.log(`[Solana] Account mint: ${mint}, balance: ${uiAmount}`);

        if (mint === TOKEN_MINTS.ROACHY && roachy === 0) {
          roachy = uiAmount;
        } else if (mint === TOKEN_MINTS.DIAMONDS && diamonds === 0) {
          diamonds = uiAmount;
        }
      }
    }

    console.log(`[Solana] Final - ROACHY: ${roachy}, DIAMONDS: ${diamonds}`);
    return { roachy, diamonds };
  } catch (error) {
    console.error("[Solana] Failed to fetch token balances:", error);
    return { roachy: 0, diamonds: 0 };
  }
}
