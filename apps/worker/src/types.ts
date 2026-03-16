export interface MediaMetadata {
  width?: number;
  height?: number;
  duration?: number;
  bitrate?: number;
  format?: string;
  codec?: string;
}

export interface TranscodePreset {
  resolution: string;
  bitrate: string;
  outputFormat: string;
}
