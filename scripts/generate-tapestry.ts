#!/usr/bin/env npx tsx
/**
 * Brainrothaus Tapestry Generator
 *
 * Generates high-resolution AI art for wall tapestries using:
 * 1. fal.ai Flux 2 Pro  — generates base image at 2048x2048
 * 2. Replicate Real-ESRGAN — upscales 4x to 8192x8192 print quality
 * 3. Supabase Storage — uploads final image to `brainrothaus-designs` bucket
 *
 * Usage:
 *   npx tsx scripts/generate-tapestry.ts --prompt "your prompt" --slug "product-slug"
 *   npx tsx scripts/generate-tapestry.ts --preset terachad-ascension
 *   npx tsx scripts/generate-tapestry.ts --all
 *
 * Environment variables required:
 *   FAL_KEY               — fal.ai API key (https://fal.ai/dashboard/keys)
 *   REPLICATE_API_TOKEN   — Replicate API token (https://replicate.com/account/api-tokens)
 *   NEXT_PUBLIC_SUPABASE_URL       — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY      — Supabase service role key (for storage uploads)
 *
 * Install deps:
 *   npm install (already has @supabase/supabase-js)
 *
 * Cost per image:
 *   ~$0.06 fal.ai (2048x2048 = ~4.2MP) + ~$0.01 Replicate upscale = ~$0.07/image
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { TAPESTRY_PROMPTS, type TapestryPrompt } from "./tapestry-prompts";

// ---------------------------------------------------------------------------
// Config (env vars are lazy — only validated when generation actually runs)
// ---------------------------------------------------------------------------

const FAL_ENDPOINT = "https://queue.fal.run/fal-ai/flux-2-pro";
const REPLICATE_API = "https://api.replicate.com/v1/predictions";
const STORAGE_BUCKET = "brainrothaus-designs";
const UPSCALE_FACTOR = 4; // 2048 * 4 = 8192

// Lazy-loaded env vars (so --list and --help work without keys)
let _falKey: string;
let _replicateToken: string;
let _supabaseUrl: string;
let _supabaseServiceKey: string;

function loadEnvVars() {
  _falKey = env("FAL_KEY");
  _replicateToken = env("REPLICATE_API_TOKEN");
  _supabaseUrl = env("NEXT_PUBLIC_SUPABASE_URL");
  _supabaseServiceKey = env("SUPABASE_SERVICE_ROLE_KEY");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function env(name: string): string {
  const val = process.env[name];
  if (!val) {
    console.error(`[ERROR] Missing env var: ${name}`);
    process.exit(1);
  }
  return val;
}

function log(step: string, msg: string) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] [${step}] ${msg}`);
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Step 1: Generate image via fal.ai Flux 2 Pro
// ---------------------------------------------------------------------------

interface FalQueueResponse {
  request_id: string;
  response_url: string;
  status_url: string;
}

interface FalStatusResponse {
  status: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  response_url?: string;
}

interface FalResultResponse {
  images: Array<{ url: string; width: number; height: number; content_type: string }>;
  seed: number;
  has_nsfw_concepts: boolean[];
  prompt: string;
}

async function generateWithFlux(prompt: string): Promise<string> {
  log("FAL", "Submitting to Flux 2 Pro queue...");

  // Submit to queue
  const submitRes = await fetch(FAL_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Key ${_falKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      image_size: {
        width: 2048,
        height: 2048,
      },
      num_inference_steps: 28,
      guidance_scale: 7.5,
      safety_tolerance: 5,
      output_format: "png",
      enable_safety_checker: false,
    }),
  });

  if (!submitRes.ok) {
    const errText = await submitRes.text();
    throw new Error(`fal.ai submit failed (${submitRes.status}): ${errText}`);
  }

  const queueData: FalQueueResponse = await submitRes.json();
  log("FAL", `Queued: request_id=${queueData.request_id}`);

  // Poll for completion
  const statusUrl = queueData.status_url;
  let attempts = 0;
  const maxAttempts = 120; // 10 minutes at 5s intervals

  while (attempts < maxAttempts) {
    await sleep(5000);
    attempts++;

    const statusRes = await fetch(statusUrl, {
      headers: { Authorization: `Key ${_falKey}` },
    });

    if (!statusRes.ok) {
      log("FAL", `Status check failed (${statusRes.status}), retrying...`);
      continue;
    }

    const status: FalStatusResponse = await statusRes.json();
    log("FAL", `Status: ${status.status} (attempt ${attempts}/${maxAttempts})`);

    if (status.status === "COMPLETED") {
      // Fetch the result
      const resultUrl = queueData.response_url;
      const resultRes = await fetch(resultUrl, {
        headers: { Authorization: `Key ${_falKey}` },
      });

      if (!resultRes.ok) {
        throw new Error(`fal.ai result fetch failed (${resultRes.status})`);
      }

      const result: FalResultResponse = await resultRes.json();

      if (!result.images || result.images.length === 0) {
        throw new Error("fal.ai returned no images");
      }

      const imageUrl = result.images[0].url;
      log("FAL", `Generated: ${result.images[0].width}x${result.images[0].height}`);
      log("FAL", `Seed: ${result.seed}`);
      return imageUrl;
    }

    if (status.status === "FAILED") {
      throw new Error("fal.ai generation failed");
    }
  }

  throw new Error("fal.ai generation timed out after 10 minutes");
}

// ---------------------------------------------------------------------------
// Step 2: Upscale via Replicate Real-ESRGAN
// ---------------------------------------------------------------------------

interface ReplicatePrediction {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output: string | null;
  error: string | null;
  urls: {
    get: string;
    cancel: string;
  };
}

async function upscaleWithRealESRGAN(imageUrl: string): Promise<string> {
  log("ESRGAN", `Submitting upscale (${UPSCALE_FACTOR}x)...`);

  // Create prediction
  const createRes = await fetch(REPLICATE_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${_replicateToken}`,
      "Content-Type": "application/json",
      Prefer: "wait",
    },
    body: JSON.stringify({
      // Use the official model identifier — Replicate resolves to latest version
      model: "nightmareai/real-esrgan",
      input: {
        image: imageUrl,
        scale: UPSCALE_FACTOR,
        face_enhance: false,
      },
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Replicate create failed (${createRes.status}): ${errText}`);
  }

  let prediction: ReplicatePrediction = await createRes.json();
  log("ESRGAN", `Prediction: ${prediction.id} (status: ${prediction.status})`);

  // If "Prefer: wait" didn't resolve it, poll
  let attempts = 0;
  const maxAttempts = 120; // 10 minutes at 5s intervals

  while (
    prediction.status !== "succeeded" &&
    prediction.status !== "failed" &&
    prediction.status !== "canceled"
  ) {
    await sleep(5000);
    attempts++;

    if (attempts > maxAttempts) {
      throw new Error("Replicate upscale timed out after 10 minutes");
    }

    const pollRes = await fetch(prediction.urls.get, {
      headers: { Authorization: `Bearer ${_replicateToken}` },
    });

    if (!pollRes.ok) {
      log("ESRGAN", `Poll failed (${pollRes.status}), retrying...`);
      continue;
    }

    prediction = await pollRes.json();
    log("ESRGAN", `Status: ${prediction.status} (attempt ${attempts}/${maxAttempts})`);
  }

  if (prediction.status === "failed") {
    throw new Error(`Replicate upscale failed: ${prediction.error}`);
  }

  if (prediction.status === "canceled") {
    throw new Error("Replicate upscale was canceled");
  }

  if (!prediction.output) {
    throw new Error("Replicate returned no output");
  }

  log("ESRGAN", `Upscaled image ready`);
  return prediction.output;
}

// ---------------------------------------------------------------------------
// Step 3: Upload to Supabase Storage
// ---------------------------------------------------------------------------

async function uploadToSupabase(
  imageUrl: string,
  slug: string,
): Promise<string> {
  log("UPLOAD", `Downloading upscaled image...`);

  // Download the image
  const imageRes = await fetch(imageUrl);
  if (!imageRes.ok) {
    throw new Error(`Failed to download upscaled image (${imageRes.status})`);
  }

  const imageBuffer = Buffer.from(await imageRes.arrayBuffer());
  const sizeInMB = (imageBuffer.length / (1024 * 1024)).toFixed(1);
  log("UPLOAD", `Downloaded: ${sizeInMB} MB`);

  // Create Supabase client with service role key (bypasses RLS)
  const supabase: SupabaseClient = createClient(_supabaseUrl, _supabaseServiceKey);

  // Upload to storage
  const timestamp = Date.now();
  const filePath = `tapestries/${slug}/${slug}-${timestamp}-8192x8192.png`;

  log("UPLOAD", `Uploading to ${STORAGE_BUCKET}/${filePath}...`);

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, imageBuffer, {
      contentType: "image/png",
      upsert: false,
    });

  if (error) {
    // If bucket doesn't exist, try to create it
    if (error.message?.includes("not found") || error.message?.includes("Bucket")) {
      log("UPLOAD", `Bucket '${STORAGE_BUCKET}' not found, creating...`);
      const { error: bucketError } = await supabase.storage.createBucket(
        STORAGE_BUCKET,
        { public: true },
      );
      if (bucketError && !bucketError.message?.includes("already exists")) {
        throw new Error(`Failed to create bucket: ${bucketError.message}`);
      }

      // Retry upload
      const { data: retryData, error: retryError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, imageBuffer, {
          contentType: "image/png",
          upsert: false,
        });

      if (retryError) {
        throw new Error(`Upload failed after bucket creation: ${retryError.message}`);
      }
    } else {
      throw new Error(`Upload failed: ${error.message}`);
    }
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(filePath);

  const publicUrl = urlData.publicUrl;
  log("UPLOAD", `Public URL: ${publicUrl}`);

  return publicUrl;
}

// ---------------------------------------------------------------------------
// Main pipeline
// ---------------------------------------------------------------------------

async function generateTapestry(prompt: string, slug: string): Promise<string> {
  loadEnvVars();

  console.log("\n" + "=".repeat(70));
  console.log(`  BRAINROTHAUS TAPESTRY GENERATOR`);
  console.log(`  Slug: ${slug}`);
  console.log(`  Prompt: ${prompt.slice(0, 80)}...`);
  console.log("=".repeat(70) + "\n");

  const startTime = Date.now();

  // Step 1: Generate base image
  log("PIPELINE", "Step 1/3: Generating base image (2048x2048) via Flux 2 Pro...");
  const baseImageUrl = await generateWithFlux(prompt);

  // Step 2: Upscale
  log("PIPELINE", "Step 2/3: Upscaling to 8192x8192 via Real-ESRGAN...");
  const upscaledImageUrl = await upscaleWithRealESRGAN(baseImageUrl);

  // Step 3: Upload
  log("PIPELINE", "Step 3/3: Uploading to Supabase Storage...");
  const publicUrl = await uploadToSupabase(upscaledImageUrl, slug);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("\n" + "=".repeat(70));
  console.log(`  DONE in ${elapsed}s`);
  console.log(`  Public URL: ${publicUrl}`);
  console.log("=".repeat(70) + "\n");

  return publicUrl;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  let prompt: string | undefined;
  let slug: string | undefined;
  let preset: string | undefined;
  let generateAll = false;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--prompt":
      case "-p":
        prompt = args[++i];
        break;
      case "--slug":
      case "-s":
        slug = args[++i];
        break;
      case "--preset":
        preset = args[++i];
        break;
      case "--all":
        generateAll = true;
        break;
      case "--list":
        console.log("\nAvailable presets:\n");
        for (const p of TAPESTRY_PROMPTS) {
          console.log(`  ${p.slug.padEnd(25)} ${p.name}`);
        }
        console.log("");
        process.exit(0);
      case "--help":
      case "-h":
        printUsage();
        process.exit(0);
      default:
        console.error(`Unknown argument: ${args[i]}`);
        printUsage();
        process.exit(1);
    }
  }

  // Mode: generate all presets
  if (generateAll) {
    console.log(`\nGenerating all ${TAPESTRY_PROMPTS.length} tapestry designs...\n`);
    const results: Array<{ slug: string; url: string }> = [];

    for (const p of TAPESTRY_PROMPTS) {
      try {
        const url = await generateTapestry(p.prompt, p.slug);
        results.push({ slug: p.slug, url });
      } catch (err) {
        console.error(`\n[ERROR] Failed to generate ${p.slug}:`, err);
        results.push({ slug: p.slug, url: "FAILED" });
      }
    }

    console.log("\n" + "=".repeat(70));
    console.log("  BATCH RESULTS");
    console.log("=".repeat(70));
    for (const r of results) {
      const status = r.url === "FAILED" ? "FAILED" : "OK";
      console.log(`  [${status}] ${r.slug}`);
      if (r.url !== "FAILED") {
        console.log(`        ${r.url}`);
      }
    }
    console.log("=".repeat(70) + "\n");
    return;
  }

  // Mode: use a preset
  if (preset) {
    const found = TAPESTRY_PROMPTS.find((p) => p.slug === preset);
    if (!found) {
      console.error(`Unknown preset: ${preset}`);
      console.error(`Use --list to see available presets.`);
      process.exit(1);
    }
    await generateTapestry(found.prompt, found.slug);
    return;
  }

  // Mode: custom prompt + slug
  if (prompt && slug) {
    await generateTapestry(prompt, slug);
    return;
  }

  // No valid mode
  console.error("Error: Provide --prompt + --slug, --preset, or --all");
  printUsage();
  process.exit(1);
}

function printUsage() {
  console.log(`
Brainrothaus Tapestry Generator
================================

Usage:
  npx tsx scripts/generate-tapestry.ts --preset <slug>
  npx tsx scripts/generate-tapestry.ts --prompt "..." --slug "..."
  npx tsx scripts/generate-tapestry.ts --all
  npx tsx scripts/generate-tapestry.ts --list

Options:
  --preset <slug>    Use a predefined prompt from tapestry-prompts.ts
  --prompt, -p       Custom prompt text
  --slug, -s         Product slug (used for file naming)
  --all              Generate all presets sequentially
  --list             List available presets
  --help, -h         Show this help

Environment variables required:
  FAL_KEY                        fal.ai API key
  REPLICATE_API_TOKEN            Replicate API token
  NEXT_PUBLIC_SUPABASE_URL       Supabase project URL
  SUPABASE_SERVICE_ROLE_KEY      Supabase service role key

Examples:
  npx tsx scripts/generate-tapestry.ts --preset terachad-ascension
  npx tsx scripts/generate-tapestry.ts --preset lone-wolf-protocol
  npx tsx scripts/generate-tapestry.ts -p "A cosmic wolf howling at a nebula" -s "cosmic-wolf"
  npx tsx scripts/generate-tapestry.ts --all
`);
}

// Run
main().catch((err) => {
  console.error("\n[FATAL]", err);
  process.exit(1);
});
