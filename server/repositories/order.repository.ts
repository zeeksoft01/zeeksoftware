import { Db } from 'mongodb';
import { Order } from '../../src/types';

export class OrderRepository {
  constructor(private getDb: () => Db | null) {}

  private get collection() {
    const db = this.getDb();
    if (!db) throw new Error('Database not connected');
    return db.collection<Order>('orders');
  }

  async getAll(): Promise<Order[]> {
    return this.collection.find({}).sort({ createdAt: -1 }).toArray();
  }

  async getById(id: string): Promise<Order | null> {
    return this.collection.findOne({
      $or: [{ id }, { paymentReference: id }],
    });
  }

  async create(order: Order): Promise<Order> {
    // If order has paymentReference, ensure idempotency
    if (order.paymentReference) {
      const existing = await this.collection.findOne({ paymentReference: order.paymentReference });
      if (existing) {
        return existing;
      }
    }

    await this.collection.insertOne(order);
    return order;
  }

  async update(id: string, updates: Partial<Order>): Promise<Order | null> {
    const res = await this.collection.findOneAndUpdate(
      { id },
      {
        $set: {
          ...updates,
          updatedAt: new Date().toISOString(),
        },
      },
      { returnDocument: 'after' }
    );
    return res || null;
  }

  async lookup(query: string): Promise<Order[]> {
    const q = query.trim();
    if (!q) return [];

    const digitsOnly = q.replace(/\D/g, '');

    return this.collection
      .find({
        $or: [
          { id: { $regex: q, $options: 'i' } },
          { customerEmail: { $regex: `^${q}$`, $options: 'i' } },
          { paymentReference: { $regex: `^${q}$`, $options: 'i' } },
          ...(digitsOnly ? [{ customerWhatsApp: { $regex: digitsOnly } }] : []),
        ],
      })
      .sort({ createdAt: -1 })
      .toArray();
  }

  async count(): Promise<number> {
    return this.collection.countDocuments();
  }

  async seedMany(orders: Order[]): Promise<void> {
    for (const ord of orders) {
      await this.collection.updateOne(
        { id: ord.id },
        { $setOnInsert: ord },
        { upsert: true }
      );
    }
  }

  /**
   * MongoDB Aggregation Pipeline for High-Performance Admin Analytics
   */
  async getAnalyticsSummary(): Promise<{
    totalRevenue: number;
    totalOrders: number;
    paidOrders: number;
    pendingOrders: number;
    topProducts: Array<{ name: string; count: number; revenue: number }>;
    salesByDay: Array<{ date: string; revenue: number; orders: number }>;
  }> {
    const db = this.getDb();
    if (!db) {
      return {
        totalRevenue: 0,
        totalOrders: 0,
        paidOrders: 0,
        pendingOrders: 0,
        topProducts: [],
        salesByDay: [],
      };
    }

    const col = this.collection;

    // 1. Overall stats
    const [overall] = await col
      .aggregate<{
        totalOrders: number;
        paidOrders: number;
        pendingOrders: number;
        totalRevenue: number;
      }>([
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            paidOrders: {
              $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0] },
            },
            pendingOrders: {
              $sum: { $cond: [{ $eq: ['$paymentStatus', 'pending'] }, 1, 0] },
            },
            totalRevenue: {
              $sum: {
                $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$totalAmount', 0],
              },
            },
          },
        },
      ])
      .toArray();

    // 2. Top Products Pipeline
    const topProducts = await col
      .aggregate<{ name: string; count: number; revenue: number }>([
        { $match: { paymentStatus: 'paid' } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.productName',
            count: { $sum: '$items.quantity' },
            revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          },
        },
        { $project: { _id: 0, name: '$_id', count: 1, revenue: 1 } },
        { $sort: { revenue: -1 } },
        { $limit: 8 },
      ])
      .toArray();

    // 3. Sales By Day Pipeline
    const salesByDay = await col
      .aggregate<{ date: string; revenue: number; orders: number }>([
        { $match: { paymentStatus: 'paid' } },
        {
          $group: {
            _id: { $substr: ['$createdAt', 0, 10] },
            revenue: { $sum: '$totalAmount' },
            orders: { $sum: 1 },
          },
        },
        { $project: { _id: 0, date: '$_id', revenue: 1, orders: 1 } },
        { $sort: { date: -1 } },
        { $limit: 14 },
      ])
      .toArray();

    return {
      totalRevenue: overall?.totalRevenue || 0,
      totalOrders: overall?.totalOrders || 0,
      paidOrders: overall?.paidOrders || 0,
      pendingOrders: overall?.pendingOrders || 0,
      topProducts,
      salesByDay,
    };
  }
}
