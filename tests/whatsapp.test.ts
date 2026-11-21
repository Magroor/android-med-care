import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyMetaSignature } from "../src/lib/crypto";
import { backoffSeconds, parseWebhookPayload } from "../src/lib/whatsapp";

const payload = {
  object: "whatsapp_business_account",
  entry: [
    {
      changes: [
        {
          value: {
            contacts: [{ wa_id: "919876543210", profile: { name: "Asha Patel" } }],
            messages: [
              { from: "919876543210", id: "wamid.AAA", timestamp: "1717300000", type: "text", text: { body: " Hello doctor " } },
              { from: "919876543210", id: "wamid.BBB", timestamp: "1717300001", type: "image" },
              { from: "919876543210", id: "wamid.CCC", type: "button", button: { text: "CONFIRM" } },
              { id: "no-from" },
            ],
            statuses: [{ id: "wamid.OUT1", status: "delivered" }],
          },
        },
      ],
    },
  ],
};

describe("webhook payload parsing", () => {
  const parsed = parseWebhookPayload(payload);

  it("extracts text messages with profile names", () => {
    expect(parsed.messages[0]).toMatchObject({ from: "919876543210", id: "wamid.AAA", text: "Hello doctor", name: "Asha Patel", type: "text" });
  });
  it("keeps non-text messages with empty text so the bot can reply 'text only'", () => {
    expect(parsed.messages[1]).toMatchObject({ id: "wamid.BBB", type: "image", text: "" });
  });
  it("maps quick-reply buttons to text", () => {
    expect(parsed.messages[2].text).toBe("CONFIRM");
  });
  it("ignores malformed entries and extracts statuses", () => {
    expect(parsed.messages).toHaveLength(3);
    expect(parsed.statuses).toEqual([{ id: "wamid.OUT1", status: "delivered" }]);
  });
  it("tolerates garbage", () => {
    expect(parseWebhookPayload(null)).toEqual({ messages: [], statuses: [] });
    expect(parseWebhookPayload({ entry: [{}] })).toEqual({ messages: [], statuses: [] });
  });
});

describe("signature verification", () => {
  const body = JSON.stringify(payload);
  const secret = "app-secret";
  const sig = "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");
  it("accepts a valid signature", () => expect(verifyMetaSignature(body, sig, secret)).toBe(true));
  it("rejects tampered bodies, wrong secrets and missing headers", () => {
    expect(verifyMetaSignature(body + " ", sig, secret)).toBe(false);
    expect(verifyMetaSignature(body, sig, "other")).toBe(false);
    expect(verifyMetaSignature(body, null, secret)).toBe(false);
    expect(verifyMetaSignature(body, "sha256=abc", secret)).toBe(false);
  });
});

describe("exponential backoff", () => {
  const noJitter = () => 0.5; // multiplier 1.0
  it("doubles each attempt", () => {
    expect([1, 2, 3, 4, 5].map((n) => backoffSeconds(n, noJitter))).toEqual([30, 60, 120, 240, 480]);
  });
  it("is capped at one hour", () => {
    expect(backoffSeconds(20, noJitter)).toBe(3600);
  });
  it("applies bounded jitter", () => {
    expect(backoffSeconds(1, () => 0)).toBe(26);
    expect(backoffSeconds(1, () => 1)).toBe(35); // 30s * 1.15 = 34.5 -> 35
  });
});
