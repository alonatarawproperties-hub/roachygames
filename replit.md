# Roachy Games - P2E Arcade Platform

## Overview
Roachy Games is an arcade platform for play-to-earn (P2E) games featuring Roachies (cockroach-themed creatures). The platform launches with Roachy Hunt and plans to add more games, aiming to create an engaging P2E ecosystem on the Solana blockchain.

## User Preferences
- Custom Roachy images to be provided later (currently using class icons)
- Bundle identifiers kept as "com.cryptocreatures.app"
- Future: Wallet connection and NFT minting via marketplace dApp

## Authentication System (Simplified - Build 107)
Login screen has **3 options only**:
1. **Sign in with Google** - OAuth via `expo-auth-session`
2. **Connect Wallet** - Authenticates via Phantom/Solflare wallet signature
3. **Continue as Guest** - Play without account, restricted wallet features

**Guest User Restrictions:**
- Cannot connect wallet, earn crypto, or claim daily bonuses
- TokenBalanceCard, EarningsTracker, DailyBonusCard, NFTGallery all show "Sign In Required"
- Wallet buttons show alert with option to sign in (logs out and returns to login)

**Wallet-Based Authentication:**
- Endpoint: `POST /api/auth/wallet-login`
- Signs message with wallet private key, server verifies signature
- Creates new user or logs in existing wallet user
- `authProvider: "wallet"` for wallet-authenticated users

## System Architecture

### High-Level Design
The project is built as an arcade platform with a clear separation between platform-wide features and game-specific functionalities. It supports multiple games, starting with "Roachy Hunt," and is designed for scalability to integrate more P2E games.

### Frontend (Expo/React Native)
The client is developed using Expo and React Native, ensuring cross-platform compatibility (iOS, Android, and web with specific fallbacks).

**Key Features:**
- **Arcade Home (Platform-Wide Only):** Central hub for game selection, token balances, live player counts, and access to rewards, profile, and marketplace links. Contains only platform-wide features:
    - Home Tab: Featured games, game tiles, search
    - Games Tab: Full game catalog
    - Rewards Tab: Daily login bonus, earnings tracker, game shortcuts (no game-specific leaderboards/achievements)
    - Profile Tab: Wallet connection, user info, account settings
- **Roachy Hunt Game:**
    - GPS-based creature hunting with an "AR-like" camera encounter system for catching Roachies.
    - 12 unique Roachies across 4 classes and 5 rarity tiers.
    - Egg collection and hatching system with Mystery and Roachy eggs.
    - In-game economy with energy/pity mechanics.
    - Player engagement features: Onboarding flow, Earnings Tracker, Activity History, Achievement Badges, and Leaderboards (game-specific).
    - Unified Egg System: All spawns appear as mystery golden markers on the map, revealing creature type only upon encounter.
    - Advanced GPS: Uses `Location.Accuracy.BestForNavigation` for high accuracy, with directional arrow on the map.
    - Map: Interactive dark-themed Leaflet WebView map (Expo Go compatible) with custom markers and a 100m catch radius.
- **UI/UX:** Adheres to a gold/brown theme with distinct class colors for Roachies (Tank: Green, Assassin: Red, Mage: Purple, Support: Cyan).
- **Wallet Integration UI:** Components for displaying token balances, network status, and wallet connection/disconnection.

**Folder Structure (Client):**
- `client/App.tsx`: Root component.
- `client/components/`: Reusable UI components (e.g., `ArcadeHeader`, `GameTile`, `Button`, `Card`, `CreatureCard`).
- `client/constants/`: Game data, creature definitions, game catalog, and design theme.
- `client/navigation/`: Stack and tab navigators for app flow.
- `client/screens/`: Screen-specific UI for Arcade, Catch, Inventory, etc.

### Backend (Express)
A simple Express.js server handles API routes and data storage.
- `server/index.ts`: Entry point.
- `server/hunt-routes.ts`: API routes specific to Roachy Hunt.
- `server/storage.ts`: Database storage handling.

### Game Catalog
- **Roachy Hunt (LIVE):** GPS-based creature hunting, catch, collect, battle.
- **Roachy Mate (LIVE):** Native chess game with Unicode piece rendering. Located in `client/games/chess/`.
- **Flappy Roachy (LIVE):** Endless flyer game with NFT skin system. Located in `client/games/flappy/`.
- **Coming Soon:** Roachy Battles (PvP).

