import { Suspense } from 'react';
import XeroCallbackClient from '@/components/XeroCallbackClient';

// This is a simple server component wrapper
const XeroCallbackPage = () => {
  return (
    <div className="flex items-center justify-center h-screen">
      <Suspense fallback={<p className="text-lg">Loading...</p>}>
        <XeroCallbackClient />
      </Suspense>
    </div>
  );
};

export default XeroCallbackPage;