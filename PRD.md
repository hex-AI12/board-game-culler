# Board Game Culler — Product Requirements

## Overview
A Next.js web app that helps a board game collector decide which games to cull from their collection. Pulls data from BoardGameGeek's XML API2, scores each game on "cull-worthiness", and provides an interactive UI for making keep/sell/trade decisions.

## Tech Stack
- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS v4
- shadcn/ui components
- No database — all state in localStorage + BGG API

## Environment
- `BGG_API_KEY` in `.env.local` — used as Bearer token for BGG API requests

## BGG API Integration

### Authentication
All requests to `https://boardgamegeek.com/xmlapi2/` must include:
```
Authorization: Bearer <BGG_API_KEY>
```

### Endpoints Used
1. **Collection**: `GET /xmlapi2/collection?username=USERNAME&own=1&stats=1&excludesubtype=boardgameexpansion`
   - Returns owned games with ratings and stats
   - May return HTTP 202 (queued) — must retry with delay until 200
   - Response is XML
   
2. **Thing (game details)**: `GET /xmlapi2/thing?id=ID1,ID2,...&stats=1`
   - Batch fetch game details (up to ~20 IDs per request)
   - Returns: weight, player count votes, categories, mechanics, description, image

3. **Plays**: `GET /xmlapi2/plays?username=USERNAME&subtype=boardgame`
   - Returns play history (paginated, 100 per page)
   - Used to calculate "last played" and play frequency

### XML Parsing
Use a server-side API route to fetch from BGG and return JSON to the client. Parse XML with `fast-xml-parser`.

## Features

### 1. Setup Page
- Text input for BGG username
- "Load Collection" button
- Loading state with progress (fetching collection... fetching details... fetching plays...)
- Persist username in localStorage

### 2. Collection Dashboard
- Grid/list view of all owned games
- Each game card shows:
  - Thumbnail image
  - Name + year
  - Your rating (if rated) + BGG average rating
  - Play count + last played date
  - Weight (complexity) — shown as colored dots or bar
  - Player count range
  - **Cull Score** — the key metric (0-100, higher = more cull-worthy)

### 3. Cull Score Algorithm
Score 0-100 where higher = more likely should be culled. Factors:

| Factor | Weight | Logic |
|--------|--------|-------|
| Play frequency | 30% | Games not played in 12+ months score high. Never played = max. Recently played = low. |
| Your rating | 25% | Low personal rating = high cull score. No rating = moderate (unknown preference). |
| Rating gap | 10% | If your rating is well below BGG average, you might be keeping it for the "wrong" reasons. |
| Collection redundancy | 15% | If you have 5 other games with the same primary mechanic, this one is more cullable. |
| Weight mismatch | 10% | If most of your plays are on medium-weight games but this is very heavy or very light, it's a mismatch. |
| Availability | 10% | High BGG rank + in print = easy to re-acquire. Rare/OOP = penalty on cull score. |

### 4. Sorting & Filtering
- Sort by: Cull Score (desc), Name, Rating, Play Count, Last Played, Weight
- Filter by: Player count, Weight range, Category, Mechanic, Year
- Search by name
- Toggle: Show only unplayed, Show only unrated

### 5. Decision Mode (Tinder-style)
- Shows one game at a time, large card
- Full details + cull score breakdown
- Three buttons: KEEP (green), MAYBE (yellow), CULL (red)
- Swipe gestures on mobile
- Progress bar showing how many reviewed
- Can skip

### 6. Results / Export
- Summary: X games to keep, Y to cull, Z maybe
- List view of cull pile with:
  - Estimated trade value (based on BGG marketplace if available)
  - Direct link to BGG trade listing page
- Export as CSV (name, BGG link, your rating, cull score, decision)
- Share link (generates a static page or copy-to-clipboard list)

### 7. Persistence
- All decisions saved to localStorage
- Can re-import and see what changed
- "Reset decisions" button

## UI/UX
- Dark mode by default (gamer vibes)
- Mobile-responsive
- Fast — cache BGG data in localStorage after first fetch
- Skeleton loading states
- Toast notifications for actions

## API Routes (Next.js)
- `GET /api/collection?username=X` — fetches + parses BGG collection XML
- `GET /api/games?ids=1,2,3` — fetches + parses BGG thing details XML
- `GET /api/plays?username=X` — fetches + parses BGG plays XML (all pages)

## File Structure
```
board-game-culler/
├── src/
│   ├── app/
│   │   ├── page.tsx          (setup/landing)
│   │   ├── dashboard/
│   │   │   └── page.tsx      (collection grid)
│   │   ├── decide/
│   │   │   └── page.tsx      (tinder mode)
│   │   ├── results/
│   │   │   └── page.tsx      (export/summary)
│   │   └── api/
│   │       ├── collection/
│   │       │   └── route.ts
│   │       ├── games/
│   │       │   └── route.ts
│   │       └── plays/
│   │           └── route.ts
│   ├── components/
│   │   ├── GameCard.tsx
│   │   ├── CullScoreBadge.tsx
│   │   ├── DecisionCard.tsx
│   │   ├── FilterBar.tsx
│   │   └── ...
│   ├── lib/
│   │   ├── bgg.ts            (BGG API client)
│   │   ├── cull-score.ts     (scoring algorithm)
│   │   ├── types.ts          (TypeScript interfaces)
│   │   └── storage.ts        (localStorage helpers)
│   └── ...
├── .env.local
├── package.json
└── ...
```

## Non-Goals
- No user accounts / auth
- No server-side database
- No BGG login/write operations
- No expansion tracking (base games only)

## Launch Checklist
- [ ] Can enter BGG username and load collection
- [ ] Games display with all metadata
- [ ] Cull score calculates correctly
- [ ] Dashboard sorting/filtering works
- [ ] Decision mode (tinder) works with swipe
- [ ] Results page shows summary + CSV export
- [ ] Data persists in localStorage
- [ ] Mobile responsive
- [ ] Handles BGG API 202 retry gracefully
