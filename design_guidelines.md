# Design Guidelines: Blockchain Creature Hunter

## Architecture Decisions

### Authentication
**Auth Required** - Blockchain wallet integration necessitates user accounts.

**Implementation:**
- Use SSO (Apple Sign-In for iOS, Google Sign-In for Android)
- Add "Connect Wallet" flow as secondary auth method (mock Web3 wallet connection)
- Onboarding screens:
  1. Welcome/Tutorial (swipeable cards explaining AR hunting, blockchain ownership)
  2. Sign-in options (SSO buttons + "Connect Wallet" button)
  3. Permissions request (Location "Always" for background spawning, Camera for AR capture)
- Account management in Profile tab:
  - Wallet address display (truncated with copy button)
  - Connected wallet badge
  - Log out and Delete account options

### Navigation
**Tab Navigation** (4 tabs + FAB)

**Tab Structure:**
1. **Map** (Hunt) - Default landing screen, shows player location and nearby creatures
2. **Inventory** (Pokédex) - Grid view of caught creatures
3. **Catch FAB** - Floating action button (center) triggers AR catch mode when near a creature
4. **Marketplace** - Trading/browsing NFT creatures (placeholder for V1)
5. **Profile** - Player stats, wallet info, settings

**Navigation Stacks:**
- Map Stack: MapView → CreatureDetails (modal)
- Inventory Stack: InventoryGrid → CreatureDetails
- Catch Flow: CatchScreen (full-screen modal with AR camera view)
- Marketplace Stack: MarketplaceList → ListingDetails
- Profile Stack: ProfileHome → Settings → WalletSettings

---

## Screen Specifications

### 1. Map Screen (Hunt)
**Purpose:** Real-time map showing player location and spawned creatures within range.

**Layout:**
- Header: Transparent, overlays map
  - Left: Menu/Profile avatar (32px circle)
  - Right: Filters button (rarity, type)
  - No search bar
- Content: Full-screen React Native MapView
  - Custom map markers for creatures (animated sprite icons bouncing)
  - Blue pulsing circle showing player location (20m radius)
  - Distance labels under each creature marker ("15m away")
- Floating Elements:
  - Bottom sheet (slides up) showing nearest creature list with tap-to-navigate
  - "Scan Mode" toggle button (top-right below filters)
- Safe Area: 
  - Top: insets.top + Spacing.xl
  - Bottom: tabBarHeight + Spacing.xl + 80 (for bottom sheet handle)

**Components:**
- Custom map markers with creature sprite previews
- Distance calculator badge
- Creature rarity glow effects (common: white, rare: blue, epic: purple, legendary: gold)

### 2. Catch Screen (Full-Screen Modal)
**Purpose:** AR camera view for catching creatures with throw mechanics.

**Layout:**
- No header (full immersive experience)
- Content: Camera view (React Native Camera or expo-camera)
  - Creature 3D model/sprite overlaid in AR space
  - Pokéball throwing trajectory guide (dotted arc)
  - "Swipe up to throw" instruction text
- Floating Elements:
  - Top-left: X close button (white, 44px touch target)
  - Top-right: Creature stats card (HP bar, rarity badge)
  - Bottom-center: Pokéball inventory counter (e.g., "x12")
  - Bottom: Capture success meter (fills on successful hit)
- Safe Area:
  - Top: insets.top + Spacing.md
  - Bottom: insets.bottom + Spacing.md

**Interaction:**
- Vertical swipe gesture to throw pokéball (velocity affects trajectory)
- Haptic feedback on ball release and creature hit
- Particle effects on successful capture
- Shake animation if creature breaks free

### 3. Inventory Screen (Pokédex Grid)
**Purpose:** Display all caught creatures in an organized collection.

**Layout:**
- Header: Default navigation header
  - Title: "My Creatures" 
  - Right: Sort/filter icon
  - Search bar (sticky below header)
- Content: Scrollable grid (2 columns on phone, 3 on tablet)
  - Each card: Creature sprite, name, level, rarity border color
  - Blockchain verified badge (blue checkmark icon) on top-right of card
  - Empty state: "Start hunting to build your collection"
- Safe Area:
  - Top: Spacing.xl (header is non-transparent)
  - Bottom: tabBarHeight + Spacing.xl

**Components:**
- CreatureCard component (rounded corners, subtle shadow)
- Filter chips (Type, Rarity, Date Caught)
- Search input with creature name autocomplete

### 4. Creature Details Screen (Modal)
**Purpose:** Deep dive into a single creature's stats and blockchain proof.

