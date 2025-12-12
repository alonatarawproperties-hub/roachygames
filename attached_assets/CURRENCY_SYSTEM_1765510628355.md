# Roachy Games Currency System

The Roachy Games ecosystem features three distinct currencies, each serving specific purposes within the platform.

---

## 1. CHY Coins (In-Game Currency)

### What is CHY?
CHY Coins are the **soft in-game currency** earned through gameplay. They represent your skill and dedication as a player.

### How to Earn CHY
| Method | Earnings |
|--------|----------|
| **Flappy Roach** | Base: 35 CHY per game (up to 1.5x skill multiplier) |
| **Roachy Battles** | Base: 55 CHY per win (with underdog bonus) |

### Earning Formula
```
CHY Earned = Base Reward × Skill Multiplier × Activity Normalizer
```

- **Skill Multiplier**: Up to 1.5x based on performance
- **Activity Normalizer**: Prevents grinding (fatigue system after 5 sessions)

### Daily Limits
| Limit | Amount |
|-------|--------|
| Daily Cap | 500 CHY |
| Per-Game Cap | 70% of daily (350 CHY max per game) |
| Weekly Cap | 2,500 CHY |

### What Can You Do With CHY?
- Convert to **Diamonds** (120 CHY = 1 Diamond, 72-hour lock)
- Purchase cosmetics from the marketplace
- Trade for in-game items

### Anti-Abuse Protections
- Fatigue system reduces earnings after 5+ sessions
- Suspicious activity detection (24-hour penalty)
- Session-based decay to encourage quality over quantity

---

## 2. $ROACHY Token (Blockchain Currency)

### What is $ROACHY?
$ROACHY is the **native SPL token** on Solana - a real cryptocurrency with tradeable value.

### Token Details
| Property | Value |
|----------|-------|
| **Symbol** | $ROACHY |
| **Network** | Solana |
| **Mint Address** | `BJqV6DGuHY8U8KYpBGHVV74YMjJYHdYMPfb1g7dppump` |
| **Decimals** | 6 |

### How to Get $ROACHY
1. **Buy on Pump.fun** - Direct purchase
2. **Earn through P2E** - Leaderboard rewards
3. **Staking rewards** - Earn by staking

### What Can You Do With $ROACHY?
| Action | Details |
|--------|---------|
| **Stake** | Earn passive ROACHY + Diamonds (30% APR) |
| **Swap to Diamonds** | 5,000 ROACHY = 1 Diamond (instant) |
| **Trade** | Buy/sell on DEXs |
| **Top Holder Access** | 10M+ tokens = exclusive portal |

### Token Distribution (Revenue Allocation)
| Category | Percentage | Purpose |
|----------|------------|---------|
| P2E Rewards | 30% | Player earnings |
| Staking Rewards | 20% | Staker rewards |
| CEX Liquidity | 15% | Exchange listings |
| Development | 10% | Platform building |
| Marketing | 10% | Growth campaigns |
| Weekly Burn | 10% | Deflationary mechanism |
| Team | 5% | Operations |

### Key Wallets
| Wallet | Address | Purpose |
|--------|---------|---------|
| Treasury | `HEAC2k6qtrvtvWTTNRR5PWk5SZ7wU2UwLsGAvkrVuFG8` | Central treasury |
| Staking Pool | `6ZWr7gvWref9FaBvEKtE3HRFi86FKuuhVBj5G11HHodu` | Rewards pool |
| Staking Escrow | `H16Gkebw1mkXBcnPfPLpW5yQ9QHKTpi24LrBpdD5s1GH` | Locked stakes |

---

## 3. Diamonds (Premium Currency)

### What are Diamonds?
Diamonds (DIAS) are the **premium currency** of Roachy Games - an SPL token on Solana's Token-2022 program.

### Token Details
| Property | Value |
|----------|-------|
| **Symbol** | DIAS |
| **Network** | Solana (Token-2022) |
| **Mint Address** | `28AUaEftPy8L9bhuFusG84RYynFwjnNCVwT2jkyTz6CA` |
| **Decimals** | 9 |
| **Total Supply** | 5,000,000 DIAS |

### How to Get Diamonds
| Method | Conversion Rate |
|--------|-----------------|
| **Swap $ROACHY** | 5,000 ROACHY = 1 Diamond (instant) |
| **Convert CHY** | 120 CHY = 1 Diamond (72-hour lock) |
| **Stake $ROACHY** | 800 ROACHY staked earns 1 Diamond |
| **Win Chess Matches** | P2E rewards pool |
| **Tournament Prizes** | Prize pool distributions |

### What Can You Do With Diamonds?
| Feature | Cost |
|---------|------|
| **NFT Gacha Summons** | 5-50 Diamonds per summon |
| **Chess Wagers** | 1/5/10/20/50 Diamonds |
| **Tournament Entry** | 1/5/15 Diamonds |
| **Premium Marketplace** | Varies by item |
| **Exclusive Cosmetics** | Limited edition items |

### Staking Diamond Rewards
- Earned alongside ROACHY at **800:1 ratio**
- Example: 800,000 ROACHY staked = 1 Diamond per emission cycle
- 181-day emission period

---

## Currency Flow Summary

```
┌─────────────────────────────────────────────────────────────┐
│                        EARN                                 │
├─────────────────────────────────────────────────────────────┤
│  Play Games ──► CHY Coins     (soft currency)              │
│  Buy/Trade ───► $ROACHY       (blockchain token)           │
│  Stake ───────► Diamonds      (premium currency)           │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                      CONVERT                                │
├─────────────────────────────────────────────────────────────┤
│  CHY ──────────► Diamonds    (120:1, 72hr lock)            │
│  $ROACHY ──────► Diamonds    (5,000:1, instant)            │
│  Staking ──────► ROACHY + Diamonds (passive earning)       │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                        SPEND                                │
├─────────────────────────────────────────────────────────────┤
│  CHY ─────────► Cosmetics, marketplace items               │
│  Diamonds ────► Gacha, wagers, tournaments, premium items  │
│  $ROACHY ─────► Trade, stake, convert, top holder access   │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Reference Card

| Currency | Type | Earn By | Spend On | Conversion |
|----------|------|---------|----------|------------|
| **CHY** | Soft | Playing games | Cosmetics, items | 120 CHY → 1 Diamond |
| **$ROACHY** | Blockchain | Buy, P2E, staking | Stake, trade, swap | 5,000 → 1 Diamond |
| **Diamonds** | Premium | Stake, swap, convert | Gacha, wagers, premium | N/A (top tier) |

---

## API Endpoints for Mobile App

### Economy Stats
```
GET /api/economy/stats/:walletAddress
Response: { balance, diamonds, roachyTokens, daily, weekly, fatigue, config }
```

### Record Game Session
```
POST /api/economy/session
Body: { walletAddress, gameType, score, duration, gameData }
Response: { success, earnings: { chyEarned, diamondShardsEarned, skillMultiplier, ... } }
```

### Staking Status
```
GET /api/staking/:address
Response: { stakedAmount, pendingRoachyRewards, pendingDiamondRewards, lockExpiresAt, ... }
```

### Diamond Conversion (ROACHY → Diamonds)
```
POST /api/roachy-swap/initiate
Body: { walletAddress, roachyAmount }
Response: { success, transaction, diamondsToReceive }
```

### Wallet Balance
```
GET /api/wallet/:address
Response: { wallet: { address, coins, diamonds, roachyTokens } }
```

### On-Chain Balances
```
GET /api/solana/roachy-balance/:address
GET /api/solana/diamond-balance/:address
```
