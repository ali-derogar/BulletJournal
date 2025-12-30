'use client';

import { useState, useEffect, useRef } from 'react';
import { getUsers, type UserListParams } from '@/services/admin';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface UserSelectorProps {
  selectedUserIds: string[];
  onSelectionChange: (userIds: string[]) => void;
}

export default function UserSelector({ selectedUserIds, onSelectionChange }: UserSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load users based on search
  useEffect(() => {
    const loadUsers = async () => {
      if (!isOpen && searchQuery.length === 0) return;

      try {
        setLoading(true);
        const params: UserListParams = {
          page: 1,
          size: 50,
        };

        if (searchQuery) {
          params.search = searchQuery;
        }

        const response = await getUsers(params);
        setUsers(response.users);
      } catch (error) {
        console.error('Failed to load users:', error);
      } finally {
        setLoading(false);
      }
    };

    // Debounce search
    const timer = setTimeout(loadUsers, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleUser = (userId: string) => {
    if (selectedUserIds.includes(userId)) {
      onSelectionChange(selectedUserIds.filter((id) => id !== userId));
    } else {
      onSelectionChange([...selectedUserIds, userId]);
    }
  };

  const handleRemoveUser = (userId: string) => {
    onSelectionChange(selectedUserIds.filter((id) => id !== userId));
  };

  const selectedUsers = users.filter((user) => selectedUserIds.includes(user.id));

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selected Users Display */}
      {selectedUserIds.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {selectedUsers.map((user) => (
            <div
              key={user.id}
              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm"
            >
              <span>{user.name}</span>
              <button
                type="button"
                onClick={() => handleRemoveUser(user.id)}
                className="hover:text-blue-900"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
          {selectedUserIds.length > selectedUsers.length && (
            <div className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-sm">
              +{selectedUserIds.length - selectedUsers.length} more
            </div>
          )}
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search users by name or email..."
          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
          {loading ? (
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-64 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">Searching...</div>
          ) : users.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              {searchQuery ? 'No users found' : 'Start typing to search users'}
            </div>
          ) : (
            <div className="py-1">
              {users.map((user) => {
                const isSelected = selectedUserIds.includes(user.id);
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleToggleUser(user.id)}
                    className={`w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center justify-between ${
                      isSelected ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                        {user.role}
                      </span>
                      {isSelected && (
                        <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Helper Text */}
      <div className="mt-1 text-xs text-gray-500">
        {selectedUserIds.length > 0
          ? `${selectedUserIds.length} user(s) selected`
          : 'Search and select users to send notification'}
      </div>
    </div>
  );
}
