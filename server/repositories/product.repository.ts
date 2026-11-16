import { Db } from 'mongodb';
import { Product } from '../../src/types';

export class ProductRepository {
  constructor(private getDb: () => Db | null) {}

  private get collection() {
    const db = this.getDb();
    if (!db) throw new Error('Database not connected');
    return db.collection<Product>('products');
  }

  async getAll(filterUnavailable = false): Promise<Product[]> {
    const query = filterUnavailable ? { isAvailable: true } : {};
    return this.collection.find(query).sort({ displayOrder: 1 }).toArray();
  }

  async getById(id: string): Promise<Product | null> {
    return this.collection.findOne({ id });
  }

  async create(product: Product): Promise<Product> {
    await this.collection.insertOne(product);
    return product;
  }

  async update(id: string, updates: Partial<Product>): Promise<Product | null> {
    const res = await this.collection.findOneAndUpdate(
      { id },
      { $set: updates },
      { returnDocument: 'after' }
    );
    return res || null;
  }

  async delete(id: string): Promise<boolean> {
    const res = await this.collection.deleteOne({ id });
    return res.deletedCount === 1;
  }

  async search(query: string, category?: string): Promise<Product[]> {
    const filter: Record<string, unknown> = { isAvailable: true };

    if (category && category !== 'All Tools') {
      filter.category = { $regex: new RegExp(`^${category}$`, 'i') };
    }

    if (query) {
      filter.$or = [
        { name: { $regex: query, $options: 'i' } },
        { shortDescription: { $regex: query, $options: 'i' } },
        { category: { $regex: query, $options: 'i' } },
      ];
    }

    return this.collection.find(filter).sort({ displayOrder: 1 }).toArray();
  }

  async count(): Promise<number> {
    return this.collection.countDocuments();
  }

  async seedMany(products: Product[]): Promise<void> {
    for (const p of products) {
      await this.collection.updateOne(
        { id: p.id },
        { $setOnInsert: p },
        { upsert: true }
      );
    }
  }
}
