import * as fs from 'fs/promises';
import * as path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import sharp from 'sharp';
import * as Minio from 'minio';
import { DEFAULT_FFMPEG_PATH, DEFAULT_FFPROBE_PATH } from './mediaProcessor/constants';

// Configure FFmpeg - use system ffmpeg in Docker, fall back to static if available
try {
  // In Docker, ffmpeg is installed via apt-get, so set it explicitly
  ffmpeg.setFfmpegPath(DEFAULT_FFMPEG_PATH);
  ffmpeg.setFfprobePath(DEFAULT_FFPROBE_PATH);
} catch {
  // If system binaries don't exist, that's okay - ffmpeg will use PATH
  console.log('Note: Using PATH for ffmpeg/ffprobe discovery');
}

/**
 * Media file metadata
 */
import { MediaMetadata, TranscodePreset } from './types';
import {
  DEFAULT_TEMP_DIR,
  DEFAULT_TRANSCODE_PRESETS,
  DEFAULT_THUMBNAIL_WIDTH,
  DEFAULT_THUMBNAIL_HEIGHT,
  DEFAULT_VIDEO_THUMBNAIL_TIME,
} from './mediaProcessor/constants';
export class MediaProcessor {
  private minioClient: Minio.Client;
  private bucketName: string;
  private tempDir: string;

  constructor(minioClient: Minio.Client, bucketName: string, tempDir: string = DEFAULT_TEMP_DIR) {
    this.minioClient = minioClient;
    this.bucketName = bucketName;
    this.tempDir = tempDir;
  }

  /**
   * Ensure temp directory exists
   */
  async ensureTempDir(): Promise<void> {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch {
      console.warn('Temp directory already exists or error creating it');
    }
  }

