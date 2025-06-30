"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Globe } from "lucide-react"

interface BaseUrlInputProps {
  value: string
  onChange: (value: string) => void
}

export function BaseUrlInput({ value, onChange }: BaseUrlInputProps) {
  return (
    <div className="flex items-center gap-2">
      <Globe className="w-4 h-4 text-gray-600" />
      <div className="flex flex-col gap-1">
        <Label htmlFor="base-url" className="text-xs text-gray-600">
          Base URL
        </Label>
        <Input
          id="base-url"
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="http://localhost:3000"
          className="w-64 h-8 text-sm"
        />
      </div>
    </div>
  )
}
