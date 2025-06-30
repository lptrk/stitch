import type { TestBlockDefinition } from "@/types/workflow"
import { MousePointer, Type, Eye, Search, GitBranch, Navigation, Clock } from "lucide-react"

export const testBlocks: TestBlockDefinition[] = [
  {
    id: "goto",
    name: "Navigate to URL",
    description: "Navigate to a specific URL",
    icon: Navigation,
    color: "bg-blue-500",
    playwrightFunction: "goto",
    parameters: [
      {
        id: "url",
        name: "URL",
        type: "text",
        placeholder: "/login",
        required: true,
      },
    ],
  },
  {
    id: "click",
    name: "Click Element",
    description: "Click on an element",
    icon: MousePointer,
    color: "bg-green-500",
    playwrightFunction: "click",
    parameters: [
      {
        id: "selector",
        name: "Selector",
        type: "selector",
        placeholder: "button, [data-testid='submit']",
        required: true,
      },
    ],
  },
  {
    id: "fill",
    name: "Fill Input",
    description: "Fill an input field with text",
    icon: Type,
    color: "bg-purple-500",
    playwrightFunction: "fill",
    parameters: [
      {
        id: "selector",
        name: "Selector",
        type: "selector",
        placeholder: "input[name='email']",
        required: true,
      },
      {
        id: "value",
        name: "Value",
        type: "text",
        placeholder: "test@example.com",
        required: true,
      },
    ],
  },
  {
    id: "expectVisible",
    name: "Expect Visible",
    description: "Assert that an element is visible",
    icon: Eye,
    color: "bg-orange-500",
    playwrightFunction: "expectVisible",
    parameters: [
      {
        id: "selector",
        name: "Selector",
        type: "selector",
        placeholder: ".success-message",
        required: true,
      },
    ],
  },
  {
    id: "expectText",
    name: "Expect Text",
    description: "Assert that an element contains specific text",
    icon: Eye,
    color: "bg-indigo-500",
    playwrightFunction: "expectText",
    parameters: [
      {
        id: "selector",
        name: "Selector",
        type: "selector",
        placeholder: "h1",
        required: true,
      },
      {
        id: "text",
        name: "Expected Text",
        type: "text",
        placeholder: "Welcome",
        required: true,
      },
    ],
  },
  {
    id: "wait",
    name: "Wait",
    description: "Wait for a specified amount of time",
    icon: Clock,
    color: "bg-gray-500",
    playwrightFunction: "wait",
    parameters: [
      {
        id: "ms",
        name: "Milliseconds",
        type: "number",
        placeholder: "1000",
        defaultValue: "1000",
      },
    ],
  },
  {
    id: "waitForSelector",
    name: "Wait for Element",
    description: "Wait for an element to appear",
    icon: Search,
    color: "bg-orange-500",
    playwrightFunction: "waitForSelector",
    parameters: [
      {
        id: "selector",
        name: "Selector",
        type: "selector",
        placeholder: ".loading-spinner",
        required: true,
      },
      {
        id: "timeout",
        name: "Timeout (ms)",
        type: "number",
        placeholder: "10000",
        defaultValue: "10000",
      },
    ],
  },
  {
    id: "callWorkflow",
    name: "Call Workflow",
    description: "Execute another workflow",
    icon: GitBranch,
    color: "bg-violet-500",
    playwrightFunction: "callWorkflow",
    parameters: [
      {
        id: "workflowId",
        name: "Workflow to Call",
        type: "workflow",
        placeholder: "Select workflow...",
        required: true,
      },
    ],
  },
]
