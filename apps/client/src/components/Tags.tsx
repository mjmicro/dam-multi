import React, { useState } from 'react';
import { TagsProps } from './types';
import { apiClient } from '../api';

export const Tags: React.FC<TagsProps> = ({ assetId, tags, onTagsChange }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async () => {
    const tag = input.trim().toLowerCase();
    if (!tag || tags.includes(tag)) return;

    try {
      setIsLoading(true);
      setError(null);
      const updated = await apiClient.addTags(assetId, [tag]);
      onTagsChange(updated.tags);
      setInput('');
    } catch {
      setError('Failed to add tag');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async (tag: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const updated = await apiClient.removeTags(assetId, [tag]);
      onTagsChange(updated.tags);
    } catch {
      setError('Failed to remove tag');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleAdd();
  };

  return (
    <div className="mt-2">
      {/* Tag pills */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs"
            >
              {tag}
              <button
                type="button"
                onClick={() => handleRemove(tag)}
                disabled={isLoading}
                className="hover:text-blue-600 disabled:opacity-50 leading-none"
                aria-label={`Remove tag ${tag}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Add tag input */}
      <div className="flex gap-1">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add tag..."
          disabled={isLoading}
          className="flex-1 text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-blue-400 disabled:opacity-50"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={isLoading || !input.trim()}
          className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded disabled:opacity-50 transition-colors"
        >
          Add
        </button>
      </div>

      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
};
