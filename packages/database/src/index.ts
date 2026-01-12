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

// Export models
export * from './models/Asset';

// Export types and interfaces
export * from './types/index';

// Professional helper to ensure we don't open multiple connections
export const connectDB = async (uri: string) => {
  if (mongoose.connection.readyState >= 1) return;
  return mongoose.connect(uri);
};