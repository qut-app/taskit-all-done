import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mockUseAuth = vi.fn();
const mockUseAdmin = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/hooks/useAdmin", () => ({
  useAdmin: () => mockUseAdmin(),
}));

import AdminGuard from "@/components/AdminGuard";

const renderWithRouter = (ui: React.ReactElement) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

describe("AdminGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading while auth or admin status is loading", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    mockUseAdmin.mockReturnValue({ isAdmin: false, loading: true });
    renderWithRouter(
      <AdminGuard>
        <div>Admin Content</div>
      </AdminGuard>
    );
    expect(screen.queryByText("Admin Content")).not.toBeInTheDocument();
  });

  it("redirects to /auth when no user", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockUseAdmin.mockReturnValue({ isAdmin: false, loading: false });
    renderWithRouter(
      <AdminGuard>
        <div>Admin Content</div>
      </AdminGuard>
    );
    expect(screen.queryByText("Admin Content")).not.toBeInTheDocument();
  });

  it("redirects to /dashboard when user is not admin", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "user-id" },
      loading: false,
    });
    mockUseAdmin.mockReturnValue({ isAdmin: false, loading: false });
    renderWithRouter(
      <AdminGuard>
        <div>Admin Content</div>
      </AdminGuard>
    );
    expect(screen.queryByText("Admin Content")).not.toBeInTheDocument();
  });

  it("renders admin content when user is admin", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "admin-user-id" },
      loading: false,
    });
    mockUseAdmin.mockReturnValue({ isAdmin: true, loading: false });
    renderWithRouter(
      <AdminGuard>
        <div>Admin Content</div>
      </AdminGuard>
    );
    expect(screen.getByText("Admin Content")).toBeInTheDocument();
  });
});
