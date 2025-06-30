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
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          value={searchValue}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder={placeholder}
          className="pl-10 pr-10"
        />
        {searchValue && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleSearchChange("")}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>

      {/* Filter Controls */}
      <div className="flex items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 bg-transparent">
              <Filter className="w-4 h-4" />
              Filters
              {selectedTags.length + selectedCategories.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {selectedTags.length + selectedCategories.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <Command>
              <CommandInput placeholder="Search filters..." />
              <CommandList>
                <CommandEmpty>No filters found.</CommandEmpty>

                {/* Categories */}
                {allCategories.length > 0 && (
                  <CommandGroup heading="Categories">
                    {allCategories.map((category) => (
                      <CommandItem key={category} onSelect={() => toggleCategory(category)}>
                        <div className="flex items-center gap-2 w-full">
                          <input
                            type="checkbox"
                            checked={selectedCategories.includes(category)}
                            onChange={() => toggleCategory(category)}
                            className="rounded"
                          />
                          <span className="capitalize">{category}</span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {/* Tags */}
                {allTags.length > 0 && (
                  <CommandGroup heading="Tags">
                    {allTags.map((tag) => (
                      <CommandItem key={tag} onSelect={() => toggleTag(tag)}>
                        <div className="flex items-center gap-2 w-full">
                          <input
                            type="checkbox"
                            checked={selectedTags.includes(tag)}
                            onChange={() => toggleTag(tag)}
                            className="rounded"
                          />
                          <Tag className="w-3 h-3" />
                          <span>{tag}</span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearAllFilters} className="gap-2">
            <X className="w-4 h-4" />
            Clear
          </Button>
        )}
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-1">
          {selectedCategories.map((category) => (
            <Badge key={category} variant="secondary" className="gap-1">
              {category}
              <button onClick={() => toggleCategory(category)} className="ml-1 hover:text-red-600">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
          {selectedTags.map((tag) => (
            <Badge key={tag} className={`border gap-1 ${getTagColor(tag)}`}>
              <Tag className="w-2 h-2" />
              {tag}
              <button onClick={() => toggleTag(tag)} className="ml-1 hover:text-red-600">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Results Count */}
      {hasActiveFilters && (
        <div className="text-xs text-gray-500">
          Showing {filteredCount} of {blocks.length} blocks
        </div>
      )}
    </div>
  )
}