### Native Games Architecture
Games are migrated from web to native React Native components:
- **Location:** `client/games/<game-name>/` folders
- **Roachy Mate (Chess):** 
  - `client/games/chess/ChessBoard.tsx` - Core chess component using chess.js
  - Uses Unicode chess symbols for cross-platform rendering
  - Features: Touch-move, board flip, move validation, check/checkmate detection
- **Flappy Roachy:**
  - `client/games/flappy/FlappyGame.tsx` - Core game component
  - **Skin System:** Supports multiple skins with NFT-locked variants
    - `default`: Classic Roachy (free)
    - `rainbow`: Rainbow Wings (NFT-locked, purchasable in marketplace)
  - Skin assets: `client/assets/flappy/roachy-rainbow-1.png`, `roachy-rainbow-2.png`
  - Exports: `RoachySkin` type, `FLAPPY_SKINS` constant for skin metadata
  - Usage: `<FlappyGame skin="rainbow" />` to use rainbow skin

## External Dependencies

### Blockchain Integration (LIVE - Mainnet)
- **Network:** Solana Mainnet Beta
- **ROACHY Token:** `BJqV6DGuHY8U8KYpBGHVV74YMjJYHdYMPfb1g7dppump` (SPL Token, 6 decimals)
- **DIAMOND Token:** `28AUaEftPy8L9bhuFusG84RYynFwjnNCVwT2jkyTz6CA` (Token-2022, 9 decimals)
- **Price Feed:** DexScreener API for ROACHY price and 24h change
- **Balance Fetching:** Real on-chain balances via `@solana/web3.js`
- **Files:**
  - `client/lib/solana.ts` - Client-side token balance fetching
  - `server/solana-service.ts` - Server-side balance service
  - `shared/solana-tokens.ts` - Token mint addresses and config
- **API Endpoints:**
  - `GET /api/blockchain/balances/:walletAddress` - Real token balances
  - `GET /api/blockchain/token-info` - Token metadata

### Wallet Integration
- **Direct Deep-Link Protocol (tweetnacl encryption):**
    - **Phantom Wallet:** Primary supported wallet.
    - **Solflare Wallet:** Alternative supported wallet.
    - **Backpack Wallet:** Additional supported wallet.
    - Uses `tweetnacl` for X25519 keypair generation and encryption/decryption, `tweetnacl-util` for encoding/decoding, and `bs58` for Base58 encoding.
- **Reown AppKit SDK:** Used for WalletConnect-compatible wallets, platform-specific implementation for native builds. Requires `WALLETCONNECT_PROJECT_ID`.

### Mapping and Location
- **OpenStreetMap tiles:** Used for the Leaflet WebView map fallback.
- **Google Maps API Key:** Required for future upgrades to native Google Maps on Android.
- **Apple Developer Account:** Required for future upgrades to native Apple Maps on iOS.

**CRITICAL: Dual Map Implementation**
- `MapViewWrapper.tsx` has TWO map implementations that must stay in sync:
  1. **Native maps (`react-native-maps`)** - Used in production iOS/Android TestFlight builds
  2. **Leaflet WebView fallback (`LeafletMapView.tsx`)** - Used in Expo Go and when native maps fail
- When adding map features (controls, indicators, overlays), you MUST update BOTH implementations
- Native map controls are React Native components; Leaflet controls are HTML/JS in the WebView template
- Features to keep synchronized: GPS indicator, map controls position, button animations, heading arrow

### Build and Deployment
- **Expo SDK 53:** Core framework for React Native development.
- **EAS Build:** Used for creating development, preview, and production builds, especially for native capabilities like full Apple/Google Maps.

## Build Status (December 12, 2025)

