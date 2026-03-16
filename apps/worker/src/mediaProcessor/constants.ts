// Default directories and file paths
// Default directories and file paths
export const DEFAULT_TEMP_DIR = '/tmp/dam-processing';
export const DEFAULT_FFMPEG_PATH = '/usr/bin/ffmpeg';
export const DEFAULT_FFPROBE_PATH = '/usr/bin/ffprobe';

// Video transcoding presets
export const DEFAULT_TRANSCODE_PRESETS = [
  { resolution: '1080p', bitrate: '5000k', outputFormat: 'mp4' },
  { resolution: '720p', bitrate: '2500k', outputFormat: 'mp4' },
  { resolution: '480p', bitrate: '1000k', outputFormat: 'mp4' },
];

// Thumbnail defaults
export const DEFAULT_THUMBNAIL_WIDTH = 200;
export const DEFAULT_THUMBNAIL_HEIGHT = 200;
export const DEFAULT_VIDEO_THUMBNAIL_TIME = '00:00:01';

// MinIO paths
export const THUMBNAIL_PREFIX = 'thumbnails/';
export const VIDEO_PREFIX = 'videos/';
