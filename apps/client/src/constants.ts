// Centralized constants for the client app
// Add UI, polling, and other shared constants here

export const POLL_INTERVAL_MS = 3000;
export const SIZE_UNITS = ['Bytes', 'KB', 'MB', 'GB'];
export const KILOBYTE = 1024;
export const STATUS_COLORS: Record<string, string> = {
  PROCESSED: 'bg-green-500 text-white', // green-500
  PROCESSING: 'bg-orange-400 text-white', // orange-400
  PENDING: 'bg-yellow-400 text-gray-800', // yellow-400
  FAILED: 'bg-red-500 text-white', // red-500
};
export const IMAGE_MIME_PREFIX = 'image/';
export const VIDEO_MIME_PREFIX = 'video/';
export const AUDIO_MIME_PREFIX = 'audio/';
