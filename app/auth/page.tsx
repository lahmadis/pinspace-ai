"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Auth Page
 * 
 * Visual-only login/signup screen.
 * Forms navigate to /boards without real authentication.
 * 
 * Features:
 * - Tab-based UI for switching between Log in and Sign up
 * - Sign up form: Email, Password, Full name (optional), Role (required: Student/Professor)
 * - Sign in form: Email, Password
 * - Error handling and validation
 * - TODO: Wire to Supabase later
 */
export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  
  // Handle URL parameters for tab and email pre-fill
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "login" || tab === "signup") {
      setActiveTab(tab);
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md border border-gray-200">
        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab("login")}
            className={`flex-1 px-6 py-4 text-sm font-medium transition ${
              activeTab === "login"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Log in
          </button>
          <button
            onClick={() => setActiveTab("signup")}
            className={`flex-1 px-6 py-4 text-sm font-medium transition ${
              activeTab === "signup"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Sign up
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          {activeTab === "login" ? (
            <LoginForm initialEmail={searchParams.get("email") || ""} />
          ) : (
            <SignUpForm />
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Login Form Component
 */
function LoginForm({ initialEmail = "" }: { initialEmail?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Update email when initialEmail changes
  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    if (!password) {
      setError("Please enter your password");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setSubmitting(true);

    // TODO: wire to Supabase later
    // For now, just navigate to boards
    router.push("/boards");
  }

  return (
    <div>
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome back</h1>
        <p className="text-sm text-gray-600">Sign in to your account</p>
      </div>

      <form onSubmit={handleSignIn} className="space-y-4">
        {/* Email input */}
        <div>
          <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-1">
            Email address
          </label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            disabled={submitting}
            autoComplete="email"
          />
        </div>

        {/* Password input */}
        <div>
          <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            disabled={submitting}
            autoComplete="current-password"
          />
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={submitting || !email.trim() || !password}
          className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}

/**
 * Sign Up Form Component
 */
function SignUpForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"student" | "professor">("student");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    if (!password) {
      setError("Please enter a password");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setSubmitting(true);

    // TODO: wire to Supabase later
    // For now, just navigate to boards
    router.push("/boards");
  }

  return (
    <div>
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Create an account</h1>
        <p className="text-sm text-gray-600">Sign up to get started with PinSpace</p>
      </div>

      <form onSubmit={handleSignUp} className="space-y-4">
        {/* Email input */}
        <div>
          <label htmlFor="signup-email" className="block text-sm font-medium text-gray-700 mb-1">
            Email address <span className="text-red-500">*</span>
          </label>
          <input
            id="signup-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            disabled={submitting}
            autoComplete="email"
            required
          />
        </div>

        {/* Password input */}
        <div>
          <label htmlFor="signup-password" className="block text-sm font-medium text-gray-700 mb-1">
            Password <span className="text-red-500">*</span>
          </label>
          <input
            id="signup-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            disabled={submitting}
            autoComplete="new-password"
            required
            minLength={6}
          />
        </div>

        {/* Full name input (optional) */}
        <div>
          <label htmlFor="signup-fullname" className="block text-sm font-medium text-gray-700 mb-1">
            Full name
          </label>
          <input
            id="signup-fullname"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your name (optional)"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            disabled={submitting}
            autoComplete="name"
          />
        </div>

        {/* Role selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Role <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="role"
                value="student"
                checked={role === "student"}
                onChange={(e) => setRole(e.target.value as "student" | "professor")}
                className="mr-2"
                disabled={submitting}
                required
              />
              <span className="text-sm text-gray-700">Student</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="role"
                value="professor"
                checked={role === "professor"}
                onChange={(e) => setRole(e.target.value as "student" | "professor")}
                className="mr-2"
                disabled={submitting}
                required
              />
              <span className="text-sm text-gray-700">Professor</span>
            </label>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={submitting || !email.trim() || !password}
          className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Creating account..." : "Sign up"}
        </button>
      </form>
    </div>
  );
}

