/**
 * Route Protection Regression Tests
 * 
 * Verifies that all protected routes are wrapped with AuthGuard or AdminGuard.
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Route Protection Configuration", () => {
  const appTsxContent = fs.readFileSync(
    path.resolve(process.cwd(), "src/App.tsx"),
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
