import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SignInError, type Session } from "./session";
import { SignInPage } from "./SignInPage";

function fakeSession(mode: Session["mode"], signIn: Session["signIn"] = async () => {}): Session {
  return {
    mode,
    state: () => "signed-out",
    subscribe: () => () => {},
    getToken: async () => null,
    signIn: vi.fn(signIn),
    signOut: async () => {},
    end: () => {},
  };
}

async function fillIn(email = "maya.torres@example.com", password = "local") {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Email"), email);
  await user.type(screen.getByLabelText("Password"), password);
  await user.click(screen.getByRole("button", { name: "Sign in" }));
}

describe("the sign-in screen", () => {
  it("has the title, the two fields, the button and the help line, and no sign-up", () => {
    render(<SignInPage session={fakeSession("supabase")} />);

    expect(screen.getByRole("heading", { level: 1, name: "Sign in to Accountable" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByText("No account? Ask whoever runs Accountable to add you.")).toBeInTheDocument();
    expect(screen.queryByText(/Local mode/)).not.toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("names a sample teammate in local mode", () => {
    render(<SignInPage session={fakeSession("local")} />);

    expect(
      screen.getByText(
        "Local mode. Sign in as a sample teammate, such as maya.torres@example.com, with the password local.",
      ),
    ).toBeInTheDocument();
  });

  it("signs in with what was typed", async () => {
    const session = fakeSession("local");
    render(<SignInPage session={session} />);

    await fillIn("  maya.torres@example.com ", "local");

    expect(session.signIn).toHaveBeenCalledWith("maya.torres@example.com", "local");
  });

  it("catches empty fields in the form", async () => {
    const user = userEvent.setup();
    const session = fakeSession("local");
    render(<SignInPage session={session} />);

    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("Enter your email")).toBeInTheDocument();
    expect(screen.getByText("Enter your password")).toBeInTheDocument();
    expect(session.signIn).not.toHaveBeenCalled();
  });

  it("says when the email and password don't match", async () => {
    render(<SignInPage session={fakeSession("local", async () => Promise.reject(new SignInError("wrong")))} />);

    await fillIn();

    expect(await screen.findByRole("alert")).toHaveTextContent("That email and password don't match.");
  });

  it("says when the sign-in service can't be reached", async () => {
    render(<SignInPage session={fakeSession("supabase", async () => Promise.reject(new TypeError("offline")))} />);

    await fillIn();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Couldn't reach the sign-in service. Check your connection and try again.",
    );
  });

  it("says Signing in... while waiting, and can't be pressed again", async () => {
    let finish: () => void = () => {};
    const session = fakeSession("local", () => new Promise<void>((resolve) => (finish = resolve)));
    render(<SignInPage session={session} />);

    await fillIn();

    const button = await screen.findByRole("button", { name: "Signing in..." });
    expect(button).toBeDisabled();
    finish();
    expect(await screen.findByRole("button", { name: "Sign in" })).toBeEnabled();
    expect(session.signIn).toHaveBeenCalledTimes(1);
  });

  it("shows a notice above the form", () => {
    render(<SignInPage session={fakeSession("local")} notice="Your session ended. Sign in again." />);

    expect(screen.getByRole("status")).toHaveTextContent("Your session ended. Sign in again.");
  });
});
