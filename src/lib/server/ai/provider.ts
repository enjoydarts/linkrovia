export const WORKERS_AI_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const MAX_INPUT_TOKENS = 4096;
const MAX_OUTPUT_TOKENS = 512;
const PROVIDER_TOKEN_ALLOWANCE = 32;

// Rates and supported units checked against the Workers AI model and pricing docs
// on 2026-11-25. Expire the quote if the bundled catalog is no longer current.
const PRICE_EXPIRES_AT = Date.UTC(2027, 4, 25);
const INPUT_NEURONS_PER_MILLION = 26_668;
const OUTPUT_NEURONS_PER_MILLION = 204_805;
const MICROUSD_PER_NEURON = 11;

export function quoteWorkersAi(inputTokens: number, outputTokens: number) {
  const neurons = Math.ceil(
    (inputTokens * INPUT_NEURONS_PER_MILLION +
      outputTokens * OUTPUT_NEURONS_PER_MILLION) /
      1_000_000,
  );
  return {
    inputTokens,
    outputTokens,
    neurons,
    costMicrousd: neurons * MICROUSD_PER_NEURON,
  };
}

type Usage = ReturnType<typeof quoteWorkersAi>;

export const maxWorkersAiCostMicrousd = quoteWorkersAi(
  MAX_INPUT_TOKENS,
  MAX_OUTPUT_TOKENS,
).costMicrousd;

export function validWorkersAiPricing(now: Date) {
  return now.getTime() < PRICE_EXPIRES_AT;
}

export function prepareTextRequest(instruction: string, data: unknown) {
  // Prevent untrusted serialized data from introducing model chat markers.
  const input = JSON.stringify(data).replaceAll('<', '\\u003c');
  // Raw input avoids the provider adding a chat template. For this byte-level
  // BPE tokenizer, UTF-8 byte length is an upper bound on the number of tokens.
  const prompt = `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n${instruction}<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n${input}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n`;
  const inputTokens =
    new TextEncoder().encode(prompt).byteLength + PROVIDER_TOKEN_ALLOWANCE;
  if (inputTokens > MAX_INPUT_TOKENS) return null;
  return {
    prompt,
    reservation: quoteWorkersAi(inputTokens, MAX_OUTPUT_TOKENS),
  };
}

export function readWorkersAiUsage(
  usage:
    | {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      }
    | undefined,
  caps: Usage,
): Usage | null {
  if (!usage) return null;
  const {
    prompt_tokens: input,
    completion_tokens: output,
    total_tokens: total,
  } = usage;
  if (
    input === undefined ||
    output === undefined ||
    !Number.isSafeInteger(input) ||
    !Number.isSafeInteger(output) ||
    input <= 0 ||
    output < 0 ||
    input > caps.inputTokens ||
    output > caps.outputTokens ||
    total !== input + output
  )
    return null;
  return quoteWorkersAi(input, output);
}

export function runWorkersAi(
  binding: Pick<Ai, 'run'>,
  request: NonNullable<ReturnType<typeof prepareTextRequest>>,
) {
  return binding.run(WORKERS_AI_MODEL, {
    prompt: request.prompt,
    raw: true,
    stream: false,
    max_tokens: request.reservation.outputTokens,
    response_format: { type: 'json_object' },
    temperature: 0.2,
  });
}
