import { NextResponse } from "next/server"
import { getPrograms } from "@/app/actions/firebase-actions"

export async function GET() {
  try {
    const programs = await getPrograms()
    return NextResponse.json(programs)
  } catch (error) {
    console.error("Error fetching programs:", error)
    return NextResponse.json([], { status: 500 })
  }
}
