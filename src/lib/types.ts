export type Decision = "keep" | "maybe" | "cull"
export type ViewMode = "grid" | "list"
export type SortOption = "score" | "name" | "rating" | "plays" | "lastPlayed" | "weight"

export interface CollectionItem {
  id: number
  name: string
  yearPublished?: number
  image?: string
  thumbnail?: string
  own: boolean
  userRating?: number
  bggAverageRating?: number
  averageWeight?: number
  numPlaysOwned?: number
}

export interface GameDetails {
  id: number
  description?: string
  image?: string
  thumbnail?: string
  yearPublished?: number
  minPlayers?: number
  maxPlayers?: number
  minPlayTime?: number
  maxPlayTime?: number
  categories: string[]
  mechanics: string[]
  averageWeight?: number
  rank?: number | null
  usersRated?: number
  averageRating?: number
  marketPrice?: number | null
  marketListings?: number | null
  inPrint?: boolean | null
}

export interface PlaySummary {
  gameId: number
  playCount: number
  lastPlayed?: string
}

export interface CullFactorBreakdown {
  playFrequency: number
  yourRating: number
  ratingGap: number
  redundancy: number
  weightMismatch: number
  availability: number
}

export interface CullScoreBreakdown extends CullFactorBreakdown {
  total: number
  insights: string[]
}

export interface GameRecord extends CollectionItem, GameDetails, PlaySummary {
  bggUrl: string
  tradeUrl: string
  estimatedTradeValue: number
  primaryMechanic?: string
  cullScore: number
  cullScoreLabel: string
  cullBreakdown: CullScoreBreakdown
  previousCullScore?: number
  scoreDelta?: number
}

export interface CollectionDataset {
  username: string
  loadedAt: string
  previousLoadedAt?: string
  games: GameRecord[]
}

export type DecisionMap = Record<string, Decision>

export interface AppState {
  dataset: CollectionDataset | null
  decisions: DecisionMap
}

export interface LoadingStage {
  key: "collection" | "details" | "plays" | "scoring"
  label: string
  progress: number
}

export interface SharedResultsPayload {
  username: string
  generatedAt: string
  items: Array<{
    id: number
    name: string
    bggUrl: string
    tradeUrl: string
    yourRating?: number
    cullScore: number
    estimatedTradeValue: number
    decision: Decision
  }>
}

export interface DashboardFilters {
  search: string
  playerCount: string
  weightRange: [number, number]
  category: string
  mechanic: string
  yearRange: [number, number]
  onlyUnplayed: boolean
  onlyUnrated: boolean
  sortBy: SortOption
  viewMode: ViewMode
}
