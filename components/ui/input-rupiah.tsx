"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { formatRupiah } from "@/lib/utils/format"

interface InputRupiahProps {
  value: number
  onChange: (value: number) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function InputRupiah({ value, onChange, placeholder = "Rp 0", className, disabled }: InputRupiahProps) {
  const [displayValue, setDisplayValue] = useState("")

  useEffect(() => {
    if (value > 0) {
      setDisplayValue(formatRupiah(value))
    } else {
      setDisplayValue("")
    }
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^\d]/g, "")
    const numValue = Number.parseInt(rawValue, 10) || 0
    onChange(numValue)
    if (numValue > 0) {
      setDisplayValue(formatRupiah(numValue))
    } else {
      setDisplayValue("")
    }
  }

  return (
    <Input
      type="text"
      value={displayValue}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
    />
  )
}
