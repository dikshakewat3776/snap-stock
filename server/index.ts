import express from "express";
import cors from "cors";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { InventoryItem } from "../src/shared/types/contracts";

// We define the type DetectionResponse at the top of the file to avoid duplication
// DetectionResponse is the response from the detection API
// scan_id is the id of the scan
// captured_at is the timestamp of the scan
// detections is the array of detections
// aggregated_items is the array of aggregated items
// product_name is the name of the product
// brand is the brand of the product
// quantity is the quantity of the product
// confidence is the confidence of the detection
// bbox is the bounding box of the detection
// avg_confidence is the average confidence of the detections
type DetectionResponse = {
  scan_id: string;
  captured_at: string;
  detections: Array<{
    product_name: string;
    brand: string;
    quantity: number;
    confidence: number;
    bbox: [number, number, number, number];
  }>;
  aggregated_items: Array<{
    product_name: string;
    brand: string;
    quantity: number;
    avg_confidence: number;
  }>;
};

/**
 * One shared prompt/schema for all providers.
 *
 * We rely on the model to return STRICT JSON matching this shape:
 * - `detections`: raw per-item detections including bbox + confidence
 * - `aggregated_items`: per-product rollups (used by `/api/confirm-scan`)
 */
const DETECTION_PROMPT = (() => {
  const schema = `{
  "scan_id": "string",
  "captured_at": "ISO timestamp",
  "detections": [
    {
      "product_name": "string",
      "brand": "string",
      "quantity": number,
      "confidence": number,
      "bbox": [number, number, number, number]
    }
  ],
  "aggregated_items": [
    {
      "product_name": "string",
      "brand": "string",
      "quantity": number,
      "avg_confidence": number
    }
  ]
}`;

  const rules = `- Use normalized bbox values 0..1 as [x,y,width,height].
- quantity must be integer >= 1.
- confidence and avg_confidence must be 0..1.
- If unsure, use lower confidence.
- Return only JSON, no markdown.`;

  return `Analyze this store shelf image and return strict JSON only.
Schema:
${schema}
Rules:
${rules}`;
})();

// We create the app using express
const app = express();

// We create the upload directory
const uploadDir = path.join(process.cwd(), "uploads");
// We create the data directory
const dataDir = path.join(process.cwd(), "data");
// We create the data path
const dataPath = path.join(dataDir, "inventory.json");
// We create the upload index path
const uploadIndexPath = path.join(dataDir, "upload-index.json");
// We create the logs directory
const logsDir = path.join(process.cwd(), "logs");



// We load the environment file
function loadEnvFile() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf-8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}
loadEnvFile();
if (process.env.ALLOW_INSECURE_TLS === "true") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
if (!fs.existsSync(dataPath)) fs.writeFileSync(dataPath, JSON.stringify([], null, 2));
if (!fs.existsSync(uploadIndexPath)) fs.writeFileSync(uploadIndexPath, JSON.stringify([], null, 2));

const upload = multer({ dest: uploadDir });
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(process.cwd(), "public")));

type UploadRecord = {
  applicationId: string;
  uploadedAt: string;
  filePath: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
};

function readInventory(): InventoryItem[] {
  return JSON.parse(fs.readFileSync(dataPath, "utf-8"));
}

function saveInventory(items: InventoryItem[]) {
  fs.writeFileSync(dataPath, JSON.stringify(items, null, 2));
}

function readUploadIndex(): UploadRecord[] {
  return JSON.parse(fs.readFileSync(uploadIndexPath, "utf-8"));
}

function saveUploadIndex(records: UploadRecord[]) {
  fs.writeFileSync(uploadIndexPath, JSON.stringify(records, null, 2));
}

function appendDatewiseLog(entry: unknown) {
  const stamp = new Date();
  const date = stamp.toISOString().slice(0, 10);
  const logPath = path.join(logsDir, `${date}.log`);
  fs.appendFileSync(logPath, `${JSON.stringify({ at: stamp.toISOString(), ...((entry as object) ?? {}) })}\n`);
}

function redactHeaders(headers: Record<string, string> = {}) {
  const copy = { ...headers };
  if (copy.Authorization) copy.Authorization = "[REDACTED]";
  if (copy.authorization) copy.authorization = "[REDACTED]";
  return copy;
}

