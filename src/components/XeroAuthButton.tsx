"use client";

import { useState } from "react";

const XeroAuthButton = ({ initialIsAuthenticated }: { initialIsAuthenticated: boolean }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(initialIsAuthenticated);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/xero/auth-url");
      const data = await response.json();
      if (!response.ok || !data.authUrl) {
        throw new Error(data.error || "Failed to get authorization URL");
      }
      window.location.href = data.authUrl;
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/xero/disconnect", { method: "POST" });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to disconnect");
      }
      setIsAuthenticated(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      {isAuthenticated ? (
        <button
          onClick={handleDisconnect}
          disabled={isLoading}
          className="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600 disabled:opacity-50"
        >
          {isLoading ? "Disconnecting…" : "Disconnect from Xero"}
        </button>
      ) : (
        <button
          onClick={handleConnect}
          disabled={isLoading}
          className="rounded bg-orange-400 px-4 py-2 text-white hover:bg-orange-500 disabled:opacity-50"
        >
          {isLoading ? "Connecting…" : "Connect to Xero"}
        </button>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
};

export default XeroAuthButton;
