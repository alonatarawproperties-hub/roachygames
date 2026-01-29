# Roachy Games - P2E Arcade Platform

## Overview
Roachy Games is a play-to-earn (P2E) arcade platform on the Solana blockchain, featuring cockroach-themed creatures called Roachies. It aims to build an engaging P2E ecosystem by launching with "Roachy Hunt" and expanding to multiple games. The platform includes a simplified authentication system (Google, Wallet, Guest) and integrates native games like Roachy Hunt, Roachy Mate (chess), and Flappy Roachy. The business vision is to cultivate a vibrant P2E gaming community with strong market potential and a robust token economy.

## User Preferences
- Custom Roachy images to be provided later (currently using class icons)
- Bundle identifiers kept as "com.cryptocreatures.app"
- Future: Wallet connection and NFT minting via marketplace dApp
- Deployment Preference: OTA updates can be pushed automatically. AAB/TestFlight builds require explicit user confirmation before building.
- NEVER recommend Expo Go - This is a native project deployed via TestFlight/Play Store only. All testing is done via OTA updates to production builds.
- Webapp is single source of truth for competitions - No automatic/hardcoded competitions. If webapp returns no competitions, mobile shows "No competitions active".

## System Architecture

### High-Level Design
The project uses an arcade platform architecture, separating platform-wide features from game-specific functionalities to support multiple P2E games.

### Frontend (Expo/React Native)
The client is built with Expo and React Native for cross-platform compatibility.

**Key Features:**
- **Arcade Home:** Central hub for game selection, token balances, live player counts, and access to rewards, profile, and marketplace.
- **Roachy Hunt Game:** GPS-based creature hunting with an "AR-like" camera system, 12 unique Roachies across 4 classes and 5 rarity tiers, egg collection, and an in-game economy. Features include onboarding, earnings tracker, activity history, achievements, and game-specific leaderboards. Uses an interactive dark-themed Leaflet WebView map with custom markers.
- **Native Games:**
    - **Roachy Mate (Chess):** Native chess game using `chess.js` with Stockfish AI (4 difficulty levels) running server-side.
    - **Flappy Roachy:** Endless flyer game with an NFT skin system.
    - **Roachy Battles:** 3v3 turn-based PvP combat with ranked matchmaking.
- **UI/UX:** Gold/brown theme with distinct class colors for Roachies.
- **Authentication:** Login options include Google (OAuth), Connect Wallet (Phantom/Solflare signature), and Guest access.
- **Daily Bonus Anti-Fraud:** Implements device fingerprinting, progressive rewards, new account cooldowns, and IP/User Agent tracking.
- **Dual Map Implementation:** `MapViewWrapper.tsx` contains synchronized Native maps (for production) and Leaflet WebView (for fallback) implementations.

### Backend (Express)
An Express.js server handles API routes, data storage, game-specific logic, and secure proxying for webapp integration.

### Game Catalog
- **Roachy Hunt (LIVE):** GPS-based creature hunting.
- **Roachy Mate (LIVE):** Native chess game with weekly arena tournaments.
- **Flappy Roachy (LIVE):** Endless flyer game with an NFT skin system.
- **Roachy Battles (LIVE):** 3v3 turn-based PvP combat with ranked matchmaking.

### Roachy Battles System
**Architecture:** Client screens for BattlesHomeScreen, TeamSelectScreen, BattleMatchmakingScreen, BattleMatchScreen (LANDSCAPE), and BattleResultScreen. Server routes (`/api/battles/*`) handle stats, roster, queue, and match management. Configuration is defined in `server/battle-config.ts` and `server/battle-routes.ts`.
**Gameplay:** Players select 3 roachies, join a matchmaking queue (with bot fallback), and engage in turn-based combat with a momentum system and specific roachy skills. Ranked tiers include Bronze to Legend.

### Web App Integration
The mobile app integrates with `roachy.games` (webapp) for token trading (redirection only), powerup shop, balance synchronization, and OAuth synchronization. All webapp API calls are proxied through the mobile backend.

### Hunt Identity System
All Hunt API endpoints (`/api/hunt/*`) are protected by `requireAuth` middleware, extracting user identity from a JWT. The client sends JWT via `Authorization: Bearer {token}` header using `apiRequest()`. React Query cache keys for Hunt APIs no longer include `walletAddress`.

### Force Update System
Allows remote blocking of outdated native builds via the webapp's `/api/mobile/config` endpoint, displaying a blocking screen only in lobby/home or at game entry until the user updates.

### Presence System
Tracks "players online" and "X playing" counts via `server/presence-routes.ts` (in-memory store with 60s timeout cleanup) and `client/context/PresenceContext.tsx` (global provider with single session management). Heartbeats are sent every 30 seconds, tracking the user's current game.

### Hunt Admin Panel
Server-side admin endpoints at `/api/admin/hunt/*` with `x-admin-api-key` header authentication (uses `ADMIN_API_KEY` env var):
- `GET /api/admin/hunt/dashboard` - Live stats (total players, active today, catches), top catchers, flagged players with suspicious activity
- `GET /api/admin/hunt/players` - List all hunt players with economy stats, sortable by catches/streak/level/eggs
- `GET /api/admin/hunt/players/:userId` - Full player detail: economy, eggs, recent catches, catch locations (for map), activity log, suspicious flags
- `POST /api/admin/hunt/players/:userId/eggs` - Edit player eggs (action: set/add/remove, with common/rare/epic/legendary counts)
- `POST /api/admin/hunt/players/:userId/clear-streak` - Clear player's current streak
- `POST /api/admin/hunt/players/:userId/reset-economy` - Reset player economy to defaults (requires confirm: "reset")
- `POST /api/admin/hunt/players/:userId/ban` - Ban/unban/suspend player (logged to audit, enforcement requires isBanned column)

**Suspicious Activity Flags:**
- `CAP_BYPASSER`: Player's catches exceed their daily cap
- `SPEED_CATCHER`: More than 10 catches in 5 minutes
- `TELEPORTER`: Catches more than 5km apart in less than 5 minutes

## External Dependencies

### Blockchain Integration
- **Network:** Solana Mainnet Beta
- **Tokens:** ROACHY (SPL Token), DIAMOND (Token-2022)
- **Price Feed:** DexScreener API for ROACHY price.
- **Balance Fetching:** On-chain balances via `@solana/web3.js`.

### Wallet Integration
- **Direct Deep-Link Protocol:** Phantom, Solflare, and Backpack wallets.
- **Reown AppKit SDK:** For WalletConnect-compatible wallets.

### Mapping and Location
- **OpenStreetMap tiles:** For Leaflet WebView map fallback.
- **Google Maps API Key:** For native Google Maps on Android.
- **Apple Developer Account:** For native Apple Maps on iOS.

### Build and Deployment
- **Expo SDK 53:** Core framework.
- **EAS Build:** For creating development, preview, and production builds.

### Cross-Platform Integration
- **Shared Identity:** JWT-based user ID from the `users` table as the universal user ID.
- **Integration Points:** Marketplace button, Deep Linking (`roachy-games://` scheme, `https://roachy.games/app/*` links), Universal Links (iOS), Intent Filters (Android).