function withSafeTransportHeaders(init: RequestInit): RequestInit {
  const mergedHeaders: Record<string, string> = {
    Accept: "application/json",
    "Accept-Encoding": "identity",
    ...(init.headers as Record<string, string> | undefined),
  };
  return { ...init, headers: mergedHeaders };
}

function sanitizeUrl(rawUrl: string) {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.searchParams.has("key")) parsed.searchParams.set("key", "[REDACTED]");
    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

async function fetchWithLogging(
  rawUrl: string,
  init: RequestInit,
  metadata: { provider: "openai" | "gemini" | "ollama" | "grok"; model: string; requestId?: string; applicationId?: string }
) {
  const url = sanitizeUrl(rawUrl);
  appendDatewiseLog({
    type: "external_request",
    provider: metadata.provider,
    model: metadata.model,
    requestId: metadata.requestId,
    applicationId: metadata.applicationId,
    method: init.method ?? "GET",
    url,
    headers: redactHeaders((init.headers as Record<string, string>) ?? {}),
  });

  let response: Response;
  try {
    response = await fetch(rawUrl, withSafeTransportHeaders(init));
  } catch (error) {
    const err = error as Error & { code?: string; cause?: { code?: string; message?: string } };
    const causeMessage = err.cause?.message ?? err.message;
    const causeCode = err.cause?.code ?? err.code;
    appendDatewiseLog({
      type: "external_error",
      provider: metadata.provider,
      model: metadata.model,
      requestId: metadata.requestId,
      applicationId: metadata.applicationId,
      method: init.method ?? "GET",
      url,
      error: causeMessage,
      code: causeCode,
    });
    throw new Error(
      `External request failed (${metadata.provider}/${metadata.model})${causeCode ? ` [${causeCode}]` : ""}: ${causeMessage}`
    );
  }
  try {
    const cloned = response.clone();
    const bodyText = await cloned.text();
    appendDatewiseLog({
      type: "external_response",
      provider: metadata.provider,
      model: metadata.model,
      requestId: metadata.requestId,
      applicationId: metadata.applicationId,
      method: init.method ?? "GET",
      url,
      statusCode: response.status,
      ok: response.ok,
      bodyPreview: bodyText.slice(0, 1000),
    });
  } catch (error) {
    const err = error as Error & { code?: string; cause?: { code?: string; message?: string } };
    appendDatewiseLog({
      type: "external_response",
      provider: metadata.provider,
      model: metadata.model,
      requestId: metadata.requestId,
      applicationId: metadata.applicationId,
      method: init.method ?? "GET",
      url,
      statusCode: response.status,
      ok: response.ok,
      bodyPreview: "[unavailable]",
      bodyPreviewReadError: err.cause?.message ?? err.message,
      code: err.cause?.code ?? err.code,
    });
  }
  return response;
}

function normalizeDetectionResponse(raw: unknown): DetectionResponse {
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  const fallback: DetectionResponse = {
    scan_id: `scan_${Date.now()}`,
    captured_at: new Date().toISOString(),
    detections: [],
    aggregated_items: [],
  };
  if (!parsed || typeof parsed !== "object") return fallback;
  const candidate = parsed as Partial<DetectionResponse>;
  return {
    scan_id: candidate.scan_id ?? fallback.scan_id,
    captured_at: candidate.captured_at ?? fallback.captured_at,
    detections: Array.isArray(candidate.detections) ? candidate.detections : [],
    aggregated_items: Array.isArray(candidate.aggregated_items) ? candidate.aggregated_items : [],
  };
}

async function scanWithOpenAI(
  base64Image: string,
  mimeType: string,
  requestContext?: { requestId?: string; applicationId?: string }
): Promise<DetectionResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
  const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
  const prompt = DETECTION_PROMPT;

  const response = await fetchWithLogging(
    "https://api.openai.com/v1/responses",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: prompt },
              { type: "input_image", image_url: `data:${mimeType};base64,${base64Image}` },
            ],
          },
        ],
        text: { format: { type: "json_object" } },
      }),
    },
    { provider: "openai", model, ...requestContext }
  );
  if (!response.ok) throw new Error(`OpenAI request failed: ${response.status}`);
  const data = (await response.json()) as { output_text?: string };
  return normalizeDetectionResponse(data.output_text ?? "{}");
}

