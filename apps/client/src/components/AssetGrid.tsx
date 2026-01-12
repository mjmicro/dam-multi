import React from 'react';
import { Asset } from '../api';
import { AssetItem } from './AssetItem';

interface AssetGridProps {
  assets: Asset[];
  onDelete: (id: string) => void;
  isDeletingId: string | null;
  isLoading: boolean;
}

export const AssetGrid: React.FC<AssetGridProps> = ({
  assets,
  onDelete,
  isDeletingId,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No assets yet. Upload some files to get started!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {assets.map((asset) => (
        <AssetItem
          key={asset._id}
          asset={asset}
          onDelete={onDelete}
          isDeleting={isDeletingId === asset._id}
        />
      ))}
    </div>
  );
};
