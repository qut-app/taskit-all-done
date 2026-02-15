import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/release-escrow`;

Deno.test("release-escrow: should reject unauthenticated requests", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ escrow_id: "fake-id" }),
  });

  const body = await response.json();
  assertEquals(response.status, 401);
  assertEquals(body.error, "Unauthorized");
});

Deno.test("release-escrow: should handle OPTIONS (CORS preflight)", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "OPTIONS",
  });

  const body = await response.text();
  assertEquals(response.status, 200);
});
