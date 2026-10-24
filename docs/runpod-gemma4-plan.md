# Gemma 4 on Runpod: NudgeWise setup plan

Planning date: 24 October 2026. Status: researched plan; nothing deployed or purchased.

## Primary goal

Run NudgeWise's AI assistant, reminder rewriting and document-text extraction against Gemma 4 executing on a Runpod GPU. Demonstrate real Runpod usage while keeping the existing frontend, database, OCR worker and business rules in place.

Assumption: Runpod is the sponsored product you want to use. Sponsor-credit eligibility, eligible services, expiry and submission evidence requirements must be checked against your event's terms; technical use does not establish award eligibility.

## Proposed architecture

```text
Vue frontend -> existing Node backend -> HTTPS + dedicated Bearer token
                                          |
                                    Runpod Pod, port 8080
                                    authenticated reverse proxy
                                          |
                                    127.0.0.1:11434
                                    Ollama + gemma4:31b
                                          |
                                    Runpod NVIDIA GPU
```

Use a Pod for the first demo. It preserves the application's existing Ollama request/response format and avoids a serverless handler or OpenAI API adapter. Serverless can be considered later if idle compute cost becomes the main concern.

## Phase 0: Confirm documentation, integration and sponsor scope

**How this serves the primary goal:** Establish that the model can run on the sponsored infrastructure and that NudgeWise can call it without an unnecessary rewrite.

Research completed:

