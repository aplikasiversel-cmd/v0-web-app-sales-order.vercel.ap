"use client"

import type React from "react"
import { Input } from "@/components/ui/input"
import { onlyNumbers } from "@/lib/utils/format"

interface InputPhoneProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function InputPhone({ value, onChange, placeholder = "08xxxxxxxxxx", className, disabled }: InputPhoneProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = onlyNumbers(e.target.value)
    onChange(cleaned)
  }

  return (
    <Input
      type="tel"
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
      maxLength={13}
    />
  )
}
