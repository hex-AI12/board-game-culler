"use client"

import { Search, SlidersHorizontal } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import type { DashboardFilters } from "@/lib/types"

interface Facets {
  categories: string[]
  mechanics: string[]
  years: [number, number]
}

export function FilterBar({
  filters,
  onChange,
  onReset,
  facets,
}: {
  filters: DashboardFilters
  onChange: (patch: Partial<DashboardFilters>) => void
  onReset: () => void
  facets: Facets
}) {
  return (
    <Card className="border-white/10 bg-card/70 shadow-lg shadow-black/20">
      <CardContent className="space-y-5 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <SlidersHorizontal className="size-4 text-primary" />
              Filter the shelf
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Dial in player counts, overlap, weight, and years before you start culling.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ToggleBadge active={filters.onlyUnplayed} onClick={() => onChange({ onlyUnplayed: !filters.onlyUnplayed })}>
              Unplayed only
            </ToggleBadge>
            <ToggleBadge active={filters.onlyUnrated} onClick={() => onChange({ onlyUnrated: !filters.onlyUnrated })}>
              Unrated only
            </ToggleBadge>
            <Button variant="ghost" size="sm" onClick={onReset}>
              Reset filters
            </Button>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-6 md:grid-cols-2">
          <div className="xl:col-span-2">
            <label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">Search</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={filters.search} onChange={(event) => onChange({ search: event.target.value })} placeholder="Search by name" className="pl-9" />
            </div>
          </div>

          <SelectField label="Sort by" value={filters.sortBy} onValueChange={(value) => onChange({ sortBy: value as DashboardFilters["sortBy"] })} options={[
            ["score", "Cull Score"],
            ["name", "Name"],
            ["rating", "Rating"],
            ["plays", "Play Count"],
            ["lastPlayed", "Last Played"],
            ["weight", "Weight"],
          ]} />
          <SelectField label="View" value={filters.viewMode} onValueChange={(value) => onChange({ viewMode: value as DashboardFilters["viewMode"] })} options={[["grid", "Grid"], ["list", "List"]]} />
          <SelectField label="Player count" value={filters.playerCount} onValueChange={(value) => onChange({ playerCount: value ?? "any" })} options={[["any", "Any"], ["1", "1"], ["2", "2"], ["3", "3"], ["4", "4"], ["5", "5+"]]} />
          <SelectField label="Category" value={filters.category} onValueChange={(value) => onChange({ category: value ?? "all" })} options={[["all", "All categories"], ...facets.categories.map((item) => [item, item])]} />
          <SelectField label="Mechanic" value={filters.mechanic} onValueChange={(value) => onChange({ mechanic: value ?? "all" })} options={[["all", "All mechanics"], ...facets.mechanics.map((item) => [item, item])]} />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <SliderField
            label={`Weight range · ${filters.weightRange[0].toFixed(1)} to ${filters.weightRange[1].toFixed(1)}`}
            min={1}
            max={5}
            step={0.1}
            value={filters.weightRange}
            onValueChange={(value) => onChange({ weightRange: (Array.isArray(value) ? value : [value, value]) as [number, number] })}
          />
          <SliderField
            label={`Year range · ${filters.yearRange[0]} to ${filters.yearRange[1]}`}
            min={facets.years[0]}
            max={facets.years[1]}
            step={1}
            value={filters.yearRange}
            onValueChange={(value) => onChange({ yearRange: (Array.isArray(value) ? value : [value, value]) as [number, number] })}
          />
        </div>
      </CardContent>
    </Card>
  )
}

function ToggleBadge({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}>
      <Badge className={active ? "border-primary/30 bg-primary/20 text-primary" : "bg-white/6 text-muted-foreground"}>{children}</Badge>
    </button>
  )
}

function SelectField({
  label,
  value,
  onValueChange,
  options,
}: {
  label: string
  value: string
  onValueChange: (value: string | null, eventDetails?: unknown) => void
  options: string[][]
}) {
  return (
    <div>
      <label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">{label}</label>
      <Select value={value} onValueChange={(val) => onValueChange(val ?? "")}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(([optionValue, optionLabel]) => (
            <SelectItem key={optionValue} value={optionValue}>
              {optionLabel}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  onValueChange,
}: {
  label: string
  value: number[]
  min: number
  max: number
  step: number
  onValueChange: (value: number | readonly number[], eventDetails?: unknown) => void
}) {
  return (
    <div>
      <label className="mb-3 block text-xs uppercase tracking-wide text-muted-foreground">{label}</label>
      <Slider min={min} max={max} step={step} value={value} onValueChange={onValueChange} />
    </div>
  )
}
