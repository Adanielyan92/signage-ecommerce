import { createHmac } from "crypto";
import { signPayload, retryDelayMs } from "../../lib/webhooks";

describe("signPayload", () => {
  it("returns a valid HMAC-SHA256 hex signature", () => {
    const payload = '{"event":"order.created","data":{}}';
    const secret = "test-secret-key";

    const result = signPayload(payload, secret);

    // Verify it matches manual HMAC computation
    const expected = createHmac("sha256", secret).update(payload).digest("hex");
    expect(result).toBe(expected);
  });

  it("produces different signatures for different secrets", () => {
    const payload = '{"event":"order.created"}';
    const sig1 = signPayload(payload, "secret-a");
    const sig2 = signPayload(payload, "secret-b");
    expect(sig1).not.toBe(sig2);
  });

  it("produces different signatures for different payloads", () => {
    const secret = "shared-secret";
    const sig1 = signPayload('{"event":"order.created"}', secret);
    const sig2 = signPayload('{"event":"order.paid"}', secret);
    expect(sig1).not.toBe(sig2);
  });
});

describe("retryDelayMs", () => {
  it("returns 30s for attempt 1", () => {
    expect(retryDelayMs(1)).toBe(30_000);
  });

  it("returns 120s for attempt 2", () => {
    expect(retryDelayMs(2)).toBe(120_000);
  });

  it("returns 480s for attempt 3", () => {
    expect(retryDelayMs(3)).toBe(480_000);
  });
});
