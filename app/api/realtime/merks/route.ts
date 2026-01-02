import { NextResponse } from "next/server"
import { getMerks } from "@/app/actions/firebase-actions"

export async function GET() {
  try {
    const merks = await getMerks()
    return NextResponse.json(merks)
  } catch (error) {
    console.error("Error fetching merks:", error)
    return NextResponse.json([], { status: 500 })
  }
}
