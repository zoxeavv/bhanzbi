"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface loginType {
  title?: string;
  subtitle?: React.ReactNode;
  subtext?: React.ReactNode;
}

const AuthLogin = ({ title, subtitle, subtext }: loginType) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  // Lire le paramètre error de l'URL
  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam === "unauthorized") {
      setUrlError("Vous n'avez pas les droits pour accéder à cette page.");
    } else if (errorParam === "session") {
      setUrlError("Votre session a expiré, veuillez vous reconnecter.");
    } else {
      setUrlError(null);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[AuthLogin] Form submit triggered');
    console.log('[AuthLogin] Submitting login with email:', email);
    
    setError(null);
    setLoading(true);

    try {
      console.log('[AuthLogin] Calling supabase.auth.signInWithPassword...');
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('[AuthLogin] Supabase signInWithPassword response:', {
        hasData: !!data,
        hasError: !!signInError,
        error: signInError ? {
          message: signInError.message,
          status: signInError.status,
          name: signInError.name,
        } : null,
        user: data?.user ? {
          id: data.user.id,
          email: data.user.email,
        } : null,
        session: data?.session ? {
          access_token: data.session.access_token ? 'present' : 'missing',
          expires_at: data.session.expires_at,
          expires_in: data.session.expires_in,
        } : null,
      });

      if (signInError) {
        console.error('[AuthLogin] SignIn error:', signInError);
        setError(signInError.message || "Invalid email or password");
        setLoading(false);
        return;
      }

      if (data.session) {
        console.log('[AuthLogin] Login successful, session details:', {
          hasAccessToken: !!data.session.access_token,
          hasRefreshToken: !!data.session.refresh_token,
          expiresAt: data.session.expires_at,
          expiresIn: data.session.expires_in,
        });
        
        // Exchange tokens for server-side cookies via API endpoint
        // This ensures the middleware can read the session from cookies
        console.log('[AuthLogin] Exchanging tokens for server-side cookies...');
        try {
          const exchangeResponse = await fetch('/api/auth/exchange', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
            }),
          });

          if (!exchangeResponse.ok) {
            const errorData = await exchangeResponse.json();
            console.error('[AuthLogin] Token exchange failed:', errorData);
            setError('Failed to synchronize session. Please try again.');
            setLoading(false);
            return;
          }

          console.log('[AuthLogin] Token exchange successful');
          
          // Check if cookies are set after exchange
          console.log('[AuthLogin] Checking cookies after exchange...');
          const allCookies = document.cookie.split(';').map(c => c.trim());
          const supabaseCookies = allCookies.filter(c => 
            c.includes('supabase') || 
            c.startsWith('sb-') || 
            c.includes('auth')
          );
          console.log('[AuthLogin] Supabase cookies after exchange:', supabaseCookies.map(c => c.split('=')[0]));
          
          console.log('[AuthLogin] Redirecting to dashboard');
          // Redirect to dashboard on success
          router.push("/dashboard");
          router.refresh();
        } catch (exchangeError) {
          console.error('[AuthLogin] Error during token exchange:', exchangeError);
          setError('Failed to synchronize session. Please try again.');
          setLoading(false);
          return;
        }
      } else {
        console.warn('[AuthLogin] No session returned in data object');
        setError('No session returned. Please try again.');
        setLoading(false);
      }
    } catch (err) {
      console.error('[AuthLogin] Unexpected error:', err);
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <>
      {title ? (
        <h2 className="font-bold text-3xl mb-1">
          {title}
        </h2>
      ) : null}

      {subtext}

      {urlError && (
        <div className="mb-2 rounded-md border border-warning/50 bg-warning/10 px-4 py-3 text-sm text-warning-foreground">
          {urlError}
        </div>
      )}

      {error && (
        <div className="mb-2 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-semibold">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="w-full"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-semibold">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="w-full"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <input
                id="remember"
                type="checkbox"
                defaultChecked
                className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
              />
              <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
                Remeber this Device
              </Label>
            </div>
            <Link
              href="/"
              className="text-sm font-medium text-primary hover:underline"
            >
              Forgot Password ?
            </Link>
          </div>
        </div>
        
        <Button
          type="submit"
          disabled={loading}
          className="w-full"
          size="lg"
        >
          {loading ? "Signing In..." : "Sign In"}
        </Button>
      </form>
      {subtitle}
    </>
  );
};

export default AuthLogin;
