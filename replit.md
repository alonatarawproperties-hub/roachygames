# Roachy Hunt - GPS Creature Hunting Game

## Overview
Roachy Hunt is a Pokémon GO-style mobile game where players hunt and catch Roachies (cockroach creatures) in their real-world location. Features a class-based system (Tank, Assassin, Mage, Support), 5-tier rarity system, and comprehensive economy with energy/pity mechanics.

## Current State
**Phase:** Full Roachy Hunt Theme Implemented

The app includes:
- **Hunt Screen:** GPS-based Roachy hunting with placeholder map, auto-spawning creatures
- **Catch Mini-Game:** Timing-based ring mechanic with haptic feedback and multiple attempts
- **12 Unique Roachies:** 4 classes across 5 rarity tiers (Common to Legendary)
- **Egg System:** Walking distance tracking for egg incubation and hatching
- **Raid Battles:** Multi-player boss battles with timing attacks
- **Collection Screen:** Grid view of all caught Roachies with rarity/class indicators
- **Economy System:** Energy (30/day), daily catch limit (25), weekly limit (120), pity mechanics
- **Mock Blockchain:** Simulated wallet connection for future NFT integration

## Recent Changes (December 2025)
- Migrated from CryptoCreatures to Roachy Hunt theme
- Updated color scheme to gold/brown (primary: #F59E0B, background: #120a05)
- Changed from element-based creatures to class-based Roachies (Tank, Assassin, Mage, Support)
- Created 12 Roachy templates with unique stats
- Updated all UI components with new theme and branding
- Fixed duplicate key error in location endpoint
- Added image fallbacks showing class icons (user will provide Roachy images later)

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

### Roachies (Creatures)
- 12 unique Roachy creatures with placeholder icons (images pending from user)
- 5 rarity tiers: Common, Uncommon, Rare, Epic, Legendary
- 4 class types: Tank (shield), Assassin (zap), Mage (star), Support (heart)
- Each Roachy has unique stats (HP, Attack, Defense, Speed)
- Common: Ironshell, Scuttler, Sparkroach, Leafwing
- Uncommon: Viking Bug, Shadowblade
- Rare: Frost Mage, Aviator
- Epic: Royal Mage, Warlord, Nightstalker
- Legendary: Cosmic King

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
