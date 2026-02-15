import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/paystack-webhook`;

Deno.test("paystack-webhook: should reject requests with invalid signature", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      "x-paystack-signature": "invalid-signature",
    },
    body: JSON.stringify({
      event: "charge.success",
      data: { reference: "test", amount: 1000 },
    }),
  });

  const body = await response.json();
  // Should reject due to invalid signature
  assertEquals(response.status, 401);
  assertEquals(body.error, "Invalid signature");
});

Deno.test("paystack-webhook: should handle CORS preflight", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "OPTIONS",
  });

  await response.text();
  assertEquals(response.status, 200);
});
