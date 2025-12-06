# Roachy Games - P2E Arcade Platform

## Overview
Roachy Games is an arcade platform for play-to-earn (P2E) games featuring Roachies (cockroach-themed creatures). The platform launches with Roachy Hunt and plans to add more games.

## Current State
**Phase:** Arcade Launcher Implemented

The app includes:
- **Arcade Home:** Game launcher with featured game and coming soon tiles
- **Roachy Hunt:** Full GPS-based creature hunting game
  - Hunt Screen with auto-spawning creatures
  - Catch Mini-Game with timing mechanics
  - 12 unique Roachies across 4 classes
  - Egg incubation and hatching
  - Raid battles
  - Collection management
  - Economy system with energy/pity mechanics

## Recent Changes (December 2025)
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
- **Roachy Battle:** PvP arena combat
- **Roachy Match:** Match-3 puzzle game
- **Roachy Quest:** Epic story adventure

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
