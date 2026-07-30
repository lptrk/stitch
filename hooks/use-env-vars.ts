"use client"

import { useLocalStorage } from "@/hooks/use-local-storage"

export interface EnvVar {
  id: string
  name: string
  value: string
}

export function useEnvVars() {
  const [envVars, setEnvVars] = useLocalStorage<EnvVar[]>("stitch-env-vars", [])

  const addEnvVar = () => {
    setEnvVars((prev) => [
      ...prev,
      { id: `env-${Date.now()}`, name: "", value: "" },
    ])
  }

  const updateEnvVar = (id: string, field: "name" | "value", newValue: string) => {
    setEnvVars((prev) =>
      prev.map((v) => (v.id === id ? { ...v, [field]: newValue } : v))
    )
  }

  const removeEnvVar = (id: string) => {
    setEnvVars((prev) => prev.filter((v) => v.id !== id))
  }

  return { envVars, addEnvVar, updateEnvVar, removeEnvVar }
}
