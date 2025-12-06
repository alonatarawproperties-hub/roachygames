# Roachy Hunt - Mobile Export

GPS-based creature hunting game. Find and catch Roachies in your real-world location!

## File Structure

```
roachy-hunt-export/
├── frontend/
│   ├── RoachyHunt.tsx          # Main hunt page (1381 lines)
│   ├── MapHuntView.tsx         # Leaflet map component (820 lines)
│   ├── CatchMiniGame.tsx       # Timing catch mechanic (211 lines)
│   ├── EggReveal.tsx           # Egg hatch animation (392 lines)
│   ├── RaidBattleMiniGame.tsx  # Raid boss battles (339 lines)
│   └── WalletConnect.tsx       # WalletConnect integration
│
├── backend/
│   ├── hunt-routes.ts          # All /api/hunt/* endpoints
│   ├── hunt-schema.ts          # Database tables (Drizzle ORM)
│   ├── hunt-storage.ts         # Storage implementations
│   └── hunt-storage-interface.ts # Storage interface definitions
│
└── README.md
```

## Features

### Core Gameplay
- Real GPS tracking via browser Geolocation API
- Leaflet.js map with OpenStreetMap tiles
- 5 rarity tiers: Common (60%), Uncommon (25%), Rare (10%), Epic (4%), Legendary (1%)
- 12 Roach templates across 4 classes (Tank, Assassin, Mage, Support)

### Economy System
- **Energy**: 30/day, each catch costs 1, refills at midnight
- **Daily Limit**: 25 catches/day
- **Weekly Limit**: 120 catches/week
- **Pity System**: Guaranteed Rare every 20 catches, Epic every 60
- **Legendary Cap**: 1 per 30 days per account
- **IV Variance**: ±5% stats, 1% Perfect roll (+7%)
- **Catch Quality XP**: Perfect=150, Great=75, Good=30

### Engagement Systems
1. **Catch Streaks**: Daily streak tracking, 7-day bonus = guaranteed Rare
2. **Day/Night Spawns**: Assassins at night (6pm-6am), Support during day
3. **Weather Effects**: 4 types rotate every 3 hours (40% class boost)
   - Sunny → Tank, Cloudy → Assassin, Rainy → Mage, Foggy → Support
4. **Habitat Zones**: Park/Urban detection (25% boost)
   - Park → Support/Mage, Urban → Tank/Assassin
5. **Egg Incubators**: Walk to hatch eggs (distance-based)
6. **Flash Events**: Random spawn rate boosts (10-30 min duration)
7. **Co-op Raids**: Boss battles with timing-based attacks

### Multiplayer
- WebSocket real-time player positions (`/ws/hunt`)
- Guest mode polling fallback (15-second intervals)
- Raid boss participation with damage contribution rewards

## API Endpoints

### Location & Spawns
- `POST /api/hunt/location` - Update player position
- `GET /api/hunt/nearby-spawns?latitude=X&longitude=Y` - Get nearby Roachies
- `POST /api/hunt/catch` - Catch a spawn (returns pity, IVs, egg drops)

### Economy & Stats
- `GET /api/hunt/economy/:walletAddress` - Energy, limits, pity progress
- `GET /api/hunt/leaderboard` - Top hunters

### Weather & Habitat
- `GET /api/hunt/weather` - Current weather condition
- `GET /api/hunt/habitat?latitude=X&longitude=Y` - Zone detection

### Eggs
- `GET /api/hunt/eggs/:walletAddress` - Player's eggs and incubators
- `POST /api/hunt/eggs/incubate` - Start incubating
- `POST /api/hunt/eggs/walk` - Update distance walked
- `POST /api/hunt/eggs/hatch` - Hatch ready egg

### Raids
- `GET /api/hunt/raids?latitude=X&longitude=Y` - Nearby raids
- `POST /api/hunt/raids/:raidId/join` - Join a raid
- `POST /api/hunt/raids/:raidId/attack` - Attack boss (timing-based damage)

### Flash Events
- `GET /api/hunt/flash-events` - Active and upcoming events

## Database Tables

- `hunt_player_locations` - Real-time GPS positions
- `wild_roachy_spawns` - Active spawns in the world
- `hunt_caught_roachies` - Player collections with IVs
- `hunt_leaderboard` - Catch stats and rankings
- `hunt_economy_stats` - Energy, pity, streaks, limits
- `hunt_eggs` - Eggs awaiting incubation
- `hunt_incubators` - Incubator slots

## WalletConnect Integration

Uses WalletConnect v2 with Solana adapter:
- Project ID stored in `WALLETCONNECT_PROJECT_ID` secret
- Preloads on component mount for instant QR display
- Supports Phantom mobile, Trust Wallet, etc.

## Debug Mode

Add `?debug=1` to URL for:
- Test spawn button (generates spawns at current location)
- Test raid button (spawns raid boss nearby)

## Dependencies

Frontend:
- react, react-dom
- leaflet, react-leaflet (maps)
- @solana/wallet-adapter-react
- @walletconnect/solana-adapter
- lucide-react (icons)
- framer-motion (animations)

Backend:
- express
- ws (WebSocket)
- drizzle-orm
- @neondatabase/serverless (PostgreSQL)
