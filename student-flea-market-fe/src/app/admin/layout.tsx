'use client';

import type { ReactNode } from 'react';
import { AppShell } from '@/components/shell/AppShell';
import { RequireAuth } from '@/components/RequireAuth';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell variant="admin">
      <RequireAuth staffOnly>{children}</RequireAuth>
    </AppShell>
  );
}
