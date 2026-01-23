// // Minimal Mongoose helper for TypeScript consumers.
// // Exposes: `connect(url?)`, `getAssetModel()`, and a small `client` with `findAssets`/`createAsset`.
// import mongoose from 'mongoose';

// export type AssetDoc = any;

// const assetSchema = new mongoose.Schema({
// 	filename: String,
// 	originalName: String,
// 	mimeType: String,
// 	size: Number,
// 	providerPath: String,
// 	status: String,
// 	createdAt: { type: Date, default: Date.now },
// }, { collection: 'assets' });

// function getAssetModel() {
// 	return mongoose.models.Asset || mongoose.model('Asset', assetSchema);
// }

// export async function connect(url?: string) {
// 	const mongoUrl = url || process.env.DATABASE_URL || process.env.MONGO_URL || 'mongodb://mongo:27017/mediadb';
// 	return mongoose.connect(mongoUrl, { autoIndex: false });
// }

// export const client = {
// 	async findAssets(filter: any = {}) {
// 		const Asset = getAssetModel();
// 		return Asset.find(filter).lean().exec();
// 	},
// 	async createAsset(data: any) {
// 		const Asset = getAssetModel();
// 		const doc = await Asset.create(data);
// 		return doc.toObject();
// 	},
// 	async disconnect() {
// 		return mongoose.disconnect();
// 	}
// };

// export { getAssetModel };

import mongoose from 'mongoose';

// Professional helper with connection checking
export const connectDB = async (uri: string) => {
  try {
    console.log(`Connecting to MongoDB: ${uri}`);
    console.log(`Initial readyState: ${mongoose.connection.readyState}`);
    
    const connection = await mongoose.connect(uri, {
      // Minimal pooling
      maxPoolSize: 1,
      minPoolSize: 0,
      
      // Timeouts
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 120000,
      connectTimeoutMS: 30000,
      family: 4,
      
      // Retries
      retryWrites: true,
      retryReads: true,
      
      // Buffering
      bufferCommands: false,  // DISABLE buffering - require immediate connection!
      
      keepAlive: true,
      keepAliveInitialDelayMS: 10000,
    });
    
    console.log(`After mongoose.connect() - readyState: ${mongoose.connection.readyState}`);
    
    // Verify connection is truly ready
    const readyState = mongoose.connection.readyState;
    if (readyState !== 1) {
      throw new Error(`Connection not ready! readyState: ${readyState} (expected 1)`);
    }
    
    console.log('✅ MongoDB connection verified - readyState = 1 (CONNECTED)');
    return connection;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    throw error;
  }
};