"use client"

import {useState, useMemo} from "react"
import type {TestBlockDefinition} from "@/types/workflow"
import {TestBlock} from "./test-block"
import {CustomBlocksControls} from "./custom-blocks-controls"
import {BlockInspectorDialog} from "./block-inspector-dialog"
import {BlockDebugDialog} from "./block-debug-dialog"
import {BlockSearchCombobox} from "./block-search-combobox"
import {CollapsibleSection} from "./collapsible-section"
import {ScrollArea} from "@/components/ui/scroll-area"
import {Separator} from "@/components/ui/separator"
import {Badge} from "@/components/ui/badge"
import {useToast} from "@/hooks/use-toast"
import {Blocks, Zap} from "lucide-react"

interface TestBlocksSidebarProps {
  blocks: TestBlockDefinition[]
  customBlocks: TestBlockDefinition[]
  onAddCustomBlock: (blockData: any) => void
  onRemoveCustomBlock: (blockId: string) => void
  onUpdateCustomBlock?: (updatedBlock: TestBlockDefinition) => void
  onExportCustomBlocks: () => number
  onImportCustomBlocks: (data: any, iconMap: any) => number
  onClearCustomBlocks: () => void
}

export function TestBlocksSidebar({
                                    blocks,
                                    customBlocks,
                                    onAddCustomBlock,
                                    onRemoveCustomBlock,
                                    onUpdateCustomBlock,
                                    onExportCustomBlocks,
                                    onImportCustomBlocks,
                                    onClearCustomBlocks,
                                  }: TestBlocksSidebarProps) {
  const [inspectorOpen, setInspectorOpen] = useState(false)
  const [debugOpen, setDebugOpen] = useState(false)
  const [selectedBlock, setSelectedBlock] = useState<TestBlockDefinition | null>(null)
  const [filteredBuiltInBlocks, setFilteredBuiltInBlocks] = useState<TestBlockDefinition[]>(blocks)
  const [filteredCustomBlocks, setFilteredCustomBlocks] = useState<TestBlockDefinition[]>(customBlocks)
  const {toast} = useToast()

  // Combine all blocks for search
  const allBlocks = useMemo(() => [...blocks, ...customBlocks], [blocks, customBlocks])

  // Handle search filter changes
  const handleFilterChange = (filtered: TestBlockDefinition[]) => {
    const builtInFiltered = filtered.filter((block) => !block.isCustom)
    const customFiltered = filtered.filter((block) => block.isCustom)

    setFilteredBuiltInBlocks(builtInFiltered)
    setFilteredCustomBlocks(customFiltered)
  }

  // Reset filters when blocks change
  useMemo(() => {
    setFilteredBuiltInBlocks(blocks)
    setFilteredCustomBlocks(customBlocks)
  }, [blocks, customBlocks])

  const handleInspectBlock = (block: TestBlockDefinition) => {
    console.log("🔍 Sidebar: Inspect block", block.name)
    setSelectedBlock(block)
    setInspectorOpen(true)
  }

  const handleDebugBlock = (block: TestBlockDefinition) => {
    console.log("🐛 Sidebar: Debug block", block.name)
    setSelectedBlock(block)
    setDebugOpen(true)
  }

  const handleEditBlock = (block: TestBlockDefinition) => {
    console.log("✏️ Sidebar: Edit block", block.name)
    setSelectedBlock(block)
    setInspectorOpen(true)
  }

  const handleSaveBlock = (updatedBlock: TestBlockDefinition) => {
    console.log("💾 Sidebar: Save block", updatedBlock.name)
    if (onUpdateCustomBlock) {
      onUpdateCustomBlock(updatedBlock)
      toast({
        title: "Block updated",
        description: `Successfully updated "${updatedBlock.name}"`,
      })
    }
  }

  const handleDeleteBlock = (blockId: string) => {
    console.log("🗑️ Sidebar: Delete block", blockId)
    const block = customBlocks.find((b) => b.id === blockId)
    if (block) {
      onRemoveCustomBlock(blockId)
      setInspectorOpen(false)
      setDebugOpen(false)
      setSelectedBlock(null)
      toast({
        title: "Block deleted",
        description: `Deleted "${block.name}"`,
      })
    }
  }

  const handleDuplicateBlock = (block: TestBlockDefinition) => {
    console.log("📋 Sidebar: Duplicate block", block.name)
    const duplicatedBlock = {
      name: `${block.name} (Copy)`,
      description: block.description,
      category: (block as any).category || "custom",
      icon: block.icon,
      code: block.customCode || "",
      parameters: block.parameters || [],
      tags: (block as any).tags || []
    }

    onAddCustomBlock(duplicatedBlock)
    toast({
      title: "Block duplicated",
      description: `Created copy of "${block.name}"`,
    })
  }

  const handleTestBlock = async (block: TestBlockDefinition, parameters: Record<string, string>) => {
    console.log("🧪 Testing block:", block.name, "with parameters:", parameters)

    // Create a test workflow configuration
    const testConfig = {
      baseUrl: "https://example.com",
      workflows: {
        test: {
          name: "Block Test",
          description: "Testing single block",
          workflow: [
            {
              block: "goto",
              parameters: {url: "/"},
            },
            {
              block: block.id,
              parameters: parameters,
            },
          ],
        },
      },
      mainWorkflow: "test",
      customBlocks: block.isCustom
        ? {
          [block.id]: {
            id: block.id,
            name: block.name,
            code: block.customCode || "",
            parameters: block.parameters || [],
          },
        }
        : {},
    }

    try {
      console.log("🚀 Sending test request...")
      const response = await fetch("/api/run-workflow", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(testConfig),
      })

      const result = await response.json()
      console.log("📥 Test result:", result)

      if (result.success) {
        toast({
          title: "Block test completed",
          description: "Block executed successfully! Check console for details.",
        })
      } else {
        toast({
          title: "Block test failed",
          description: result.message || "Test execution failed",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("❌ Test error:", error)
      toast({
        title: "Test failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    }
  }

  return (
    <>
      <div className="bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Test Blocks</h2>
          <p className="text-sm text-gray-600">Drag blocks to build your test</p>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <BlockSearchCombobox
            blocks={allBlocks}
            onFilterChange={handleFilterChange}
            placeholder="Search blocks by name, description, or tags..."
          />
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* Built-in Blocks */}
            <CollapsibleSection
              title="Built-in Blocks"
              icon={<Blocks className="w-4 h-4"/>}
              badge={
                <Badge variant="outline" className="text-xs">
                  {filteredBuiltInBlocks.length}
                </Badge>
              }
              defaultExpanded={true}
            >
              {filteredBuiltInBlocks.length === 0 ? (
                <div className="text-center py-4 text-gray-500 text-sm">No built-in blocks match your search</div>
              ) : (
                <div className="space-y-3">
                  {filteredBuiltInBlocks.map((block) => (
                    <TestBlock
                      key={block.id}
                      block={block}
                      draggable={true}
                      onInspect={handleInspectBlock}
                      onDebug={handleDebugBlock}
                    />
                  ))}
                </div>
              )}
            </CollapsibleSection>

            {/* Custom Blocks */}
            {customBlocks.length > 0 && (
              <>
                <Separator/>
                <CollapsibleSection
                  title="Custom Blocks"
                  icon={<Zap className="w-4 h-4"/>}
                  badge={
                    <Badge variant="secondary" className="text-xs">
                      {filteredCustomBlocks.length}
                    </Badge>
                  }
                  defaultExpanded={true}
                >
                  {filteredCustomBlocks.length === 0 ? (
                    <div className="text-center py-4 text-gray-500 text-sm">No custom blocks match your search</div>
                  ) : (
                    <div className="space-y-3">
                      {filteredCustomBlocks.map((block) => (
                        <TestBlock
                          key={block.id}
                          block={block}
                          draggable={true}
                          onInspect={handleInspectBlock}
                          onEdit={handleEditBlock}
                          onDelete={handleDeleteBlock}
                          onDuplicate={handleDuplicateBlock}
                          onDebug={handleDebugBlock}
                        />
                      ))}
                    </div>
                  )}
                </CollapsibleSection>
              </>
            )}
          </div>
        </ScrollArea>

        {/* Custom Blocks Controls */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <CustomBlocksControls
            customBlocksCount={customBlocks.length}
            onAddCustomBlock={onAddCustomBlock}
            onExportBlocks={onExportCustomBlocks}
            onImportBlocks={onImportCustomBlocks}
            onClearBlocks={onClearCustomBlocks}
          />
        </div>
      </div>

      {/* Block Inspector Dialog */}
      <BlockInspectorDialog
        block={selectedBlock}
        open={inspectorOpen}
        onClose={() => {
          console.log("❌ Closing inspector dialog")
          setInspectorOpen(false)
          setSelectedBlock(null)
        }}
        onSave={selectedBlock?.isCustom ? handleSaveBlock : undefined}
        onDelete={selectedBlock?.isCustom ? handleDeleteBlock : undefined}
        onDuplicate={handleDuplicateBlock}
        readonly={!selectedBlock?.isCustom}
      />

      {/* Block Debug Dialog */}
      <BlockDebugDialog
        block={selectedBlock}
        open={debugOpen}
        onClose={() => {
          console.log("❌ Closing debug dialog")
          setDebugOpen(false)
          setSelectedBlock(null)
        }}
        onTestBlock={handleTestBlock}
      />
    </>
  )
}
