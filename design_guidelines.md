# Design Guidelines: Roachy Games Arcade

## App Identity
**Name:** Roachy Games
**Tagline:** Play, Earn, and Collect in the Ultimate Arcade
**Platform:** Multi-game arcade with GPS gameplay and NFT integration

## Architecture Decisions

### Authentication
**Required** - Multi-user platform with:
- Apple Sign-In (iOS primary)
- Google Sign-In (Android/cross-platform)
- Profile screen with wallet connection, NFT collection, earnings
- Account management: Log out (with confirmation), Delete account (nested under Settings > Account > Delete with double confirmation)

### Navigation
**Tab Navigation** (4 tabs + floating action):
- **Games** - Browse arcade games
- **Map** - GPS gameplay (active game)
- **Collection** - NFTs and Roachies
- **Profile** - Wallet, stats, settings
- **Floating Action Button** - Quick play current game

Each game (e.g., Roachy Hunt) loads as a nested stack within the Games or Map tab.

### Screen Specifications

#### Games Screen
- Purpose: Browse and launch arcade games
- Header: Transparent with search bar, wallet balance on right
- Layout: Scrollable grid of game cards
- Safe area: top = insets.top + Spacing.xl, bottom = tabBarHeight + Spacing.xl
- Components: Category filters (horizontal scroll), game cards with vibrant badges, featured carousel

#### Map Screen (Active Game)
- Purpose: GPS gameplay area
- Header: Transparent with game title, energy bar on right
- Layout: Full-screen map with floating UI
- Safe area: Floating elements need proper insets from edges
- Components: Map view, spawn markers with glow, player indicator, bottom action sheet (catch UI)

#### Collection Screen
- Purpose: View NFTs and collected Roachies
- Header: Default with tabs (NFTs | Roachies)
- Layout: Scrollable grid/list
- Safe area: top = Spacing.xl, bottom = tabBarHeight + Spacing.xl
- Components: Rarity filters, sort options, collection cards with glow borders

#### Profile Screen
- Purpose: Wallet, earnings, account settings
- Header: Transparent
- Layout: Scrollable form
- Safe area: top = headerHeight + Spacing.xl, bottom = tabBarHeight + Spacing.xl
- Components: Wallet card (prominent glow), stats cards, settings list, log out button

## Color Palette

### Primary Colors
**Vibrant and Saturated:**
- Primary: #FF9500 (Neon orange - CTAs, arcade energy)
- Primary Bright: #FFB340 (Bright orange - hover states)
- Gold: #FFD700 (Pure gold - premium elements, highlights)
- Gold Glow: #FFA500 with opacity 0.6 (Glow effect overlay)

### Background Colors
**Deep and Rich:**
- Background Root: #0A0604 (Almost black with brown tint)
- Surface: #1A0F08 (Rich dark brown)
- Surface Elevated: #2D1810 (Warm brown for cards)
- Surface Glow: #3D2418 (Glowing card hover state)

### Accent Colors
**Bright and Punchy:**
- Success: #00FF88 (Neon green)
- Error: #FF3366 (Hot pink red)
- Warning: #FFCC00 (Bright yellow)
- Info: #00D9FF (Cyan)

### Text Colors
- Text Primary: #FFFFFF (Pure white for max contrast)
- Text Gold: #FFD700 (Gold for headings and emphasis)
- Text Secondary: #D4A574 (Warm beige for body)
- Text Muted: #8B7355 (Muted brown for labels)
- Button Text: #0A0604 (Dark on bright buttons)

### Game Category Colors
**Vibrant Badges:**
- Action: #FF3366 (Hot pink)
- Adventure: #9D4EDD (Electric purple)
- Strategy: #3A86FF (Bright blue)
- Casual: #00FF88 (Neon green)
- Premium: #FFD700 (Pure gold with glow)

### Rarity Colors
- Common: #A0A0A0 (Gray)
- Uncommon: #00FF88 (Neon green)
- Rare: #3A86FF (Bright blue)
- Epic: #9D4EDD (Electric purple)
- Legendary: #FFD700 (Pure gold with intense glow)

### Class Colors (Roachy Hunt)
- Tank: #00FF88 (Neon green - shield icon)
- Assassin: #FF3366 (Hot pink - zap icon)
- Mage: #9D4EDD (Electric purple - star icon)
- Support: #00D9FF (Cyan - heart icon)

