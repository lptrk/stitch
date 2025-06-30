"use client"

import type { LucideIcon } from "lucide-react"
import { Code } from "lucide-react"

interface SafeIconProps {
  icon: LucideIcon | undefined
  className?: string
  fallback?: LucideIcon
}

export function SafeIcon({ icon, className = "w-4 h-4", fallback = Code }: SafeIconProps) {
  try {
    if (icon && typeof icon === "function") {
      const IconComponent = icon
      return <IconComponent className={className} />
    } else {
      console.warn("Invalid icon provided, using fallback")
      const FallbackIcon = fallback
      return <FallbackIcon className={className} />
    }
  } catch (error) {
    console.error("Error rendering icon:", error)
    const FallbackIcon = fallback
    return <FallbackIcon className={className} />
  }
}
