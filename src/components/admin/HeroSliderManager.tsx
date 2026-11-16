import React, { useState } from 'react';
import {
  Sliders,
  Plus,
  ArrowUp,
  ArrowDown,
  Copy,
  Trash2,
  Upload,
  Loader2,
  CheckCircle,
  GripVertical,
  Smartphone,
  Monitor,
  RotateCcw,
  Sparkles,
  Layers,
  Eye,
  Check,
} from 'lucide-react';
import { HeroSlide, SiteSettings } from '../../types';
import { api } from '../../api/client';

interface HeroSliderManagerProps {
  slides: HeroSlide[];
  setSlides: React.Dispatch<React.SetStateAction<HeroSlide[]>>;
  settings: SiteSettings;
  setSettings: React.Dispatch<React.SetStateAction<SiteSettings | null>>;
  token: string;
  uploadAssetFile: (file: File) => Promise<string>;
  onRefreshPublicData: () => void;
  setSaveSuccessMsg: (msg: string) => void;
  setSaveErrorMsg: (msg: string) => void;
}

export const HeroSliderManager: React.FC<HeroSliderManagerProps> = ({
  slides,
  setSlides,
  settings,
  setSettings,
  token,
  uploadAssetFile,
  onRefreshPublicData,
  setSaveSuccessMsg,
  setSaveErrorMsg,
}) => {
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [selectedPreviewIdx, setSelectedPreviewIdx] = useState<number>(0);
  const [draggedSlideIdx, setDraggedSlideIdx] = useState<number | null>(null);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);

  // Preset cinematic photography recommendations
  const PRESET_CINEMATIC_PHOTOS = [
    {
      label: 'Happy African Professional (Customer)',
      url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=2000&q=85',
    },
    {
      label: 'Abstract Luxury Tech 3D Background',
      url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=2000&q=85',
    },
    {
      label: 'African Freelancer Workstation Monitor',
      url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=2000&q=85',
    },
    {
      label: 'Young African Woman with Smartphone',
      url: 'https://images.unsplash.com/photo-1589156280159-27698a70f29e?auto=format&fit=crop&w=2000&q=85',
    },
  ];

  // Drag and drop reordering
  const handleDragStart = (idx: number) => {
    setDraggedSlideIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetIdx: number) => {
    if (draggedSlideIdx === null || draggedSlideIdx === targetIdx) return;
    const newSlides = [...slides];
    const [removed] = newSlides.splice(draggedSlideIdx, 1);
    newSlides.splice(targetIdx, 0, removed);
    setSlides(newSlides);
    setDraggedSlideIdx(null);
  };

  // Move slide up/down
  const handleMoveSlide = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= slides.length) return;
    const newSlides = [...slides];
    const temp = newSlides[index];
    newSlides[index] = newSlides[targetIdx];
    newSlides[targetIdx] = temp;
    setSlides(newSlides);
  };

  // Add new slide
  const handleAddSlide = () => {
    const newSlide: HeroSlide = {
      id: `slide-${Date.now()}`,
      badge: 'NEW DIGITAL EXCELLENCE',
      headline: 'Empowering Your Work. Elevating Every Project.',
      supportingText:
        'Discover high-performance software tools and specialized creative applications at accessible, subsidized rates.',
      cta1Label: 'EXPLORE TOOLS',
      cta1Action: 'products',
      cta2Label: 'CONSULT AN EXPERT',
      cta2Action: 'whatsapp',
      backgroundImage:
        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=2000&q=85',
      visualType: 'photo',
      bgGradient: 'from-[#061B45] via-[#092257] to-[#041230]',
      accentColor: '#FF7900',
      overlayOpacity: 0.72,
      backgroundPosition: 'center right',
      textAlignment: 'left',
      isActive: true,
      displayOrder: slides.length + 1,
    };
    setSlides([...slides, newSlide]);
    setSelectedPreviewIdx(slides.length);
  };

  // Duplicate slide
  const handleDuplicateSlide = (index: number) => {
    const target = slides[index];
    const duplicate: HeroSlide = {
      ...target,
      id: `slide-${Date.now()}`,
      badge: `${target.badge} (Copy)`,
      displayOrder: slides.length + 1,
    };
    setSlides([...slides, duplicate]);
  };

  // Delete slide
  const handleDeleteSlide = (index: number) => {
    if (slides.length <= 1) {
      setSaveErrorMsg('You must maintain at least one hero slide.');
      return;
    }
    const filtered = slides.filter((_, i) => i !== index);
    setSlides(filtered);
    if (selectedPreviewIdx >= filtered.length) {
      setSelectedPreviewIdx(Math.max(0, filtered.length - 1));
    }
  };

  // Direct image upload for slide background
  const handleUploadBackground = async (index: number, file: File) => {
    try {
      setUploadingIndex(index);
      const url = await uploadAssetFile(file);
      const newSlides = [...slides];
      newSlides[index].backgroundImage = url;
      setSlides(newSlides);
      setSaveSuccessMsg(`Background image for slide #${index + 1} uploaded.`);
    } catch (err: unknown) {
      setSaveErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setUploadingIndex(null);
    }
  };

  // Save all slides & timings
  const handleSaveAll = async () => {
    if (!token) return;
    setIsSaving(true);
    try {
      await api.updateCMS(token, 'slides', { slides });
      if (settings) {
        await api.updateSettings(token, {
          heroAutoplayDuration: settings.heroAutoplayDuration,
          heroTransitionSpeed: settings.heroTransitionSpeed,
        });
      }
      setSaveSuccessMsg('All hero slides and timing settings saved and live on storefront.');
      onRefreshPublicData();
    } catch (err: unknown) {
      setSaveErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
  };

  // Restore default 4 luxury slides
  const handleRestoreDefaults = () => {
    if (!token) return;
    setShowRestoreConfirm(true);
  };

  const confirmRestoreDefaults = async () => {
    if (!token) return;
    setIsRestoring(true);
    try {
      const restored = await api.resetHeroSlides(token);
      setSlides(restored);
      setSelectedPreviewIdx(0);
      setSaveSuccessMsg('Restored 4 default luxury hero slides successfully.');
      onRefreshPublicData();
    } catch (err: unknown) {
      setSaveErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setIsRestoring(false);
      setShowRestoreConfirm(false);
    }
  };

  const previewSlide = slides[selectedPreviewIdx] || slides[0];

  return (
    <div className="space-y-8">
      {/* 1. Header Bar */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#061B45] text-white flex items-center justify-center shadow-md">
              <Sliders className="w-5 h-5 text-[#FF7900]" />
            </div>
            <div>
              <h3 className="text-xl font-black text-[#061B45] tracking-tight">
                HERO SLIDER MANAGER
              </h3>
              <p className="text-xs text-slate-500">
                Full control over the luxury Revolution hero carousel, background media, and typography.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            {slides.filter((s) => s.isActive).length} / {slides.length} Active Slides
          </span>

          <button
            type="button"
            onClick={handleAddSlide}
            className="btn-zeek-orange px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Slide</span>
          </button>

          <button
            type="button"
            disabled={isRestoring}
            onClick={handleRestoreDefaults}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center gap-1.5 transition-colors"
            title="Restore 4 Default Luxury Slides"
          >
            <RotateCcw className={`w-4 h-4 ${isRestoring ? 'animate-spin' : ''}`} />
            <span>Restore Defaults</span>
          </button>
        </div>
      </div>

      {/* 2. Global Revolution Animation & Timing Settings */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#FF7900]" />
          <span>Revolution Sliding Animation & Timing Configuration</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pt-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Slide Display Duration (Milliseconds)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                step={500}
                min={2000}
                max={20000}
                value={settings.heroAutoplayDuration || 4000}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    heroAutoplayDuration: Number(e.target.value),
                  })
                }
                className="w-32 px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 bg-white"
              />
              <span className="text-xs text-slate-500 font-medium">
                {((settings.heroAutoplayDuration || 4000) / 1000).toFixed(1)} seconds per slide
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Outgoing slide slides horizontally to the left (0% to -100%).
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Horizontal Slide Transition Speed (Milliseconds)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                step={50}
                min={400}
                max={2500}
                value={settings.heroTransitionSpeed || 900}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    heroTransitionSpeed: Number(e.target.value),
                  })
                }
                className="w-32 px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 bg-white"
              />
              <span className="text-xs text-slate-500 font-medium">
                {settings.heroTransitionSpeed || 900}ms smooth easing
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Incoming slide enters seamlessly from the right (+100% to 0%).
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-100 flex flex-col justify-center">
            <span className="text-[11px] font-extrabold text-blue-900 uppercase tracking-wide">
              Horizontal Sliding Guarantee
            </span>
            <p className="text-[11px] text-blue-700 mt-0.5 leading-relaxed">
              GPU-accelerated dual-slide animation moves outgoing and incoming slides simultaneously with zero blank gaps.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Live Interactive Device Preview (Desktop vs Mobile) */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#FF7900]" />
              <span>Real-Time Storefront Slide Preview</span>
            </h4>
            <p className="text-xs text-slate-500">
              Select which slide to inspect and preview across Desktop and Mobile viewports.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Slide selector pills */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {slides.map((s, idx) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedPreviewIdx(idx)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors ${
                    selectedPreviewIdx === idx
                      ? 'bg-[#061B45] text-white'
                      : 'text-slate-600 hover:text-black'
                  }`}
                >
                  Slide #{idx + 1}
                </button>
              ))}
            </div>

            {/* Device Switcher */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setPreviewDevice('desktop')}
                className={`p-1.5 rounded-lg flex items-center gap-1 text-xs font-bold transition-colors ${
                  previewDevice === 'desktop'
                    ? 'bg-white text-[#061B45] shadow-sm'
                    : 'text-slate-500 hover:text-black'
                }`}
                title="Desktop Preview"
              >
                <Monitor className="w-4 h-4" />
                <span className="hidden sm:inline">Desktop</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewDevice('mobile')}
                className={`p-1.5 rounded-lg flex items-center gap-1 text-xs font-bold transition-colors ${
                  previewDevice === 'mobile'
                    ? 'bg-white text-[#061B45] shadow-sm'
                    : 'text-slate-500 hover:text-black'
                }`}
                title="Mobile Phone Frame Preview"
              >
                <Smartphone className="w-4 h-4" />
                <span className="hidden sm:inline">Mobile</span>
              </button>
            </div>
          </div>
        </div>

        {/* Preview Frame */}
        {previewSlide && (
          <div className="flex justify-center p-4 bg-slate-900 rounded-2xl overflow-hidden">
            {previewDevice === 'desktop' ? (
              // Desktop Viewport
              <div className="relative w-full h-80 rounded-xl overflow-hidden shadow-2xl flex items-center p-8 bg-[#061B45]">
                <img
                  src={previewSlide.backgroundImage}
                  alt="Desktop preview"
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{
                    objectPosition: previewSlide.backgroundPosition || 'center right',
                  }}
                />
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: `linear-gradient(90deg, #061B45 0%, rgba(6, 27, 69, ${
                      previewSlide.overlayOpacity ?? 0.72
                    }) 45%, rgba(6, 27, 69, 0.3) 100%)`,
                  }}
                />
                <div className="relative z-10 max-w-lg space-y-3 text-left">
                  <span className="px-3 py-1 rounded-full bg-white/10 text-[#FF9200] text-[10px] font-bold uppercase tracking-wider">
                    {previewSlide.badge}
                  </span>
                  <h2 className="text-2xl font-black text-white leading-tight">
                    {previewSlide.headline}
                  </h2>
                  <p className="text-xs text-slate-200 line-clamp-2">
                    {previewSlide.supportingText}
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="btn-zeek-orange px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider">
                      {previewSlide.cta1Label}
                    </span>
                    {previewSlide.cta2Label && (
                      <span className="px-4 py-2 rounded-lg text-xs font-bold bg-[#071C3F] border border-white/20 text-white">
                        {previewSlide.cta2Label}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              // Mobile Smartphone Frame
              <div className="relative w-[280px] h-[520px] bg-black rounded-[42px] p-3 shadow-2xl border-4 border-slate-700 flex flex-col justify-between">
                <div className="relative w-full h-full rounded-[32px] overflow-hidden bg-[#061B45] flex flex-col justify-between p-5 text-left">
                  <img
                    src={previewSlide.backgroundImage}
                    alt="Mobile preview"
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{
                      objectPosition: previewSlide.backgroundPosition || 'center center',
                    }}
                  />
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: `linear-gradient(180deg, rgba(6, 27, 69, 0.4) 0%, rgba(6, 27, 69, ${
                        previewSlide.overlayOpacity ?? 0.72
                      }) 60%, #061B45 100%)`,
                    }}
                  />
                  <div className="relative z-10 pt-4">
                    <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-[#FF9200] text-[9px] font-bold uppercase">
                      {previewSlide.badge}
                    </span>
                  </div>
                  <div className="relative z-10 space-y-2 pb-2">
                    <h3 className="text-base font-black text-white leading-snug">
                      {previewSlide.headline}
                    </h3>
                    <p className="text-[10px] text-slate-200 line-clamp-2">
                      {previewSlide.supportingText}
                    </p>
                    <div className="flex flex-col gap-1.5 pt-1">
                      <span className="btn-zeek-orange py-2 rounded-lg text-[10px] font-bold uppercase text-center">
                        {previewSlide.cta1Label}
                      </span>
                      {previewSlide.cta2Label && (
                        <span className="py-1.5 rounded-lg text-[9px] font-bold bg-white/10 text-white text-center border border-white/20">
                          {previewSlide.cta2Label}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Slides Cards List (Drag-and-Drop, Reordering, Form Controls) */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-extrabold text-[#061B45] uppercase tracking-wider">
            Slide Inventory ({slides.length} Slides)
          </h4>
          <span className="text-xs text-slate-500">
            Tip: Drag items or use Up/Down arrows to rearrange rotation order.
          </span>
        </div>

        {slides.map((slide, idx) => (
          <div
            key={slide.id}
            draggable
            onDragStart={() => handleDragStart(idx)}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(idx)}
            className={`p-6 rounded-3xl border transition-all ${
              slide.isActive
                ? 'bg-white border-slate-200 shadow-sm'
                : 'bg-slate-50 border-dashed border-slate-300 opacity-65'
            } ${draggedSlideIdx === idx ? 'border-orange-500 ring-2 ring-orange-200' : ''}`}
          >
            {/* Card Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div
                  className="p-1 rounded cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-700"
                  title="Drag to rearrange"
                >
                  <GripVertical className="w-5 h-5" />
                </div>

                <span className="w-8 h-8 rounded-xl bg-[#061B45] text-white text-xs font-black flex items-center justify-center">
                  #{idx + 1}
                </span>

                <div>
                  <h5 className="text-xs font-bold text-slate-800">
                    {slide.headline ? slide.headline.substring(0, 45) : `Slide ${idx + 1}`}
                  </h5>
                  <span className="text-[10px] text-slate-400 font-mono">ID: {slide.id}</span>
                </div>

                <label className="inline-flex items-center gap-2 cursor-pointer ml-4">
                  <input
                    type="checkbox"
                    checked={slide.isActive}
                    onChange={(e) => {
                      const newSlides = [...slides];
                      newSlides[idx].isActive = e.target.checked;
                      setSlides(newSlides);
                    }}
                    className="w-4 h-4 text-[#FF7900] rounded"
                  />
                  <span
                    className={`text-xs font-bold ${
                      slide.isActive ? 'text-emerald-700' : 'text-slate-400'
                    }`}
                  >
                    {slide.isActive ? 'Active on Storefront' : 'Disabled'}
                  </span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={() => handleMoveSlide(idx, 'up')}
                  className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 disabled:opacity-30 text-slate-600 transition-colors"
                  title="Move Up"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={idx === slides.length - 1}
                  onClick={() => handleMoveSlide(idx, 'down')}
                  className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 disabled:opacity-30 text-slate-600 transition-colors"
                  title="Move Down"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDuplicateSlide(idx)}
                  className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
                  title="Duplicate Slide"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteSlide(idx)}
                  className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
                  title="Delete Slide"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Card Content Form */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-5">
              
              {/* Form Fields Column */}
              <div className="lg:col-span-7 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Eyebrow Badge Text:
                    </label>
                    <input
                      type="text"
                      value={slide.badge}
                      onChange={(e) => {
                        const newSlides = [...slides];
                        newSlides[idx].badge = e.target.value;
                        setSlides(newSlides);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                      placeholder="e.g. WELCOME TO ZEEK SOFTWARES"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Visual Presentation Type:
                    </label>
                    <select
                      value={slide.visualType || 'photo'}
                      onChange={(e) => {
                        const newSlides = [...slides];
                        newSlides[idx].visualType = e.target.value as any;
                        newSlides[idx].enableFloatingLogos = e.target.value === 'floating_logos';
                        setSlides(newSlides);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-semibold"
                    >
                      <option value="photo">Cinematic Photography (Human Subject)</option>
                      <option value="floating_logos">3D Floating Software Logos Matrix (Slide 2)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Slide Headline:
                  </label>
                  <input
                    type="text"
                    value={slide.headline}
                    onChange={(e) => {
                      const newSlides = [...slides];
                      newSlides[idx].headline = e.target.value;
                      setSlides(newSlides);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-[#061B45]"
                    placeholder="e.g. Premium Tools. Limitless Possibilities."
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Supporting Description:
                  </label>
                  <textarea
                    rows={3}
                    value={slide.supportingText}
                    onChange={(e) => {
                      const newSlides = [...slides];
                      newSlides[idx].supportingText = e.target.value;
                      setSlides(newSlides);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs leading-relaxed"
                    placeholder="Describe what users get..."
                  />
                </div>

                {/* CTAs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Primary CTA Label:
                    </label>
                    <input
                      type="text"
                      value={slide.cta1Label}
                      onChange={(e) => {
                        const newSlides = [...slides];
                        newSlides[idx].cta1Label = e.target.value;
                        setSlides(newSlides);
                      }}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Primary CTA Action:
                    </label>
                    <select
                      value={slide.cta1Action}
                      onChange={(e) => {
                        const newSlides = [...slides];
                        newSlides[idx].cta1Action = e.target.value;
                        setSlides(newSlides);
                      }}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white"
                    >
                      <option value="products">All Products Page</option>
                      <option value="products-ai">AI & Productivity Filter</option>
                      <option value="products-creative">Creative Design Filter</option>
                      <option value="whatsapp">Chat on WhatsApp</option>
                      <option value="about">About Page</option>
                      <option value="contact">Contact Page</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Secondary CTA Label (Optional):
                    </label>
                    <input
                      type="text"
                      value={slide.cta2Label || ''}
                      onChange={(e) => {
                        const newSlides = [...slides];
                        newSlides[idx].cta2Label = e.target.value;
                        setSlides(newSlides);
                      }}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 font-bold"
                      placeholder="e.g. BECOME AN AFFILIATE"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Secondary CTA Action:
                    </label>
                    <select
                      value={slide.cta2Action || 'whatsapp'}
                      onChange={(e) => {
                        const newSlides = [...slides];
                        newSlides[idx].cta2Action = e.target.value;
                        setSlides(newSlides);
                      }}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white"
                    >
                      <option value="whatsapp">WhatsApp Consultation</option>
                      <option value="affiliate">Affiliate Registration Modal</option>
                      <option value="community">WhatsApp Community Group</option>
                      <option value="products">Explore Products</option>
                      <option value="contact">Contact Page</option>
                      <option value="about">About Us</option>
                    </select>
                  </div>
                </div>

                {/* Composition & Opacity Controls */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Slide Background Position:
                    </label>
                    <select
                      value={slide.backgroundPosition || 'center right'}
                      onChange={(e) => {
                        const newSlides = [...slides];
                        newSlides[idx].backgroundPosition = e.target.value;
                        setSlides(newSlides);
                      }}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white font-medium"
                    >
                      <option value="center right">Center Right (Recommended for human subjects)</option>
                      <option value="center center">Center Center (Balanced)</option>
                      <option value="top right">Top Right</option>
                      <option value="top center">Top Center</option>
                      <option value="center left">Center Left</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-700 uppercase">
                        Dark Navy Overlay Opacity:
                      </label>
                      <span className="font-mono text-xs font-bold text-[#061B45]">
                        {Math.round((slide.overlayOpacity ?? 0.72) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.3}
                      max={0.95}
                      step={0.02}
                      value={slide.overlayOpacity ?? 0.72}
                      onChange={(e) => {
                        const newSlides = [...slides];
                        newSlides[idx].overlayOpacity = Number(e.target.value);
                        setSlides(newSlides);
                      }}
                      className="w-full accent-[#FF7900]"
                    />
                    <span className="text-[10px] text-slate-400">
                      Higher opacity ensures sharp text contrast against photography.
                    </span>
                  </div>
                </div>
              </div>

              {/* Background Photography & Direct Upload Column */}
              <div className="lg:col-span-5 space-y-4">
                <label className="block text-[11px] font-bold text-slate-600 uppercase">
                  Cinematic Background Photography:
                </label>

                {/* Direct Upload Dropzone */}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleUploadBackground(idx, file);
                  }}
                  onClick={() => {
                    const input = document.getElementById(`slide-bg-${idx}`) as HTMLInputElement;
                    input?.click();
                  }}
                  className="border-2 border-dashed border-slate-300 hover:border-[#FF7900] rounded-2xl p-5 text-center bg-slate-50 hover:bg-orange-50/20 transition-all cursor-pointer group flex flex-col items-center justify-center gap-2"
                >
                  <input
                    type="file"
                    id={`slide-bg-${idx}`}
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadBackground(idx, file);
                    }}
                  />

                  {uploadingIndex === idx ? (
                    <div className="py-4 flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 text-[#FF7900] animate-spin" />
                      <span className="text-xs font-bold text-[#FF7900]">
                        Uploading image to durable storage...
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-500 group-hover:text-[#FF7900]">
                        <Upload className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-slate-700">
                        Upload New Slide Image
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Drag and drop or click to browse (PNG, JPG, WEBP up to 15MB)
                      </span>
                    </>
                  )}
                </div>

                {/* Backdrop Thumbnail & Live Position Indicator */}
                <div className="relative h-36 rounded-2xl overflow-hidden bg-[#061B45] border border-slate-200 shadow-inner">
                  <img
                    src={slide.backgroundImage}
                    alt="Backdrop thumbnail"
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{
                      objectPosition: slide.backgroundPosition || 'center right',
                      opacity: 0.45,
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#061B45] via-[#061B45]/80 to-transparent pointer-events-none" />
                  <div className="relative z-10 p-4 space-y-1 max-w-[80%] text-left">
                    <span className="text-[9px] font-bold text-[#FF9200] uppercase tracking-wider block">
                      {slide.badge}
                    </span>
                    <h6 className="text-xs font-black text-white line-clamp-1">
                      {slide.headline}
                    </h6>
                    <p className="text-[10px] text-slate-300 line-clamp-1">
                      {slide.supportingText}
                    </p>
                    <div className="pt-2 flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[#FF7900] text-white">
                        {slide.cta1Label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Recommended Presets */}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                    Or Select High-Res Authentic Preset:
                  </span>
                  <div className="space-y-1.5">
                    {PRESET_CINEMATIC_PHOTOS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          const newSlides = [...slides];
                          newSlides[idx].backgroundImage = preset.url;
                          setSlides(newSlides);
                        }}
                        className={`w-full py-1.5 px-3 rounded-xl text-[11px] font-semibold text-left flex items-center justify-between transition-colors border ${
                          slide.backgroundImage === preset.url
                            ? 'bg-orange-50 border-orange-300 text-orange-900 font-bold'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span className="truncate">{preset.label}</span>
                        {slide.backgroundImage === preset.url && (
                          <Check className="w-3.5 h-3.5 text-[#FF7900] shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 5. Sticky Bottom Action Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 sticky bottom-4 z-20">
        <div className="text-left">
          <span className="text-xs font-extrabold text-[#061B45] block">
            Save Slider Modifications
          </span>
          <span className="text-[11px] text-slate-500">
            Updates are saved to persistent storage and immediately applied to storefront.
          </span>
        </div>

        <button
          type="button"
          disabled={isSaving}
          onClick={handleSaveAll}
          className="btn-zeek-orange px-8 py-3.5 rounded-xl text-xs sm:text-sm font-extrabold uppercase tracking-wider shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving Changes...</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              <span>Save All Hero Slides</span>
            </>
          )}
        </button>
      </div>

      {showRestoreConfirm && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 p-6 space-y-4">
            <h4 className="text-base font-black text-[#061B45]">Restore Default Hero Slides?</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Restore the 4 original luxury hero slides? Any custom slide modifications will be overwritten.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isRestoring}
                onClick={() => setShowRestoreConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isRestoring}
                onClick={confirmRestoreDefaults}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 flex items-center gap-1.5"
              >
                {isRestoring && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Restore Slides</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
