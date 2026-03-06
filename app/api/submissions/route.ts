import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(req: Request) {

  try {

    const supabase = await createClient()

    const { project_id, submissions } = await req.json()

    if (!project_id) {
      return NextResponse.json(
        { error: "Missing project id" },
        { status: 400 }
      )
    }

    /* -------------------------
       GET AUTH USER
    -------------------------- */

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    /* -------------------------
       GET EXISTING SUBMISSIONS
    -------------------------- */

    const { data: existingProject, error: fetchError } = await supabase
      .from("projects")
      .select("submissions")
      .eq("id", project_id)
      .single()

    if (fetchError) {

      console.error("Fetch project error:", fetchError)

      return NextResponse.json(
        { error: fetchError.message },
        { status: 500 }
      )

    }

    const existingSubmissions = existingProject?.submissions || {}

    /* -------------------------
       ENRICH NEW SUBMISSIONS
    -------------------------- */

    const enrichedSubmissions: Record<string, any> = {}

    Object.entries(submissions).forEach(([key, value]) => {

      /* Dynamic rows (arrays) */

      if (Array.isArray(value)) {

        enrichedSubmissions[key] = value.map((row: any) => ({

          ...(row as Record<string, any>),

          submitted_by: row.submitted_by || user.id,

          submitted_at: row.submitted_at || new Date().toISOString(),

          updated_at: new Date().toISOString(),

        }))

      }

      /* Single field */

      else {

        enrichedSubmissions[key] = {

          ...(value as Record<string, any>),

          submitted_by: user.id,

          submitted_at: new Date().toISOString(),

          updated_at: new Date().toISOString(),

        }

      }

    })

    /* -------------------------
       MERGE SUBMISSIONS
       (VERY IMPORTANT FIX)
    -------------------------- */

    const mergedSubmissions: Record<string, any> = {
      ...existingSubmissions,
    }

    Object.entries(enrichedSubmissions).forEach(([key, value]) => {

      /* If dynamic rows */

      if (Array.isArray(value)) {

        const existingRows = existingSubmissions?.[key] || []

        mergedSubmissions[key] = [...existingRows, ...value]

      }

      /* If single field */

      else {

        mergedSubmissions[key] = value

      }

    })

    /* -------------------------
       UPDATE PROJECT
    -------------------------- */

    const { data: project, error } = await supabase
      .from("projects")
      .update({
        submissions: mergedSubmissions,
        status: "ongoing",
        last_client_activity: new Date().toISOString(),
      })
      .eq("id", project_id)
      .select()
      .single()

    if (error) {

      console.error("Submission update error:", error)

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )

    }

    return NextResponse.json(project)

  }

  catch (err) {

    console.error("Submission API crash:", err)

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    )

  }

}