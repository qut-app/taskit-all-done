import { execSync } from "child_process";
import type { Plugin } from "vite";

/**
 * Vite plugin that runs the critical regression test suite before building.
 * If any test fails, the build is aborted — preventing deployment of broken code.
 */
export function preDeployTestGate(): Plugin {
  return {
    name: "pre-deploy-test-gate",
    enforce: "pre",
    buildStart() {
      console.log("\n🧪 Running pre-deploy regression tests...\n");
      try {
        execSync("npx vitest run src/test --reporter=verbose", {
          stdio: "inherit",
          env: { ...process.env, CI: "true" },
        });
        console.log("\n✅ All regression tests passed. Proceeding with build.\n");
      } catch {
        console.error(
          "\n❌ DEPLOYMENT BLOCKED: Critical regression tests failed.\n" +
            "Fix failing tests before deploying.\n"
        );
        throw new Error("Pre-deploy regression tests failed. Build aborted.");
      }
    },
  };
}
