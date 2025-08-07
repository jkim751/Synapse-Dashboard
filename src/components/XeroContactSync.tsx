
"use client";

import { useState } from "react";

const XeroContactSync = () => {
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const handleSyncContacts = async () => {
    setSyncing(true);
    try {
      // This would call your sync API
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulated delay
      setLastSync(new Date());
    } catch (error) {
      console.error("Sync failed:", error);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-gray-600">
        Sync student and parent information with Xero contacts for invoicing.
      </p>
      
      <button
        onClick={handleSyncContacts}
        disabled={syncing}
        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
      >
        {syncing ? "Syncing..." : "Sync All Contacts"}
      </button>
      
      {lastSync && (
        <p className="text-sm text-gray-500">
          Last synced: {lastSync.toLocaleString()}
        </p>
      )}
    </div>
  );
};

export default XeroContactSync;