async function scanWithGemini(
  base64Image: string,
  mimeType: string,
  requestContext?: { requestId?: string; applicationId?: string }
): Promise<DetectionResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
  const configuredModel = process.env.GEMINI_MODEL;
  const modelsToTry = configuredModel
    ? [configuredModel]
    : ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-flash-latest"];
  const prompt = DETECTION_PROMPT;

  let lastError = "Gemini request failed";
  for (const model of modelsToTry) {
    const response = await fetchWithLogging(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { text: prompt },
                { inline_data: { mime_type: mimeType, data: base64Image } },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
          },
        }),
      },
      { provider: "gemini", model, ...requestContext }
    );
    if (response.ok) {
      const data = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
      return normalizeDetectionResponse(text);
    }
    const body = await response.text();
    lastError = `Gemini request failed: ${response.status} (${model}) ${body.slice(0, 180)}`;
    if (response.status !== 404) break;
  }
  throw new Error(lastError);
}

async function scanWithOllama(
  base64Image: string,
  _mimeType: string,
  requestContext?: { requestId?: string; applicationId?: string }
): Promise<DetectionResponse> {
  const model = process.env.OLLAMA_MODEL ?? "llava:latest";
  const baseUrl = (process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434").replace(/\/+$/, "");
  const apiKey = process.env.OLLAMA_API_KEY;
  const prompt = DETECTION_PROMPT;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const response = await fetchWithLogging(
    `${baseUrl}/api/chat`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        stream: false,
        format: "json",
        messages: [
          {
            role: "user",
            content: prompt,
            images: [base64Image],
          },
        ],
      }),
    },
    { provider: "ollama", model, ...requestContext }
  );
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Ollama request failed: ${response.status} ${body.slice(0, 200)}`);
  }
  const data = (await response.json()) as {
    message?: { content?: string };
    response?: string;
  };
  const text = data.message?.content ?? data.response ?? "{}";
  return normalizeDetectionResponse(text);
}

async function scanWithGrok(
  base64Image: string,
  mimeType: string,
  requestContext?: { requestId?: string; applicationId?: string }
): Promise<DetectionResponse> {
  const apiKey = process.env.GROK_API_KEY;
  if (!apiKey) throw new Error("GROK_API_KEY is not configured");
  const baseUrl = (process.env.GROK_BASE_URL ?? "https://api.x.ai/v1").replace(/\/+$/, "");
  const model = process.env.GROK_MODEL ?? "grok-2-vision-latest";
  const prompt = DETECTION_PROMPT;

  const response = await fetchWithLogging(
    `${baseUrl}/chat/completions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } },
            ],
          },
        ],
      }),
    },
    { provider: "grok", model, ...requestContext }
  );
  if (!response.ok) {
    let bodyPreview = "";
    try {
      bodyPreview = (await response.text()).slice(0, 200);
    } catch (error) {
      const err = error as Error & { code?: string; cause?: { code?: string; message?: string } };
      bodyPreview = `response read failed${err.cause?.code || err.code ? ` (${err.cause?.code ?? err.code})` : ""}: ${
        err.cause?.message ?? err.message
      }`;
    }
    throw new Error(`Grok request failed: ${response.status} ${bodyPreview}`);
  }
  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content ?? "{}";
  return normalizeDetectionResponse(text);
}

app.get("/api/health", (_req, res) => res.json({ ok: true }));

/**
 * Middleware that:
 * - assigns `applicationId` and `requestId` for correlation
 * - logs *every* incoming request + outgoing response into `logs/YYYY-MM-DD.log`
 *
 * This is useful when debugging AI-provider failures (rate limits, TLS issues, etc.).
 */
