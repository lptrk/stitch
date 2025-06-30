"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Copy, Bug, Play, Code, Settings, AlertTriangle, CheckCircle, XCircle } from "lucide-react"
import type { TestBlockDefinition, WorkflowItem } from "@/types/workflow"
import { useToast } from "@/hooks/use-toast"

interface BlockDebugDialogProps {
  block: TestBlockDefinition | null
  workflowItem?: WorkflowItem | null
  open: boolean
  onClose: () => void
  onTestBlock?: (block: TestBlockDefinition, parameters: Record<string, string>) => Promise<void>
}

interface DebugInfo {
  blockId: string
  blockName: string
  isCustom: boolean
  playwrightFunction: string
  definedParameters: any[]
  actualParameters: Record<string, string>
  parameterValidation: {
    valid: boolean
    missing: string[]
    extra: string[]
    issues: string[]
  }
  codePreview?: string
  executionContext: {
    availableVariables: string[]
    expectedInputs: string[]
    potentialIssues: string[]
  }
}

export function BlockDebugDialog({ block, workflowItem, open, onClose, onTestBlock }: BlockDebugDialogProps) {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null)
  const [isTestingBlock, setIsTestingBlock] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (block && open) {
      generateDebugInfo()
    }
  }, [block, workflowItem, open])

  const generateDebugInfo = () => {
    if (!block) return

    const actualParams = workflowItem?.parameters || {}
    const definedParams = block.parameters || []

    // Validate parameters
    const requiredParams = definedParams.filter((p) => p.required).map((p) => p.id)
    const providedParams = Object.keys(actualParams)
    const missing = requiredParams.filter((id) => !actualParams[id] || actualParams[id].trim() === "")
    const extra = providedParams.filter((id) => !definedParams.find((p) => p.id === id))

    // Check for potential issues
    const issues: string[] = []

    if (missing.length > 0) {
      issues.push(`Missing required parameters: ${missing.join(", ")}`)
    }

    if (extra.length > 0) {
      issues.push(`Extra parameters (not defined): ${extra.join(", ")}`)
    }

    // Check parameter values
    definedParams.forEach((param) => {
      const value = actualParams[param.id]
      if (value !== undefined) {
        if (param.type === "number" && isNaN(Number(value))) {
          issues.push(`Parameter "${param.name}" should be a number but got: "${value}"`)
        }
        if (param.type === "selector" && !value.trim()) {
          issues.push(`Parameter "${param.name}" is a selector but is empty`)
        }
      }
    })

    // Generate execution context info
    const executionContext = {
      availableVariables: ["page", "parameters", "expect", "console"],
      expectedInputs: definedParams.map((p) => `parameters.${p.id}`),
      potentialIssues: [
        ...issues,
        ...(block.isCustom && !block.customCode ? ["No custom code defined"] : []),
        ...(block.isCustom && block.customCode?.includes("parameters.") && Object.keys(actualParams).length === 0
          ? ["Code uses parameters but none provided"]
          : []),
      ],
    }

    const info: DebugInfo = {
      blockId: block.id,
      blockName: block.name,
      isCustom: !!block.isCustom,
      playwrightFunction: block.playwrightFunction,
      definedParameters: definedParams,
      actualParameters: actualParams,
      parameterValidation: {
        valid: missing.length === 0 && issues.length === 0,
        missing,
        extra,
        issues,
      },
      codePreview: block.customCode,
      executionContext,
    }

    setDebugInfo(info)
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied to clipboard",
      description: `${label} copied successfully`,
    })
  }

  const generateTestCode = () => {
    if (!debugInfo) return ""

    const params = Object.entries(debugInfo.actualParameters)
      .map(([key, value]) => `  ${key}: "${value}"`)
      .join(",\n")

    return `// Test code for ${debugInfo.blockName}
const testParameters = {
${params}
}

console.log('🐛 Testing block: ${debugInfo.blockName}')
console.log('📋 Parameters:', testParameters)

// Available in execution context:
// - page (Playwright page object)
// - parameters (your test parameters)
// - expect (Playwright expect function)
// - console (logging functions)

${debugInfo.codePreview || "// No custom code defined"}
`
  }

  const handleTestBlock = async () => {
    if (!block || !debugInfo) return

    setIsTestingBlock(true)
    try {
      if (onTestBlock) {
        await onTestBlock(block, debugInfo.actualParameters)
        toast({
          title: "Block test completed",
          description: "Check the console for detailed output",
        })
      }
    } catch (error) {
      toast({
        title: "Block test failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setIsTestingBlock(false)
    }
  }

  if (!block || !debugInfo) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Bug className="w-5 h-5 text-blue-600" />
            Block Debugger: {debugInfo.blockName}
            {debugInfo.isCustom && <Badge variant="secondary">Custom</Badge>}
            <Badge variant={debugInfo.parameterValidation.valid ? "default" : "destructive"}>
              {debugInfo.parameterValidation.valid ? "Valid" : "Issues Found"}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="parameters">Parameters</TabsTrigger>
            <TabsTrigger value="code">Code</TabsTrigger>
            <TabsTrigger value="test">Test</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden mt-4">
            <ScrollArea className="h-full">
              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Block Info */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        Block Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">ID:</span>
                        <code className="bg-gray-100 px-1 rounded text-xs">{debugInfo.blockId}</code>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Type:</span>
                        <Badge variant={debugInfo.isCustom ? "default" : "outline"}>
                          {debugInfo.isCustom ? "Custom" : "Built-in"}
                        </Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Function:</span>
                        <code className="bg-gray-100 px-1 rounded text-xs">{debugInfo.playwrightFunction}</code>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Parameters:</span>
                        <span>{debugInfo.definedParameters.length} defined</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Validation Status */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        {debugInfo.parameterValidation.valid ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                        Validation Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Status:</span>
                        <Badge variant={debugInfo.parameterValidation.valid ? "default" : "destructive"}>
                          {debugInfo.parameterValidation.valid ? "Valid" : "Has Issues"}
                        </Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Missing:</span>
                        <span className="text-red-600">{debugInfo.parameterValidation.missing.length}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Extra:</span>
                        <span className="text-yellow-600">{debugInfo.parameterValidation.extra.length}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Issues:</span>
                        <span className="text-red-600">{debugInfo.parameterValidation.issues.length}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Issues */}
                {debugInfo.executionContext.potentialIssues.length > 0 && (
                  <Card className="border-yellow-200 bg-yellow-50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2 text-yellow-800">
                        <AlertTriangle className="w-4 h-4" />
                        Potential Issues
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1">
                        {debugInfo.executionContext.potentialIssues.map((issue, index) => (
                          <li key={index} className="text-sm text-yellow-800 flex items-start gap-2">
                            <span className="text-yellow-600 mt-1">•</span>
                            {issue}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Execution Context */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Execution Context</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <h4 className="text-xs font-medium text-gray-600 mb-1">Available Variables:</h4>
                      <div className="flex flex-wrap gap-1">
                        {debugInfo.executionContext.availableVariables.map((variable) => (
                          <Badge key={variable} variant="outline" className="text-xs">
                            {variable}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-medium text-gray-600 mb-1">Expected Parameter Access:</h4>
                      <div className="flex flex-wrap gap-1">
                        {debugInfo.executionContext.expectedInputs.map((input) => (
                          <Badge key={input} variant="secondary" className="text-xs font-mono">
                            {input}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Parameters Tab */}
              <TabsContent value="parameters" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Defined Parameters */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">
                        Defined Parameters ({debugInfo.definedParameters.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {debugInfo.definedParameters.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">No parameters defined</p>
                      ) : (
                        <div className="space-y-3">
                          {debugInfo.definedParameters.map((param, index) => (
                            <div key={param.id} className="p-2 border rounded-lg">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium text-sm">{param.name}</span>
                                <div className="flex gap-1">
                                  <Badge variant="outline" className="text-xs">
                                    {param.type}
                                  </Badge>
                                  {param.required && (
                                    <Badge variant="destructive" className="text-xs">
                                      Required
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="text-xs text-gray-600">
                                <div>
                                  ID: <code className="bg-gray-100 px-1 rounded">{param.id}</code>
                                </div>
                                {param.placeholder && <div>Placeholder: "{param.placeholder}"</div>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Actual Parameters */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center justify-between">
                        Actual Parameters ({Object.keys(debugInfo.actualParameters).length})
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            copyToClipboard(JSON.stringify(debugInfo.actualParameters, null, 2), "Parameters")
                          }
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {Object.keys(debugInfo.actualParameters).length === 0 ? (
                        <p className="text-sm text-gray-500 italic">No parameters set</p>
                      ) : (
                        <div className="space-y-2">
                          {Object.entries(debugInfo.actualParameters).map(([key, value]) => {
                            const isRequired = debugInfo.definedParameters.find((p) => p.id === key)?.required
                            const isDefined = debugInfo.definedParameters.some((p) => p.id === key)
                            const isEmpty = !value || value.trim() === ""

                            return (
                              <div key={key} className="p-2 border rounded-lg">
                                <div className="flex items-center justify-between mb-1">
                                  <code className="text-sm font-medium">{key}</code>
                                  <div className="flex gap-1">
                                    {!isDefined && (
                                      <Badge variant="outline" className="text-xs text-yellow-600">
                                        Extra
                                      </Badge>
                                    )}
                                    {isRequired && isEmpty && (
                                      <Badge variant="destructive" className="text-xs">
                                        Missing
                                      </Badge>
                                    )}
                                    {isRequired && !isEmpty && (
                                      <Badge variant="default" className="text-xs">
                                        OK
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="text-xs bg-gray-50 p-1 rounded font-mono">
                                  {value || <span className="text-gray-400 italic">empty</span>}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Parameter Mapping */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Parameter Mapping Debug</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-gray-900 text-gray-100 p-3 rounded-lg font-mono text-xs">
                      <div className="text-green-400">// How parameters will be accessed in code:</div>
                      {Object.entries(debugInfo.actualParameters).map(([key, value]) => (
                        <div key={key}>
                          <span className="text-blue-400">parameters.{key}</span>
                          <span className="text-gray-400"> = </span>
                          <span className="text-yellow-400">"{value}"</span>
                        </div>
                      ))}
                      {Object.keys(debugInfo.actualParameters).length === 0 && (
                        <div className="text-red-400">// No parameters available</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Code Tab */}
              <TabsContent value="code" className="space-y-4">
                {debugInfo.isCustom ? (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Code className="w-4 h-4" />
                          Custom Block Code
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(debugInfo.codePreview || "", "Code")}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm max-h-64 overflow-y-auto">
                        <pre>{debugInfo.codePreview || "// No code defined"}</pre>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="text-center py-8">
                      <Code className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                      <p className="text-gray-600">Built-in blocks don't have custom code</p>
                      <p className="text-sm text-gray-500">
                        Function: <code>{debugInfo.playwrightFunction}</code>
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Test Tab */}
              <TabsContent value="test" className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Test Block Execution</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>Test Mode:</strong> This will execute the block with current parameters in a test
                        environment. Check the browser console and network tab for detailed output.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Generated Test Code:</h4>
                      <div className="bg-gray-900 text-gray-100 p-3 rounded-lg font-mono text-xs max-h-48 overflow-y-auto">
                        <pre>{generateTestCode()}</pre>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(generateTestCode(), "Test Code")}
                        className="w-full"
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        Copy Test Code
                      </Button>
                    </div>

                    <Separator />

                    <div className="flex gap-2">
                      <Button
                        onClick={handleTestBlock}
                        disabled={isTestingBlock || !debugInfo.parameterValidation.valid}
                        className="flex-1"
                      >
                        {isTestingBlock ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                            Testing...
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            Test Block
                          </>
                        )}
                      </Button>
                    </div>

                    {!debugInfo.parameterValidation.valid && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-800">
                          <strong>Cannot test:</strong> Block has validation issues. Fix parameters first.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </ScrollArea>
          </div>
        </Tabs>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-gray-200 p-4">
          <div className="flex justify-between items-center">
            <div className="text-xs text-gray-500">Debug session for: {debugInfo.blockName}</div>
            <Button variant="outline" onClick={onClose}>
              Close Debugger
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
