
"use client";

import { useState } from "react";

const XeroAuthButton = () => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleXeroAuth = async () => {
    setIsAuthenticating(true);
    try {
      window.location.href = "/api/xero/auth";
    } catch (error) {
      console.error("Error initiating Xero auth:", error);
      setIsAuthenticating(false);
    }
  };

  return (
    <button
      onClick={handleXeroAuth}
      disabled={isAuthenticating}
      className="bg-orange-400 text-white px-4 py-2 rounded hover:bg-blue-400 disabled:opacity-50"
    >
      {isAuthenticating ? "Connecting..." : "Connect to Xero"}
    </button>
  );
};

export default XeroAuthButton;
