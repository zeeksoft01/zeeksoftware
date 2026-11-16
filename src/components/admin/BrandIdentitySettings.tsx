import React, { useState } from 'react';
import {
  Sparkles,
  Upload,
  Loader2,
  CheckCircle,
  X,
  Sliders,
  Image as ImageIcon,
  Share2,
  Globe,
  Info,
  Check,
} from 'lucide-react';
import { SiteSettings } from '../../types';
import { api } from '../../api/client';

interface BrandIdentitySettingsProps {
  settings: SiteSettings;
  setSettings: React.Dispatch<React.SetStateAction<SiteSettings | null>>;
  token: string;
  uploadAssetFile: (file: File) => Promise<string>;
  onRefreshPublicData: () => void;
  setSaveSuccessMsg: (msg: string) => void;
  setSaveErrorMsg: (msg: string) => void;
}

export const BrandIdentitySettings: React.FC<BrandIdentitySettingsProps> = ({
  settings,
  setSettings,
  token,
  uploadAssetFile,
  onRefreshPublicData,
  setSaveSuccessMsg,
  setSaveErrorMsg,
}) => {
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleAssetUpload = async (
    field:
      | 'logoUrl'
      | 'lightLogoUrl'
      | 'darkLogoUrl'
      | 'faviconUrl'
      | 'mobileIconUrl'
      | 'socialShareImageUrl',
    file: File
  ) => {
    try {
      setUploadingField(field);
      const url = await uploadAssetFile(file);
      setSettings((prev) => (prev ? { ...prev, [field]: url } : prev));
      setSaveSuccessMsg(`Asset "${file.name}" uploaded. Remember to click "Save Brand Identity".`);
    } catch (err: unknown) {
      setSaveErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setUploadingField(null);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!token) return;
    setIsSaving(true);
    try {
      await api.updateSettings(token, settings);
      setSaveSuccessMsg('Brand identity and logo assets saved successfully.');
      onRefreshPublicData();
    } catch (err: unknown) {
      setSaveErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Header Bar */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#061B45] text-white flex items-center justify-center shadow-md">
            <Sparkles className="w-5 h-5 text-[#FF7900]" />
          </div>
          <div>
            <h3 className="text-xl font-black text-[#061B45] tracking-tight">
              BRAND IDENTITY SETTINGS
            </h3>
            <p className="text-xs text-slate-500">
              Manage website logos, dark/light variants, favicons, mobile icons, and social sharing cards.
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={isSaving}
          onClick={() => handleSave()}
          className="btn-zeek-orange px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
          <span>Save Brand Identity</span>
        </button>
      </div>

      {/* 2. Brand Typography & Slogans */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
          <span>Brand Names & Official Messaging</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Store Legal / Trade Name *
            </label>
            <input
              type="text"
              required
              value={settings.storeName}
              onChange={(e) => setSettings({ ...settings, storeName: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#FF7900]"
              placeholder="Zeek Softwares"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Official Slogan (Header & Footer)
            </label>
            <input
              type="text"
              value={settings.slogan || ''}
              onChange={(e) => setSettings({ ...settings, slogan: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#FF7900]"
              placeholder="THE TOTAL SOFTWARE SOLUTION"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Primary Brand Tagline
            </label>
            <input
              type="text"
              value={settings.tagline}
              onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#FF7900]"
              placeholder="Premium AI Tools. Premium Apps. Subsidized Rates."
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Secondary Brand Tagline
            </label>
            <input
              type="text"
              value={settings.secondaryTagline || ''}
              onChange={(e) => setSettings({ ...settings, secondaryTagline: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#FF7900]"
              placeholder="Powerful Tools. Smarter Work. Affordable Access."
            />
          </div>
        </div>
      </div>

      {/* 3. Primary Website Logo Upload & Dimension Controls */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h4 className="text-sm font-extrabold text-[#061B45] tracking-tight">
              Primary Website Logo
            </h4>
            <p className="text-xs text-slate-500">
              Displayed in the navigation header, footer, checkout invoices, and order lookup modal.
            </p>
          </div>

          {settings.logoUrl && (
            <button
              type="button"
              onClick={() => setSettings({ ...settings, logoUrl: '' })}
              className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Remove Custom Logo (Revert to Default Emblem)</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Upload Dropzone */}
          <div className="lg:col-span-6">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file) handleAssetUpload('logoUrl', file);
              }}
              onClick={() => {
                const input = document.getElementById('primary-logo-input') as HTMLInputElement;
                input?.click();
              }}
              className="border-2 border-dashed border-slate-300 hover:border-[#FF7900] rounded-2xl p-6 text-center bg-slate-50 hover:bg-orange-50/20 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 group min-h-[170px]"
            >
              <input
                type="file"
                id="primary-logo-input"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleAssetUpload('logoUrl', file);
                }}
              />

              {uploadingField === 'logoUrl' ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 text-[#FF7900] animate-spin" />
                  <span className="text-xs font-bold text-[#FF7900]">Uploading primary logo...</span>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-slate-500 group-hover:text-[#FF7900] transition-colors">
                    <Upload className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">
                    Click to Upload Primary Logo or Drag & Drop Here
                  </span>
                  <span className="text-[11px] text-slate-400">
                    PNG, SVG, or WEBP (transparent background recommended, up to 10MB)
                  </span>
                </>
              )}
            </div>

            {/* Logo Display Dimensions Control without modifying original file */}
            <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase">
                  Logo Display Width Control:
                </label>
                <span className="font-mono text-xs font-bold text-[#061B45]">
                  {settings.logoWidth || 160}px
                </span>
              </div>
              <input
                type="range"
                min={80}
                max={320}
                step={5}
                value={settings.logoWidth || 160}
                onChange={(e) => setSettings({ ...settings, logoWidth: Number(e.target.value) })}
                className="w-full accent-[#FF7900]"
              />
              <span className="text-[10px] text-slate-400 block mt-1">
                Controls size in headers and footers while preserving original aspect ratio (never distorts).
              </span>
            </div>
          </div>

          {/* Live Header Navbar Simulation */}
          <div className="lg:col-span-6 space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Live Header Navbar Preview:
            </span>

            {/* Dark Header Simulation */}
            <div className="bg-[#061B45] p-4 rounded-2xl border border-slate-800 shadow-md space-y-3">
              <span className="text-[9px] font-mono text-slate-400 uppercase block">
                Desktop Navigation Bar (Navy Background)
              </span>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {settings.logoUrl ? (
                    <img
                      src={settings.logoUrl}
                      alt="Primary logo preview"
                      style={{ maxWidth: `${settings.logoWidth || 160}px` }}
                      className="max-h-10 w-auto object-contain"
                    />
                  ) : (
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF7900] to-[#FF9200] flex items-center justify-center font-bold text-white text-xs shadow-md">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <span className="text-xs font-black text-white">
                          ZEEK <span className="text-[#FF7900]">SOFTWARES</span>
                        </span>
                        <span className="text-[8px] font-semibold text-slate-300 tracking-wider block">
                          {settings.slogan || 'THE TOTAL SOFTWARE SOLUTION'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 text-[11px] font-bold text-slate-300">
                  <span className="text-[#FF7900]">HOME</span>
                  <span>PRODUCTS</span>
                  <span>ABOUT</span>
                </div>
              </div>
            </div>

            {/* Light Canvas Simulation */}
            <div className="bg-slate-100 p-4 rounded-2xl border border-slate-200 shadow-inner space-y-3">
              <span className="text-[9px] font-mono text-slate-500 uppercase block">
                Light Background Simulation (Invoice & Receipts)
              </span>
              <div className="flex items-center justify-between">
                {settings.logoUrl ? (
                  <img
                    src={settings.logoUrl}
                    alt="Logo light backdrop"
                    style={{ maxWidth: `${settings.logoWidth || 160}px` }}
                    className="max-h-10 w-auto object-contain"
                  />
                ) : (
                  <span className="text-xs font-black text-[#061B45]">
                    ZEEK <span className="text-[#FF7900]">SOFTWARES</span>
                  </span>
                )}
                <span className="text-[10px] text-slate-500 font-mono">Invoice #104928</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Light & Dark Logo Variants (Optional for Adaptive Theming) */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <h4 className="text-sm font-extrabold text-[#061B45] tracking-tight">
          Adaptive Logo Variants
        </h4>
        <p className="text-xs text-slate-500">
          Upload specialized high-contrast logo versions for light and dark backgrounds.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
          {/* Light Logo for Dark BG */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h5 className="text-xs font-bold text-[#061B45] uppercase">
                  Light Logo (for Dark Backgrounds)
                </h5>
                <p className="text-[10px] text-slate-500">Used on Navy navbar and dark hero.</p>
              </div>
              {settings.lightLogoUrl && (
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, lightLogoUrl: '' })}
                  className="text-[10px] text-red-600 font-bold"
                >
                  Remove
                </button>
              )}
            </div>

            <div
              onClick={() => {
                const input = document.getElementById('light-logo-input') as HTMLInputElement;
                input?.click();
              }}
              className="border border-dashed border-slate-300 hover:border-[#FF7900] rounded-xl p-3 text-center bg-white cursor-pointer flex items-center justify-center gap-3"
            >
              <input
                type="file"
                id="light-logo-input"
                accept="image/png,image/svg+xml,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleAssetUpload('lightLogoUrl', file);
                }}
              />
              {uploadingField === 'lightLogoUrl' ? (
                <Loader2 className="w-4 h-4 text-[#FF7900] animate-spin" />
              ) : settings.lightLogoUrl ? (
                <div className="flex items-center gap-3">
                  <div className="p-1 rounded bg-[#061B45]">
                    <img src={settings.lightLogoUrl} alt="Light logo" className="h-6 w-auto" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-700">Change Light Logo</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                  <Upload className="w-4 h-4 text-[#FF7900]" />
                  <span>Upload Light Logo</span>
                </div>
              )}
            </div>
          </div>

          {/* Dark Logo for Light BG */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h5 className="text-xs font-bold text-[#061B45] uppercase">
                  Dark Logo (for Light Backgrounds)
                </h5>
                <p className="text-[10px] text-slate-500">Used on printable receipts and white panels.</p>
              </div>
              {settings.darkLogoUrl && (
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, darkLogoUrl: '' })}
                  className="text-[10px] text-red-600 font-bold"
                >
                  Remove
                </button>
              )}
            </div>

            <div
              onClick={() => {
                const input = document.getElementById('dark-logo-input') as HTMLInputElement;
                input?.click();
              }}
              className="border border-dashed border-slate-300 hover:border-[#FF7900] rounded-xl p-3 text-center bg-white cursor-pointer flex items-center justify-center gap-3"
            >
              <input
                type="file"
                id="dark-logo-input"
                accept="image/png,image/svg+xml,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleAssetUpload('darkLogoUrl', file);
                }}
              />
              {uploadingField === 'darkLogoUrl' ? (
                <Loader2 className="w-4 h-4 text-[#FF7900] animate-spin" />
              ) : settings.darkLogoUrl ? (
                <div className="flex items-center gap-3">
                  <div className="p-1 rounded bg-white border">
                    <img src={settings.darkLogoUrl} alt="Dark logo" className="h-6 w-auto" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-700">Change Dark Logo</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                  <Upload className="w-4 h-4 text-[#FF7900]" />
                  <span>Upload Dark Logo</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Favicon, Mobile App Icon, and Social Share Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Favicon Upload */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <h5 className="text-xs font-bold text-[#061B45] uppercase tracking-wider flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#FF7900]" />
              <span>Browser Tab Favicon</span>
            </h5>
            <p className="text-[11px] text-slate-500">
              Shown in browser tabs, bookmarks, and search history.
            </p>
          </div>

          <div
            onClick={() => {
              const input = document.getElementById('favicon-input') as HTMLInputElement;
              input?.click();
            }}
            className="border-2 border-dashed border-slate-300 hover:border-[#FF7900] rounded-2xl p-4 text-center bg-slate-50 cursor-pointer flex flex-col items-center justify-center gap-2"
          >
            <input
              type="file"
              id="favicon-input"
              accept="image/x-icon,image/png,image/svg+xml,image/jpeg"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleAssetUpload('faviconUrl', file);
              }}
            />
            {uploadingField === 'faviconUrl' ? (
              <Loader2 className="w-5 h-5 text-[#FF7900] animate-spin" />
            ) : settings.faviconUrl ? (
              <div className="flex items-center gap-2">
                <img
                  src={settings.faviconUrl}
                  alt="Favicon preview"
                  className="w-8 h-8 rounded-lg object-contain bg-white p-1 border shadow-sm"
                />
                <span className="text-xs font-bold text-slate-800">Change Favicon</span>
              </div>
            ) : (
              <>
                <Upload className="w-5 h-5 text-slate-400" />
                <span className="text-xs font-bold text-slate-700">Upload Favicon</span>
                <span className="text-[10px] text-slate-400">PNG, ICO, SVG (32x32 recommended)</span>
              </>
            )}
          </div>

          {/* Browser Tab Simulation */}
          <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 space-y-1">
            <span className="text-[9px] font-mono text-slate-400 uppercase block">Browser Tab Preview:</span>
            <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-300 flex items-center gap-2 shadow-sm max-w-[200px]">
              {settings.faviconUrl ? (
                <img src={settings.faviconUrl} alt="Favicon" className="w-3.5 h-3.5 object-contain" />
              ) : (
                <div className="w-3.5 h-3.5 rounded-full bg-[#FF7900]" />
              )}
              <span className="text-[11px] font-medium text-slate-700 truncate">
                {settings.storeName || 'Zeek Softwares'}
              </span>
            </div>
          </div>

          {/* Browser Caching Note */}
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[10px] space-y-1">
            <div className="flex items-center gap-1 font-bold">
              <Info className="w-3.5 h-3.5" />
              <span>Browser Caching Notice</span>
            </div>
            <p className="leading-relaxed">
              Browsers aggressively cache favicons locally. If the browser tab doesn't change immediately, hard-refresh with <strong>Ctrl+F5</strong> (or Cmd+Shift+R) or view in an Incognito window.
            </p>
          </div>
        </div>

        {/* Mobile Website Icon (Apple Touch Icon / PWA) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <h5 className="text-xs font-bold text-[#061B45] uppercase tracking-wider flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-[#FF7900]" />
              <span>Mobile Website Icon</span>
            </h5>
            <p className="text-[11px] text-slate-500">
              Shown when users save Zeek Softwares to their smartphone home screen (Apple Touch Icon / PWA).
            </p>
          </div>

          <div
            onClick={() => {
              const input = document.getElementById('mobile-icon-input') as HTMLInputElement;
              input?.click();
            }}
            className="border-2 border-dashed border-slate-300 hover:border-[#FF7900] rounded-2xl p-4 text-center bg-slate-50 cursor-pointer flex flex-col items-center justify-center gap-2"
          >
            <input
              type="file"
              id="mobile-icon-input"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleAssetUpload('mobileIconUrl', file);
              }}
            />
            {uploadingField === 'mobileIconUrl' ? (
              <Loader2 className="w-5 h-5 text-[#FF7900] animate-spin" />
            ) : settings.mobileIconUrl ? (
              <div className="flex items-center gap-2">
                <img
                  src={settings.mobileIconUrl}
                  alt="Mobile icon"
                  className="w-10 h-10 rounded-2xl object-cover shadow-md"
                />
                <span className="text-xs font-bold text-slate-800">Change Mobile Icon</span>
              </div>
            ) : (
              <>
                <Upload className="w-5 h-5 text-slate-400" />
                <span className="text-xs font-bold text-slate-700">Upload Mobile Icon</span>
                <span className="text-[10px] text-slate-400">PNG 192x192 recommended</span>
              </>
            )}
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
            <span className="text-[10px] text-slate-500 font-medium">
              Crisp 1:1 square icon with rounded corners applied automatically on iOS & Android.
            </span>
          </div>
        </div>

        {/* Social Media Sharing Card (OG Image) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <h5 className="text-xs font-bold text-[#061B45] uppercase tracking-wider flex items-center gap-2">
              <Share2 className="w-4 h-4 text-[#FF7900]" />
              <span>Social Media Sharing Card (OG)</span>
            </h5>
            <p className="text-[11px] text-slate-500">
              Displayed when the link is shared on WhatsApp, Facebook, LinkedIn, or Twitter.
            </p>
          </div>

          <div
            onClick={() => {
              const input = document.getElementById('og-image-input') as HTMLInputElement;
              input?.click();
            }}
            className="border-2 border-dashed border-slate-300 hover:border-[#FF7900] rounded-2xl p-4 text-center bg-slate-50 cursor-pointer flex flex-col items-center justify-center gap-2"
          >
            <input
              type="file"
              id="og-image-input"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleAssetUpload('socialShareImageUrl', file);
              }}
            />
            {uploadingField === 'socialShareImageUrl' ? (
              <Loader2 className="w-5 h-5 text-[#FF7900] animate-spin" />
            ) : settings.socialShareImageUrl ? (
              <div className="flex flex-col items-center gap-2">
                <img
                  src={settings.socialShareImageUrl}
                  alt="OG preview"
                  className="w-full h-20 rounded-xl object-cover shadow"
                />
                <span className="text-xs font-bold text-slate-800">Change Social Share Image</span>
              </div>
            ) : (
              <>
                <Upload className="w-5 h-5 text-slate-400" />
                <span className="text-xs font-bold text-slate-700">Upload Social Card</span>
                <span className="text-[10px] text-slate-400">1200 x 630px recommended (PNG / JPG)</span>
              </>
            )}
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
            <span className="text-[10px] text-slate-500 font-medium">
              Included automatically in &lt;meta property="og:image"&gt; tags.
            </span>
          </div>
        </div>
      </div>

      {/* 6. Sticky Bottom Action Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 sticky bottom-4 z-20">
        <div className="text-left">
          <span className="text-xs font-extrabold text-[#061B45] block">
            Save Brand Identity Settings
          </span>
          <span className="text-[11px] text-slate-500">
            Logos, sizing dimensions, and favicons are immediately reflected across the website.
          </span>
        </div>

        <button
          type="button"
          disabled={isSaving}
          onClick={() => handleSave()}
          className="btn-zeek-orange px-8 py-3.5 rounded-xl text-xs sm:text-sm font-extrabold uppercase tracking-wider shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving Assets...</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              <span>Save Brand Identity Settings</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
