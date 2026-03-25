import React, { useState } from 'react';
import { FilterAssetsProps } from './types';
import { apiClient } from '../api';

const TYPE_OPTIONS = [
  { label: 'All types', value: '' },
  { label: 'Image', value: 'image' },
  { label: 'Video', value: 'video' },
  { label: 'Audio', value: 'audio' },
] as const;

export const FilterAssets: React.FC<FilterAssetsProps> = ({ onResults }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<'image' | 'video' | 'audio' | ''>('');
  const [tagInput, setTagInput] = useState('');
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasFilters = name.trim() !== '' || type !== '' || filterTags.length > 0;

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (!tag || filterTags.includes(tag)) return;
    setFilterTags((prev) => [...prev, tag]);
    setTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    setFilterTags((prev) => prev.filter((t) => t !== tag));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSearch = async () => {
    if (!hasFilters) return;
    try {
      setIsLoading(true);
      setError(null);
      const results = await apiClient.getAssets({
        name: name.trim() || undefined,
        type: type || undefined,
        tags: filterTags.length ? filterTags : undefined,
      });
      onResults(results);
    } catch {
      setError('Search failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setName('');
    setType('');
    setTagInput('');
    setFilterTags([]);
    setError(null);
    onResults(null);
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Filter Assets</h3>

      <div className="flex flex-wrap gap-3 items-end">
        {/* Name */}
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs text-gray-500 mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search by name..."
            className="w-full text-sm border border-gray-300 rounded px-3 py-1.5 focus:outline-none focus:border-blue-400"
          />
        </div>

        {/* Type */}
        <div className="min-w-[130px]">
          <label className="block text-xs text-gray-500 mb-1">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as typeof type)}
            className="w-full text-sm border border-gray-300 rounded px-3 py-1.5 focus:outline-none focus:border-blue-400"
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Tags */}
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs text-gray-500 mb-1">Tags</label>
          <div className="flex gap-1">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="Add tag filter..."
              className="flex-1 text-sm border border-gray-300 rounded px-3 py-1.5 focus:outline-none focus:border-blue-400"
            />
            <button
              type="button"
              onClick={handleAddTag}
              disabled={!tagInput.trim()}
              className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1.5 rounded disabled:opacity-50 transition-colors"
            >
              +
            </button>
          </div>
          {filterTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {filterTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-blue-600 leading-none"
                    aria-label={`Remove tag filter ${tag}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 self-end pb-0.5">
          <button
            type="button"
            onClick={handleSearch}
            disabled={isLoading || !hasFilters}
            className="text-sm bg-blue-500 hover:bg-blue-600 text-white px-4 py-1.5 rounded disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-1.5 rounded transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
};
