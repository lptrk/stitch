"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import type { TestBlockDefinition } from "@/types/workflow"
import { Search, X, Tag, Filter } from "lucide-react"

interface BlockSearchComboboxProps {
  blocks: TestBlockDefinition[]
  onFilterChange: (filteredBlocks: TestBlockDefinition[]) => void
  placeholder?: string
}

export function BlockSearchCombobox({
  blocks,
  onFilterChange,
  placeholder = "Search blocks...",
}: BlockSearchComboboxProps) {
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

  // Get all unique tags and categories
  const allTags = Array.from(
    new Set(
      blocks
        .flatMap((block) => (block.tags || []).map((tag) => (typeof tag === "string" ? tag : tag.name)))
        .filter(Boolean),
    ),
  ).sort()

  const allCategories = Array.from(
    new Set(blocks.map((block) => (block as any).category || (block.isCustom ? "custom" : "built-in")).filter(Boolean)),
  ).sort()

  // Filter blocks based on search criteria
  const filterBlocks = (searchTerm: string, tags: string[], categories: string[]) => {
    let filtered = blocks

    // Filter by search term (name or description)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (block) =>
          block.name.toLowerCase().includes(term) ||
          block.description.toLowerCase().includes(term) ||
          (block.tags || []).some((tag) => {
            const tagName = typeof tag === "string" ? tag : tag.name
            return tagName.toLowerCase().includes(term)
          }),
      )
    }

    // Filter by selected tags
    if (tags.length > 0) {
      filtered = filtered.filter((block) => {
        const blockTags = (block.tags || []).map((tag) => (typeof tag === "string" ? tag : tag.name))
        return tags.some((tag) => blockTags.includes(tag))
      })
    }

    // Filter by selected categories
    if (categories.length > 0) {
      filtered = filtered.filter((block) => {
        const blockCategory = (block as any).category || (block.isCustom ? "custom" : "built-in")
        return categories.includes(blockCategory)
      })
    }

    return filtered
  }

  // Apply filters and notify parent
  const applyFilters = (
    searchTerm: string = searchValue,
    tags: string[] = selectedTags,
    categories: string[] = selectedCategories,
  ) => {
    const filtered = filterBlocks(searchTerm, tags, categories)
    onFilterChange(filtered)
  }

  const handleSearchChange = (value: string) => {
    setSearchValue(value)
    applyFilters(value)
  }

  const toggleTag = (tag: string) => {
    const newTags = selectedTags.includes(tag) ? selectedTags.filter((t) => t !== tag) : [...selectedTags, tag]
    setSelectedTags(newTags)
    applyFilters(searchValue, newTags)
  }

  const toggleCategory = (category: string) => {
    const newCategories = selectedCategories.includes(category)
      ? selectedCategories.filter((c) => c !== category)
      : [...selectedCategories, category]
    setSelectedCategories(newCategories)
    applyFilters(searchValue, selectedTags, newCategories)
  }

  const clearAllFilters = () => {
    setSearchValue("")
    setSelectedTags([])
    setSelectedCategories([])
    onFilterChange(blocks)
  }

  const hasActiveFilters = searchValue.trim() || selectedTags.length > 0 || selectedCategories.length > 0
  const filteredCount = filterBlocks(searchValue, selectedTags, selectedCategories).length
  const activeFilterCount = selectedTags.length + selectedCategories.length

  // Get tag color for display
  const getTagColor = (tagName: string) => {
    for (const block of blocks) {
      if (block.tags) {
        const tag = block.tags.find((t) => (typeof t === "string" ? t : t.name) === tagName)
        if (tag && typeof tag === "object" && tag.color) {
          return tag.color
        }
      }
    }
    return "bg-slate-100 text-slate-800 border-slate-200" // default color
  }

  return (
    <div className="space-y-2">
      {/* Single search row: icon + input + filter icon + optional clear */}
      <div className="relative flex items-center">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />

        <Input
          value={searchValue}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder={placeholder}
          className="pl-8 pr-14 h-8 text-xs"
        />

        <div className="absolute right-1 flex items-center gap-0.5">
          {searchValue && (
            <button
              onClick={() => handleSearchChange("")}
              className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-foreground rounded"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <button
                className={`h-6 w-6 flex items-center justify-center rounded transition-colors ${
                  activeFilterCount > 0
                    ? "text-primary bg-accent"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Filter blocks"
              >
                <Filter className="w-3.5 h-3.5" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-primary text-primary-foreground text-[8px] rounded-full flex items-center justify-center font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="end">
              <Command>
                <CommandInput placeholder="Search filters..." className="h-8 text-xs" />
                <CommandList>
                  <CommandEmpty className="text-xs py-4 text-center text-muted-foreground">No filters found.</CommandEmpty>
                  {allCategories.length > 0 && (
                    <CommandGroup heading="Categories">
                      {allCategories.map((category) => (
                        <CommandItem key={category} onSelect={() => toggleCategory(category)} className="text-xs">
                          <div className="flex items-center gap-2 w-full">
                            <input type="checkbox" checked={selectedCategories.includes(category)} onChange={() => toggleCategory(category)} className="rounded" />
                            <span className="capitalize">{category}</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                  {allTags.length > 0 && (
                    <CommandGroup heading="Tags">
                      {allTags.map((tag) => (
                        <CommandItem key={tag} onSelect={() => toggleTag(tag)} className="text-xs">
                          <div className="flex items-center gap-2 w-full">
                            <input type="checkbox" checked={selectedTags.includes(tag)} onChange={() => toggleTag(tag)} className="rounded" />
                            <Tag className="w-3 h-3" />
                            <span>{tag}</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                  {activeFilterCount > 0 && (
                    <div className="p-2 border-t">
                      <button onClick={clearAllFilters} className="w-full text-xs text-red-500 hover:text-red-700 flex items-center justify-center gap-1 py-1">
                        <X className="w-3 h-3" /> Clear all filters
                      </button>
                    </div>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedCategories.map((category) => (
            <Badge key={category} variant="secondary" className="gap-1 text-[10px] h-5 px-1.5">
              {category}
              <button onClick={() => toggleCategory(category)} className="hover:text-red-600">
                <X className="w-2.5 h-2.5" />
              </button>
            </Badge>
          ))}
          {selectedTags.map((tag) => (
            <Badge key={tag} className={`border gap-1 text-[10px] h-5 px-1.5 ${getTagColor(tag)}`}>
              {tag}
              <button onClick={() => toggleTag(tag)} className="hover:text-red-600">
                <X className="w-2.5 h-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
