# CryptoCreatures - Blockchain Creature Hunting Game

## Overview
CryptoCreatures is a Pokémon GO-style mobile game with blockchain integration. Players hunt and catch fantasy creatures in their real-world location, then mint them as NFTs to prove ownership on the blockchain.

## Current State
**Phase:** Hunt System Complete with Database Integration

The app includes:
- **Hunt Screen:** GPS-based creature hunting with placeholder map, auto-spawning creatures
- **Catch Mini-Game:** Timing-based ring mechanic with haptic feedback and multiple attempts
- **Egg System:** Walking distance tracking for egg incubation and hatching
- **Raid Battles:** Multi-player boss battles with timing attacks
- **Collection Screen:** Grid view of all caught creatures with rarity indicators
- **Economy System:** Energy, daily/weekly catch limits, pity mechanics for rare spawns
- **Profile Screen:** Player stats, wallet connection, and resource management
- **Mock Blockchain:** Simulated wallet connection and NFT minting flow

## Recent Changes (December 2025)
- Implemented complete hunt system with PostgreSQL database
- Added spawn cleanup to prevent database bloat (deactivates expired spawns, limits to 20 active)
- Fixed location handling with immediate default location for web testing
- Added close button to catch mini-game for improved UX
- Economy auto-creation for new players

## Project Architecture

### Frontend (Expo/React Native)
```
client/
├── App.tsx                    # Root app with providers
├── components/
│   ├── Button.tsx            # Animated button
│   ├── Card.tsx              # Elevated card component
│   ├── CreatureCard.tsx      # Creature display card
│   ├── ErrorBoundary.tsx     # Error handling wrapper
│   ├── ErrorFallback.tsx     # Crash recovery UI
│   ├── HeaderTitle.tsx       # Custom header with app icon
│   ├── ThemedText.tsx        # Themed typography
│   └── ThemedView.tsx        # Themed container
├── constants/
│   ├── creatures.ts          # Creature definitions and types
│   ├── gameState.ts          # Game state types and utilities
│   └── theme.ts              # Design system tokens
├── context/
│   └── GameContext.tsx       # Global game state management
├── navigation/
│   ├── InventoryStackNavigator.tsx
│   ├── MapStackNavigator.tsx
│   ├── MainTabNavigator.tsx
│   ├── ProfileStackNavigator.tsx
│   └── RootStackNavigator.tsx
└── screens/
    ├── CatchScreen.tsx       # Creature catching UI
    ├── CreatureDetailScreen.tsx
    ├── InventoryScreen.tsx
    ├── MapScreen.tsx
    └── ProfileScreen.tsx
```

### Backend (Express)
```
server/
├── index.ts                  # Server entry point
├── routes.ts                 # API routes
└── storage.ts                # Data storage interface
```

## Key Features

### Creatures
- 7 unique fantasy creatures with custom artwork
- 5 rarity tiers: Common, Uncommon, Rare, Epic, Legendary
- 6 element types: Fire, Water, Grass, Electric, Ice, Shadow
- Each creature has unique stats (HP, Attack, Defense, Speed)

### Gameplay
- Location-based creature spawning
- Gesture-based catching mechanics
- Catchball resource management
- Rarity-based catch rates

### Blockchain Integration
- Mock wallet connection flow
- NFT minting simulation for caught creatures
- Transaction hash generation
- Ownership verification badges

## Design System

### Colors
- Primary: #FF6B6B (Coral red)
- Secondary: #4ECDC4 (Teal)
- Accent: #FFD93D (Golden yellow)
- Background: #1A1A2E (Dark navy)

### Rarity Colors
- Common: #E8E8E8
- Uncommon: #6BCF7F
- Rare: #4A90E2
- Epic: #9B59B6
- Legendary: #F39C12

## Running the App
The development server runs on port 5000 with Expo on port 8081.

### Test on Mobile
Scan the QR code in the development URL dropdown to test on your physical device via Expo Go.

## Future Development
- Real Web3 wallet integration (MetaMask, WalletConnect)
- Smart contract deployment for actual NFT minting
- Creature trading marketplace
- Multiplayer battles
- Creature breeding system
