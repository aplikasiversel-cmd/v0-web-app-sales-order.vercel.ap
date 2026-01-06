"use client"

import { useState } from "react"
import { LoginForm } from "@/components/login-form"
import { RegisterForm } from "@/components/register-form"

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false)

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">MUF Order System</h1>
          <p className="text-muted-foreground">Mandiri Utama Finance</p>
        </div>

        {isRegister ? (
          <RegisterForm onLogin={() => setIsRegister(false)} />
        ) : (
          <LoginForm onRegister={() => setIsRegister(true)} />
        )}
      </div>
    </main>
  )
}