### Build 99 - Successfully Submitted to TestFlight
- **Build ID:** 0c694dfd-ac4e-43bd-a913-7629d7ee8349
- **IPA URL:** https://expo.dev/artifacts/eas/2wTFP92noHyPWh1WNyyjgt.ipa
- **Submission URL:** https://expo.dev/accounts/roachygames/projects/roachy-games/submissions/a4ec033f-b49a-4ad0-b1d9-6f5f76f50cbd
- **Fixes included:**
  - Fixed JavaScript bundling errors by removing @assets alias pointing to attached_assets/
  - Moved Flappy Roachy sprites to client/assets/flappy/
  - Removed Associated Domains (provisioning profile didn't support it - needs Apple Developer Portal update)
  - Anti-fraud system for daily login bonuses
  - Upgraded expo packages for SDK 53 compatibility

### Note: Associated Domains Temporarily Disabled
- Removed `associatedDomains` from app.json to fix provisioning profile mismatch
- To re-enable: Update provisioning profile in Apple Developer Portal to include Associated Domains capability
- Then restore: `"associatedDomains": ["applinks:roachy.games", "webcredentials:roachy.games"]`

## Daily Bonus Anti-Fraud System (December 12, 2025)

### Protection Layers
The daily login bonus system has layered anti-exploit protection:

1. **Device Fingerprinting** (`expo-application`)
   - Uses iOS Vendor ID / Android ID for device tracking
   - Maximum 1 claim per device per 24 hours, regardless of wallet
   - Tracks linked wallets per device (flags if >3 wallets linked)

2. **Progressive Rewards**
   - Days 1-3: Low value (1 diamond each) - no verification needed
   - Days 4-7: Higher rewards - email verification required after Day 3
   - Day 7 bonus: 3 diamonds for completing the week

3. **New Account Cooldown**
   - First-time bonus accounts must wait 24 hours before claiming
   - Prevents rapid account creation farming

4. **IP/User Agent Tracking**
   - Each claim logs IP address and user agent
   - IP subnet extracted for pattern analysis
   - Stored in `daily_login_history` for audit

### Database Tables
- `daily_login_bonus`: Streak tracking per wallet
- `daily_login_history`: Individual claim records with fraud metadata
- `daily_bonus_fraud_tracking`: Device fingerprint tracking

### Files
- `server/economy-routes.ts`: Anti-fraud validation in `/api/daily-bonus/claim`
- `client/components/arcade/DailyBonusCard.tsx`: Device fingerprint collection

## Web App Integration (LIVE - December 14, 2025)

### Security Architecture
All webapp API calls are routed through the backend to protect the `MOBILE_APP_SECRET`:
- **Client** calls `/api/webapp/*` endpoints on the mobile backend
- **Backend** (`server/webapp-routes.ts`) proxies requests to `roachy.games/api/web/*`
- **Response sanitization**: All non-OK responses are sanitized to `{ success: false, error: string }` only

### Features
1. **Token Trading**: Swap CHY/ROACHY tokens for Diamonds via TradingScreen
2. **Powerup Shop**: Purchase game powerups with Diamonds via PowerupShopScreen
3. **Balance Sync**: Real-time diamond/CHY balances from webapp
4. **OAuth Sync**: Google OAuth users synced with webapp on login

### Files
- `client/lib/webapp-api.ts` - Client API functions (calls backend, not webapp directly)
- `client/hooks/useWebappBalances.ts` - React Query hook for balance fetching
- `server/webapp-routes.ts` - Secure proxy with response sanitization
- `client/screens/TradingScreen.tsx` - Token exchange UI
- `client/screens/PowerupShopScreen.tsx` - Powerup purchase UI

### Rewards Distribution
When players claim daily bonuses or earn rewards:
1. Mobile app records reward in database
2. Backend calls `roachy.games/api/rewards/distribute`
3. Web app verifies request via `MOBILE_APP_SECRET`
4. Web app transfers DIAMOND tokens from treasury to player wallet
5. Transaction signature returned to mobile app

### Environment Variables
- `MOBILE_APP_SECRET` - Shared secret for authenticating with web app (server-side only)
- `WEBAPP_URL` - Web app URL (default: https://roachy.games)

## Cross-Platform Integration (roachy.games)

### Architecture
- **Mobile App (this Replit):** Game backend for Roachy Hunt (spawns, catching, eggs, GPS gameplay)
- **Web App (roachy.games):** Landing page, marketplace, trading, analytics
- **Shared Identity:** Wallet address (Phantom/Solflare) is the universal user ID across both platforms

### Integration Points
1. **Marketplace Button:** Profile screen has "Marketplace" button that opens roachy.games
2. **Deep Linking:** App responds to `roachy-games://` scheme and `https://roachy.games/app/*` links
3. **Universal Links (iOS):** Associated domains configured for `applinks:roachy.games`
4. **Intent Filters (Android):** Configured for `https://roachy.games/app/*`

### To Complete Integration (on roachy.games web app)
1. Add `/.well-known/apple-app-site-association` file for iOS universal links
2. Add `/.well-known/assetlinks.json` file for Android app links
3. Add "Open in App" buttons that link to `roachy-games://` scheme
4. Share database or sync inventory via wallet-based API calls