## Typography
- **Headings:** Bold, pure white or gold (#FFFFFF or #FFD700)
- **Subheadings:** Semi-bold, gold (#FFD700)
- **Body:** Regular, warm beige (#D4A574)
- **Stats/Numbers:** Monospace, white or gold for emphasis
- **Labels:** Regular, muted brown (#8B7355)

## Visual Design

### Glow Effects
**Critical for Arcade Feel:**
- **Standard Glow:** shadowColor gold (#FFA500), shadowOpacity 0.5, shadowRadius 8, shadowOffset (0, 0)
- **Intense Glow (Legendary):** shadowColor gold (#FFD700), shadowOpacity 0.8, shadowRadius 16, shadowOffset (0, 0)
- **Neon Glow (Categories):** Use category color, shadowOpacity 0.6, shadowRadius 10
- **Floating Elements:** shadowColor black (#000000), shadowOpacity 0.3, shadowRadius 8, shadowOffset (0, 4)

### Card Styling
- Background: Surface Elevated (#2D1810) with subtle gradient to Surface (#1A0F08)
- Border: 2px solid with rarity/category color
- Border radius: 16px
- Glow: Outer glow matching border color
- Hover: Increase brightness, intensify glow
- Rarity indicator: Thick left border (4px) or top accent bar

### Buttons
- **Primary:** Gradient from #FF9500 to #FFD700, dark text, gold glow
- **Secondary:** Transparent with gold border (2px), gold text, subtle glow
- **Danger:** Hot pink (#FF3366) with matching glow
- **Disabled:** Muted brown with no glow
- Border radius: 12px
- Hover: Scale 1.05, intensify glow
- Active: Scale 0.98

### Game Cards
- Large preview image with category badge overlay (top-right corner)
- Title in gold, subtitle in warm beige
- Vibrant category color glow around card
- Play button: Bright orange with gold glow
- Earnings indicator: Gold coin icon with neon green text

### Icons
- Use Feather icons from @expo/vector-icons
- Standard size: 24px, Large (features): 32px
- Color: Match context (gold for primary, category colors for badges)
- All icons should feel crisp and modern
- NO emojis

### Map Visuals (GPS Gameplay)
- Dark base with subtle grid pattern
- Spawn markers: Circular with pulsing glow (color = rarity)
- Player marker: Bright orange with white pulsing ring
- Geofence rings: Semi-transparent with neon outline
- Energy bar: Gradient gold to orange with glow

### Catch Mini-Game
- Full-screen dark overlay (opacity 0.9)
- Shrinking ring with vibrant colors:
  - Perfect: Neon green (#00FF88) with intense glow
  - Great: Bright blue (#3A86FF) with glow
  - Good: Gold (#FFD700) with glow
- Success flash: Gold screen flash with particle effects
- Background: Animated gradient (dark brown to black)

### Collection Display
- Grid layout with glow cards
- Rarity border with matching glow
- NFT shimmer effect on rare items
- Stat badges with class colors and icons
- Level/power indicators: Bold gold numbers

### Wallet & Earnings
- Prominent card with intense gold glow
- Balance: Large gold text with coin icon
- Recent earnings: Scrollable list with transaction glow (green for gains)
- Connect wallet button: Maximum visual prominence with pulse animation

## Animations
- **Spring-based:** Use for organic feel (bouncy, energetic)
- **Spawn pulse:** Continuous scale 1.0 to 1.1, duration 1.5s
- **Glow pulse:** Opacity 0.4 to 0.8, duration 2s (legendary items)
- **Catch success:** Flash, scale burst, particle explosion
- **Card hover:** Scale 1.02, glow intensify, duration 200ms
- **Button press:** Scale 0.98, glow flash
- **NFT shimmer:** Diagonal gradient sweep, duration 3s, repeat

## Accessibility
- Minimum touch targets: 44x44px
- High contrast: White text on dark backgrounds
- Color-blind safe: Combine color with icons and labels
- Glow effects: Ensure core UI readable without effects
- Screen reader labels: All interactive elements
- Reduce motion option: Disable pulsing/shimmer animations

## Asset Requirements
- Game preview images (16:9 ratio, vibrant and detailed)
- Category badge icons (matching vibrant color scheme)
- Roachy character artwork (12 unique designs with class variants)
- Map markers (5 rarity levels with glow states)
- Particle effects (coins, stars, sparkles for arcade feel)
- Background textures (subtle grid, circuit patterns for tech feel)