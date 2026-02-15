/**
 * Route Protection Regression Tests
 * 
 * Verifies that all protected routes are wrapped with AuthGuard or AdminGuard.
 * This is a structural test that ensures the App.tsx route configuration
 * hasn't regressed.
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Route Protection Configuration", () => {
  const appTsxContent = fs.readFileSync(
    path.resolve(__dirname, "../../App.tsx"),
    "utf-8"
  );

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
      // Find the route definition line
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
    // Landing and Auth pages should be publicly accessible
    const landingRoute = /path="\/"[^>]*element={<Landing/;
    const authRoute = /path="\/auth"[^>]*element={<Auth/;
    expect(appTsxContent).toMatch(landingRoute);
    expect(appTsxContent).toMatch(authRoute);
  });
});
