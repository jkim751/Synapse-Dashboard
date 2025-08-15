// This page shows while Xero redirects back to your API route
const XeroCallbackPage = () => {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-lg">Processing Xero authentication...</p>
        <p className="text-sm text-gray-600 mt-2">Please wait while we complete the connection.</p>
      </div>
    </div>
  );
};

export default XeroCallbackPage;