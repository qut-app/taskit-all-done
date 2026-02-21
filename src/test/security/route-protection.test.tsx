/**
 * Route Protection Regression Tests
 * 
 * Verifies that all protected routes are wrapped with AuthGuard or AdminGuard.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, "../../..");

const appTsxContent = readFileSync(
  resolve(projectRoot, "src/App.tsx"),
  "utf-8"
);

describe("Route Protection Configuration", () => {
  const protectedRoutes = [
    "/onboarding",
    "/role-select",
    "/dashboard",
    "/company-dashboard",
    "/discover",
    "/find-jobs",
    "/post-job",
    "/my-jobs",
    "/profile",
    "/feed",
  ];

  const adminRoutes = ["/admin"];

  protectedRoutes.forEach((route) => {
    it(`route "${route}" should be wrapped with AuthGuard`, () => {
      const routePattern = new RegExp(
        `path="${route.replace("/", "\\/")}".*<AuthGuard>`
      );
      expect(appTsxContent).toMatch(routePattern);
    });
  });

  adminRoutes.forEach((route) => {
    it(`route "${route}" should be wrapped with AdminGuard`, () => {
      const routePattern = new RegExp(
        `path="${route.replace("/", "\\/")}".*<AdminGuard>`
      );
      expect(appTsxContent).toMatch(routePattern);
    });
  });

  it("public routes should NOT be wrapped with AuthGuard", () => {
    const landingRoute = /path="\/"[^>]*element={<Landing/;
    const authRoute = /path="\/auth"[^>]*element={<Auth/;
    expect(appTsxContent).toMatch(landingRoute);
    expect(appTsxContent).toMatch(authRoute);
  });
});
