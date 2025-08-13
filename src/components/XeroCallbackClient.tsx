'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

const XeroCallbackClient = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code) {
      setMessage('Error: No authorization code found. Redirecting...');
      setTimeout(() => router.push('/admin/xero'), 3000);
      return;
    }

    // Send the code to our backend API route
    fetch('/api/xero/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setMessage('Authentication successful! Redirecting...');
          router.push('/admin/xero');
        } else {
          setMessage(`Error: ${data.error || 'Authentication failed.'}. Redirecting...`);
          setTimeout(() => router.replace('/admin/xero'), 3000);
        }
      })
      .catch(() => {
        setMessage('An unexpected error occurred. Please try again. Redirecting...');
        setTimeout(() => router.replace('/admin/xero'), 3000);
      });
  }, [searchParams, router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <p className="text-lg">{message}</p>
      </div>
    </div>
  );
};

export default XeroCallbackClient;