'use client';

import { Toaster } from 'sonner';

export function V0Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}

