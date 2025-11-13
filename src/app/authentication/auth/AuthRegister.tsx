"use client";
import React, { useState } from 'react';
import { Box, Typography, Button, Alert } from '@mui/material';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

import CustomTextField from '@/app/(DashboardLayout)/components/forms/theme-elements/CustomTextField';
import { Stack } from '@mui/system';

interface registerType {
    title?: string;
    subtitle?: React.ReactNode;
    subtext?: React.ReactNode;
}

const AuthRegister = ({ title, subtitle, subtext }: registerType) => {
    const router = useRouter();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('[AuthRegister] Form submit triggered');
        console.log('[AuthRegister] Submitting registration with email:', email);
        console.log('[AuthRegister] Name:', name);
        
        setError(null);
        setLoading(true);

        try {
            console.log('[AuthRegister] Calling supabase.auth.signUp...');
            const { data, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        display_name: name,
                    },
                },
            });

            console.log('[AuthRegister] Supabase signUp response:', {
                hasData: !!data,
                hasError: !!signUpError,
                error: signUpError ? {
                    message: signUpError.message,
                    status: signUpError.status,
                    name: signUpError.name,
                } : null,
                user: data?.user ? {
                    id: data.user.id,
                    email: data.user.email,
                    created_at: data.user.created_at,
                } : null,
                session: data?.session ? {
                    access_token: data.session.access_token ? 'present' : 'missing',
                    expires_at: data.session.expires_at,
                } : null,
            });

            if (signUpError) {
                console.error('[AuthRegister] SignUp error:', signUpError);
                setError(signUpError.message || "Failed to create account. Please try again.");
                setLoading(false);
                return;
            }

            if (data.user) {
                console.log('[AuthRegister] User created successfully:', data.user.id);
                setSuccess(true);
                // Redirect to login page after a short delay
                setTimeout(() => {
                    router.push("/authentication/login");
                }, 2000);
            } else {
                console.warn('[AuthRegister] No user returned in data object');
            }
        } catch (err) {
            console.error('[AuthRegister] Unexpected error:', err);
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

            {success && (
                <Alert severity="success" sx={{ mb: 2 }}>
                    Account created successfully! Redirecting to login...
                </Alert>
            )}

            <form onSubmit={handleSubmit}>
                <Box>
                    <Stack mb={3}>
                        <Typography variant="subtitle1"
                            fontWeight={600} component="label" htmlFor='name' mb="5px">Name</Typography>
                        <CustomTextField
                            id="name"
                            variant="outlined"
                            fullWidth
                            value={name}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                            required
                            disabled={loading || success}
                        />

                        <Typography variant="subtitle1"
                            fontWeight={600} component="label" htmlFor='email' mb="5px" mt="25px">Email Address</Typography>
                        <CustomTextField
                            id="email"
                            type="email"
                            variant="outlined"
                            fullWidth
                            value={email}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                            required
                            disabled={loading || success}
                        />

                        <Typography variant="subtitle1"
                            fontWeight={600} component="label" htmlFor='password' mb="5px" mt="25px">Password</Typography>
                        <CustomTextField
                            id="password"
                            type="password"
                            variant="outlined"
                            fullWidth
                            value={password}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                            required
                            disabled={loading || success}
                            inputProps={{ minLength: 6 }}
                        />
                    </Stack>
                    <Button
                        color="primary"
                        variant="contained"
                        size="large"
                        fullWidth
                        type="submit"
                        disabled={loading || success}
                    >
                        {loading ? "Creating Account..." : success ? "Account Created!" : "Sign Up"}
                    </Button>
                </Box>
            </form>
            {subtitle}
        </>
    );
};

export default AuthRegister;
