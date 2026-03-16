import React from 'react';
import {
  FILE_UPLOAD_BORDER_COLOR,
  FILE_UPLOAD_BG_COLOR,
  FILE_UPLOAD_BG_COLOR_HOVER,
  FILE_UPLOAD_BG_COLOR_LOADING,
  FILE_UPLOAD_BORDER_COLOR_LOADING,
} from '../constants/ui';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  isLoading: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFilesSelected, isLoading }) => {
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files);
    onFilesSelected(files);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      onFilesSelected(files);
    }
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
        isLoading
          ? `${FILE_UPLOAD_BG_COLOR_LOADING} ${FILE_UPLOAD_BORDER_COLOR_LOADING}`
          : `${FILE_UPLOAD_BORDER_COLOR} ${FILE_UPLOAD_BG_COLOR} ${FILE_UPLOAD_BG_COLOR_HOVER}`
      }`}
    >
      <input
        type="file"
        id="file-input"
        multiple
        onChange={handleChange}
        disabled={isLoading}
        className="hidden"
        accept="image/*,video/*,audio/*"
      />
      <label htmlFor="file-input" className="cursor-pointer">
        <p className="text-lg font-semibold text-gray-700 mb-2">
          {isLoading ? 'Uploading...' : 'Drag & drop files here'}
        </p>
        <p className="text-gray-500">or click to select files (Images, Videos, Audio)</p>
      </label>
    </div>
  );
};
