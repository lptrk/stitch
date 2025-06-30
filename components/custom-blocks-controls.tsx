"use client"

import type React from "react"

import {useState} from "react"
import {Button} from "@/components/ui/button"
import {Input} from "@/components/ui/input"
import {Label} from "@/components/ui/label"
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger} from "@/components/ui/dialog"
import {AddCustomBlockDialog} from "./add-custom-block-dialog"
import {Download, Upload, Trash2, Code} from "lucide-react"
import {useToast} from "@/hooks/use-toast"
import type {LucideIcon} from "lucide-react"
import * as LucideIcons from "lucide-react"

interface CustomBlocksControlsProps {
  customBlocksCount: number
  onAddCustomBlock: (blockData: any) => void
  onExportBlocks: () => number
  onImportBlocks: (data: any, iconMap: Record<string, LucideIcon>) => number
  onClearBlocks: () => void
}

export function CustomBlocksControls({
                                       customBlocksCount,
                                       onAddCustomBlock,
                                       onExportBlocks,
                                       onImportBlocks,
                                       onClearBlocks,
                                     }: CustomBlocksControlsProps) {
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const {toast} = useToast()

  // Create icon map for import
  const createIconMap = (): Record<string, LucideIcon> => {
    const iconMap: Record<string, LucideIcon> = {}

    // Add all Lucide icons to the map
    Object.entries(LucideIcons).forEach(([name, icon]) => {
      if (typeof icon === "function" && name !== "createLucideIcon") {
        iconMap[name] = icon as LucideIcon
      }
    })

    // Add some common fallbacks
    iconMap["Code"] = LucideIcons.Code
    iconMap["Zap"] = LucideIcons.Zap
    iconMap["Settings"] = LucideIcons.Settings
    iconMap["Play"] = LucideIcons.Play

    console.log("Created icon map with", Object.keys(iconMap).length, "icons")
    return iconMap
  }

  const handleExport = () => {
    try {
      const exportedCount = onExportBlocks()
      toast({
        title: "Blocks exported",
        description: `Successfully exported ${exportedCount} custom blocks`,
      })
    } catch (error) {
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    }
  }

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const importData = JSON.parse(content)

        console.log("Importing blocks:", importData)

        const iconMap = createIconMap()
        console.log("Available icons:", Object.keys(iconMap).slice(0, 10), "...")

        const importedCount = onImportBlocks(importData, iconMap)

        setImportDialogOpen(false)
        toast({
          title: "Blocks imported",
          description: `Successfully imported ${importedCount} custom blocks`,
        })
      } catch (error) {
        console.error("Import error:", error)
        toast({
          title: "Import failed",
          description: error instanceof Error ? error.message : "Invalid blocks file format",
          variant: "destructive",
        })
      }
    }
    reader.readAsText(file)

    // Reset input
    event.target.value = ""
  }

  const handleClear = () => {
    if (customBlocksCount === 0) return

    if (confirm(`Delete all ${customBlocksCount} custom blocks? This cannot be undone.`)) {
      onClearBlocks()
      toast({
        title: "Blocks cleared",
        description: `Removed ${customBlocksCount} custom blocks`,
      })
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Add Custom Block */}
      <AddCustomBlockDialog onAddBlock={onAddCustomBlock}/>

      {/* Import/Export Controls */}
      <div className="flex gap-2">
        {customBlocksCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleExport} className="flex-1 bg-transparent">
            <Upload className="w-3 h-3 mr-1"/>
            Export ({customBlocksCount})
          </Button>
        )}
        <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="flex-1 bg-transparent">
              <Download className="w-3 h-3 mr-1"/>
              Import
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Code className="w-5 h-5"/>
                Import Custom Blocks
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>⚠️ Warning:</strong> Importing will replace all current custom blocks.
                </p>
              </div>
              <div>
                <Label htmlFor="blocks-file">Select custom-blocks.json file</Label>
                <Input id="blocks-file" type="file" accept=".json" onChange={handleImport} className="mt-2"/>
              </div>
              <p className="text-xs text-gray-500">
                Only import blocks from trusted sources. Custom blocks contain executable code.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Clear All */}
      {customBlocksCount > 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleClear}
          className="text-red-600 hover:text-red-700 hover:bg-red-50 bg-transparent"
        >
          <Trash2 className="w-3 h-3 mr-1"/>
          Clear All ({customBlocksCount})
        </Button>
      )}

      {/* Info */}
      <p className="text-xs text-gray-500 text-center">
        {customBlocksCount === 0 ? "No custom blocks" : `${customBlocksCount} custom blocks loaded`}
      </p>
    </div>
  )
}
