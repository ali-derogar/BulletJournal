"use client";

import { useState } from "react";
import { useUser } from "@/app/context/UserContext";

export default function UserManagement() {
  const {
    currentUser,
    allUsers,
    isLoading,
    switchUser,
    createUser,
    updateUser,
    removeUser,
  } = useUser();

  const [showDialog, setShowDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showUserList, setShowUserList] = useState(false);

  const handleOpenCreateDialog = () => {
    setDialogMode("create");
    setUserName("");
    setError(null);
    setShowDialog(true);
  };

  const handleOpenEditDialog = (userId: string, name: string) => {
    setDialogMode("edit");
    setEditingUserId(userId);
    setUserName(name);
    setError(null);
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setUserName("");
    setError(null);
    setEditingUserId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = userName.trim();
    if (!trimmedName) {
      setError("Name cannot be empty");
      return;
    }

    try {
      if (dialogMode === "create") {
        await createUser(trimmedName);
      } else if (dialogMode === "edit" && editingUserId) {
        await updateUser(editingUserId, trimmedName);
      }
      handleCloseDialog();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    }
  };

  const handleSwitchUser = async (userId: string) => {
    try {
      await switchUser(userId);
      setShowUserList(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to switch user");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user profile?")) {
      return;
    }

    try {
      await removeUser(userId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user");
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg p-4 shadow">
        <div className="text-gray-600">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-4 shadow space-y-4">
      {/* Current User Display */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">Current User</h3>
          <p className="text-sm text-gray-600">
            {currentUser?.name || "No user selected"}
          </p>
        </div>
        <button
          onClick={() => setShowUserList(!showUserList)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
        >
          {showUserList ? "Hide Users" : "Switch User"}
        </button>
      </div>

      {/* User List (for switching) */}
      {showUserList && (
        <div className="border rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-gray-900">All Users</h4>
            <button
              onClick={handleOpenCreateDialog}
              className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
            >
              + New User
            </button>
          </div>

          {allUsers.length === 0 ? (
            <p className="text-sm text-gray-500">No users found</p>
          ) : (
            <div className="space-y-2">
              {allUsers.map((user) => (
                <div
                  key={user.id}
                  className={`flex items-center justify-between p-2 rounded ${
                    currentUser?.id === user.id
                      ? "bg-blue-50 border border-blue-200"
                      : "bg-gray-50"
                  }`}
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500">ID: {user.id}</p>
                  </div>

                  <div className="flex gap-2">
                    {currentUser?.id !== user.id && (
                      <button
                        onClick={() => handleSwitchUser(user.id)}
                        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs"
                      >
                        Switch
                      </button>
                    )}

                    <button
                      onClick={() => handleOpenEditDialog(user.id, user.name)}
                      className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-xs"
                    >
                      Edit
                    </button>

                    {user.id !== "default" && (
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs"
                        disabled={currentUser?.id === user.id}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {dialogMode === "create" ? "Create New User" : "Edit User"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="userName"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Name
                </label>
                <input
                  id="userName"
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter user name"
                  autoFocus
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                  {error}
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={handleCloseDialog}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  {dialogMode === "create" ? "Create" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Error Display */}
      {error && !showDialog && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  );
}
