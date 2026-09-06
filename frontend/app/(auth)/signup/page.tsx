"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Mail, Lock, Building, ArrowRight, Loader2 } from "lucide-react";
import { AmbientBackground } from "@/components/ambient/ambient-background";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [institution, setInstitution] = useState("");
  const [department, setDepartment] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            institution,
            department,
          },
        },
      });

      if (error) {
        setErrorMessage(error.message);
      } else {
        toast.success("Account registered successfully", {
          description: "Please check your institutional email for confirmation link or proceed to dashboard.",
        });
        router.push("/dashboard");
      }
    } catch {
      setErrorMessage("Network error connecting to authentication provider");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-6 bg-background">
      <AmbientBackground />

      <div className="relative z-10 w-full max-w-lg futuristic-card p-8 sm:p-10 shadow-2xl space-y-7 border-primary/30">
        <div className="space-y-2 text-center">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-base shadow-xs mx-auto mb-1">
            P•AI
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Create Faculty Account
          </h1>
          <p className="text-sm text-muted-foreground">
            Register your department to provision isolated academic workspaces.
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-5 text-sm">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/25 text-destructive text-sm font-medium">
              {errorMessage}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="font-semibold text-foreground">Full Name</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dr. Elena Rostova"
                className="w-full text-sm rounded-xl border border-border bg-background px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
              />
            </div>

            <div className="space-y-2">
              <label className="font-semibold text-foreground">Institutional Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="faculty@polytechnic.edu"
                className="w-full text-sm rounded-xl border border-border bg-background px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="font-semibold text-foreground">Institution / University</label>
              <input
                required
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="ETH Zurich / MIT"
                className="w-full text-sm rounded-xl border border-border bg-background px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
              />
            </div>

            <div className="space-y-2">
              <label className="font-semibold text-foreground">Department</label>
              <input
                required
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Computer Science & AI"
                className="w-full text-sm rounded-xl border border-border bg-background px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="font-semibold text-foreground">Master Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className="w-full text-sm rounded-xl border border-border bg-background px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-primary via-indigo-600 to-cyan-500 text-white text-sm font-bold hover:brightness-110 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md mt-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Register Faculty Account</span>}
          </button>
        </form>

        <div className="text-center text-sm text-muted-foreground pt-1">
          Already have an account?{" "}
          <Link href="/login" className="text-primary font-semibold hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
