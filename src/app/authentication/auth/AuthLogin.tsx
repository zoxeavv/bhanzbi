"use client";
import React, { useState } from "react";
import {
  Box,
  Typography,
  FormGroup,
  FormControlLabel,
  Button,
  Stack,
  Checkbox,
  Alert,
} from "@mui/material";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

import CustomTextField from "@/components/forms/CustomTextField";

interface loginType {
  title?: string;
  subtitle?: React.ReactNode;
  subtext?: React.ReactNode;
}

const AuthLogin = ({ title, subtitle, subtext }: loginType) => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
        <Typography fontWeight="700" variant="h2" mb={1}>
          {title}
        </Typography>
      ) : null}

      {subtext}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Stack>
          <Box>
            <Typography
              variant="subtitle1"
              fontWeight={600}
              component="label"
              htmlFor="email"
              mb="5px"
            >
              Email
            </Typography>
            <CustomTextField
              id="email"
              type="email"
              variant="outlined"
              fullWidth
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </Box>
          <Box mt="25px">
            <Typography
              variant="subtitle1"
              fontWeight={600}
              component="label"
              htmlFor="password"
              mb="5px"
            >
              Password
            </Typography>
            <CustomTextField
              id="password"
              type="password"
              variant="outlined"
              fullWidth
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </Box>
          <Stack
            justifyContent="space-between"
            direction="row"
            alignItems="center"
            my={2}
          >
            <FormGroup>
              <FormControlLabel
                control={<Checkbox defaultChecked />}
                label="Remeber this Device"
              />
            </FormGroup>
            <Typography
              component={Link}
              href="/"
              fontWeight="500"
              sx={{
                textDecoration: "none",
                color: "primary.main",
              }}
            >
              Forgot Password ?
            </Typography>
          </Stack>
        </Stack>
        <Box>
          <Button
            color="primary"
            variant="contained"
            size="large"
            fullWidth
            type="submit"
            disabled={loading}
          >
            {loading ? "Signing In..." : "Sign In"}
          </Button>
        </Box>
      </form>
      {subtitle}
    </>
  );
};

export default AuthLogin;
