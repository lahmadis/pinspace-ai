import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

// Disable Next.js body parser for file uploads
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/process-crit-audio
 * 
 * Processes audio recording from architecture critique:
 * 1. Transcribes audio using Groq's Whisper API
 * 2. Organizes transcript using Groq's Llama model
 * 3. Returns structured feedback with themes, action items, and keywords
 * 
 * Architecture-specific themes: circulation, materials, structure, spatial, formal, site
 */
export async function POST(request: NextRequest) {
  try {
    // Check for API key
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      return NextResponse.json(
        { error: "GROQ_API_KEY not configured" },
        { status: 500 }
      );
    }

    // Get form data
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    // Initialize Groq client
    const groq = new Groq({
      apiKey: groqApiKey,
    });

    // Step 1: Transcribe audio with Whisper
    console.log("[process-crit-audio] Transcribing audio...");
    // Groq SDK accepts File objects directly from FormData
    const transcriptionResponse = await groq.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-large-v3",
      language: "en",
      response_format: "json",
    });

    const transcript = transcriptionResponse.text || "";
    console.log("[process-crit-audio] Transcript length:", transcript.length);

    if (!transcript || transcript.trim().length === 0) {
      return NextResponse.json(
        { error: "No speech detected in audio" },
        { status: 400 }
      );
    }

    // Step 2: Organize transcript with Llama
    console.log("[process-crit-audio] Organizing transcript...");
    const analysisPrompt = `You are organizing an architecture critique transcript. Your job is to organize what was ACTUALLY SAID into categories. DO NOT add information that wasn't mentioned. DO NOT make assumptions. DO NOT invent critique points.

TRANSCRIPT (what was actually said):
"""
${transcript}
"""

Organize the transcript into structured categories. Only include information that was explicitly mentioned in the transcript above. If a category wasn't discussed, leave it empty.

Provide a JSON response with this structure:
{
  "themes": {
    "circulation": ["exact quotes or close paraphrases about circulation/movement/flow - ONLY if mentioned"],
    "materials": ["exact quotes or close paraphrases about materials/textures/finishes - ONLY if mentioned"],
    "structure": ["exact quotes or close paraphrases about structural systems - ONLY if mentioned"],
    "spatial": ["exact quotes or close paraphrases about spatial relationships - ONLY if mentioned"],
    "formal": ["exact quotes or close paraphrases about form/geometry/aesthetics - ONLY if mentioned"],
    "site": ["exact quotes or close paraphrases about site/context/landscape - ONLY if mentioned"]
  },
  "actionItems": ["specific action items that were mentioned - ONLY what was actually said"],
  "keywords": ["key terms that were actually used in the transcript"],
  "summary": "A 2-3 sentence summary of what was ACTUALLY discussed - no added interpretation"
}

CRITICAL: Only include themes/items that were explicitly mentioned. Empty arrays are better than invented content.`;

    const analysisResponse = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "You are a transcript organizer. You ONLY organize what was actually said. You NEVER add information that wasn't explicitly stated. Be faithful to the original transcript.",
        },
        {
          role: "user",
          content: analysisPrompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1, // Lower temperature = less creative/hallucination
    });

    let analysis;
    try {
      const analysisText = analysisResponse.choices[0]?.message?.content || "{}";
      analysis = JSON.parse(analysisText);
    } catch (parseError) {
      console.error("[process-crit-audio] Failed to parse analysis JSON:", parseError);
      // Fallback: create basic structure
      analysis = {
        themes: {},
        actionItems: [],
        keywords: [],
        summary: "Analysis completed but formatting failed. See transcript for details.",
      };
    }

    return NextResponse.json({
      transcript,
      analysis: {
        themes: analysis.themes || {},
        actionItems: analysis.actionItems || [],
        keywords: analysis.keywords || [],
        summary: analysis.summary || "",
      },
    });
  } catch (error: any) {
    console.error("[process-crit-audio] Error:", error);

    return NextResponse.json(
      {
        error: error.message || "Failed to process audio",
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}