  /**
   * Download file from MinIO
   */
  async downloadFromMinIO(objectName: string): Promise<string> {
    const localPath = path.join(this.tempDir, path.basename(objectName));
    const dataChunks: Buffer[] = [];

    return new Promise(async (resolve, reject) => {
      try {
        const dataStream = await this.minioClient.getObject(this.bucketName, objectName);

        dataStream.on('data', (chunk: Buffer) => dataChunks.push(chunk));
        dataStream.on('error', reject);
        dataStream.on('end', async () => {
          try {
            await fs.writeFile(localPath, Buffer.concat(dataChunks));
            resolve(localPath);
          } catch (e) {
            reject(e);
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Upload file to MinIO
   */
  async uploadToMinIO(localPath: string, objectName: string): Promise<void> {
    const fileContent = await fs.readFile(localPath);
    await this.minioClient.putObject(this.bucketName, objectName, fileContent, fileContent.length);
  }

  private getAssetTypeYearMonthFromObjectName(
    objectName: string,
    fallbackAssetType: 'audio' | 'image' | 'video',
  ): { assetType: 'audio' | 'image' | 'video'; year: string; month: string } {
    // Expected object key format:
    //   /{assetType}/{year}/{month}/{filename}
    const parts = objectName.split('/').filter(Boolean);
    if (parts.length >= 4) {
      const assetType = parts[0];
      const year = parts[1];
      const month = parts[2];

      if (
        (assetType === 'audio' || assetType === 'image' || assetType === 'video') &&
        /^\d{4}$/.test(year) &&
        /^\d{2}$/.test(month)
      ) {
        return { assetType, year, month };
      }
    }

    // Backwards-compatible fallback for older keys without year/month segments.
    const now = new Date();
    const year = String(now.getUTCFullYear());
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    return { assetType: fallbackAssetType, year, month };
  }

  /**
   * Extract metadata from image
   */
  async extractImageMetadata(filePath: string): Promise<MediaMetadata> {
    try {
      const metadata = await sharp(filePath).metadata();
      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      // Try to handle BMP and other formats by converting to PNG first
      if (errMsg && (errMsg.includes('unsupported') || errMsg.includes('BMP'))) {
        try {
          console.log('Attempting to convert image format using ffmpeg...');
          const ext = path.extname(filePath).toLowerCase();

          // Use ffmpeg to get image info
          return await new Promise((resolve) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ffmpeg.ffprobe(filePath, (err: any, metadata: any) => {
              if (err) {
                console.warn(
                  'Failed to extract image metadata via ffmpeg:',
                  err instanceof Error ? err.message : 'Unknown error',
                );
                return resolve({});
              }

              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const videoStream = metadata.streams?.find((s: any) => s.codec_type === 'video');
              if (videoStream) {
                resolve({
                  width: videoStream.width,
                  height: videoStream.height,
                  format: ext.substring(1).toLowerCase(),
                });
              } else {
                resolve({});
              }
            });
          });
        } catch (ffmpegErr: unknown) {
          console.warn('Failed to extract image metadata via ffmpeg:', ffmpegErr);
          return {};
        }
      }
      console.warn('Failed to extract image metadata:', errMsg);
      return {};
    }
  }

  /**
   * Extract metadata from video using ffmpeg
   */
  async extractVideoMetadata(filePath: string): Promise<MediaMetadata> {
    return new Promise((resolve) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ffmpeg.ffprobe(filePath, (err: any, metadata: any) => {
        if (err) {
          console.warn(
            'Failed to extract video metadata:',
            err instanceof Error ? err.message : 'Unknown error',
          );
          return resolve({});
        }

        const videoStream = metadata.streams?.find(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (s: any) => s.codec_type === 'video',
        );

        resolve({
          width: videoStream?.width,
          height: videoStream?.height,
          duration: Math.round(metadata.format?.duration || 0),
          bitrate: Math.round((metadata.format?.bit_rate || 0) / 1000),
          format: path.extname(filePath).substring(1),
          codec: videoStream?.codec_name,
        });
      });
    });
  }

  /**
   * Generate thumbnail from image
   */
  async generateImageThumbnail(
    inputPath: string,
    outputPath: string,
    width: number = DEFAULT_THUMBNAIL_WIDTH,
    height: number = DEFAULT_THUMBNAIL_HEIGHT,
  ): Promise<void> {
    try {
      await sharp(inputPath)
        .resize(width, height, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({ quality: 80 })
        .toFile(outputPath);
    } catch (err: unknown) {
      // If Sharp fails (e.g., BMP), try using ffmpeg
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      if (errMsg && errMsg.includes('unsupported')) {
        console.log('Sharp failed, attempting ffmpeg for thumbnail...');
        return new Promise<void>((resolve, reject) => {
          ffmpeg(inputPath)
            .on('error', reject)
            .on('end', () => resolve())
            .screenshots({
              timestamps: ['0'],
              filename: path.basename(outputPath),
              folder: path.dirname(outputPath),
              size: `${width}x${height}`,
            });
        });
      }
      throw err;
    }
  }

  /**
   * Generate thumbnail from video at specific timestamp
   */
  async generateVideoThumbnail(
    inputPath: string,
    outputPath: string,
    timemark: string = DEFAULT_VIDEO_THUMBNAIL_TIME,
    width: number = DEFAULT_THUMBNAIL_WIDTH,
    height: number = DEFAULT_THUMBNAIL_HEIGHT,
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .on('error', reject)
        .on('end', () => resolve())
        .screenshots({
          timestamps: [timemark],
          filename: path.basename(outputPath),
          folder: path.dirname(outputPath),
          size: `${width}x${height}`,
        });
    });
  }

  /**
   * Transcode video to multiple resolutions
   */
  async transcodeVideo(
    inputPath: string,
    outputDir: string,
    presets: TranscodePreset[] = DEFAULT_TRANSCODE_PRESETS,
  ): Promise<string[]> {
    const baseName = path.basename(inputPath, path.extname(inputPath));
    const outputFiles: string[] = [];

    // Create output directory
    await fs.mkdir(outputDir, { recursive: true });

    // Get video dimensions to only transcode valid resolutions
    const metadata = await this.extractVideoMetadata(inputPath);
    const maxHeight = metadata.height || 1080;

    // Define resolution mappings
    const resolutionMap: { [key: string]: { height: number; width: number } } = {
      '1080p': { height: 1080, width: 1920 },
      '720p': { height: 720, width: 1280 },
      '480p': { height: 480, width: 854 },
    };

    for (const preset of presets) {
      const heightFromResolution = parseInt(preset.resolution);

      // Skip transcoding if source is lower than preset
      if (heightFromResolution > maxHeight) {
        console.log(`Skipping ${preset.resolution} (source is ${maxHeight}p)`);
        continue;
      }

      const outputPath = path.join(
        outputDir,
        `${baseName}_${preset.resolution}.${preset.outputFormat}`,
      );

      // Get resolution dimensions
      const resDim = resolutionMap[preset.resolution] || {
        height: heightFromResolution,
        width: Math.round((heightFromResolution * 16) / 9),
      };
      const sizeStr = `${resDim.width}x${resDim.height}`;

      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .output(outputPath)
          .videoCodec('libx264')
          .audioCodec('aac')
          .videoBitrate(preset.bitrate)
          .audioBitrate('128k')
          .audioChannels(2)
          .audioFrequency(44100)
          .size(sizeStr)
          .on('error', reject)
          .on('end', () => {
            console.log(`Transcoded to ${preset.resolution}: ${outputPath}`);
            resolve();
          })
          .run();
      });

      outputFiles.push(outputPath);
    }

    return outputFiles;
  }

  /**
   * Process image: extract metadata and generate thumbnail
   */
  async processImage(
    assetId: string,
    objectName: string,
  ): Promise<{
    metadata: MediaMetadata;
    thumbnailPath: string;
  }> {
    console.log(`Processing image: ${objectName}`);

    const localPath = await this.downloadFromMinIO(objectName);
    const metadata = await this.extractImageMetadata(localPath);

    const { assetType, year, month } = this.getAssetTypeYearMonthFromObjectName(
      objectName,
      'image',
    );

    // Generate thumbnail
    const thumbnailFileName = `${assetId}_thumbnail.jpg`;
    const thumbnailPath = path.join(this.tempDir, thumbnailFileName);
    await this.generateImageThumbnail(localPath, thumbnailPath);

    // Upload thumbnail to MinIO
    const minioThumbnailPath = `${assetType}/${year}/${month}/${thumbnailFileName}`;
    await this.uploadToMinIO(thumbnailPath, minioThumbnailPath);

    console.log(`Image processed: ${JSON.stringify(metadata)}`);

    return {
      metadata,
      thumbnailPath: minioThumbnailPath,
    };
  }

  /**
   * Process video: extract metadata, generate thumbnail, and transcode
   */
  async processVideo(
    assetId: string,
    objectName: string,
  ): Promise<{
    metadata: MediaMetadata;
    thumbnailPath: string;
    transcodedFiles: Array<{ resolution: string; path: string }>;
  }> {
    console.log(`Processing video: ${objectName}`);

    const localPath = await this.downloadFromMinIO(objectName);
    const metadata = await this.extractVideoMetadata(localPath);

    const { assetType, year, month } = this.getAssetTypeYearMonthFromObjectName(
      objectName,
      'video',
    );

    // Generate thumbnail at 1 second mark
    const thumbnailFileName = `${assetId}_thumbnail.jpg`;
    const thumbnailPath = path.join(this.tempDir, thumbnailFileName);
    await this.generateVideoThumbnail(localPath, thumbnailPath);

    // Upload thumbnail to MinIO
    const minioThumbnailPath = `${assetType}/${year}/${month}/${thumbnailFileName}`;
    await this.uploadToMinIO(thumbnailPath, minioThumbnailPath);

    // Transcode video
    const transcodingDir = path.join(this.tempDir, assetId);
    const transcodedPaths = await this.transcodeVideo(localPath, transcodingDir);

    // Upload transcoded videos to MinIO
    const transcodedFiles: Array<{ resolution: string; path: string }> = [];
    for (const filePath of transcodedPaths) {
      const fileName = path.basename(filePath);
      const minionPath = `${assetType}/${year}/${month}/${fileName}`;
      await this.uploadToMinIO(filePath, minionPath);
      const resolutionMatch = fileName.match(/_(\d+p)\./);
      const resolution = resolutionMatch ? resolutionMatch[1] : 'unknown';
      transcodedFiles.push({
        resolution,
        path: minionPath,
      });
    }

    console.log(
      `Video processed: ${JSON.stringify(metadata)}, ${transcodedFiles.length} resolutions`,
    );

    return {
      metadata,
      thumbnailPath: minioThumbnailPath,
      transcodedFiles,
    };
  }

  /**
   * Cleanup temporary files
   */
  async cleanup(assetId: string): Promise<void> {
    try {
      const assetTempDir = path.join(this.tempDir, assetId);
      await fs.rm(assetTempDir, { recursive: true, force: true });
      console.log(`Cleaned up temporary files for ${assetId}`);
    } catch (err) {
      console.warn(`Failed to cleanup: ${err}`);
    }
  }
}