app.use((req, res, next) => {
  const applicationId = req.header("x-application-id") || `app_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
  const requestId = `req_${Date.now()}_${crypto.randomUUID().slice(0, 6)}`;
  const startedAt = Date.now();
  (req as express.Request & { applicationId?: string; requestId?: string }).applicationId = applicationId;
  (req as express.Request & { applicationId?: string; requestId?: string }).requestId = requestId;
  res.setHeader("x-application-id", applicationId);
  res.setHeader("x-request-id", requestId);

  const jsonRef = res.json.bind(res);
  const sendRef = res.send.bind(res);
  let responsePayload: unknown;
  res.json = ((body: unknown) => {
    responsePayload = body;
    return jsonRef(body);
  }) as typeof res.json;
  res.send = ((body: unknown) => {
    responsePayload = body;
    return sendRef(body);
  }) as typeof res.send;

  appendDatewiseLog({
    type: "request",
    requestId,
    applicationId,
    method: req.method,
    path: req.path,
    headers: req.headers,
    query: req.query,
    body: req.body,
  });

  res.on("finish", () => {
    appendDatewiseLog({
      type: "response",
      requestId,
      applicationId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
      responseBody:
        typeof responsePayload === "string"
          ? responsePayload.slice(0, 1000)
          : responsePayload ?? null,
    });
  });
  next();
});

/**
 * POST `/api/scan`
 *
 * Purpose:
 * - Accept 1..10 shelf images in a single multipart request (field name: `image`)
 * - For each file, call the configured AI provider (OpenAI/Gemini/Ollama/Grok)
 * - Return detection results using the shared `DetectionResponse` JSON contract.
 *
 * Response:
 * - If you upload exactly 1 image: returns a single detection object.
 * - If you upload multiple images: returns `{ scans: [ ... ] }`.
 *
 * Note: Uploads are persisted into `uploads/` and tracked in `data/upload-index.json`.
 */
app.post("/api/scan", upload.array("image", 10), async (req, res) => {
  const files = (req.files ?? []) as Express.Multer.File[];
  if (!files.length) return res.status(400).json({ error: "Missing image file(s)" });

  const appReq = req as express.Request & { applicationId?: string; requestId?: string };
  const requestApplicationId = appReq.applicationId ?? `app_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
  const requestId = appReq.requestId;

  const provider = (process.env.AI_PROVIDER ?? "").toLowerCase();

  try {
    const scans: Array<DetectionResponse & { application_id: string; stored_file: string }> = [];

    for (const [index, file] of files.entries()) {
      // Create a unique id for this individual image within the request.
      const uploadedAt = new Date().toISOString();
      const datePrefix = uploadedAt.slice(0, 10);

      const fileApplicationId = `${requestApplicationId}_${index}_${crypto.randomUUID().slice(0, 6)}`;
      const safeOriginalName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      const finalFileName = `${datePrefix}_${fileApplicationId}_${safeOriginalName || file.filename}`;
      const finalPath = path.join(uploadDir, finalFileName);

      fs.renameSync(file.path, finalPath);

      const uploadRecord: UploadRecord = {
        applicationId: fileApplicationId,
        uploadedAt,
        filePath: finalPath,
        fileName: finalFileName,
        originalName: file.originalname,
        mimeType: file.mimetype || "application/octet-stream",
        size: file.size,
      };

      const existing = readUploadIndex();
      saveUploadIndex([uploadRecord, ...existing].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt)));

      const mimeType = file.mimetype || "image/jpeg";
      const base64Image = fs.readFileSync(finalPath).toString("base64");

      // Call the selected provider for this image, returning the normalized JSON contract.
      let result: DetectionResponse;
      if (provider === "grok" || (!provider && process.env.GROK_API_KEY)) {
        result = await scanWithGrok(base64Image, mimeType, { requestId, applicationId: fileApplicationId });
      } else if (provider === "ollama" || (!provider && process.env.OLLAMA_API_KEY)) {
        result = await scanWithOllama(base64Image, mimeType, { requestId, applicationId: fileApplicationId });
      } else if (provider === "openai" || (!provider && process.env.OPENAI_API_KEY)) {
        result = await scanWithOpenAI(base64Image, mimeType, { requestId, applicationId: fileApplicationId });
      } else if (provider === "gemini" || (!provider && process.env.GEMINI_API_KEY)) {
        result = await scanWithGemini(base64Image, mimeType, { requestId, applicationId: fileApplicationId });
      } else {
        return res.status(500).json({
          error:
            "No AI provider configured. Set AI_PROVIDER=grok|ollama|openai|gemini and configure GROK_API_KEY or OLLAMA_API_KEY or OPENAI_API_KEY or GEMINI_API_KEY",
          details: {
            hasGrokKey: Boolean(process.env.GROK_API_KEY),
            hasOllamaKey: Boolean(process.env.OLLAMA_API_KEY),
            hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY),
            hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
            aiProvider: provider || "(auto)",
            note: "Server now loads keys from .env at startup. Restart dev server after .env changes.",
          },
        });
      }

      scans.push({ ...result, application_id: fileApplicationId, stored_file: finalFileName });
    }

    // Backward compatible response for single file uploads.
    if (scans.length === 1) return res.json(scans[0]);
    return res.json({ scans });
  } catch (error) {
    const message = error instanceof Error ? error.message : "scan failed";
    return res.status(502).json({ error: message });
  }
});

