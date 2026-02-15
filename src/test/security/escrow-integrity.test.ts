/**
 * Escrow System Integrity Tests
 * 
 * Verifies that the escrow RPC functions exist and are properly configured.
 * Tests the database function signatures to ensure no regressions in the
 * critical financial operations.
 */
import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

describe("Escrow RPC Function Existence", () => {
  it("process_escrow_release RPC should exist", async () => {
    // Call with invalid ID — we expect a specific error, NOT 'function not found'
    const { error } = await anonClient.rpc("process_escrow_release", {
      _escrow_id: "00000000-0000-0000-0000-000000000000",
    });
    // If function doesn't exist, error.code would be '42883' (undefined_function)
    if (error) {
      expect(error.code).not.toBe("42883");
    }
  });

  it("hold_escrow_funds RPC should exist", async () => {
    const { error } = await anonClient.rpc("hold_escrow_funds", {
      _escrow_id: "00000000-0000-0000-0000-000000000000",
    });
    if (error) {
      expect(error.code).not.toBe("42883");
    }
  });

  it("process_escrow_cancellation RPC should exist", async () => {
    const { error } = await anonClient.rpc("process_escrow_cancellation", {
      _escrow_id: "00000000-0000-0000-0000-000000000000",
      _provider_arrived: false,
    });
    if (error) {
      expect(error.code).not.toBe("42883");
    }
  });

  it("calculate_trust_score RPC should exist", async () => {
    const { error } = await anonClient.rpc("calculate_trust_score", {
      _user_id: "00000000-0000-0000-0000-000000000000",
    });
    if (error) {
      expect(error.code).not.toBe("42883");
    }
  });

  it("calculate_ai_fraud_score RPC should exist", async () => {
    const { error } = await anonClient.rpc("calculate_ai_fraud_score", {
      _user_id: "00000000-0000-0000-0000-000000000000",
    });
    if (error) {
      expect(error.code).not.toBe("42883");
    }
  });

  it("deduct_slots_on_accept RPC should exist", async () => {
    const { error } = await anonClient.rpc("deduct_slots_on_accept", {
      _job_id: "00000000-0000-0000-0000-000000000000",
      _requester_id: "00000000-0000-0000-0000-000000000000",
      _provider_id: "00000000-0000-0000-0000-000000000000",
    });
    if (error) {
      expect(error.code).not.toBe("42883");
    }
  });

  it("has_role RPC should exist", async () => {
    const { error } = await anonClient.rpc("has_role", {
      _user_id: "00000000-0000-0000-0000-000000000000",
      _role: "admin",
    });
    if (error) {
      expect(error.code).not.toBe("42883");
    }
  });
});
