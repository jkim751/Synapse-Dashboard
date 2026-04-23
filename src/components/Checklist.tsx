"use client";

import { useState, useEffect, useCallback } from "react";

type ChecklistItem = {
  id: string;
  text: string;
  type: "DAILY" | "MONTHLY";
  isCompleted: boolean;
};

type Props = {
  type: "DAILY" | "MONTHLY";
};

export default function Checklist({ type }: Props) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [newText, setNewText] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const label = type === "DAILY" ? "Daily" : "Monthly";

  const fetchItems = useCallback(async () => {
    const res = await fetch("/api/checklist");
    if (res.ok) {
      const data: ChecklistItem[] = await res.json();
      setItems(data.filter((item) => item.type === type));
    }
    setLoading(false);
  }, [type]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;
    const res = await fetch("/api/checklist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: newText, type }),
    });
    if (res.ok) {
      const item: ChecklistItem = await res.json();
      setItems((prev) => [...prev, item]);
      setNewText("");
    }
  };

  const toggleItem = async (id: string) => {
    const res = await fetch(`/api/checklist/${id}`, { method: "PATCH" });
    if (res.ok) {
      const updated: ChecklistItem = await res.json();
      setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
    }
  };

  const startEdit = (item: ChecklistItem) => {
    setEditingId(item.id);
    setEditText(item.text);
  };

  const saveEdit = async (id: string) => {
    const trimmed = editText.trim();
    if (!trimmed) { setEditingId(null); return; }
    const res = await fetch(`/api/checklist/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: trimmed }),
    });
    if (res.ok) {
      const updated: ChecklistItem = await res.json();
      setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
    }
    setEditingId(null);
  };

  const cancelEdit = () => setEditingId(null);

  const deleteItem = async (id: string) => {
    const res = await fetch(`/api/checklist/${id}`, { method: "DELETE" });
    if (res.ok) {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const completedCount = items.filter((i) => i.isCompleted).length;

  return (
    <div className="bg-white rounded-md p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-800">{label} Checklist</h2>
        <span className="text-xs text-gray-400">
          {completedCount}/{items.length}
        </span>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : (
        <ul className="space-y-2 mb-3 max-h-64 overflow-y-auto flex-1">
          {items.length === 0 && (
            <li className="text-sm text-gray-400 italic">No items yet</li>
          )}
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-2 group">
              <button
                type="button"
                onClick={() => toggleItem(item.id)}
                className={`w-4 h-4 flex-shrink-0 rounded border cursor-pointer flex items-center justify-center transition-colors ${
                  item.isCompleted
                    ? "bg-[#FC7118] border-[#FC7118]"
                    : "bg-white border-gray-300 hover:border-orange-400"
                }`}
                aria-label="Toggle item"
              >
                {item.isCompleted && (
                  <svg viewBox="0 0 10 8" className="w-2.5 h-2.5" fill="none">
                    <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
              {editingId === item.id ? (
                <input
                  autoFocus
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onBlur={() => saveEdit(item.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEdit(item.id);
                    if (e.key === "Escape") cancelEdit();
                  }}
                  className="flex-1 text-sm border-b border-orange-400 outline-none bg-transparent text-gray-700"
                />
              ) : (
                <span
                  onDoubleClick={() => startEdit(item)}
                  className={`flex-1 text-sm cursor-text ${
                    item.isCompleted ? "line-through text-gray-400" : "text-gray-700"
                  }`}
                  title="Double-click to edit"
                >
                  {item.text}
                </span>
              )}
              <button
                onClick={() => deleteItem(item.id)}
                className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-lg leading-none flex-shrink-0"
                aria-label="Delete item"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={addItem} className="flex gap-2 mt-auto">
        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder={`Add ${label.toLowerCase()} task...`}
          className="flex-1 text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-orange-400"
        />
        <button
          type="submit"
          className="text-sm bg-[#FC7118] text-white px-3 py-1.5 rounded hover:bg-orange-600 transition-colors"
        >
          Add
        </button>
      </form>
    </div>
  );
}
