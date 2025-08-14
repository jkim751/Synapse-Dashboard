'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation'; // Only useRouter is needed now

const XeroCallbackClient = () => {
  const router = useRouter();
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    // We get the URL directly from the window object. No need for useSearchParams.
    const callbackUrl = window.location.href;

    // Check if the URL actually contains the 'code' parameter from Xero
    if (!callbackUrl.includes('code=')) {
      setMessage('Error: Invalid callback URL. Redirecting...');
      setTimeout(() => router.replace('/admin/xero'), 3000);
      return;
    }

    // Send the ENTIRE URL to our backend API route
    fetch('/api/xero/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callbackUrl }), // Send the full URL in the body
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setMessage('Authentication successful! Redirecting...');
          router.replace('/admin/xero'); // Use replace for better UX
        } else {
          setMessage(`Error: ${data.error || 'Authentication failed.'}. Redirecting...`);
          setTimeout(() => router.replace('/admin/xero'), 3000);
        }
      })
      .catch((err) => {
        console.error("Fetch error:", err);
        setMessage('An unexpected error occurred. Please try again. Redirecting...');
        setTimeout(() => router.replace('/admin/xero'), 3000);
      });
      
  // The empty dependency array is correct. This should only run ONCE.
  }, [router]); 

  return (
    <div className="text-center">
      <p className="text-lg">{message}</p>
    </div>
  );
};

export default XeroCallbackClient;