**Layout:**
- Header: Custom transparent header
  - Left: Back button
  - Right: Share icon (share NFT link)
- Content: Scrollable view
  - Hero image: Large creature sprite (300x300px) with rarity glow
  - Stats section: HP, Attack, Defense, Speed (progress bars)
  - Blockchain section:
    - "Minted as NFT" badge
    - Transaction hash (truncated, copy button)
    - Mint date and catch location (map thumbnail)
  - Evolution chain (if applicable)
- Floating Elements:
  - "Transfer to Wallet" button (bottom, fixed)
- Safe Area:
  - Top: headerHeight + Spacing.xl
  - Bottom: insets.bottom + Spacing.xl + 60 (for button)

**Components:**
- Stat bar component (animated fill on mount)
- Transaction hash display with copy functionality
- Evolution path horizontal scroll

### 5. Profile Screen
**Purpose:** Player stats, wallet info, achievements, settings.

**Layout:**
- Header: Default header with title "Profile"
  - Right: Settings gear icon
- Content: Scrollable form-like layout
  - Avatar picker (choose from 8 trainer sprites)
  - Username display/edit field
  - Wallet section:
    - Connected wallet address (card with copy)
    - NFT balance counter
  - Stats cards:
    - Total creatures caught
    - Distance walked (km)
    - Rarest catch (with sprite preview)
  - Achievements list (locked/unlocked badges)
- Safe Area:
  - Top: Spacing.xl
  - Bottom: tabBarHeight + Spacing.xl

**Components:**
- Stat cards (horizontal scroll)
- Avatar selection modal (8 preset trainer sprites)
- Wallet connection status indicator

---

## Design System

### Color Palette
**Primary Colors:**
- Primary: #FF6B6B (Vibrant coral-red for CTAs, pokéball accents)
- Secondary: #4ECDC4 (Teal for map elements, water-type creatures)
- Accent: #FFD93D (Golden yellow for rare/legendary indicators)

**Rarity Tiers:**
- Common: #E8E8E8 (Light gray)
- Uncommon: #6BCF7F (Green)
- Rare: #4A90E2 (Blue)
- Epic: #9B59B6 (Purple)
- Legendary: #F39C12 (Gold)

**Neutrals:**
- Background: #1A1A2E (Dark navy for game ambiance)
- Surface: #16213E (Slightly lighter navy for cards)
- Text Primary: #FFFFFF
- Text Secondary: #A8A8B8

### Typography
- **Headings:** System Bold (SF Pro Rounded on iOS for playful feel)
- **Body:** System Regular, 16px
- **Captions:** System Medium, 12px
- **Stats/Numbers:** Monospace for consistency

### Visual Design
**Icons:**
- Use Feather icons for UI controls (filter, settings, close)
- Custom creature type icons (fire, water, grass, electric, etc.)
- NO emojis

**Touchable Feedback:**
- All cards: Scale down to 0.98 on press
- Buttons: Opacity 0.7 on press
- Floating catch button: 
  - shadowOffset: {width: 0, height: 2}
  - shadowOpacity: 0.10
  - shadowRadius: 2
  - Glow effect (golden ring) when creature is in range

**Assets Required:**
1. **Trainer Avatars** (8 presets): Pixel art style trainers in various poses/outfits
2. **Creature Sprites** (Minimum 12 starter creatures): Fantasy creature designs (avoid direct Pokémon copies)
   - 4 Common, 4 Rare, 3 Epic, 1 Legendary
   - Each with idle animation sprite sheet
3. **Pokéball Icon**: 3D rendered pokéball (64x64px, 128x128px, 256x256px)
4. **Map Markers**: Creature silhouettes for map pins (32x32px)
5. **Rarity Badges**: Border/glow overlays for cards
6. **Type Icons**: 8 element symbols (fire, water, grass, etc., 24x24px)
7. **Achievement Badges**: 10 unlockable achievement icons

**Animations:**
- Creature card entry: Staggered fade-in from bottom (0.2s delay between each)
- Catch success: Confetti particle burst + pokéball shake sequence
- Map marker pulse: Continuous scale 1.0 → 1.1 → 1.0 (2s loop)
- Stat bars: Animate from 0 to value on screen mount

---

## Accessibility
- All map markers have VoiceOver labels: "[Creature name], [Distance] away, [Rarity]"
- Catch screen: Audio cues for throw success/failure
- High contrast mode: Increase rarity glow saturation by 40%
- Minimum touch targets: 44x44px for all interactive elements
- Color-blind safe rarity indicators: Use shape + color (stars for legendary, circles for common)