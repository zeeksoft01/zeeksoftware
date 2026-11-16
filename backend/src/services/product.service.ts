import { Product } from '../types';
import { ProductModel, SiteSettingsModel } from '../models';
import { requireDatabaseConnection } from '../config/database';
import { auditService } from './audit.service';
import { uploadService } from './upload.service';

export const productService = {
  async getProducts(options?: {
    onlyAvailable?: boolean;
    category?: string;
    search?: string;
  }): Promise<Product[]> {
    requireDatabaseConnection();
    const onlyAvailable = options?.onlyAvailable ?? false;
    const category = options?.category?.trim();
    const search = options?.search?.trim().toLowerCase();

    const filter: Record<string, unknown> = {};
    if (onlyAvailable) filter.isAvailable = true;
    const docs = await ProductModel.find(filter).sort({ displayOrder: 1, name: 1 }).lean();
    let products: Product[] = docs.map(({ _id, ...rest }) => rest as Product);

    if (category && category !== 'All Tools') {
      products = products.filter((p) => p.category.toLowerCase() === category.toLowerCase());
    }

    if (search) {
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(search) ||
          p.shortDescription.toLowerCase().includes(search) ||
          p.category.toLowerCase().includes(search)
      );
    }

    return products;
  },

  async getProductById(idOrSlug: string): Promise<Product | null> {
    requireDatabaseConnection();
    const raw = (idOrSlug || '').trim();
    if (!raw) return null;

    const doc = await ProductModel.findOne({
      $or: [{ id: raw }, { id: `prod-${raw}` }],
    }).lean();
    if (doc) {
      const { _id, ...rest } = doc;
      return rest as Product;
    }

    // Fallback: match deterministic slug generated from name + duration + id
    const allDocs = await ProductModel.find().lean();
    const normalize = (value: string) =>
      value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    const target = normalize(raw);
    const matched = allDocs.find((p) => {
      const idSlug = normalize(p.id.replace(/^prod-/, ''));
      const nameDurationSlug = normalize(`${p.name}-${p.duration}`);
      const fullSlug = `${nameDurationSlug}-${p.id}`;
      return idSlug === target || nameDurationSlug === target || normalize(fullSlug) === target;
    });
    if (!matched) return null;
    const { _id, ...rest } = matched;
    return rest as Product;
  },

  async createProduct(
    input: Omit<Product, 'id'> & {
      imageBase64?: string;
      commissionRateOverride?: number | null;
      usdPrice?: number | null;
    }
  ): Promise<Product> {
    requireDatabaseConnection();
    const id = `prod-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const { imageBase64, commissionRateOverride, usdPrice, ...productFields } = input;

    const resolvedImage = await uploadService.resolveCloudinaryImageUrl(
      imageBase64 || productFields.image || '',
      { fileName: productFields.name, folder: 'products' }
    );

    const settingsDoc = await SiteSettingsModel.findOne({ key: 'site_settings' }).lean();
    const activeUsdRate = settingsDoc?.usdNgnRate || settingsDoc?.usdtNgnRate || 1550;
    const priceSourceCurrency = productFields.priceSourceCurrency === 'USD' ? 'USD' : 'NGN';

    let computedPrice = productFields.price;
    if (priceSourceCurrency === 'USD' && typeof usdPrice === 'number' && usdPrice > 0) {
      computedPrice = Math.round(usdPrice * activeUsdRate);
    }

    const count = await ProductModel.countDocuments();
    const newProduct: Product = {
      ...productFields,
      price: computedPrice,
      priceSourceCurrency,
      ...(typeof usdPrice === 'number' && usdPrice > 0 ? { usdPrice } : {}),
      ...(typeof commissionRateOverride === 'number'
        ? { commissionRateOverride }
        : {}),
      image: resolvedImage,
      detailedDescription: productFields.detailedDescription?.trim() || productFields.shortDescription,
      id,
      displayOrder: productFields.displayOrder ?? count + 1,
    };

    await ProductModel.create(newProduct);

    if (typeof commissionRateOverride === 'number') {
      await SiteSettingsModel.updateOne(
        { key: 'site_settings' },
        { $set: { [`productCommissionRates.${id}`]: commissionRateOverride } }
      );
    }

    await auditService.addLog('Add Product', `Added product: ${newProduct.name} (${newProduct.duration})`);
    return newProduct;
  },

  async updateProduct(
    id: string,
    updates: Partial<Omit<Product, 'commissionRateOverride' | 'usdPrice'>> & {
      imageBase64?: string;
      commissionRateOverride?: number | null;
      usdPrice?: number | null;
    }
  ): Promise<Product | null> {
    requireDatabaseConnection();
    const existing = await this.getProductById(id);
    if (!existing) return null;

    const { imageBase64, commissionRateOverride, usdPrice, ...restUpdates } = updates;
    const setPayload: Record<string, unknown> = { ...restUpdates };
    const unsetPayload: Record<string, 1> = {};

    if (imageBase64 || restUpdates.image) {
      setPayload.image = await uploadService.resolveCloudinaryImageUrl(
        imageBase64 || restUpdates.image || '',
        { fileName: restUpdates.name || id, folder: 'products' }
      );
    }

    const nextCurrency =
      restUpdates.priceSourceCurrency ?? existing.priceSourceCurrency ?? 'NGN';
    const nextUsdPrice =
      usdPrice !== undefined ? usdPrice : existing.usdPrice;

    if (nextCurrency === 'USD' && typeof nextUsdPrice === 'number' && nextUsdPrice > 0) {
      const settingsDoc = await SiteSettingsModel.findOne({ key: 'site_settings' }).lean();
      const activeUsdRate = settingsDoc?.usdNgnRate || settingsDoc?.usdtNgnRate || 1550;
      setPayload.priceSourceCurrency = 'USD';
      setPayload.usdPrice = nextUsdPrice;
      setPayload.price = Math.round(nextUsdPrice * activeUsdRate);
    } else if (restUpdates.priceSourceCurrency === 'NGN') {
      setPayload.priceSourceCurrency = 'NGN';
      if (usdPrice === null) {
        unsetPayload.usdPrice = 1;
      }
    } else if (typeof usdPrice === 'number' && usdPrice > 0) {
      setPayload.usdPrice = usdPrice;
    } else if (usdPrice === null) {
      unsetPayload.usdPrice = 1;
    }

    if (commissionRateOverride === null) {
      unsetPayload.commissionRateOverride = 1;
      await SiteSettingsModel.updateOne(
        { key: 'site_settings' },
        { $unset: { [`productCommissionRates.${id}`]: 1 } }
      );
    } else if (typeof commissionRateOverride === 'number' && !Number.isNaN(commissionRateOverride)) {
      setPayload.commissionRateOverride = commissionRateOverride;
      await SiteSettingsModel.updateOne(
        { key: 'site_settings' },
        { $set: { [`productCommissionRates.${id}`]: commissionRateOverride } }
      );
    }

    const updateOp: Record<string, unknown> = { $set: setPayload };
    if (Object.keys(unsetPayload).length > 0) {
      updateOp.$unset = unsetPayload;
    }

    const updated = await ProductModel.findOneAndUpdate(
      { id },
      updateOp,
      { new: true, runValidators: true }
    ).lean();
    if (!updated) return null;
    const { _id, ...rest } = updated;
    await auditService.addLog('Update Product', `Updated product ${(rest as Product).name}`);
    return rest as Product;
  },

  async uploadProductImage(id: string, imageBase64: string, fileName?: string) {
    requireDatabaseConnection();
    const existing = await this.getProductById(id);
    if (!existing) return null;

    const upload = await uploadService.uploadToCloudinary(
      imageBase64,
      fileName || existing.name,
      'products'
    );

    const updated = await ProductModel.findOneAndUpdate(
      { id },
      { $set: { image: upload.url } },
      { new: true, runValidators: true }
    ).lean();
    if (!updated) return null;
    const { _id, ...rest } = updated;

    await auditService.addLog(
      'Upload Product Image',
      `Uploaded Cloudinary image for product ${(rest as Product).name}`
    );

    return {
      product: rest as Product,
      upload,
    };
  },

  async deleteProduct(id: string): Promise<boolean> {
    requireDatabaseConnection();
    const deleted = await ProductModel.findOneAndDelete({ id }).lean();
    if (!deleted) return false;
    await auditService.addLog('Delete Product', `Deleted product: ${deleted.name}`);
    return true;
  },
};
