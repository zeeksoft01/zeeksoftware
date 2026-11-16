import React, { useEffect, useState } from 'react';
import {
  CheckCircle,
  Download,
  ExternalLink,
  FileArchive,
  Link as LinkIcon,
  Lock,
  MessageCircle,
  Package,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  Unlock,
  Upload,
  Eye,
  BarChart3,
  Loader2,
  X,
} from 'lucide-react';
import {
  DestinationType,
  DigitalAsset,
  PostPaymentConfig,
  Product,
  ProductDeliveryConfig,
  ProductDeliveryRecord,
  SiteSettings,
} from '../../types';
import { api } from '../../api/client';

type DeliverySubSection =
  | 'default_destination'
  | 'whatsapp_settings'
  | 'custom_links'
  | 'digital_uploads'
  | 'product_delivery'
  | 'download_records'
  | 'delivery_reports';

interface ProductDeliveryAdminProps {
  token: string;
  settings: SiteSettings;
  setSettings: React.Dispatch<React.SetStateAction<SiteSettings | null>>;
  products: Product[];
  onRefreshPublicData: () => void;
  loadAdminData: () => Promise<void>;
  setSaveSuccessMsg: (msg: string) => void;
  setSaveErrorMsg: (msg: string) => void;
}

const VARIABLE_CHIPS = ['{{orderId}}', '{{productName}}', '{{amount}}', '{{customerName}}'];

