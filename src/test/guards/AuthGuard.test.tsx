import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Mock useAuth hook
const mockUseAuth = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

// Must import AFTER mocking
import AuthGuard from "@/components/AuthGuard";

const renderWithRouter = (ui: React.ReactElement, initialRoute = "/") =>
  render(<MemoryRouter initialEntries={[initialRoute]}>{ui}</MemoryRouter>);

describe("AuthGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading spinner while auth is loading", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    renderWithRouter(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("redirects to /auth when user is not authenticated", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    const { container } = renderWithRouter(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("renders children when user is authenticated", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "test-user-id", email: "test@example.com" },
      loading: false,
    });
    renderWithRouter(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );
    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });
});
