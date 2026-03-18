# Board Game Shelf — Product Requirements v2

## Overview
A personal board game collection manager powered by BoardGameGeek data. Manage your collection, discover what to play tonight, analyze your shelf, cull games you don't need, track your wishlist, and manage trades — all from one app.

## Rebrand
- App name: **Board Game Shelf**
- Tagline: "Your collection, sorted."
- Update all references from "Board Game Culler" to "Board Game Shelf"
- Update metadata, page titles, header branding

## Tech Stack (unchanged)
- Next.js 15 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui (base-nova style)
- No database — localStorage + BGG API
- Server-side API routes proxy BGG XML API with Bearer token auth

## Navigation Structure
```
/ .................. Landing / Setup (enter BGG username)
/collection ........ Collection Dashboard (was /dashboard)
/play .............. Game Night Picker
/culler ............ Culler (keep/maybe/cull triage - existing decide mode)
/stats ............. Stats & Insights
/wishlist .......... Wishlist Manager
/trades ............ Trade Helper
```

Update the header nav to show all 6 sections. Use icons + labels. Mobile: hamburger menu or bottom nav.

---

## Feature 1: Collection Dashboard (`/collection`)
**This already exists as /dashboard. Move it to /collection and keep all existing functionality.**

Existing features to preserve:
- Summary cards (collection size, high cull fit count, average score, decisions made)
- Scoring mode banner (plays tracked vs not)
- Filter bar (search, sort, player count, weight, category, mechanic, year range, toggles)
- Game card grid/list view with cull scores
- Tabs (all games, cull hotlist, unplayed)

Additions:
- Add a "Favorites" tab — games the user has rated 8+ on BGG
- Show total estimated collection value in summary cards
- Add a quick "Play tonight" button that links to /play with current filters pre-applied

---

## Feature 2: Game Night Picker (`/play`)
Help the user pick a game for tonight from their own collection.

### UI
- **Quick filters at the top:**
  - Player count selector (1-8+) — big, tappable buttons
  - Time available: "Quick (<30min)", "Standard (30-90min)", "Epic (90min+)"
  - Weight preference: "Light", "Medium", "Heavy", "Any"
  - Category/mechanic pills (optional, collapsible)

- **Results area:**
  - Shows matching games from the user's collection, sorted by BGG rating (best first)
  - Each result is a compact card: image, name, player range, play time, weight dots, BGG rating
  - "Spin the wheel" button — randomly picks one game from the filtered results with a fun animation (CSS spinner that lands on a game)
  - "Can't decide" mode — shows 2 games side-by-side for head-to-head comparison, user picks one (tournament bracket style, up to 3 rounds)

### Data
- Uses the already-loaded collection data from localStorage
- Player count filter: game.minPlayers <= selected <= game.maxPlayers
- Time filter: uses minPlayTime/maxPlayTime from BGG game details
- Weight filter: Light (1-2), Medium (2-3.5), Heavy (3.5-5)

---

## Feature 3: Culler (`/culler`)
**This is the existing /decide page, moved to /culler.**

Keep all existing functionality:
- Tinder-style decision cards
- Keep/Maybe/Cull buttons
- Swipe gestures
- Score breakdown with insights
- Progress tracking

