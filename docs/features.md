# 🎮 Features & Systems (implemented)

## 1. Core Multiplayer 🌐
- **Synchronization**: Real-time position updates, nickname validation, and unique socket IDs.
- **Spawn Logic**: Safe zone spawning (-100 to 100) to prevent collisions on entry.
- **Movement**: Client-side prediction with server broadcasting.

## 2. World & Environment 🌳
- **Map**: 2000x2000 seamless world with dirt background.
- **Biomes**:
  - **Forest (Middle)**: Normal Trees, Apples.
  - **Snow (Top, Y < -700)**: Frozen Trees, Crystals.
  - **Desert (Bottom, Y > 700)**: Cactus, Fiber.
- **Lighting**: Day/Night cycle (5 min) with ambient color transitions (Midnight -> Dawn -> Noon -> Dusk).
- **NPCs**: Roaming creatures (Sheep, Roaches) with synchronized states.

## 3. Interaction & Physics 💥
- **Mobile Controls**: Dynamic Joystick (Expanded 75% zone) + Touch buttons.
- **Collisions**: Arcade physics with trunk-only hitboxes for 2.5D depth feel.
- **Harvesting**: Proximity-based gathering (2s wait) with loot drops.
- **Visuals**: 
  - Floating Emoji Animations for loot.
  - Animated bonfires and particle effects.

## 4. Systems 🛠️
- **Inventory**: 
  - Smart stacking & 20-slot paged UI.
  - **Drag & Drop** organization.
  - **Context Menu**: Eat (Restore HP) / Drop (Floating item visualization).
  - Unified Left-Click/Touch interaction for Mobile & PC.
- **Building**: 
  - Grid-based placement (48x48 snapping).
  - Persistence via SQLite (`world.db`).
  - "Remove Tool" with resource refund.

## 5. RPG Mechanics ⚔️
- **Stats**: HP, Max HP, Level, EXP.
- **Progression**: Visual Level text, Status Window (Stats overview).
- **Consumables**: Eat food to restore HP using the Inventory Context Menu.

## 6. Systems (Meta) 🏗️
- **Guestbook**: Persistent message board with proximity trigger.
- **Minigames**: "Arcade Hub" with Leaderboards (Cactus Dodge, Resource Rush, Math Blitz).

## 7. UI/UX 🎨
- **HUD**: Minimap (with entity dots), Digital Clock, Floating Health Bars.
- **Responsiveness**: Mobile-optimized icons (Backpack, Build, Emotes).
- **Authentication**: Salted hash login, Session persistence ("Remember Me").
