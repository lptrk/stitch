"use client"

import React from "react"

import { useState, useCallback } from "react"
import type { TestBlockDefinition } from "@/types/workflow"
import type { LucideIcon } from "lucide-react"

interface CustomBlockData {
  name: string
  description: string
  category: string
  icon: LucideIcon
  code: string
  tags: Array<{ name: string; color: string }>
  parameters: Array<{
    id: string
    name: string
    type: "text" | "number" | "selector"
    required: boolean
    placeholder: string
  }>
}

interface CustomBlockExport {
  id: string
  name: string
  description: string
  category: string
  iconName: string
  code: string
  tags: Array<{ name: string; color: string }>
  parameters: Array<{
    id: string
    name: string
    type: "text" | "number" | "selector"
    required: boolean
    placeholder: string
  }>
  createdAt: string
}

const categoryColors = {
  click: "bg-blue-500",
  input: "bg-green-500",
  navigation: "bg-purple-500",
  verification: "bg-orange-500",
  utility: "bg-gray-500",
  custom: "bg-pink-500",
}

export function useCustomBlocks() {
  const [customBlocks, setCustomBlocks] = useState<TestBlockDefinition[]>([])

  const addCustomBlock = useCallback((blockData: CustomBlockData) => {
    const blockId = `custom_${Date.now()}`

    const newBlock: TestBlockDefinition = {
      id: blockId,
      name: blockData.name,
      description: blockData.description,
      icon: blockData.icon,
      color: categoryColors[blockData.category as keyof typeof categoryColors] || "bg-gray-500",
      playwrightFunction: blockId, // Use same ID for playwright function
      parameters: blockData.parameters.map((param) => ({
        id: param.id,
        name: param.name,
        type: param.type,
        placeholder: param.placeholder,
        required: param.required,
      })),
      customCode: blockData.code,
      isCustom: true,
      category: blockData.category,
      tags: blockData.tags,
    }

    setCustomBlocks((prev) => [...prev, newBlock])
    return newBlock
  }, [])

  const updateCustomBlock = useCallback((updatedBlock: TestBlockDefinition) => {
    setCustomBlocks((prev) => prev.map((block) => (block.id === updatedBlock.id ? updatedBlock : block)))
  }, [])

  const removeCustomBlock = useCallback((blockId: string) => {
    setCustomBlocks((prev) => prev.filter((block) => block.id !== blockId))
  }, [])

  const clearCustomBlocks = useCallback(() => {
    setCustomBlocks([])
  }, [])

  const exportCustomBlocks = useCallback(() => {
    const exportData: CustomBlockExport[] = customBlocks.map((block) => ({
      id: block.id,
      name: block.name,
      description: block.description,
      category: (block as any).category || "custom",
      iconName: block.icon.name,
      code: block.customCode || "",
      parameters: block.parameters || [],
      tags: (block as any).tags || [],
      createdAt: new Date().toISOString(),
    }))

    const dataStr = JSON.stringify(
      {
        version: "1.0",
        exportedAt: new Date().toISOString(),
        blocks: exportData,
      },
      null,
      2,
    )

    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)

    const link = document.createElement("a")
    link.href = url
    link.download = `custom-blocks-${Date.now()}.json`
    link.click()

    URL.revokeObjectURL(url)

    return exportData.length
  }, [customBlocks])

  const importCustomBlocks = useCallback((importData: any, iconMap: Record<string, LucideIcon>) => {
    try {
      // Validate import data structure
      if (!importData.blocks || !Array.isArray(importData.blocks)) {
        throw new Error("Invalid blocks file format")
      }

      const importedBlocks: TestBlockDefinition[] = importData.blocks.map((blockData: CustomBlockExport) => {
        // Get icon from map or use default
        let icon = iconMap[blockData.iconName]

        // If icon not found, try some fallbacks
        if (!icon) {
          console.warn(`Icon "${blockData.iconName}" not found, using fallback`)
          icon = iconMap["Code"] || iconMap["Zap"] || iconMap["Settings"]
        }

        // Final fallback - use a simple function that returns a div
        if (!icon) {
          console.error(`No fallback icon found, creating dummy icon`)
          icon = (() => React.createElement("div", { className: "w-4 h-4 bg-gray-400 rounded" })) as LucideIcon
        }

        // Keep original ID structure but ensure uniqueness
        const blockId = `imported_${blockData.id}_${Date.now()}`

        return {
          id: blockId,
          name: blockData.name,
          description: blockData.description,
          icon: icon,
          color: categoryColors[blockData.category as keyof typeof categoryColors] || "bg-gray-500",
          playwrightFunction: blockId, // Use same ID for playwright function
          parameters: blockData.parameters || [],
          customCode: blockData.code,
          isCustom: true,
          category: blockData.category,
          tags: blockData.tags || [],
        }
      })

      console.log(
        "📦 Imported blocks:",
        importedBlocks.map((b) => ({ id: b.id, playwrightFunction: b.playwrightFunction })),
      )

      // Replace all custom blocks with imported ones
      setCustomBlocks(importedBlocks)

      return importedBlocks.length
    } catch (error) {
      console.error("Import error:", error)
      throw new Error(`Failed to import blocks: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }, [])

  return {
    customBlocks,
    addCustomBlock,
    updateCustomBlock,
    removeCustomBlock,
    clearCustomBlocks,
    exportCustomBlocks,
    importCustomBlocks,
  }
}