- Ollama lists `gemma4:31b` as a runnable local model. Its current artifacts are roughly 19-20 GB, depending on backend/quantization. Download size is not total VRAM demand. [Official model listing](https://ollama.com/library/gemma4:31b).
- Runpod documents running Ollama on GPU Pods. [Runpod guide](https://www.runpod.io/articles/guides/ollama-serve-quantized-models-gpu-container).
- `server/integrations.cjs:40-62` already sends `POST {base}/api/chat` with `{model, messages, stream:false}` and reads `message.content`. Cloud mode supports a configurable URL and Bearer secret.
- The backend performs retrieval and Docling text extraction before inference; those stay in the existing app environment.

Allowed interfaces: Ollama `/api/chat`; `ollama pull`, `ollama list`, `ollama ps`; documented Ollama environment variables; Runpod Pod ports, storage and HTTPS proxy.

Before spending: confirm credits apply to GPU Pods and storage, their expiry and any required sponsor branding or evidence. Check the console's actual GPU price and available balance. Never paste account keys into the repository or screenshots.

Guard: an OpenAI `/v1/chat/completions` endpoint or Runpod `/runsync` URL is not a drop-in substitute for this application's native Ollama endpoint.

## Phase 1: Provision one demo GPU Pod

**How this serves the primary goal:** Supply enough GPU memory for the chosen model with a predictable demo runtime.

1. Select Secure Cloud, on-demand, one NVIDIA GPU. Start with a 48 GB A40 or L40S, subject to stock and current price. This is a conservative sizing recommendation, not a measured performance result.
2. A 24 GB GPU may fit a quantized 31B model at limited context, but has less headroom. Avoid making that the first live-demo dependency. If credits are tight, test `gemma4:e4b` on a smaller GPU instead; evaluate quality before presenting it as equivalent.
3. Use a currently maintained Ollama template if its version supports Gemma 4 and its startup behavior can be configured. Otherwise use Runpod's official PyTorch template and Ollama's official Linux installer. Record the working template/image and Ollama version.
4. Allocate approximately 30 GB container disk and a 50 GB network volume for one model and setup files. Verify free space after pulling. Mount the network volume at `/workspace` and choose a GPU in the same data center.
5. Expose SSH for administration and HTTP port `8080` for the authenticated gateway. Do not expose Ollama's `11434` directly. Review template defaults and disable unused public services.
6. Use a fixed demo session window and a shutdown reminder or a verified automatic termination setting. Record what storage survives termination before enabling it.

Verification: GPU is visible through `nvidia-smi`, the network volume is mounted, and the resource/price matches the selected configuration.

Reference: [Runpod storage](https://docs.runpod.io/storage/network-volumes), [pricing](https://docs.runpod.io/pods/pricing).

## Phase 2: Start Ollama and load Gemma

**How this serves the primary goal:** Ensure inference actually executes on the Runpod GPU with bounded memory requirements.

Apply these to the process that runs `ollama serve`:

```dotenv
OLLAMA_HOST=127.0.0.1:11434
OLLAMA_MODELS=/workspace/ollama/models
OLLAMA_CONTEXT_LENGTH=8192
OLLAMA_NUM_PARALLEL=1
```

Start Ollama using the template's supported startup mechanism, or install it using the official instructions if the base template does not include it. Keep only one Ollama server process. If installed as a service, configure its environment and write permissions rather than assuming SSH-shell variables affect the service.

Once its local API responds, run inside the Pod:

```bash
ollama pull gemma4:31b
ollama list
```

Use the local model tag `gemma4:31b`, not a `-cloud` model that routes inference elsewhere. Record the downloaded model digest and installed Ollama version for reproducibility.

Warm the model with a synthetic request:

```bash
curl http://127.0.0.1:11434/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"model":"gemma4:31b","messages":[{"role":"user","content":"Reply with: Runpod test successful"}],"stream":false}'
ollama ps
```

Verification: response includes `message.content`; `ollama ps` reports GPU execution; inspect `nvidia-smi` during generation. Check the effective context is 8192. Measure warm-response latency and try a representative invoice/policy prompt. Increase context only if retrieval inputs require it and VRAM permits it.

References: [Ollama context length](https://docs.ollama.com/context-length), [FAQ and concurrency](https://docs.ollama.com/faq).

## Phase 3: Secure the remote endpoint

**How this serves the primary goal:** Let the existing backend reach the GPU while preventing strangers from consuming credits or sending requests.

Configure a standard reverse proxy such as Nginx on `0.0.0.0:8080`, forwarding only the required `POST /api/chat` route to `http://127.0.0.1:11434`. Validate a dedicated high-entropy `Authorization: Bearer` secret before forwarding; deny missing/wrong secrets and other routes. Do not expose pull/delete/admin endpoints. Store the gateway configuration/secret securely and configure both processes to start again after a restart.

Use HTTPS through Runpod's exposed-port proxy:

```text
https://<pod-id>-8080.proxy.runpod.net
```

The Runpod account API key manages infrastructure; it does not automatically protect Ollama. Use a separate inference secret configured explicitly at your gateway. Ollama's local API is unauthenticated, so adding a header on the client alone provides no protection.

Verification from outside the Pod: missing/wrong token is rejected; correct token produces an actual Gemma response; raw port 11434 is not publicly exposed; unrelated routes are denied. Avoid logging authorization headers or full invoice prompts. Set proxy timeouts consistently and measure latency against Runpod's documented HTTP proxy limit; raising only the app timeout cannot bypass the platform limit.

References: [Ollama authentication](https://docs.ollama.com/api/authentication), [Runpod exposed ports](https://docs.runpod.io/pods/configuration/expose-ports).

## Phase 4: Connect NudgeWise

**How this serves the primary goal:** Route the app's existing AI features to Runpod through its current provider configuration.

Set these in the backend's local environment or hosting secret settings, preserving unrelated database/OCR settings:

```dotenv
VITE_BACKEND_ENABLED=true
AI_PROVIDER=cloud
CLOUD_AI_PROVIDER=ollama
CLOUD_AI_BASE_URL=https://<pod-id>-8080.proxy.runpod.net
CLOUD_AI_MODEL=gemma4:31b
CLOUD_AI_API_KEY=<dedicated-gateway-secret>
AI_TIMEOUT_MS=120000
```

`cloud` here selects the backend's authenticated remote-Ollama path; it does not require Ollama's paid cloud service. The base URL must omit `/api/chat` and must not redirect. Set `CLOUD_AI_API_KEY` explicitly so the code does not fall back to an existing Ollama cloud key. The local `ollama` provider mode does not send authentication in this codebase.

Restart the backend. If changing the frontend backend-enabled flag, restart Vite or rebuild the hosted frontend as appropriate. No new model SDK, database migration, AI provider adapter or frontend secret is required.

Code references: `server/integrations.cjs:15-24` (settings), `:40-62` (request/auth/timeout); `tests/ai-provider-v2.test.cjs:21-31` and `tests/ollama.test.cjs:16-24` (existing contract tests).

Verification: UI reports the intended model; assistant questions, reminder rewriting and synthetic document extraction receive remote inference responses. Application failures remain visible and do not silently claim inference succeeded.

## Phase 5: Verify, collect evidence and shut down

**How this serves the primary goal:** Prove that the complete app uses Runpod and leave a repeatable, affordable demo.

- Run existing mocked provider checks: `node --test tests/ai-provider-v2.test.cjs tests/ollama.test.cjs`. They verify request handling, not a live GPU deployment.
- Perform live tests separately: synthetic invoice question, grounded policy answer, reminder rewrite and document extraction. Check first-request and warm latency, GPU memory, auth rejection, unavailable-Pod behavior and restart recovery.
- Confirm all map/API choices match the linked official docs and avoid the incompatible `/v1` or `/runsync` substitutions above.
- Capture sanitized evidence: Runpod Pod name/GPU, Gemma model tag/digest, GPU-use output and a NudgeWise response from the same session. Retain usage/billing evidence if the sponsor requires it. Describe the architecture accurately as Gemma inference on Runpod; do not imply the whole app is hosted there.
- Record startup/shutdown commands, gateway restart configuration and a warm-up step before the presentation.
- Stop compute after each session; delete resources only after confirming no needed files will be lost. Network volumes keep billing until deleted. Re-check credits and storage after the event.

Cost estimate: GPU hourly rate shown at deployment x running hours, plus separately billed storage and applicable charges. Do not budget as if an idle running Pod were free. Stopped Pods can retain billable storage. No account-specific rate, credit balance or stock has been verified for this plan.

## Deferred work and remaining checks

No training, fine-tuning, serverless conversion, vLLM migration or application hosting migration. No live deployment or benchmark has been performed. Sponsor eligibility and actual response quality/latency remain to be verified before calling the setup demo-ready.
