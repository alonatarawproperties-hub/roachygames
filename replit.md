# Roachy Games - P2E Arcade Platform

## Overview
Roachy Games is an arcade platform for play-to-earn (P2E) games featuring Roachies (cockroach-themed creatures). The platform launches with Roachy Hunt and plans to add more games.

## Current State
**Phase:** Arcade Launcher Implemented

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
- **Unified Egg System (Latest)**
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

## Future Development
- Wallet connection (WalletConnect)
- NFT minting via marketplace dApp
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
