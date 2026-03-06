import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST() {

  try {

    const supabase = await createClient()

    const { error } = await supabase
      .from("projects")
      .update({
        submissions: {},
        custom_sections: []
      })
      .neq("id", 0) // update all rows

    if (error) {

      console.error("Reset error:", error)

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )

    }

    return NextResponse.json({
      success: true,
      message: "All project submissions cleared"
    })

  } catch (err) {

    console.error("Reset crash:", err)

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    )

  }

}