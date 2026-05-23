"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HRReviewPage() {
  const router = useRouter();
  useEffect(() => {
    router.push('/dashboard/hr');
  }, [router]);
  return null;
}
