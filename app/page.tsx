'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  
  useEffect(() => {
    router.push('/forecast');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-xl text-gray-600">Redirigiendo al dashboard...</div>
    </div>
  );
}
