import React from 'react';
import { Asset } from '../api';

interface AssetItemProps {
  asset: Asset;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

export const AssetItem: React.FC<AssetItemProps> = ({
  asset,
  onDelete,
  isDeleting,
}) => {
  const isImage = asset.mimeType.startsWith('image/');
  const isVideo = asset.mimeType.startsWith('video/');
  const isAudio = asset.mimeType.startsWith('audio/');

  const getThumbnailUrl = (): string | null => {
    if (asset.metadata?.thumbnail) {
      return `http://minio:9000/assets/${asset.metadata.thumbnail}`;
    }
    return null;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'PROCESSING':
        return 'bg-blue-100 text-blue-800';
      case 'PROCESSED':
        return 'bg-green-100 text-green-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      case 'PROCESSED_NO_FILE':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      {/* Thumbnail */}
      <div className="relative h-48 bg-gray-200 flex items-center justify-center overflow-hidden">
        {getThumbnailUrl() ? (
          <img
            src={getThumbnailUrl()!}
            alt={asset.originalName}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="text-4xl">
            {isImage ? '🖼️' : isVideo ? '🎬' : isAudio ? '🎵' : '📄'}
          </div>
        )}
        <span
          className={`absolute top-2 right-2 px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(
            asset.status
          )}`}
        >
          {asset.status}
        </span>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 truncate mb-1">
          {asset.originalName}
        </h3>
        <p className="text-sm text-gray-600 mb-2">
          {formatSize(asset.size)}
        </p>

        {/* Metadata */}
        {asset.metadata && (
          <div className="text-xs text-gray-500 mb-2 space-y-1">
            {asset.metadata.width && asset.metadata.height && (
              <p>
                Resolution: {asset.metadata.width} × {asset.metadata.height}
              </p>
            )}
            {asset.metadata.duration && (
              <p>Duration: {Math.round(asset.metadata.duration)}s</p>
            )}
            {asset.metadata.transcoded && asset.metadata.transcoded.length > 0 && (
              <p>Resolutions: {asset.metadata.transcoded.map(t => t.resolution).join(', ')}</p>
            )}
          </div>
        )}

        {/* Error message */}
        {asset.error && (
          <p className="text-xs text-red-600 mb-2">Error: {asset.error}</p>
        )}

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
