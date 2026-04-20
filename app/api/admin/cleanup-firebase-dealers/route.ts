import { NextRequest, NextResponse } from "next/server"
import { cleanupDeletedDealersFromFirebase } from "@/app/actions/firebase-actions"

export async function POST(request: NextRequest) {
  try {
    const result = await cleanupDeletedDealersFromFirebase()

    if (result) {
      return NextResponse.json({
        success: true,
        message: "Successfully cleaned up deleted dealers from Firebase",
      })
    } else {
      return NextResponse.json(
        { success: false, message: "Failed to cleanup Firebase dealers" },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("[API] Firebase cleanup error:", error)
    return NextResponse.json(
      { success: false, message: "Error during Firebase cleanup" },
      { status: 500 }
    )
  }
}
