"use client";

import { useState, useRef, useEffect } from "react";

interface Contact {
  contactId: string;
  name: string;
}

const XeroInvoiceManager = ({ contacts }: { contacts: Contact[] }) => {
  const [contactId, setContactId] = useState("");
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [send, setSend] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success?: string; error?: string } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedContact = contacts.find(c => c.contactId === contactId);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (c: Contact) => {
    setContactId(c.contactId);
    setSearch(c.name);
    setShowDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/xero/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId, description, amount, dueDate: dueDate || undefined, send }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to create invoice");

      setResult({ success: `Invoice created${send ? " and sent" : ""} (ID: ${data.invoiceId})` });
      setContactId("");
      setSearch("");
      setDescription("");
      setAmount("");
      setDueDate("");
      setSend(false);
    } catch (err: any) {
      setResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Contact</label>
          {contacts.length > 0 ? (
            <div ref={containerRef} className="relative">
              <input
                type="text"
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setContactId("");
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Search by name…"
                required={!contactId}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              {/* Hidden input to enforce contactId is required */}
              <input type="text" value={contactId} onChange={() => {}} required className="sr-only" tabIndex={-1} />
              {showDropdown && search && (
                <ul className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded border border-gray-200 bg-white shadow-lg">
                  {filtered.length > 0 ? (
                    filtered.map(c => (
                      <li
                        key={c.contactId}
                        onMouseDown={() => handleSelect(c)}
                        className={`cursor-pointer px-3 py-2 text-sm hover:bg-orange-50 ${
                          c.contactId === contactId ? "bg-orange-100 font-medium" : ""
                        }`}
                      >
                        {c.name}
                      </li>
                    ))
                  ) : (
                    <li className="px-3 py-2 text-sm text-gray-400">No contacts found</li>
                  )}
                </ul>
              )}
              {selectedContact && (
                <p className="mt-1 text-xs text-gray-500">Selected: {selectedContact.name}</p>
              )}
            </div>
          ) : (
            <input
              type="text"
              value={contactId}
              onChange={e => setContactId(e.target.value)}
              placeholder="Xero Contact ID"
              required
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Amount (AUD)</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            required
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="e.g. Term 2 School Fees"
            required
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Due Date (optional)</label>
          <input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        <div className="flex items-center gap-2 pt-6">
          <input
            id="send-invoice"
            type="checkbox"
            checked={send}
            onChange={e => setSend(e.target.checked)}
            className="h-4 w-4"
          />
          <label htmlFor="send-invoice" className="text-sm text-gray-700">
            Send invoice to contact via email
          </label>
        </div>
      </div>

      {result?.success && (
        <p className="rounded bg-green-50 px-3 py-2 text-sm text-green-700">{result.success}</p>
      )}
      {result?.error && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{result.error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="rounded bg-orange-400 px-5 py-2 text-sm font-medium text-white hover:bg-orange-500 disabled:opacity-50"
      >
        {loading ? "Creating…" : "Create Invoice"}
      </button>
    </form>
  );
};

export default XeroInvoiceManager;
