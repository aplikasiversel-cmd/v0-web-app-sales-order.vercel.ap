import { NextResponse } from "next/server"
import { getDealers } from "@/app/actions/firebase-actions"

export async function GET() {
  try {
    const dealers = await getDealers()
    return NextResponse.json(dealers)
  } catch (error) {
    console.error("Error fetching dealers:", error)
    return NextResponse.json([], { status: 500 })
  }
}
