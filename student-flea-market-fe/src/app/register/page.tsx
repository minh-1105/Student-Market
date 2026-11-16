'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Old URL kept working: /register → /auth?mode=register. */
export default function RegisterRedirect() {
  const router = useRouter();
  useEffect(() => router.replace('/auth?mode=register'), [router]);
  return null;
}