Additions:
- Add a "Quick cull" mode: shows a table/list of ALL games sorted by cull score, with inline Keep/Cull buttons (for people who don't want to swipe one-by-one)
- Show estimated trade value on each card
- Link to the game's trade page on /trades after marking as "cull"

---

## Feature 4: Stats & Insights (`/stats`)
Analytics dashboard for the collection. All computed client-side from cached data.

### Sections

**Collection Overview**
- Total games owned
- Total estimated value (sum of all estimateTradeValue)
- Average BGG rating across collection
- Average weight across collection
- Year range (oldest to newest game)

**Weight Distribution** (bar chart or visual)
- Histogram: how many games at each weight band (1-1.5, 1.5-2, 2-2.5, etc.)
- Show the user's "sweet spot" (where most games cluster)
- Highlight outliers

**Player Count Coverage** (visual)
- For each player count 1-8+: how many games support it
- Identify gaps ("You only have 2 solo games" or "Nothing plays 7+")

**Mechanic Breakdown** (horizontal bar chart or tag cloud)
- Top 15 mechanics in the collection with counts
- "You have 12 deck builders" type callouts
- Highlight over-represented and under-represented mechanics

**Category Spread**
- Similar to mechanics — top categories with counts

**Rating Distribution**
- How many games at each user rating (1-10)
- How many unrated games
- Average personal rating vs average BGG rating

**Top 10 Lists** (cards)
- Highest rated (by user)
- Highest rated (by BGG community)
- Heaviest games
- Lightest games
- Most players supported
- Newest additions (by year published)

### Implementation
- Use simple CSS-based charts (colored bars with percentage widths). No charting library needed.
- Each section is a Card component with a title and content.
- Responsive grid layout.

---

## Feature 5: Wishlist Manager (`/wishlist`)
Pull the user's BGG wishlist and provide smart recommendations.

### Data
- New API route: `GET /api/wishlist?username=X`
- Calls BGG XML API: `/xmlapi2/collection?username=X&wishlist=1&stats=1&excludesubtype=boardgameexpansion`
- Returns wishlist items with stats

### UI
- Grid of wishlist games (similar card style to collection)
- Each card shows: name, image, BGG rating, weight, player count, year
- **Overlap warnings**: if a wishlist game shares 2+ mechanics with games you already own, show a warning badge: "Similar to [Game X] you already own"
- **Priority sorting**: BGG wishlist priority (1-5) shown as stars/badges
- Sort by: priority, BGG rating, weight, name
- Filter by: player count, weight, category
- "Move to owned" button (links to BGG to update status)
- Estimated price indicator based on BGG marketplace data

---

## Feature 6: Trade Helper (`/trades`)
Manage games marked for trade/cull.

### Data
- Games marked as "cull" in the Culler flow are automatically added here
- Also pulls BGG "for trade" list: `GET /api/collection?username=X&trade=1`
- New API route or parameter addition

### UI
- List of all games marked for trade/cull
- Each game shows:
  - Image, name, year
  - Estimated trade value
  - BGG marketplace link (direct link to list this game)
  - BGG GeekMarket "sell" link
  - Current number of "want in trade" users on BGG (shows demand)
- **Total value** of trade pile displayed prominently
- **Export options**:
  - CSV download (name, BGG ID, estimated value, BGG link)
  - Copy as formatted text (for posting on BGG forums or Reddit r/boardgameexchange)
  - BGG GeekList format
- Sort by: estimated value, name, cull score

---

## Shared Components to Build/Update

### Updated Header
- Logo/name: "Board Game Shelf" with a bookshelf icon
- Nav items: Collection, Play, Culler, Stats, Wishlist, Trades
- Each nav item has an icon (from lucide-react)
- Active state highlighting
- Mobile: collapsible hamburger or horizontal scroll
- Username badge (when collection is loaded)
- Review count badge on Culler nav item

### Game Card (updated)
- Add optional "play time" display (e.g., "60-90 min")
- Add optional "action" slot for inline buttons (Keep/Cull, Add to trade, etc.)

### Empty States
- Each page needs a good empty state when no collection is loaded
- Consistent messaging: "Load your collection from the setup page to get started"
- Link back to /

---

## Routes Summary

### Pages
- `/` — Landing/setup (existing, update branding)
- `/collection` — Collection dashboard (move from /dashboard)
- `/play` — Game Night Picker (new)
- `/culler` — Culler triage (move from /decide, add quick-cull mode)
- `/stats` — Stats & Insights (new)
- `/wishlist` — Wishlist Manager (new)
- `/trades` — Trade Helper (new)
- `/results` — Results/export (keep, but link from /trades too)

### API Routes
- `/api/collection` — existing
- `/api/games` — existing
- `/api/plays` — existing
- `/api/wishlist` — new (BGG wishlist fetch)

---

## Implementation Notes
- All new pages should be client components wrapped in ClientOnly (same pattern as existing pages)
- Reuse the FilterBar component where applicable (collection, play, wishlist)
- Stats page: no external charting library — use Tailwind-styled divs for bar charts
- Game Night Picker spinner: CSS animation with transform rotate, lands on random game
- Keep all existing localStorage persistence patterns
- Wishlist data should also cache in localStorage (separate key)

## Non-Goals (for now)
- No user accounts / auth
- No server-side database
- No BGG login/write operations
- No social features (sharing collections between users)
- No expansion tracking

## Quality Bar
- Dark mode by default, light mode toggle
- Mobile responsive on all pages
- Skeleton loading states
- Toast notifications for actions
- Smooth transitions between pages
- Fast — everything cached after first load
