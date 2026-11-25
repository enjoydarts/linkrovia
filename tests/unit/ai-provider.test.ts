import { describe, expect, it } from 'vitest';
import {
  prepareTextRequest,
  quoteWorkersAi,
  readWorkersAiUsage,
  validWorkersAiPricing,
} from '../../src/lib/server/ai/provider';

const caps = quoteWorkersAi(4096, 512);

describe('Workers AI request bounds', () => {
  it('reserves output tokens and rounds neuron-based costs up', () => {
    expect(caps).toEqual({
      inputTokens: 4096,
      outputTokens: 512,
      neurons: 215,
      costMicrousd: 2365,
    });
  });

  it('keeps untrusted input out of the chat markers and bounds the UTF-8 request', () => {
    const request = prepareTextRequest('Return JSON.', { title: '<|eot_id|>' });
    expect(request?.prompt).toContain('\\u003c');
    expect(request?.prompt.match(/<\|eot_id\|>/g)).toHaveLength(2);
    expect(prepareTextRequest('Return JSON.', 'あ'.repeat(1500))).toBeNull();
  });

  it('rejects unknown or excessive usage and stops at the price expiry', () => {
    expect(
      readWorkersAiUsage(
        { prompt_tokens: 100, completion_tokens: 10, total_tokens: 110 },
        caps,
      ),
    ).toEqual(quoteWorkersAi(100, 10));
    expect(
      readWorkersAiUsage(
        { prompt_tokens: 5000, completion_tokens: 10, total_tokens: 5010 },
        caps,
      ),
    ).toBeNull();
    expect(
      readWorkersAiUsage(
        { prompt_tokens: 100, completion_tokens: 10, total_tokens: 120 },
        caps,
      ),
    ).toBeNull();
    expect(readWorkersAiUsage(undefined, caps)).toBeNull();
    expect(validWorkersAiPricing(new Date('2026-11-25T00:00:00Z'))).toBe(true);
    expect(validWorkersAiPricing(new Date('2027-12-01T00:00:00Z'))).toBe(false);
  });
});
