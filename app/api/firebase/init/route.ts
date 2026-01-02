import { NextResponse } from "next/server"
import { initializeDefaultData } from "@/app/actions/firebase-actions"

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("Operation timed out")), timeoutMs)
  })
  return Promise.race([promise, timeout])
}

export async function POST() {
  try {
    await withTimeout(initializeDefaultData(), 10000)
    return NextResponse.json({ success: true, message: "Firebase initialized with default data" })
  } catch (error) {
    console.error("Error initializing Firebase:", error)
    return NextResponse.json({ success: false, error: "Failed to initialize Firebase" }, { status: 500 })
  }
}

export async function GET() {
  try {
    await withTimeout(initializeDefaultData(), 10000)
    return NextResponse.json({ success: true, message: "Firebase initialized with default data" })
  } catch (error) {
    console.error("Error initializing Firebase:", error)
    return NextResponse.json({ success: false, error: "Failed to initialize Firebase" }, { status: 500 })
  }
}
