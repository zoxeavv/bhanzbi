"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

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
            console.log('[AuthRegister] Calling /api/auth/register...');
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    password,
                    display_name: name,
                }),
            });

            const result = await response.json();

            console.log('[AuthRegister] API response:', {
                status: response.status,
                hasError: !!result.error,
                hasUser: !!result.user,
                error: result.error || null,
                user: result.user ? {
                    id: result.user.id,
                    email: result.user.email,
                    created_at: result.user.created_at,
                } : null,
            });

            if (!response.ok || result.error) {
                console.error('[AuthRegister] Registration error:', result.error);
                
                // Gérer spécifiquement le cas où l'email n'est pas autorisé
                if (result.error === 'EMAIL_NOT_ALLOWED') {
                    setError(result.message || "Cet email n'est pas autorisé à créer un compte. Contactez un administrateur.");
                } else {
                    // Autres erreurs (validation, serveur, etc.)
                    setError(result.error || result.message || "Failed to create account. Please try again.");
                }
                
                setLoading(false);
                return;
            }

            if (result.user) {
                console.log('[AuthRegister] User created successfully:', result.user.id);
                setSuccess(true);
                // Redirect to login page after a short delay
                setTimeout(() => {
                    router.push("/authentication/login");
                }, 2000);
            } else {
                console.warn('[AuthRegister] No user returned in response');
                setError("Account creation completed but no user data returned.");
                setLoading(false);
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
                <h2 className="font-bold text-3xl mb-1">
                    {title}
                </h2>
            ) : null}

            {subtext}

            {error && (
                <div className="mb-2 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground">
                    {error}
                </div>
            )}

            {success && (
                <div className="mb-2 rounded-md border border-success/50 bg-success/10 px-4 py-3 text-sm text-success-foreground">
                    Account created successfully! Redirecting to login...
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm font-semibold">
                            Name
                        </Label>
                        <Input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                            required
                            disabled={loading || success}
                            className="w-full"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-semibold">
                            Email Address
                        </Label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                            required
                            disabled={loading || success}
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
                            minLength={6}
                            disabled={loading || success}
                            className="w-full"
                        />
                    </div>
                </div>
                
                <Button
                    type="submit"
                    disabled={loading || success}
                    className="w-full"
                    size="lg"
                >
                    {loading ? "Creating Account..." : success ? "Account Created!" : "Sign Up"}
                </Button>
            </form>
            {subtitle}
        </>
    );
};

export default AuthRegister;
