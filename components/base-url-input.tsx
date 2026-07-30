"use client"

import { Input } from "@/components/ui/input"
import { Globe } from "lucide-react"

interface BaseUrlInputProps {
  value: string
  onChange: (value: string) => void
  showIcon?: boolean
  className?: string
  placeholder?: string
}

export function BaseUrlInput({
  value,
  onChange,
  showIcon = true,
  className = "h-7 w-44 text-xs",
  placeholder = "http://localhost:3000",
}: BaseUrlInputProps) {
  return (
    <div className="flex items-center gap-1">
      {showIcon && <Globe className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
      <Input
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={className}
      />
    </div>
  )
}
