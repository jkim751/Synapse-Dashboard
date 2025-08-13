"use client";
import { useState } from "react";

// Accept the initial state as a prop
const XeroAuthButton = ({ initialIsAuthenticated }: { initialIsAuthenticated: boolean }) => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  
  // A "disconnect" function would call another API route to delete the tokens
  const handleDisconnect = () => { alert("Disconnect logic not implemented yet."); }
  
  const handleXeroAuth = () => {
    setIsAuthenticating(true);
    window.location.href = "/api/xero/callback";
  };

  if (initialIsAuthenticated) {
    return (
      <button 
        onClick={handleDisconnect} 
        className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
      >
        Disconnect from Xero
      </button>
    );
  }

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