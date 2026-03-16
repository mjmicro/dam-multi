import React from 'react';
import { AssetItemProps } from './types';
import {
  STATUS_COLORS,
  SIZE_UNITS,
  KILOBYTE,
  IMAGE_MIME_PREFIX,
  VIDEO_MIME_PREFIX,
  AUDIO_MIME_PREFIX,
} from '../constants';
import { MINIO_ASSET_BASE_URL } from '../config';

export const AssetItem: React.FC<AssetItemProps> = ({ asset, onDelete, isDeleting }) => {
  const isImage = asset.mimeType.startsWith(IMAGE_MIME_PREFIX);
  const isVideo = asset.mimeType.startsWith(VIDEO_MIME_PREFIX);
  const isAudio = asset.mimeType.startsWith(AUDIO_MIME_PREFIX);

  const getThumbnailUrl = (): string | null => {
    if (asset.metadata?.thumbnail) {
      return MINIO_ASSET_BASE_URL + asset.metadata.thumbnail;
    }
    return null;
  };

  const getStatusColor = (status: string) => {
    return STATUS_COLORS[status.toUpperCase()] || 'bg-gray-100 text-gray-800';
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(KILOBYTE));
    return Math.round((bytes / Math.pow(KILOBYTE, i)) * 100) / 100 + ' ' + SIZE_UNITS[i];
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      {/* Thumbnail */}
      <div className="relative h-48 bg-gray-200 flex items-center justify-center overflow-hidden">
        {getThumbnailUrl() && (
          <img
            src={getThumbnailUrl() || ''}
            alt={asset.originalName}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )}
        {!getThumbnailUrl() && (
          <div className="text-4xl text-gray-400">
            {isImage ? 'Image' : isVideo ? 'Video' : isAudio ? 'Audio' : 'File'}
          </div>
        )}
        <span
          className={`absolute top-2 right-2 px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(
            asset.status,
          )}`}
        >
          {asset.status.toUpperCase()}
        </span>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 truncate mb-1">{asset.originalName}</h3>
        <p className="text-sm text-gray-600 mb-2">{formatSize(asset.size)}</p>

        {/* Metadata */}
        {asset.metadata && (
          <div className="text-xs text-gray-500 mb-2 space-y-1">
            {asset.metadata.width && asset.metadata.height && (
              <p>
                Resolution: {asset.metadata.width} × {asset.metadata.height}
              </p>
            )}
            {asset.metadata.duration && <p>Duration: {Math.round(asset.metadata.duration)}s</p>}
            {asset.metadata.transcoded && asset.metadata.transcoded.length > 0 && (
              <p>Resolutions: {asset.metadata.transcoded.map((t) => t.resolution).join(', ')}</p>
            )}
          </div>
        )}

        {/* Error message */}
        {asset.error && <p className="text-xs text-red-600 mb-2">Error: {asset.error}</p>}

        {/* Delete button */}
        <button
          onClick={() => onDelete(asset._id)}
          disabled={isDeleting}
          className="w-full mt-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white py-2 px-4 rounded transition-colors"
        >
          {isDeleting ? '🗑️ Deleting...' : '🗑️ Delete'}
        </button>
      </div>
    </div>
  );
};
