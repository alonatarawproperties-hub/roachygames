# Roachy Games - P2E Arcade Platform

## Overview
Roachy Games is an arcade platform for play-to-earn (P2E) games featuring Roachies (cockroach-themed creatures). The platform launches with Roachy Hunt and plans to add more games.

## Current State
**Phase:** TestFlight Beta - Build #51 Submitted

**SDK Version:** Expo SDK 53 (stable) - Downgraded from SDK 54 due to iOS build issues

**Deployment Status:**
- iOS TestFlight: Build #48 submitted with multi-wallet support and secure session storage
- Bundle ID: com.cryptocreatures.app
- EAS Build configured for development, preview, and production profiles
- Build uses Xcode 16.0 on macOS Sonoma 14.6

**Wallet Connection:**
- Uses direct deep-link protocol with tweetnacl encryption (no AppKit SDK)
- Removed @reown/appkit-react-native due to iOS build incompatibility with Expo SDK 53
- Implementation: client/lib/walletDeeplink.ts
- Supports three wallets via universal links:
  - Phantom (https://phantom.app/ul/v1/)
  - Solflare (https://solflare.com/ul/v1/)
  - Backpack (https://backpack.app/ul/v1/)

The app includes:
- **Arcade Home:** Game launcher with featured game and coming soon tiles
- **Roachy Hunt:** Full GPS-based creature hunting game
  - Hunt Screen with auto-spawning creatures
  - **AR-like Camera Encounter** with creature overlays (tap spawn -> camera view -> catch)
  - Catch Mini-Game with timing mechanics
  - 12 unique Roachies across 4 classes
  - Egg incubation and hatching
  - Raid battles
  - Collection management
  - Economy system with energy/pity mechanics

## Recent Changes (December 2025)
- **Player Engagement Features (Latest)**
  - **OnboardingFlow**: 5-step welcome flow for new players (Welcome, Hunt, Collection, Earn, Wallet)
    - Uses AsyncStorage to show only once per device
    - Skip and complete handlers, animated step indicators
  - **EarningsTracker**: Shows RCH earned today/week/all-time with percentage changes
    - Wallet connectivity gating - prompts "Connect wallet" when disconnected
    - Displayed on Home tab below header
  - **ActivityHistory**: Recent activity feed showing catches, rewards, hatches, trades
    - Timestamp formatting, RCH amounts, activity icons
    - Displayed in Rewards tab
  - **AchievementBadges**: 6 achievements across 4 rarity tiers (common/rare/epic/legendary)
    - Unlocked/locked states, progress bars, horizontal scroll
    - Displayed in Rewards and Profile tabs
  - **Leaderboard**: Tabbed view (Catches/Earnings/Streaks) with top 5 + current user rank
    - Live indicator, rank badges for top 3, player avatars
    - Displayed in Rewards tab
  - All components use placeholder data - ready for Solana RPC/backend integration
- **Crypto Arcade UI Components**
  - TokenBalanceCard: Shows RCH + SOL balances with USD conversion, "Connect Wallet" CTA when not connected
  - NetworkStatusBadge: Pulsing green dot with "Solana" label for connection status
  - SolanaTrustBadge: "Powered by Solana" footer in minimal and full variants
  - Live player count indicator: Shows online players and active hunters
  - Profile tab: Marketplace button with Token Swap and Staking shortcuts
  - Currently using placeholder data - ready for Solana RPC/backend integration
- **WalletConnect (Reown AppKit) Integration**
  - Replaced custom DH encryption with official Reown AppKit SDK
  - Platform-specific implementation: AppKit on native (iOS/Android), stub on web
  - Uses Metro resolver to exclude AppKit packages from web builds
  - Supports WalletConnect-compatible wallets via Reown modal
  - Requires WALLETCONNECT_PROJECT_ID secret in environment
  - Disconnect flow properly calls AppKit disconnect() API
  - `isAppKitReady` guard prevents UI access when project ID missing
  - Files: AppKitWrapper.native.tsx, AppKitWrapper.web.tsx, WalletContext.native.tsx, WalletContext.web.tsx
- **Full Solana Wallet Integration (Legacy - now using Reown AppKit)**
  - Uses tweetnacl for X25519 keypair generation and encrypted payload handling
  - Supports Phantom, Solflare, and Backpack wallets via universal links
  - Proper session management with encrypted shared secrets
  - Works in TestFlight builds with registered app scheme
  - HuntContext syncs with WalletContext - uses Solana address when connected, guest ID when not
- **Unified Egg System**
  - ALL spawns now appear as eggs on the map (templateId: 'wild_egg')
  - Two egg types differentiated by `creatureClass` field:
    - Mystery Eggs (60%): `creatureClass='egg'`, simple tap-to-collect, accumulate 10 to hatch
    - Roachy Eggs (40%): `creatureClass` matches creature type (tank/mage/etc), timing minigame required
  - Roachy egg catch flow: tap → timing minigame → egg crack animation → Roachy reveal
  - `containedTemplateId` field stores the creature inside Roachy eggs
  - Map shows all spawns as mystery golden "???" markers
  - Backend tracks `isMysteryEgg` and `isRoachyEgg` for proper handling
- **Egg Collection & Hatching System**
  - Eggs have 5 rarity tiers: Common (60%), Uncommon (25%), Rare (10%), Epic (4%), Legendary (1%)
  - Mystery eggs use simplified collect animation (no timing minigame)
  - Collect 10 eggs to unlock HATCH button in Inventory
  - Hatching consumes 10 eggs and gives 1 random rarity Roachy
- **Mystery Ping System**
  - All map markers now display as uniform gold "???" markers
  - No names or rarity colors revealed until caught
  - Creates suspense and excitement during hunting
  - Applies to both Leaflet WebView map and native map markers
- **Added Directional Arrow on Map**
  - Shows player movement direction when walking/hunting
  - Arrow rotates smoothly based on heading from GPS or calculated from movement
  - Only updates when player moves 3+ meters (filters GPS jitter)
  - Orange arrow above player marker, matches game theme
- **Upgraded GPS to Waze/Google Maps-level accuracy**
  - Uses `Location.Accuracy.BestForNavigation` (navigation-grade GPS)
  - Continuous tracking with `watchPositionAsync` (real-time updates)
  - Enables Android Network Provider for improved accuracy
  - Multiple sampling technique for initial fix (up to 5 attempts)
  - Accuracy filtering: Only accepts readings with < 20m accuracy
  - Updates every 2-3 seconds or 3-5 meters of movement
  - Now also captures heading from GPS when available
- **Implemented Leaflet WebView Map (Expo Go Compatible)**
  - Interactive dark-themed map with OpenStreetMap tiles
  - Works immediately in Expo Go without native builds
  - 100m catch radius circle around player
  - Custom spawn markers with rarity colors
  - Navigation and refresh controls
  - Bidirectional messaging between React Native and WebView
- **EAS Build Configuration Added**
  - eas.json configured for future native maps upgrade
  - When ready, can build development client with full Apple/Google Maps
- **Added AR-like Camera Encounter for Roachy Hunt**
  - AR-style camera view with animated creature overlays
  - Proper camera permission handling with Settings fallback
  - Web fallback for browser testing
  - Flow: Map spawn tap → Camera encounter → Catch mini-game
- Improved spawn generation to ensure catchable spawns nearby (first spawn within 50m)
- **Created "Roachy Games" arcade launcher platform**
- Added arcade home screen with game selection UI
- Roachy Hunt integrated as first playable game
- Created gamesCatalog for future games (Battle, Match, Quest)
- Updated app branding to "Roachy Games"
- Navigation refactored: ArcadeHome → RoachyHuntStack

## Project Architecture

### Frontend (Expo/React Native)
```
client/
├── App.tsx                    # Root app with providers
├── components/
│   ├── arcade/               # Arcade launcher components
│   │   ├── ArcadeHeader.tsx  # Logo and action buttons
│   │   ├── GameTile.tsx      # Game selection cards
│   │   └── index.ts
│   ├── Button.tsx            # Animated button
│   ├── Card.tsx              # Elevated card component
│   ├── CreatureCard.tsx      # Creature display card
│   ├── ErrorBoundary.tsx     # Error handling wrapper
│   └── ...
├── constants/
│   ├── creatures.ts          # 12 Roachy definitions
│   ├── gamesCatalog.ts       # Arcade game entries
│   ├── gameState.ts          # Game state types
│   └── theme.ts              # Design system (gold/brown)
├── navigation/
│   ├── RootStackNavigator.tsx  # ArcadeHome + game stacks
│   ├── MainTabNavigator.tsx    # Roachy Hunt tabs
│   └── ...
└── screens/
    ├── Arcade/
    │   └── HomeScreen.tsx     # Arcade launcher UI
    ├── CatchScreen.tsx
    ├── InventoryScreen.tsx
    └── ...
```

### Backend (Express)
```
server/
├── index.ts                  # Server entry point
├── hunt-routes.ts            # Roachy Hunt API routes
└── storage.ts                # Database storage
```

## Game Catalog

### Roachy Hunt (LIVE)
- GPS-based creature hunting
- 12 unique Roachies (4 classes, 5 rarities)
- Catch, collect, battle gameplay

### Coming Soon
- **Roachy Battles:** PvP arena combat
- **Flappy Roach:** Tap-to-fly endless runner
- **Roachy Mate:** Breeding and evolution game

## Design System

### Colors (Gold/Brown Theme)
- Primary: #F59E0B (Gold/Amber)
- Secondary: #22C55E (Green)
- Background: #120a05 (Dark brown)
- Surface: #1e1109 (Brown)
- Text Primary: #f0c850 (Gold)
- Text Secondary: #c4955e (Tan)
- Success: #22C55E (Green)

### Class Colors
- Tank: #22C55E (Green)
- Assassin: #EF4444 (Red)
- Mage: #8B5CF6 (Purple)
- Support: #06B6D4 (Cyan)

## User Preferences
- Custom Roachy images to be provided later (currently using class icons)
- Bundle identifiers kept as "com.cryptocreatures.app"
- Future: Wallet connection and NFT minting via marketplace dApp

## Running the App
- Development server: Port 5000 (Express) + Port 8081 (Expo)
- Scan QR code in Expo Go to test on mobile device

## Wallet Integration

### Current Status: READY FOR TESTFLIGHT
Solana wallet connection is fully implemented using proper Diffie-Hellman encryption via tweetnacl. Works in TestFlight builds with registered app scheme.

**Note:** Expo Go users will see "TestFlight Required" message because Expo Go cannot handle wallet redirect URLs. The full wallet flow only works in the published TestFlight app where the `roachy-games://` scheme is registered.

### Supported Wallets
- **Phantom** - Primary wallet, uses universal links
- **Solflare** - Alternative wallet option
- **Backpack** - Additional wallet support

### Technical Implementation
The wallet connection uses the official Phantom deeplink protocol with encryption:
1. Generate ephemeral X25519 keypair using tweetnacl
2. Send connect request with dapp_encryption_public_key (Base58 encoded)
3. Wallet returns encrypted response with phantom_encryption_public_key (Base58) + data (Base64) + nonce (Base64)
4. Compute shared secret using nacl.box.before() with wallet's public key
5. Decrypt data/nonce using nacl.box.open.after() with shared secret
6. Extract wallet address and session token from decrypted JSON

### Encoding Standards (Phantom Protocol)
- **Public keys**: Base58 encoded (dapp_encryption_public_key, phantom_encryption_public_key, wallet address)
- **Encrypted data/nonce**: Base64 encoded (use tweetnacl-util decodeBase64)
- **Session storage**: Keys stored as Base58 strings, must decode back to Uint8Array for signing

### Dependencies
- `tweetnacl` - Pure JS implementation of NaCl cryptographic library (box.keyPair, box.before, box.open.after)
- `tweetnacl-util` - Utility functions for Base64 encoding/decoding
- `bs58` - Base58 encoding for Solana public keys and addresses

### Key Files
- `client/context/WalletContext.tsx` - Full wallet connection with DH encryption
- `client/components/WalletSelectModal.tsx` - Provider selection UI
- `client/screens/ProfileScreen.tsx` - Wallet connection UI
- `client/context/HuntContext.tsx` - Uses wallet address for game API calls

### Connection Flow
1. User taps "Connect Wallet" on Profile screen
2. Modal shows available wallet providers
3. User selects wallet (e.g., Phantom)
4. App generates encryption keypair and opens wallet via deep link
5. User approves connection in wallet app
6. Wallet redirects back with encrypted public key
7. App decrypts response and stores wallet address
8. Game uses Solana address as player identifier

## Future Development
- Full Solana Mobile Wallet Adapter integration
- NFT minting for caught Roachies
- Additional P2E games
- Cross-platform sync (mobile + web)

## Upgrading to Native Maps (EAS Build)

To get full Apple Maps / Google Maps instead of the Leaflet WebView:

1. **Create Expo Account**: Sign up at expo.dev
2. **Get Google Maps API Key**: 
   - Go to Google Cloud Console
   - Enable "Maps SDK for iOS" and "Maps SDK for Android"
   - Create an API key
3. **Add API Key to app.json**:
   ```json
   "android": {
     "config": {
       "googleMaps": {
         "apiKey": "YOUR_GOOGLE_MAPS_API_KEY"
       }
     }
   }
   ```
4. **Build Development Client**:
   ```bash
   npx expo login
   npx eas build --profile development --platform android
   # For iOS, need Apple Developer account ($99/year)
   npx eas build --profile development --platform ios
   ```
5. **Install on Device**: Download and install the generated APK/IPA
6. The app will automatically use native react-native-maps when available
