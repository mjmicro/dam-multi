import * as fs from 'fs/promises';
import * as path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import sharp from 'sharp';
import * as Minio from 'minio';
import { AssetStatus, IThumbnail } from '@dam/database';

// Configure FFmpeg - use system ffmpeg in Docker, fall back to static if available
try {
  // In Docker, ffmpeg is installed via apt-get, so set it explicitly
  ffmpeg.setFfmpegPath('/usr/bin/ffmpeg');
  ffmpeg.setFfprobePath('/usr/bin/ffprobe');
} catch (err) {
  // If system binaries don't exist, that's okay - ffmpeg will use PATH
  console.log('Note: Using PATH for ffmpeg/ffprobe discovery');
}

/**
 * Media file metadata
 */
export interface MediaMetadata {
  width?: number;
  height?: number;
  duration?: number;
  bitrate?: number;
  format?: string;
  codec?: string;
}

/**
 * Transcoding quality preset
 */
export interface TranscodePreset {
  resolution: string;
  bitrate: string;
  outputFormat: string;
}

/**
 * Media processor class handles image and video processing
 */
export class MediaProcessor {
  private minioClient: Minio.Client;
  private bucketName: string;
  private tempDir: string;

  constructor(
    minioClient: Minio.Client,
    bucketName: string,
    tempDir: string = '/tmp/dam-processing'
  ) {
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
    } catch (err) {
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
        const dataStream = await this.minioClient.getObject(
          this.bucketName,
          objectName
        );

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
    await this.minioClient.putObject(
      this.bucketName,
      objectName,
      fileContent,
      fileContent.length
    );
  }

  /**
   * Extract metadata from image
   */
  async extractImageMetadata(filePath: string): Promise<MediaMetadata> {
    try {
      let metadata = await sharp(filePath).metadata();
      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
      };
    } catch (err: any) {
      // Try to handle BMP and other formats by converting to PNG first
      if (err.message && (err.message.includes('unsupported') || err.message.includes('BMP'))) {
        try {
          console.log('Attempting to convert image format using ffmpeg...');
          const ext = path.extname(filePath).toLowerCase();
          
          // Use ffmpeg to get image info
          return new Promise((resolve) => {
            ffmpeg.ffprobe(filePath, (err: any, metadata: any) => {
              if (err) {
                console.warn('Failed to extract image metadata via ffmpeg:', err.message);
                return resolve({});
              }
              
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
        } catch (ffmpegErr) {
          console.warn('Failed to extract image metadata via ffmpeg:', ffmpegErr);
          return {};
        }
      }
      console.warn('Failed to extract image metadata:', err);
      return {};
    }
  }

  /**
   * Extract metadata from video using ffmpeg
   */
  async extractVideoMetadata(filePath: string): Promise<MediaMetadata> {
    return new Promise((resolve) => {
      ffmpeg.ffprobe(filePath, (err: any, metadata: any) => {
        if (err) {
          console.warn('Failed to extract video metadata:', err.message);
          return resolve({});
        }

        const videoStream = metadata.streams?.find(
          (s: any) => s.codec_type === 'video'
        );
        const audioStream = metadata.streams?.find(
          (s: any) => s.codec_type === 'audio'
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
    width: number = 200,
    height: number = 200
  ): Promise<void> {
    try {
      await sharp(inputPath)
        .resize(width, height, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({ quality: 80 })
        .toFile(outputPath);
    } catch (err: any) {
      // If Sharp fails (e.g., BMP), try using ffmpeg
      if (err.message && err.message.includes('unsupported')) {
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
    timemark: string = '00:00:01',
    width: number = 200,
    height: number = 200
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
    presets: TranscodePreset[] = [
      {
        resolution: '1080p',
        bitrate: '5000k',
        outputFormat: 'mp4',
      },
      {
        resolution: '720p',
        bitrate: '2500k',
        outputFormat: 'mp4',
      },
      {
        resolution: '480p',
        bitrate: '1000k',
        outputFormat: 'mp4',
      },
    ]
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
        console.log(
          `⏭️  Skipping ${preset.resolution} (source is ${maxHeight}p)`
        );
        continue;
      }

      const outputPath = path.join(
        outputDir,
        `${baseName}_${preset.resolution}.${preset.outputFormat}`
      );

      // Get resolution dimensions
      const resDim = resolutionMap[preset.resolution] || { height: heightFromResolution, width: Math.round(heightFromResolution * 16 / 9) };
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
            console.log(`✅ Transcoded to ${preset.resolution}: ${outputPath}`);
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
    objectName: string
  ): Promise<{
    metadata: MediaMetadata;
    thumbnailPath: string;
  }> {
    console.log(`🖼️  Processing image: ${objectName}`);

    const localPath = await this.downloadFromMinIO(objectName);
    const metadata = await this.extractImageMetadata(localPath);

    // Generate thumbnail
    const thumbnailFileName = `${assetId}_thumbnail.jpg`;
    const thumbnailPath = path.join(this.tempDir, thumbnailFileName);
    await this.generateImageThumbnail(localPath, thumbnailPath);

    // Upload thumbnail to MinIO
    const minioThumbnailPath = `thumbnails/${thumbnailFileName}`;
    await this.uploadToMinIO(thumbnailPath, minioThumbnailPath);

    console.log(`✅ Image processed: ${JSON.stringify(metadata)}`);

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
    objectName: string
  ): Promise<{
    metadata: MediaMetadata;
    thumbnailPath: string;
    transcodedFiles: Array<{ resolution: string; path: string }>;
  }> {
    console.log(`🎬 Processing video: ${objectName}`);

    const localPath = await this.downloadFromMinIO(objectName);
    const metadata = await this.extractVideoMetadata(localPath);

    // Generate thumbnail at 1 second mark
    const thumbnailFileName = `${assetId}_thumbnail.jpg`;
    const thumbnailPath = path.join(this.tempDir, thumbnailFileName);
    await this.generateVideoThumbnail(localPath, thumbnailPath);

    // Upload thumbnail to MinIO
    const minioThumbnailPath = `thumbnails/${thumbnailFileName}`;
    await this.uploadToMinIO(thumbnailPath, minioThumbnailPath);

    // Transcode video
    const transcodingDir = path.join(this.tempDir, assetId);
    const transcodedPaths = await this.transcodeVideo(localPath, transcodingDir);

    // Upload transcoded videos to MinIO
    const transcodedFiles: Array<{ resolution: string; path: string }> = [];
    for (const filePath of transcodedPaths) {
      const fileName = path.basename(filePath);
      const minionPath = `videos/${fileName}`;
      await this.uploadToMinIO(filePath, minionPath);
      const resolutionMatch = fileName.match(/_(\d+p)\./);
      const resolution = resolutionMatch ? resolutionMatch[1] : 'unknown';
      transcodedFiles.push({
        resolution,
        path: minionPath,
      });
    }

    console.log(
      `✅ Video processed: ${JSON.stringify(metadata)}, ${transcodedFiles.length} resolutions`
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
      console.log(`🧹 Cleaned up temporary files for ${assetId}`);
    } catch (err) {
      console.warn(`Failed to cleanup: ${err}`);
    }
  }
}
