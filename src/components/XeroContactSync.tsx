"use client";

import { useState } from "react";

const XeroContactSync = () => {
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSyncContacts = async () => {
    setSyncing(true);
    setSyncResult(null); // Clear previous results

    try {
      const response = await fetch('/api/xero/sync-contacts', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        // If the server returns an error status (4xx, 5xx)
        throw new Error(data.message || 'The sync operation failed.');
      }
      
      setSyncResult({ success: true, message: data.message });

    } catch (error: any) {
      console.error("Sync failed:", error);
      setSyncResult({ success: false, message: error.message });
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
      
      {syncResult && (
        <div className={`mt-4 p-3 rounded text-sm ${
            syncResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {syncResult.message}
        </div>
      )}
    </div>
  );
};

export default XeroContactSync;