app.get("/api/uploads", (_req, res) => {
  // Returns the persisted upload metadata sorted newest-first.
  const records = readUploadIndex().sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  res.json(records);
});

/**
 * POST `/api/confirm-scan`
 *
 * Purpose:
 * - Update local inventory (`data/inventory.json`) using the model's
 *   `aggregated_items` from one scan or many scans.
 *
 * How it works:
 * - Each aggregated item is matched to an inventory row by:
 *   `product_name` -> inventory `name`, and `brand` -> inventory `brand`
 * - When there's a match, `currentStock` is increased by `quantity`.
 *
 * Input formats supported:
 * - a single scan object (as returned from `/api/scan` when uploading 1 image)
 * - `{ scans: [...] }` when uploading multiple images
 */
app.post("/api/confirm-scan", (req, res) => {
  const items = readInventory();
  const body = req.body as unknown;
  const rawScans: unknown[] = Array.isArray(body)
    ? body
    : typeof body === "object" && body && "scans" in (body as { scans?: unknown })
      ? ((body as { scans?: unknown })?.scans as unknown[]) ?? []
      : [body];

  const aggregatedItems: DetectionResponse["aggregated_items"] = [];
  for (const scan of rawScans) {
    if (scan && typeof scan === "object" && "aggregated_items" in (scan as { aggregated_items?: unknown })) {
      const ai = (scan as { aggregated_items?: unknown }).aggregated_items;
      if (Array.isArray(ai)) aggregatedItems.push(...(ai as DetectionResponse["aggregated_items"]));
    }
  }

  /**
   * Merge aggregated items by `(product_name, brand)` so multiple images
   * contribute to the same inventory product.
   *
   * We also recompute `avg_confidence` using a weighted average based on quantity.
   */
  type Agg = DetectionResponse["aggregated_items"][number];
  type AggMerged = Agg & { totalQuantity: number };
  const mergedByKey = new Map<string, AggMerged>();
  for (const hit of aggregatedItems) {
    const key = `${hit.product_name}::${hit.brand}`;
    const existing = mergedByKey.get(key);
    if (!existing) {
      mergedByKey.set(key, { ...hit, totalQuantity: hit.quantity });
      continue;
    }
    const nextTotal = existing.totalQuantity + hit.quantity;
    const weightedAvg = (existing.avg_confidence * existing.totalQuantity + hit.avg_confidence * hit.quantity) / nextTotal;
    mergedByKey.set(key, {
      product_name: existing.product_name,
      brand: existing.brand,
      quantity: existing.quantity + hit.quantity,
      avg_confidence: weightedAvg,
      totalQuantity: nextTotal,
    });
  }
  const aggregated = Array.from(mergedByKey.values()).map(({ totalQuantity: _t, ...rest }) => rest as Agg);

  const updated = items.map((item) => {
    const hit = aggregated.find((x) => x.product_name === item.name && x.brand === item.brand);
    if (!hit) return item;
    return {
      ...item,
      currentStock: item.currentStock + hit.quantity,
      updatedAt: new Date().toISOString(),
    };
  });
  saveInventory(updated);
  res.json({ ok: true, inventory: updated });
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  appendDatewiseLog({
    type: "server_start",
    message: `Web portal running on http://localhost:${port}`,
    port,
    insecureTls: process.env.ALLOW_INSECURE_TLS === "true",
  });
});
