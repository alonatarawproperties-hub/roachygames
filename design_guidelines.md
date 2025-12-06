# Design Guidelines: Roachy Hunt

## App Identity
**Name:** Roachy Hunt
**Tagline:** Catch, Train, and Battle Roachies in the Wild!

## Color Palette

### Primary Colors
- Primary: #F59E0B (Golden amber - CTAs, highlights)
- Secondary: #22C55E (Green - success, tank class)
- Accent: #f0c850 (Gold - text highlights, premium elements)

### Background Colors
- Background Root: #120a05 (Deep dark brown)
- Surface: #1e1109 (Medium dark brown)
- Surface Light: #3b2418 (Warm brown for cards/modals)
- Tertiary: #4a3020 (Lighter brown for hover states)

### Text Colors
- Text Primary: #f0c850 (Gold for headings)
- Text Secondary: #c4955e (Muted gold for body text)
- Button Text: #120a05 (Dark text on gold buttons)

### Rarity Colors
- Common: #9CA3AF (Gray)
- Uncommon: #22C55E (Green)
- Rare: #3B82F6 (Blue)
- Epic: #A855F7 (Purple)
- Legendary: #F59E0B (Gold)

### Class Colors
- Tank: #22C55E (Green - shield icon)
- Assassin: #EF4444 (Red - zap icon)
- Mage: #8B5CF6 (Purple - star icon)
- Support: #06B6D4 (Cyan - heart icon)

## Typography
- Headings: Bold, gold color (#f0c850)
- Body: Regular, muted gold (#c4955e)
- Stats/Numbers: Monospace for consistency
- All text should feel warm and inviting

## Visual Design

### Card Styling
- Background: Surface color (#1e1109)
- Border: 1px solid surfaceLight (#3b2418)
- Border radius: 12-16px
- Rarity indicator: Left border color matching rarity

### Buttons
- Primary: Gold gradient background (#F59E0B to #f0c850)
- Text: Dark brown (#120a05)
- Hover: Slight brightness increase
- Border radius: 8-12px

### Icons
- Use Feather icons from @expo/vector-icons
- Tank: shield
- Assassin: zap
- Mage: star
- Support: heart
- NO emojis in the UI

### Map/Hunt Screen
- Dark brown background with subtle texture feel
- Spawn markers: Circular with rarity glow
- Player marker: Blue pulsing circle
- Economy bar: Compact at top with energy, spawns, streak

### Catch Mini-Game
- Shrinking ring mechanic with timing zones
- Perfect zone: Green
- Great zone: Blue
- Good zone: Gold
- Background: Full screen dark overlay

### Animations
- Use spring-based animations for organic feel
- Spawn markers: Gentle pulse animation
- Catch success: Flash and scale effects
- Egg hatch: Wobble, crack, and reveal sequence

## Roachy Characters

### Classes
1. **Tank** - High HP, high Defense, low Speed
2. **Assassin** - High Attack, high Speed, low Defense
3. **Mage** - High Attack, balanced stats
4. **Support** - Balanced HP/Defense, low Attack

### Roachy Roster
- Common: Ironshell (Tank), Scuttler (Assassin), Sparkroach (Mage), Leafwing (Support)
- Uncommon: Viking Bug (Tank), Shadowblade (Assassin)
- Rare: Frost Mage (Mage), Aviator (Support)
- Epic: Royal Mage (Mage), Warlord (Tank), Nightstalker (Assassin)
- Legendary: Cosmic King (Tank)

## Economy Display
- Energy bar: Gold gradient
- Pity progress: Colored by rarity
- Streak display: Fire icon with count
- Stats modal: Full breakdown with all limits

## Accessibility
- Minimum touch targets: 44x44px
- Color-blind safe: Use shapes + colors for class indicators
- Screen reader labels on all interactive elements
