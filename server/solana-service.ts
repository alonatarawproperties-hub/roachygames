import { Connection, PublicKey, GetProgramAccountsFilter } from "@solana/web3.js";
import { SOLANA_TOKENS, SOLANA_RPC_ENDPOINTS, ACTIVE_NETWORK } from "../shared/solana-tokens";

const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const TOKEN_2022_PROGRAM_ID = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");

let connection: Connection | null = null;

function getConnection(): Connection {
  if (!connection) {
    connection = new Connection(SOLANA_RPC_ENDPOINTS[ACTIVE_NETWORK], "confirmed");
  }
  return connection;
}

interface TokenBalance {
  mint: string;
  balance: number;
  uiBalance: number;
  decimals: number;
}

export async function getTokenBalance(
  walletAddress: string,
  tokenMint: string,
  decimals: number
): Promise<TokenBalance> {
  try {
    const conn = getConnection();
    const wallet = new PublicKey(walletAddress);
    const mint = new PublicKey(tokenMint);
    
    const tokenAccounts = await conn.getParsedTokenAccountsByOwner(wallet, {
      mint: mint,
    });

    if (tokenAccounts.value.length === 0) {
      let token2022Accounts;
      try {
        token2022Accounts = await conn.getParsedTokenAccountsByOwner(
          wallet,
          { mint: mint }
        );
      } catch {
        token2022Accounts = { value: [] };
      }
      
      if (token2022Accounts.value.length === 0) {
        return {
          mint: tokenMint,
          balance: 0,
          uiBalance: 0,
          decimals,
        };
      }
      
      const accountData = token2022Accounts.value[0].account.data.parsed.info;
      const rawBalance = parseInt(accountData.tokenAmount.amount);
      
      return {
        mint: tokenMint,
        balance: rawBalance,
        uiBalance: rawBalance / Math.pow(10, decimals),
        decimals,
      };
    }

    const accountData = tokenAccounts.value[0].account.data.parsed.info;
    const rawBalance = parseInt(accountData.tokenAmount.amount);
    
    return {
      mint: tokenMint,
      balance: rawBalance,
      uiBalance: rawBalance / Math.pow(10, decimals),
      decimals,
    };
  } catch (error) {
    console.error(`[Solana] Error fetching token balance for ${tokenMint}:`, error);
    return {
      mint: tokenMint,
      balance: 0,
      uiBalance: 0,
      decimals,
    };
  }
}

export async function getRoachyBalance(walletAddress: string): Promise<number> {
  const result = await getTokenBalance(
    walletAddress,
    SOLANA_TOKENS.ROACHY.mint,
    SOLANA_TOKENS.ROACHY.decimals
  );
  return result.uiBalance;
}

export async function getDiamondBalance(walletAddress: string): Promise<number> {
  const result = await getTokenBalance(
    walletAddress,
    SOLANA_TOKENS.DIAMOND.mint,
    SOLANA_TOKENS.DIAMOND.decimals
  );
  return result.uiBalance;
}

export async function getAllTokenBalances(walletAddress: string): Promise<{
  roachy: number;
  diamond: number;
  solBalance: number;
}> {
  try {
    const conn = getConnection();
    const wallet = new PublicKey(walletAddress);
    
    const [roachyBalance, diamondBalance, solBalance] = await Promise.all([
      getRoachyBalance(walletAddress),
      getDiamondBalance(walletAddress),
      conn.getBalance(wallet).then(lamports => lamports / 1e9),
    ]);

    return {
      roachy: roachyBalance,
      diamond: diamondBalance,
      solBalance,
    };
  } catch (error) {
    console.error("[Solana] Error fetching all balances:", error);
    return {
      roachy: 0,
      diamond: 0,
      solBalance: 0,
    };
  }
}

export function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}