export const ProductDeliveryAdmin: React.FC<ProductDeliveryAdminProps> = ({
  token,
  settings,
  setSettings,
  products,
  onRefreshPublicData,
  loadAdminData,
  setSaveSuccessMsg,
  setSaveErrorMsg,
}) => {
  const [subSection, setSubSection] = useState<DeliverySubSection>('default_destination');
  const [loading, setLoading] = useState(false);

  // Global Post-Payment Config
  const [postConfig, setPostConfig] = useState<PostPaymentConfig>({
    defaultDestinationType: settings.postPaymentConfig?.defaultDestinationType || 'whatsapp',
    whatsappNumber: settings.postPaymentConfig?.whatsappNumber || '',
    whatsappMessageTemplate:
      settings.postPaymentConfig?.whatsappMessageTemplate ||
      'Hello Zeek Softwares, my payment for Order {{orderId}} ({{productName}} — {{amount}}) has been verified. Please activate my plan for {{customerName}}.',
    customRedirectUrl: settings.postPaymentConfig?.customRedirectUrl || '',
    downloadPageHeadline:
      settings.postPaymentConfig?.downloadPageHeadline || 'Your Order is Verified & Ready!',
    downloadPageInstructions:
      settings.postPaymentConfig?.downloadPageInstructions ||
      'Access your purchased software or activation link below. Keep your Order ID safe for support.',
  });

  // Preview Tester state
  const [previewProductId, setPreviewProductId] = useState<string>(products[0]?.id || '');
  const [previewResult, setPreviewResult] = useState<{
    destinationType: DestinationType;
    destinationUrl: string;
    whatsappMessage?: string;
    digitalFileName?: string;
  } | null>(null);

  // Digital Assets Upload & Library state
  const [assets, setAssets] = useState<DigitalAsset[]>([]);
  const [assetTitle, setAssetTitle] = useState('');
  const [assetFile, setAssetFile] = useState<File | null>(null);
  const [uploadingAsset, setUploadingAsset] = useState(false);
  const [deletingAssetId, setDeletingAssetId] = useState<string | null>(null);

  // Per-Product Delivery Overrides state
  const [productSearch, setProductSearch] = useState('');
  const [productDrafts, setProductDrafts] = useState<Record<string, ProductDeliveryConfig>>({});
  const [savingProductId, setSavingProductId] = useState<string | null>(null);

  // Customer Download Records state
  const [records, setRecords] = useState<ProductDeliveryRecord[]>([]);
  const [recordSearch, setRecordSearch] = useState('');
  const [recordStatusFilter, setRecordStatusFilter] = useState('all');
  const [recordDestFilter, setRecordDestFilter] = useState('all');

  // Delivery Reports state
  const [reports, setReports] = useState<Awaited<ReturnType<typeof api.getDeliveryReports>> | null>(null);

  useEffect(() => {
    const initialDrafts: Record<string, ProductDeliveryConfig> = {};
    for (const p of products) {
      initialDrafts[p.id] = {
        destinationType: p.deliveryConfig?.destinationType || 'default',
        digitalAssetId: p.deliveryConfig?.digitalAssetId || '',
        customRedirectUrl: p.deliveryConfig?.customRedirectUrl || '',
        whatsappNumber: p.deliveryConfig?.whatsappNumber || '',
        whatsappMessageTemplate: p.deliveryConfig?.whatsappMessageTemplate || '',
      };
    }
    setProductDrafts(initialDrafts);
  }, [products]);

  const loadAssets = async () => {
    setLoading(true);
    try {
      const list = await api.getDigitalAssets(token);
      setAssets(list);
    } catch (err: unknown) {
      setSaveErrorMsg(err instanceof Error ? err.message : 'Failed to load digital assets.');
    } finally {
      setLoading(false);
    }
  };

  const loadRecords = async () => {
    setLoading(true);
    try {
      const list = await api.getDeliveryRecords(token, {
        search: recordSearch.trim() || undefined,
        status: recordStatusFilter !== 'all' ? recordStatusFilter : undefined,
        destinationType: recordDestFilter !== 'all' ? recordDestFilter : undefined,
      });
      setRecords(list);
    } catch (err: unknown) {
      setSaveErrorMsg(err instanceof Error ? err.message : 'Failed to load download records.');
    } finally {
      setLoading(false);
    }
  };

  const loadReports = async () => {
    setLoading(true);
    try {
      const res = await api.getDeliveryReports(token);
      setReports(res);
    } catch (err: unknown) {
      setSaveErrorMsg(err instanceof Error ? err.message : 'Failed to load delivery reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (subSection === 'digital_uploads' || subSection === 'product_delivery') {
      loadAssets();
    } else if (subSection === 'download_records') {
      loadRecords();
    } else if (subSection === 'delivery_reports') {
      loadReports();
    }
  }, [subSection]);

  const handleSaveGlobalPostConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setSaveErrorMsg('');
    try {
      const updated = await api.updateSettings(token, {
        postPaymentConfig: postConfig,
      });
      setSettings(updated);
      onRefreshPublicData();
      setSaveSuccessMsg('Post-payment destination settings saved successfully.');
    } catch (err: unknown) {
      setSaveErrorMsg(err instanceof Error ? err.message : 'Failed to save settings.');
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewDestination = async (productId?: string, overrideProduct?: ProductDeliveryConfig) => {
    setSaveErrorMsg('');
    try {
      const res = await api.previewDeliveryDestination(token, {
        productId: productId || previewProductId || undefined,
        overridePostPaymentConfig: postConfig,
        overrideProductConfig: overrideProduct,
      });
      setPreviewResult(res);
    } catch (err: unknown) {
      setSaveErrorMsg(err instanceof Error ? err.message : 'Preview failed.');
    }
  };

  const handleUploadAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetFile) {
      setSaveErrorMsg('Please choose a file to upload.');
      return;
    }
    setUploadingAsset(true);
    setSaveErrorMsg('');
    try {
      await api.uploadDigitalAsset(token, assetFile, assetTitle.trim() || undefined);
      setAssetFile(null);
      setAssetTitle('');
      setSaveSuccessMsg('Digital product file uploaded securely to private storage.');
      await loadAssets();
    } catch (err: unknown) {
      setSaveErrorMsg(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploadingAsset(false);
    }
  };

  const handleDeleteAsset = async (id: string) => {
    try {
      await api.deleteDigitalAsset(token, id);
      setDeletingAssetId(null);
      setSaveSuccessMsg('Digital asset deleted.');
      await loadAssets();
    } catch (err: unknown) {
      setSaveErrorMsg(err instanceof Error ? err.message : 'Delete failed.');
    }
  };

  const handleSaveProductDelivery = async (product: Product) => {
    const draft = productDrafts[product.id];
    if (!draft) return;
    setSavingProductId(product.id);
    setSaveErrorMsg('');
    try {
      await api.updateProduct(token, product.id, {
        deliveryConfig: draft,
      });
      setSaveSuccessMsg(`Saved delivery settings for ${product.name}.`);
      await loadAdminData();
      onRefreshPublicData();
    } catch (err: unknown) {
      setSaveErrorMsg(err instanceof Error ? err.message : 'Failed to update product delivery config.');
    } finally {
      setSavingProductId(null);
    }
  };

  const handleToggleAccess = async (record: ProductDeliveryRecord) => {
    try {
      await api.toggleDeliveryAccess(token, record.id, !record.downloadEnabled);
      setSaveSuccessMsg(
        `Access ${!record.downloadEnabled ? 'enabled' : 'revoked'} for ${record.customerEmail} (${record.orderId}).`
      );
      await loadRecords();
    } catch (err: unknown) {
      setSaveErrorMsg(err instanceof Error ? err.message : 'Failed to update access status.');
    }
  };

  const handleResendEmail = async (record: ProductDeliveryRecord) => {
    try {
      await api.resendDeliveryInstructions(token, record.id);
      setSaveSuccessMsg(`Resent verified delivery link to ${record.customerEmail}.`);
    } catch (err: unknown) {
      setSaveErrorMsg(err instanceof Error ? err.message : 'Failed to resend delivery email.');
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const NAV_ITEMS: Array<{ id: DeliverySubSection; label: string }> = [
    { id: 'default_destination', label: 'Default Post-Payment Destination' },
    { id: 'whatsapp_settings', label: 'WhatsApp Redirect Settings' },
    { id: 'custom_links', label: 'Custom Redirect Links' },
    { id: 'digital_uploads', label: 'Digital Product Uploads' },
    { id: 'product_delivery', label: 'Product-Specific Delivery Settings' },
    { id: 'download_records', label: 'Customer Download Records' },
    { id: 'delivery_reports', label: 'Product Delivery Reports' },
  ];

  const filteredProducts = products.filter((p) => {
    if (!productSearch.trim()) return true;
    const q = productSearch.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#FF7900]">
            Section B • Payment Fulfillment & Protected Digital Delivery
          </span>
          <h3 className="text-2xl font-black text-[#061B45]">
            Post-Payment Destination & Digital Delivery Control
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure where verified paid customers go (WhatsApp, Custom Portal Link, or Private Digital File Download), attach files per product, and audit every download.
          </p>
        </div>
      </div>

      {/* Horizontal Sub-Navigation */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-1.5">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSubSection(item.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
              subSection === item.id
                ? 'bg-[#FF7900] text-white shadow-sm'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* 1. DEFAULT POST-PAYMENT DESTINATION */}
      {subSection === 'default_destination' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleSaveGlobalPostConfig}
            className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5"
          >
            <div>
              <h4 className="text-lg font-black text-[#061B45]">
                Global Default Post-Payment Destination
              </h4>
              <p className="text-xs text-slate-500">
                Applies to all products unless overridden in Product-Specific Delivery Settings.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: 'whatsapp' as const,
                  title: 'WhatsApp Redirect',
                  desc: 'Sends verified buyer to WhatsApp with order details',
                  icon: MessageCircle,
                },
                {
                  id: 'custom_url' as const,
                  title: 'Custom Link Redirect',
                  desc: 'Routes buyer to an external onboarding or portal URL',
                  icon: ExternalLink,
                },
                {
                  id: 'digital_download' as const,
                  title: 'Digital Download Page',
                  desc: 'Unlocks verified protected file download on-site',
                  icon: Download,
                },
              ].map((opt) => {
                const Icon = opt.icon;
                const active = postConfig.defaultDestinationType === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() =>
                      setPostConfig({ ...postConfig, defaultDestinationType: opt.id })
                    }
                    className={`p-4 rounded-2xl border text-left transition-all space-y-1.5 ${
                      active
                        ? 'border-[#FF7900] bg-orange-50/50 ring-1 ring-[#FF7900]'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${active ? 'text-[#FF7900]' : 'text-slate-500'}`} />
                    <div className="text-xs font-black text-[#061B45]">{opt.title}</div>
                    <p className="text-[11px] text-slate-500 leading-snug">{opt.desc}</p>
                  </button>
                );
              })}
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                Verified Delivery Page Headline
              </label>
              <input
                type="text"
                value={postConfig.downloadPageHeadline || ''}
                onChange={(e) =>
                  setPostConfig({ ...postConfig, downloadPageHeadline: e.target.value })
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                Verified Delivery Page Instructions
              </label>
              <textarea
                rows={3}
                value={postConfig.downloadPageInstructions || ''}
                onChange={(e) =>
                  setPostConfig({ ...postConfig, downloadPageInstructions: e.target.value })
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-zeek-orange px-6 py-3 rounded-xl text-xs font-extrabold uppercase tracking-wider"
            >
              Save Default Destination
            </button>
          </form>

          {/* Preview Destination Tester */}
          <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <h4 className="text-base font-black text-[#061B45]">
                Interactive Destination Preview
              </h4>
              <p className="text-xs text-slate-500">
                Simulate what a verified customer receives right after paying for any product.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                Select Product to Test
              </label>
              <select
                value={previewProductId}
                onChange={(e) => setPreviewProductId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.duration})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => handlePreviewDestination(previewProductId)}
              className="w-full py-2.5 rounded-xl bg-[#061B45] hover:bg-[#0c2a63] text-white text-xs font-bold flex items-center justify-center gap-2"
            >
              <Eye className="w-4 h-4 text-[#FF9200]" />
              <span>Preview Customer Destination</span>
            </button>

            {previewResult && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                <div>
                  <span className="text-slate-500">Resolved Mode:</span>{' '}
                  <strong className="uppercase text-[#FF7900]">
                    {previewResult.destinationType.replace('_', ' ')}
                  </strong>
                </div>
                {previewResult.digitalFileName && (
                  <div>
                    <span className="text-slate-500">Protected File:</span>{' '}
                    <strong className="font-mono text-[#061B45]">{previewResult.digitalFileName}</strong>
                  </div>
                )}
                <div className="break-all">
                  <span className="text-slate-500 block">Resolved URL:</span>
                  <code className="text-[11px] text-[#061B45]">{previewResult.destinationUrl}</code>
                </div>
                {previewResult.whatsappMessage && (
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-[11px] whitespace-pre-wrap">
                    {previewResult.whatsappMessage}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. WHATSAPP REDIRECT SETTINGS */}
      {subSection === 'whatsapp_settings' && (
        <form
          onSubmit={handleSaveGlobalPostConfig}
          className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 max-w-3xl"
        >
          <div>
            <h4 className="text-lg font-black text-[#061B45]">WhatsApp Post-Payment Redirect Settings</h4>
            <p className="text-xs text-slate-500">
              Defaults to your main support WhatsApp ({settings.internationalWhatsApp}) unless overridden below.
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
              Post-Payment WhatsApp Number Override (International digits, optional)
            </label>
            <input
              type="text"
              value={postConfig.whatsappNumber || ''}
              onChange={(e) =>
                setPostConfig({ ...postConfig, whatsappNumber: e.target.value })
              }
              placeholder={`Leave blank to use default (${settings.internationalWhatsApp})`}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
            />
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
              <label className="text-[11px] font-bold uppercase text-slate-600">
                Prefilled Customer Message Template
              </label>
              <div className="flex flex-wrap gap-1.5">
                {VARIABLE_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() =>
                      setPostConfig({
                        ...postConfig,
                        whatsappMessageTemplate: `${postConfig.whatsappMessageTemplate || ''} ${chip}`.trim(),
                      })
                    }
                    className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[10px] font-mono font-bold text-[#061B45]"
                  >
                    + {chip}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              rows={4}
              value={postConfig.whatsappMessageTemplate || ''}
              onChange={(e) =>
                setPostConfig({ ...postConfig, whatsappMessageTemplate: e.target.value })
              }
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-zeek-orange px-6 py-3 rounded-xl text-xs font-extrabold uppercase tracking-wider"
          >
            Save WhatsApp Redirect Settings
          </button>
        </form>
      )}

      {/* 3. CUSTOM REDIRECT LINKS */}
      {subSection === 'custom_links' && (
        <form
          onSubmit={handleSaveGlobalPostConfig}
          className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 max-w-3xl"
        >
          <div>
            <h4 className="text-lg font-black text-[#061B45]">Global Custom Post-Payment Redirect Link</h4>
            <p className="text-xs text-slate-500">
              Used when default destination is set to Custom Link Redirect (or product override uses custom URL). Supports dynamic placeholders.
            </p>
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
              <label className="text-[11px] font-bold uppercase text-slate-600">
                Global Custom URL
              </label>
              <div className="flex flex-wrap gap-1.5">
                {VARIABLE_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() =>
                      setPostConfig({
                        ...postConfig,
                        customRedirectUrl: `${postConfig.customRedirectUrl || ''}${chip}`,
                      })
                    }
                    className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[10px] font-mono font-bold text-[#061B45]"
                  >
                    + {chip}
                  </button>
                ))}
              </div>
            </div>
            <input
              type="text"
              value={postConfig.customRedirectUrl || ''}
              onChange={(e) =>
                setPostConfig({ ...postConfig, customRedirectUrl: e.target.value })
              }
              placeholder="https://portal.zeeksoftwares.com/activate?order={{orderId}}"
              className="w-full px-3 py-2.5 text-xs font-mono rounded-xl border border-slate-300"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-zeek-orange px-6 py-3 rounded-xl text-xs font-extrabold uppercase tracking-wider"
          >
            Save Custom Redirect Link
          </button>
        </form>
      )}

      {/* 4. DIGITAL PRODUCT UPLOADS */}
      {subSection === 'digital_uploads' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleUploadAsset}
            className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 h-fit"
          >
            <div>
              <h4 className="text-base font-black text-[#061B45]">Upload Digital Product File</h4>
              <p className="text-xs text-slate-500">
                Supports PDF, ZIP, DOCX, MP4, MP3, APK, DMG, EXE up to 50MB. Files are stored in private server storage and only streamable via paid order tokens.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                Display Title (Optional)
              </label>
              <input
                type="text"
                value={assetTitle}
                onChange={(e) => setAssetTitle(e.target.value)}
                placeholder="e.g. Canva Pro Setup Guide + Bonus Pack"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                Select File *
              </label>
              <input
                type="file"
                required
                onChange={(e) => setAssetFile(e.target.files?.[0] || null)}
                className="w-full text-xs file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-[#061B45] file:text-white file:font-bold hover:file:bg-[#0c2a63]"
              />
            </div>

            <button
              type="submit"
              disabled={uploadingAsset || !assetFile}
              className="btn-zeek-orange w-full py-3 rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {uploadingAsset ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              <span>{uploadingAsset ? 'Uploading to Private Storage...' : 'Upload Digital Asset'}</span>
            </button>
          </form>

          <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-black text-[#061B45]">
                Private Digital Asset Library ({assets.length})
              </h4>
              <button
                type="button"
                onClick={loadAssets}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {assets.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No digital files uploaded yet. Upload your first digital product on the left.
              </div>
            ) : (
              <div className="space-y-2.5">
                {assets.map((asset) => (
                  <div
                    key={asset.id}
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <FileArchive className="w-4 h-4 text-[#FF7900] shrink-0" />
                        <strong className="text-[#061B45] truncate">{asset.title}</strong>
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 truncate">
                        {asset.originalFileName} • {formatBytes(asset.sizeBytes)} • {asset.mimeType}
                      </div>
                      {asset.sha256 && (
                        <div className="text-[10px] font-mono text-slate-400">
                          SHA-256: {asset.sha256.slice(0, 16)}…
                        </div>
                      )}
                    </div>

                    <div className="shrink-0">
                      {deletingAssetId === asset.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDeleteAsset(asset.id)}
                            className="px-2.5 py-1 rounded bg-red-600 text-white text-[10px] font-bold"
                          >
                            Confirm Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingAssetId(null)}
                            className="px-2 py-1 rounded bg-slate-200 text-slate-700 text-[10px] font-bold"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeletingAssetId(asset.id)}
                          className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600"
                          title="Delete Digital Asset"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. PRODUCT-SPECIFIC DELIVERY SETTINGS */}
      {subSection === 'product_delivery' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-base font-black text-[#061B45]">
                Per-Product Delivery Overrides ({products.length} Products)
              </h4>
              <p className="text-xs text-slate-500">
                Assign custom downloadable files, custom links, or custom WhatsApp instructions individually per product.
              </p>
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search products..."
                className="pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-300 w-56"
              />
            </div>
          </div>

          <div className="space-y-3">
            {filteredProducts.map((product) => {
              const draft = productDrafts[product.id] || { destinationType: 'default' };
              return (
                <div
                  key={product.id}
                  className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <strong className="text-sm font-black text-[#061B45]">{product.name}</strong>
                      <span className="ml-2 text-xs text-slate-500">
                        ({product.duration}) • ₦{product.price.toLocaleString('en-NG')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handlePreviewDestination(product.id, draft)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-[#061B45]"
                      >
                        Preview
                      </button>
                      <button
                        type="button"
                        disabled={savingProductId === product.id}
                        onClick={() => handleSaveProductDelivery(product)}
                        className="btn-zeek-orange px-4 py-1.5 rounded-xl text-xs font-bold disabled:opacity-50"
                      >
                        {savingProductId === product.id ? 'Saving...' : 'Save Product'}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        Destination Mode
                      </label>
                      <select
                        value={draft.destinationType || 'default'}
                        onChange={(e) =>
                          setProductDrafts({
                            ...productDrafts,
                            [product.id]: {
                              ...draft,
                              destinationType: e.target.value as ProductDeliveryConfig['destinationType'],
                            },
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold"
                      >
                        <option value="default">
                          Use Global Default ({postConfig.defaultDestinationType})
                        </option>
                        <option value="whatsapp">WhatsApp Redirect</option>
                        <option value="custom_url">Custom URL Redirect</option>
                        <option value="digital_download">Protected Digital File Download</option>
                      </select>
                    </div>

                    {(draft.destinationType === 'digital_download' ||
                      (draft.destinationType === 'default' &&
                        postConfig.defaultDestinationType === 'digital_download')) && (
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                          Attached Digital File
                        </label>
                        <select
                          value={draft.digitalAssetId || ''}
                          onChange={(e) =>
                            setProductDrafts({
                              ...productDrafts,
                              [product.id]: { ...draft, digitalAssetId: e.target.value },
                            })
                          }
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                        >
                          <option value="">-- Select uploaded digital asset --</option>
                          {assets.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.title} ({a.originalFileName})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {(draft.destinationType === 'custom_url' ||
                      (draft.destinationType === 'default' &&
                        postConfig.defaultDestinationType === 'custom_url')) && (
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                          Custom Redirect URL Override
                        </label>
                        <input
                          type="text"
                          value={draft.customRedirectUrl || ''}
                          onChange={(e) =>
                            setProductDrafts({
                              ...productDrafts,
                              [product.id]: { ...draft, customRedirectUrl: e.target.value },
                            })
                          }
                          placeholder="Leave blank to use global custom URL"
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                        />
                      </div>
                    )}

                    {(draft.destinationType === 'whatsapp' ||
                      (draft.destinationType === 'default' &&
                        postConfig.defaultDestinationType === 'whatsapp')) && (
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                          WhatsApp Message Override (Optional)
                        </label>
                        <input
                          type="text"
                          value={draft.whatsappMessageTemplate || ''}
                          onChange={(e) =>
                            setProductDrafts({
                              ...productDrafts,
                              [product.id]: { ...draft, whatsappMessageTemplate: e.target.value },
                            })
                          }
                          placeholder="Optional product-specific WhatsApp message..."
                          className="w-full px-3 py-2 rounded-xl border border-slate-300"
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {previewResult && (
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-xs flex flex-wrap items-center justify-between gap-2">
              <div>
                <strong>Live Preview:</strong> {previewResult.destinationType} →{' '}
                <code>{previewResult.destinationUrl}</code>
              </div>
              <button type="button" onClick={() => setPreviewResult(null)}>
                <X className="w-4 h-4 text-blue-700" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* 6. CUSTOMER DOWNLOAD RECORDS */}
      {subSection === 'download_records' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={recordSearch}
                onChange={(e) => setRecordSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadRecords()}
                placeholder="Search order ID, email, customer, product..."
                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200"
              />
            </div>

            <select
              value={recordStatusFilter}
              onChange={(e) => setRecordStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-semibold"
            >
              <option value="all">All Delivery Statuses</option>
              <option value="pending_payment">Pending Payment</option>
              <option value="ready">Ready</option>
              <option value="accessed">Accessed</option>
              <option value="downloaded">Downloaded</option>
              <option value="revoked">Revoked</option>
            </select>

            <select
              value={recordDestFilter}
              onChange={(e) => setRecordDestFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-semibold"
            >
              <option value="all">All Destinations</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="custom_url">Custom URL</option>
              <option value="digital_download">Digital Download</option>
            </select>

            <button
              type="button"
              onClick={loadRecords}
              className="btn-zeek-orange px-4 py-2 rounded-xl text-xs font-bold"
            >
              Filter
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#061B45] text-white uppercase font-bold">
                <tr>
                  <th className="p-3.5">Order & Customer</th>
                  <th className="p-3.5">Product & Destination</th>
                  <th className="p-3.5">Payment / Delivery</th>
                  <th className="p-3.5">Access & Downloads</th>
                  <th className="p-3.5 text-right">Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      No delivery records match your filters.
                    </td>
                  </tr>
                ) : (
                  records.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50">
                      <td className="p-3.5">
                        <strong className="font-mono text-[#061B45] block">{rec.orderId}</strong>
                        <span className="font-semibold text-slate-800 block">{rec.customerName}</span>
                        <span className="text-[11px] font-mono text-slate-500">{rec.customerEmail}</span>
                      </td>
                      <td className="p-3.5">
                        <strong className="text-slate-900 block">{rec.productName}</strong>
                        <span className="inline-block mt-0.5 px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold uppercase">
                          {rec.destinationType.replace('_', ' ')}
                        </span>
                        {rec.digitalFileName && (
                          <span className="block text-[10px] font-mono text-slate-500 mt-0.5">
                            {rec.digitalFileName}
                          </span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase mr-1 ${
                            rec.paymentStatus === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {rec.paymentStatus}
                        </span>
                        <span className="inline-block px-2 py-0.5 rounded bg-blue-50 text-blue-800 text-[10px] font-bold uppercase">
                          {rec.deliveryStatus}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-[#061B45]">{rec.downloadCount} download(s)</div>
                        {rec.firstAccessedAt && (
                          <div className="text-[10px] text-slate-500">
                            First: {rec.firstAccessedAt.slice(0, 16).replace('T', ' ')}
                          </div>
                        )}
                        {rec.lastCompletedAt && (
                          <div className="text-[10px] text-emerald-700">
                            Last stream: {rec.lastCompletedAt.slice(0, 16).replace('T', ' ')}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleToggleAccess(rec)}
                          className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 ${
                            rec.downloadEnabled
                              ? 'bg-red-50 hover:bg-red-100 text-red-700'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          {rec.downloadEnabled ? (
                            <>
                              <Lock className="w-3 h-3" /> Revoke
                            </>
                          ) : (
                            <>
                              <Unlock className="w-3 h-3" /> Enable
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResendEmail(rec)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#061B45] hover:bg-[#0c2a63] text-white text-[10px] font-bold inline-flex items-center gap-1"
                        >
                          <Send className="w-3 h-3 text-[#FF9200]" /> Resend Email
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. PRODUCT DELIVERY REPORTS */}
      {subSection === 'delivery_reports' && reports && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-lg font-black text-[#061B45]">Product Delivery Analytics & Reports</h4>
              <p className="text-xs text-slate-500">
                Track paid orders vs customer access completion rates across all products.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                api.downloadAdminCsv(token, '/api/admin/delivery/reports/export', 'zeek-delivery-reports.csv')
              }
              className="px-4 py-2 rounded-xl bg-[#061B45] text-white text-xs font-bold flex items-center gap-1.5"
            >
              <Download className="w-4 h-4 text-[#FF9200]" />
              <span>Export Delivery CSV</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Paid Delivery Records', value: reports.summary.paidRecords },
              { label: 'Accessed / Downloaded', value: reports.summary.accessedOrDownloaded },
              { label: 'Total Digital Downloads', value: reports.summary.totalDownloads },
              { label: 'Completion Rate', value: `${reports.summary.completionRate}%` },
            ].map((k) => (
              <div key={k.label} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">{k.label}</span>
                <span className="text-2xl font-black text-[#061B45] mt-1 block">{k.value}</span>
              </div>
            ))}
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h5 className="text-sm font-black text-[#061B45]">Per-Product Delivery Breakdown</h5>
            <div className="space-y-3">
              {reports.byProduct.length === 0 ? (
                <p className="text-xs text-slate-400">No paid delivery records recorded yet.</p>
              ) : (
                reports.byProduct.map((row) => {
                  const pct = row.paidOrders
                    ? Math.min(100, Math.round((row.accessedCount / row.paidOrders) * 100))
                    : 0;
                  return (
                    <div key={row.productId} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <strong className="text-[#061B45]">{row.productName}</strong>
                          <span className="ml-2 px-2 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-bold uppercase">
                            {row.destinationType.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="text-slate-600">
                          Paid Orders: <strong>{row.paidOrders}</strong> • Accessed:{' '}
                          <strong className="text-emerald-700">{row.accessedCount}</strong> ({pct}%) • File Streams:{' '}
                          <strong>{row.totalDownloads}</strong>
                        </div>
                      </div>
                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-[#FF7900]" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
