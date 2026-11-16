'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/** Old URL kept working: /login → /auth (query string preserved). */
function Redirect() {
  const router = useRouter();
  const params = useSearchParams();
  useEffect(() => {
    const qs = params.toString();
    router.replace(qs ? `/auth?${qs}` : '/auth');
  }, [router, params]);
  return null;
}

export default function LoginRedirect() {
  return (
    <Suspense fallback={null}>
      <Redirect />
    </Suspense>
  );
}
