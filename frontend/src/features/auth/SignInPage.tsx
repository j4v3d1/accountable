import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { TextField } from "../../ui/fields";
import { SignInError, type Session, type SignInProblem } from "./session";
import "./auth.css";

const schema = z.object({
  email: z.string().trim().min(1, "Enter your email"),
  password: z.string().min(1, "Enter your password"),
});

const PROBLEMS: Record<SignInProblem, string> = {
  wrong: "That email and password don't match.",
  unreachable: "Couldn't reach the sign-in service. Check your connection and try again.",
};

interface Props {
  session: Session;
  /** Shown above the form, such as after the session ended (R52). */
  notice?: string | null;
}

/** The sign-in screen, shown at whatever address was asked for while signed out (R49, R50, R54). */
export function SignInPage({ session, notice }: Props) {
  const [problem, setProblem] = useState<SignInProblem | null>(null);
  const form = useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });
  const { errors, isSubmitting } = form.formState;

  async function signIn({ email, password }: z.output<typeof schema>) {
    setProblem(null);
    try {
      await session.signIn(email, password);
    } catch (error) {
      setProblem(error instanceof SignInError ? error.problem : "unreachable");
    }
  }

  return (
    <main className="sign-in-page">
      <div className="sign-in-card">
        <div className="sign-in-logo" aria-hidden="true">
          A
        </div>
        <h1 className="sign-in-title">Sign in to Accountable</h1>
        {session.mode === "local" && (
          <p className="sign-in-local">
            Local mode. Sign in as a sample teammate, such as maya.torres@example.com, with the password local.
          </p>
        )}
        {notice && (
          <p className="sign-in-notice" role="status">
            {notice}
          </p>
        )}
        <form className="sign-in-form" onSubmit={form.handleSubmit(signIn)} noValidate>
          <TextField
            label="Email"
            type="email"
            autoComplete="username"
            error={errors.email?.message}
            {...form.register("email")}
          />
          <TextField
            label="Password"
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...form.register("password")}
          />
          {problem && (
            <p className="sign-in-problem" role="alert">
              {PROBLEMS[problem]}
            </p>
          )}
          <button type="submit" className="btn btn-primary sign-in-button" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <p className="sign-in-help">No account? Ask whoever runs Accountable to add you.</p>
      </div>
    </main>
  );
}
