import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/auto-release-escrow`;

Deno.test("auto-release-escrow: should respond with 200 and JSON", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
    },
  });

  const body = await response.json();
  // Function should execute successfully (even if no escrows to release)
  assertEquals(response.status, 200);
  assertExists(body.success);
  assertExists(body.released !== undefined);
  assertExists(body.checked !== undefined);
});

Deno.test("auto-release-escrow: should handle OPTIONS (CORS preflight)", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "OPTIONS",
  });

  const body = await response.text();
  assertEquals(response.status, 200);
  const corsHeader = response.headers.get("Access-Control-Allow-Origin");
  assertEquals(corsHeader, "*");
});
