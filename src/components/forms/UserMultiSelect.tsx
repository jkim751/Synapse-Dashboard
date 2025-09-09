"use client";

import { useState } from "react";

interface User {
  id: string;
  name: string;
  role: "TEACHER" | "ADMIN";
}

interface UserMultiSelectProps {
  users: User[];
  selectedUserIds: string[];
  onChange: (userIds: string[]) => void;
  error?: { message?: string };
}

const UserMultiSelect = ({ users, selectedUserIds, onChange, error }: UserMultiSelectProps) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleUserToggle = (userId: string) => {
    const newSelectedIds = selectedUserIds.includes(userId)
      ? selectedUserIds.filter(id => id !== userId)
      : [...selectedUserIds, userId];
    onChange(newSelectedIds);
  };

  const selectAll = () => {
    onChange(users.map(user => user.id));
  };

  const selectNone = () => {
    onChange([]);
  };

  return (
    <div className="w-full">
      <label className="text-sm font-medium">Select Teachers & Admins</label>
      
      <div className="mt-2 border rounded-lg p-3 max-h-64 overflow-y-auto">
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-3 py-1 border rounded text-sm"
          />
          <button
            type="button"
            onClick={selectAll}
            className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
          >
            Select All
          </button>
          <button
            type="button"
            onClick={selectNone}
            className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            Clear
          </button>
        </div>

        <div className="space-y-2">
          {filteredUsers.map((user) => (
            <label key={user.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
              <input
                type="checkbox"
                checked={selectedUserIds.includes(user.id)}
                onChange={() => handleUserToggle(user.id)}
                className="form-checkbox"
              />
              <span className="flex-1">{user.name}</span>
              <span className={`text-xs px-2 py-1 rounded ${
                user.role === 'ADMIN' 
                  ? 'bg-purple-100 text-purple-700' 
                  : 'bg-green-100 text-green-700'
              }`}>
                {user.role}
              </span>
            </label>
          ))}
        </div>

        {filteredUsers.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-4">No users found</p>
        )}
      </div>

      {selectedUserIds.length > 0 && (
        <p className="text-sm text-gray-600 mt-2">
          {selectedUserIds.length} user(s) selected
        </p>
      )}

      {error?.message && (
        <span className="text-red-500 text-sm">{error.message}</span>
      )}
    </div>
  );
};

export default UserMultiSelect;
