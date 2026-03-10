import React, { useEffect, useState } from 'react';
import { apiClient, Asset } from './api';
import { FileUpload } from './components/FileUpload';
import { AssetGrid } from './components/AssetGrid';
import './index.css';

export const App: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);

  // Load assets on mount and polling
  useEffect(() => {
    loadAssets();
    const interval = setInterval(loadAssets, 3000); // Poll every 3 seconds
    return () => clearInterval(interval);
  }, []);

  const loadAssets = async () => {
    try {
      setIsLoadingAssets(true);
      const data = await apiClient.getAssets();
      setAssets(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setError(null);
    } catch (err) {
      console.error('Failed to load assets:', err);
      setError('Failed to load assets');
    } finally {
      setIsLoadingAssets(false);
    }
  };

  const handleFilesSelected = async (files: File[]) => {
    try {
      setIsUploading(true);
      setError(null);
      const results = await apiClient.uploadFiles(files);
      setUploadedFiles(results.map(r => r.assetId));
      await loadAssets(); // Refresh immediately after upload
    } catch (err) {
      console.error('Upload failed:', err);
      setError('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteAsset = async (id: string) => {
    if (!confirm('Are you sure you want to delete this asset?')) {
      return;
    }

    try {
      setIsDeletingId(id);
      await apiClient.deleteAsset(id);
      await loadAssets();
    } catch (err) {
      console.error('Delete failed:', err);
      setError('Failed to delete asset');
    } finally {
      setIsDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Digital Asset Manager</h1>
          <p className="text-gray-600 mt-2">
            Upload, process, and manage your media files
          </p>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error message */}
        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
            <button
              onClick={() => setError(null)}
              className="float-right font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* Upload section */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Upload Files</h2>
          <FileUpload onFilesSelected={handleFilesSelected} isLoading={isUploading} />
          {uploadedFiles.length > 0 && (
            <p className="text-green-600 mt-2">
              {uploadedFiles.length} file(s) uploaded successfully
            </p>
          )}
        </section>

        {/* Stats section */}
        <section className="mb-10 bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-gray-600">Total Assets</p>
              <p className="text-3xl font-bold text-blue-600">{assets.length}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-gray-600">Processed</p>
              <p className="text-3xl font-bold text-green-600">
                {assets.filter(a => a.status === 'PROCESSED').length}
              </p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-gray-600">Processing</p>
              <p className="text-3xl font-bold text-yellow-600">
                {assets.filter(a => a.status === 'PROCESSING' || a.status === 'PENDING').length}
              </p>
            </div>
          </div>
        </section>

        {/* Assets grid section */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Assets</h2>
          <AssetGrid
            assets={assets}
            onDelete={handleDeleteAsset}
            isDeletingId={isDeletingId}
            isLoading={isLoadingAssets}
          />
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-gray-600">
          <p>Digital Asset Manager v1.0.0</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
