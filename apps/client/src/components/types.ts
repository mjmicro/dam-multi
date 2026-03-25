import { Asset } from '../api';

export interface AssetItemProps {
  asset: Asset;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

export interface AssetGridProps {
  assets: Asset[];
  onDelete: (id: string) => void;
  isDeletingId: string | null;
  isLoading: boolean;
}

export interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  isLoading: boolean;
}

export interface TagsProps {
  assetId: string;
  tags: string[];
  onTagsChange: (updatedTags: string[]) => void;
}

export interface FilterAssetsProps {
  onResults: (assets: Asset[] | null) => void;
}
