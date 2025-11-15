"use client";
import Link from "next/link";
import { Suspense } from "react";
import PageContainer from "@/components/shared/PageContainer";
import Logo from "@/components/shared/Logo";
import AuthLogin from "../auth/AuthLogin";
import { Card } from "@/components/ui/card";

const Login2 = () => {
  return (
    <PageContainer title="Login" description="this is Login page">
      <div className="relative min-h-screen">
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            background: "radial-gradient(#d2f1df, #d3d7fa, #bad8f4)",
            backgroundSize: "400% 400%",
            animation: "gradient 15s ease infinite",
          }}
        />
        <div className="relative flex min-h-screen items-center justify-center p-4">
          <div className="w-full max-w-[500px]">
            <Card className="relative z-10 p-6 shadow-lg">
              <div className="flex items-center justify-center mb-6">
                <Logo />
              </div>
              <Suspense fallback={<div>Chargement...</div>}>
                <AuthLogin
                  subtext={
                    <p className="text-center text-sm text-muted-foreground mb-1">
                      Your Social Campaigns
                    </p>
                  }
                  subtitle={
                    <div className="flex items-center justify-center gap-1 mt-6">
                      <p className="text-muted-foreground text-base font-medium">
                        New to Modernize?
                      </p>
                      <Link
                        href="/authentication/register"
                        className="text-primary font-medium hover:underline"
                      >
                        Create an account
                      </Link>
                    </div>
                  }
                />
              </Suspense>
            </Card>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};
export default Login2;
