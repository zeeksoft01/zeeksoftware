import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowRight,
  MessageCircle,
  Users,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Bot,
  Palette,
  Film,
  Send,
  Sliders,
  Layers,
  Pause,
  Play,
  RotateCcw,
  ExternalLink,
  Laptop,
  Smartphone,
  Video,
  Feather,
  Cpu,
  Monitor,
  Check,
} from 'lucide-react';
import { HeroSlide, SiteSettings } from '../types';

interface HeroSliderProps {
  slides: HeroSlide[];
  onNavigate: (tab: string, filter?: string) => void;
  onOpenAffiliate?: () => void;
  settings: SiteSettings;
}

// 13 Software brand marks for Slide 2 Floating Matrix
interface FloatingToolLogo {
  name: string;
  tagline: string;
  accent: string;
  glow: string;
  initials: string;
  classDelay: string;
  size: 'lg' | 'md' | 'sm';
}

const FLOATING_TOOLS: FloatingToolLogo[] = [
  { name: 'ChatGPT Plus', tagline: 'OpenAI GPT-4o', accent: '#10A37F', glow: 'rgba(16,163,127,0.3)', initials: 'GPT', classDelay: 'animate-float-1', size: 'lg' },
  { name: 'Canva Pro', tagline: 'Brand Studio & 4K', accent: '#00C4CC', glow: 'rgba(0,196,204,0.3)', initials: 'CAN', classDelay: 'animate-float-2', size: 'lg' },
  { name: 'CapCut Pro', tagline: '4K Multi-Track', accent: '#FF5E62', glow: 'rgba(255,94,98,0.3)', initials: 'CAP', classDelay: 'animate-float-3', size: 'md' },
  { name: 'Claude Pro', tagline: 'Anthropic Sonnet 3.5', accent: '#D97706', glow: 'rgba(217,119,6,0.3)', initials: 'CLD', classDelay: 'animate-float-1', size: 'md' },
  { name: 'Google Gemini', tagline: '2M Token Context', accent: '#8B5CF6', glow: 'rgba(139,92,246,0.3)', initials: 'GEM', classDelay: 'animate-float-2', size: 'lg' },
  { name: 'Grammarly', tagline: 'Tone & Clarity AI', accent: '#15C39A', glow: 'rgba(21,195,154,0.3)', initials: 'GRM', classDelay: 'animate-float-3', size: 'sm' },
  { name: 'QuillBot Pro', tagline: 'Research & Paraphraser', accent: '#4CAF50', glow: 'rgba(76,175,80,0.3)', initials: 'QUI', classDelay: 'animate-float-1', size: 'sm' },
  { name: 'Adobe Express', tagline: 'Creative Suite AI', accent: '#FA0F00', glow: 'rgba(250,15,0,0.3)', initials: 'ADB', classDelay: 'animate-float-2', size: 'md' },
  { name: 'Lovable Pro', tagline: 'Prompt to Fullstack', accent: '#EC4899', glow: 'rgba(236,72,153,0.3)', initials: 'LVB', classDelay: 'animate-float-3', size: 'md' },
  { name: 'Camtasia', tagline: 'Studio Recording', accent: '#0D9488', glow: 'rgba(13,148,136,0.3)', initials: 'CAM', classDelay: 'animate-float-1', size: 'sm' },
  { name: 'Renderforest', tagline: 'Motion & Animations', accent: '#3B82F6', glow: 'rgba(59,130,246,0.3)', initials: 'REN', classDelay: 'animate-float-2', size: 'sm' },
  { name: 'Zoom Pro', tagline: 'Cloud Collaboration', accent: '#2563EB', glow: 'rgba(37,99,235,0.3)', initials: 'ZM', classDelay: 'animate-float-3', size: 'sm' },
  { name: 'Netflix UHD', tagline: 'Ultra 4K Stream', accent: '#E50914', glow: 'rgba(229,9,20,0.3)', initials: 'NFLX', classDelay: 'animate-float-1', size: 'sm' },
];

export const HeroSlider: React.FC<HeroSliderProps> = ({
  slides,
  onNavigate,
  onOpenAffiliate,
  settings,
}) => {
  const activeSlides = slides.filter((s) => s.isActive);
  const totalSlides = activeSlides.length;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [transitionState, setTransitionState] = useState<{
    fromIdx: number;
    toIdx: number;
    direction: 'next' | 'prev';
    inProgress: boolean;
  } | null>(null);

  const [isHovered, setIsHovered] = useState(false);
  const [pauseSecondsLeft, setPauseSecondsLeft] = useState(0);
  const [progressKey, setProgressKey] = useState(0);

  // Timing configuration: 4 seconds visible, 900ms transition
  const AUTO_INTERVAL = settings.heroAutoplayDuration || 4000;
  const TRANSITION_DURATION = settings.heroTransitionSpeed || 900;

  // Touch swipe refs
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check reduced motion
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Horizontal Revolution-Style sliding transition
  const goToSlide = useCallback(
    (targetIdx: number, direction: 'next' | 'prev' = 'next') => {
      if (transitionState !== null || totalSlides <= 1) return;
      if (targetIdx === currentIndex) return;

      if (prefersReducedMotion) {
        setCurrentIndex(targetIdx);
        setProgressKey((k) => k + 1);
        return;
      }

      // Initialize dual-slide transition
      setTransitionState({
        fromIdx: currentIndex,
        toIdx: targetIdx,
        direction,
        inProgress: false,
      });

      // Trigger translate on the very next render frame
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTransitionState((prev) => (prev ? { ...prev, inProgress: true } : null));
        });
      });

      // Finalize transition when 900ms completes
      setTimeout(() => {
        setCurrentIndex(targetIdx);
        setTransitionState(null);
        setProgressKey((k) => k + 1);
      }, TRANSITION_DURATION);
    },
    [currentIndex, totalSlides, transitionState, prefersReducedMotion, TRANSITION_DURATION]
  );

  const handleNext = useCallback(() => {
    if (totalSlides <= 1) return;
    const nextIdx = (currentIndex + 1) % totalSlides;
    goToSlide(nextIdx, 'next');
  }, [currentIndex, totalSlides, goToSlide]);

  const handlePrev = useCallback(() => {
    if (totalSlides <= 1) return;
    const prevIdx = (currentIndex - 1 + totalSlides) % totalSlides;
    goToSlide(prevIdx, 'prev');
  }, [currentIndex, totalSlides, goToSlide]);

  // User click interaction pauses autoplay for 10s
  const handleUserInteraction = () => {
    setPauseSecondsLeft(10);
    if (holdTimerRef.current) clearInterval(holdTimerRef.current);

    holdTimerRef.current = setInterval(() => {
      setPauseSecondsLeft((prev) => {
        if (prev <= 1) {
          if (holdTimerRef.current) clearInterval(holdTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Keyboard navigation (Left / Right arrow keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        handleUserInteraction();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handleUserInteraction();
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev]);

  // Touch gestures for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const diffX = touchStartX.current - e.changedTouches[0].clientX;
    const diffY = touchStartY.current - e.changedTouches[0].clientY;

    // Verify horizontal swipe intent (more horizontal than vertical)
    if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY)) {
      handleUserInteraction();
      if (diffX > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  // Autoplay loop every 7 seconds, pauses on hover or user interaction hold
  useEffect(() => {
    if (totalSlides <= 1) return;

    if (!isHovered && pauseSecondsLeft === 0 && transitionState === null) {
      autoPlayTimerRef.current = setInterval(() => {
        handleNext();
      }, AUTO_INTERVAL);
    }

    return () => {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
    };
  }, [currentIndex, isHovered, pauseSecondsLeft, transitionState, totalSlides, AUTO_INTERVAL, handleNext]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
      if (holdTimerRef.current) clearInterval(holdTimerRef.current);
    };
  }, []);

  if (!totalSlides) return null;

  const currentSlide = activeSlides[currentIndex] || activeSlides[0];

  // CTA Action router
  const handleAction = (action: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    handleUserInteraction();

    if (action === 'products' || action === 'all') {
      onNavigate('products');
    } else if (action === 'affiliate') {
      if (onOpenAffiliate) onOpenAffiliate();
      else onNavigate('policies', 'affiliate');
    } else if (action === 'whatsapp' || action.startsWith('https://wa.me')) {
      const cleanNum = (settings.internationalWhatsApp || '2347045200361').replace(/\D/g, '');
      window.open(
        `https://wa.me/${cleanNum}?text=Hello%20Zeek%20Softwares%2C%20I%20want%20to%20learn%20more%20about%20your%20premium%20AI%20tools`,
        '_blank'
      );
    } else if (action === 'community' || action.includes('whatsapp.com')) {
      const communityUrl =
        settings.whatsappCommunityUrl ||
        'https://chat.whatsapp.com/GmuCpw6aMBf6D5vB0ESj0k?s=cl&p=a&mlu=4&ilr=4';
      window.open(communityUrl, '_blank');
    } else if (action.startsWith('http')) {
      window.open(action, '_blank');
    } else {
      onNavigate(action);
    }
  };

  // Render content of a specific slide
  const renderSlideContent = (slide: HeroSlide, isActiveSlide: boolean) => {
    const isFloatingLogos = slide.visualType === 'floating_logos' || slide.enableFloatingLogos;
    const overlayOpacity = slide.overlayOpacity !== undefined ? slide.overlayOpacity : 0.72;

    return (
      <div
        className="relative w-full h-full min-h-[640px] sm:min-h-[680px] lg:min-h-[720px] flex items-center overflow-hidden"
        style={{
          backgroundColor: '#061B45',
        }}
      >
        {/* Full-Bleed Cinematic Background Image */}
        <div
          className="absolute inset-0 w-full h-full bg-cover transition-transform duration-1000 ease-out"
          style={{
            backgroundImage: `url(${slide.backgroundImage})`,
            backgroundPosition: slide.backgroundPosition || 'center right',
            filter: 'contrast(1.04) brightness(0.96)',
          }}
        />

        {/* Tailored Luxury Gradient Overlay (Keeps text 100% legible while showing human subjects) */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(90deg, #061B45 0%, rgba(6, 27, 69, ${overlayOpacity}) 45%, rgba(6, 27, 69, ${
              overlayOpacity * 0.65
            }) 70%, rgba(6, 27, 69, 0.28) 100%)`,
          }}
        />

        {/* Ambient Warm Orange Lighting Glow */}
        <div className="absolute -top-32 right-12 w-[520px] h-[520px] bg-gradient-to-br from-[#FF7900]/15 via-orange-600/5 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-16 w-[440px] h-[440px] bg-gradient-to-tr from-[#061B45] to-[#071C3F] rounded-full blur-2xl pointer-events-none" />

        {/* Subtle Decorative Technical Grid Lines */}
        <div className="absolute inset-0 bg-[radial-gradient(#1e3a75_1px,transparent_1px)] [background-size:32px_32px] opacity-20 pointer-events-none" />

        {/* Main Content Layout (Full-Width Balanced 2-Column Split) */}
        <div className="w-full px-6 sm:px-14 lg:px-20 xl:px-24 py-14 sm:py-16 lg:py-20 pb-24 sm:pb-24 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 xl:gap-16 items-center w-full">
            
            {/* LEFT: Premium Editorial Typography & CTAs */}
            <div
              className={`lg:col-span-6 space-y-6 sm:space-y-7 text-left w-full ${
                isActiveSlide ? 'animate-luxury-in' : ''
              }`}
            >
              {/* Eyebrow Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[#FF9200] text-xs font-bold uppercase tracking-widest shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-[#FF7900]" />
                <span>{slide.badge}</span>
              </div>

              {/* Main Heading */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl xl:text-[56px] font-black tracking-tight text-white leading-[1.1] text-balance">
                {slide.headline.split('. ').map((part, i) => (
                  <span key={`${slide.id}-line-${i}`} className="block">
                    {i === 0 ? (
                      part
                    ) : (
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF7900] via-[#FF9200] to-amber-300">
                        {part}
                      </span>
                    )}
                  </span>
                ))}
              </h1>

              {/* Supporting Text */}
              <p className="text-sm sm:text-base lg:text-lg text-slate-200/90 font-normal leading-relaxed max-w-2xl">
                {slide.supportingText}
              </p>

              {/* High-End CTA Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  type="button"
                  onClick={(e) => handleAction(slide.cta1Action, e)}
                  className="btn-zeek-orange px-8 py-4 rounded-xl text-xs sm:text-sm font-extrabold uppercase tracking-wider flex items-center gap-2.5 shadow-xl hover:shadow-orange-500/30 transition-all hover:scale-[1.03] active:scale-[0.99] cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span>{slide.cta1Label}</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </button>

                {slide.cta2Label && (
                  <button
                    type="button"
                    onClick={(e) => handleAction(slide.cta2Action || 'whatsapp', e)}
                    className="px-7 py-4 rounded-xl text-xs sm:text-sm font-bold bg-[#071C3F]/80 hover:bg-[#0c2a63] text-white border border-white/20 backdrop-blur-md flex items-center gap-2.5 transition-all hover:scale-[1.02] active:scale-[0.99] shadow-lg cursor-pointer whitespace-nowrap shrink-0"
                  >
                    {slide.cta2Action === 'affiliate' ? (
                      <Users className="w-4 h-4 text-[#FF9200] shrink-0" />
                    ) : slide.cta2Action === 'community' ? (
                      <Users className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                    <span>{slide.cta2Label}</span>
                  </button>
                )}
              </div>

              {/* Refined Trust Badges */}
              <div className="pt-3 flex flex-wrap items-center gap-6 text-xs text-slate-300 font-medium border-t border-white/10">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Subsidized Naira Pricing</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#FF7900] shrink-0" />
                  <span>Instant Digital Delivery</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-300 shrink-0" />
                  <span>Dedicated Expert Support</span>
                </div>
              </div>
            </div>

            {/* RIGHT: Full-Width Balanced Software Grid (Slide 2) or Framed Editorial Visual Showcase (Slides 1, 3, 4) */}
            <div className="lg:col-span-6 relative flex items-center justify-center lg:justify-end w-full min-h-[280px] sm:min-h-[340px] lg:min-h-[440px]">
              {isFloatingLogos ? (
                /* Slide 2: Floating 3D Product Matrix with Glass Tiles */
                <div className="relative w-full max-w-2xl h-[400px] sm:h-[440px] flex items-center justify-center">
                  {/* Subtle Background Glow Ring */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-[#FF7900]/20 via-blue-600/15 to-purple-600/10 rounded-3xl blur-2xl pointer-events-none" />

                  {/* 3D Glass Tiles Grid */}
                  <div className="relative z-10 w-full grid grid-cols-3 gap-3 sm:gap-4 p-2 sm:p-3">
                    {FLOATING_TOOLS.slice(0, 9).map((tool) => (
                      <div
                        key={tool.name}
                        className={`group relative p-3.5 sm:p-4 rounded-2xl bg-[#071C3F]/80 backdrop-blur-md border border-white/15 shadow-xl transition-all duration-300 hover:scale-105 hover:bg-[#0c2a63]/95 hover:border-orange-500/40 cursor-pointer ${
                          tool.classDelay
                        }`}
                        style={{
                          boxShadow: `0 10px 30px -10px ${tool.glow}`,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate('products');
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-[11px] text-white shadow-md"
                            style={{ backgroundColor: tool.accent }}
                          >
                            {tool.initials}
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#FF9200] transition-colors" />
                        </div>
                        <h4 className="text-xs font-bold text-white tracking-tight truncate">
                          {tool.name}
                        </h4>
                        <span className="text-[10px] text-slate-300 truncate block">
                          {tool.tagline}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Additional perimeter labels */}
                  <div className="hidden sm:block absolute -top-3 right-2 px-3 py-1.5 rounded-xl bg-[#061B45]/90 border border-white/20 text-[11px] font-bold text-slate-200 backdrop-blur-md shadow-lg animate-float-2">
                    <span className="text-[#FF7900] mr-1.5">+</span>Renderforest & Camtasia
                  </div>
                  <div className="hidden sm:block absolute -bottom-3 left-2 px-3 py-1.5 rounded-xl bg-[#061B45]/90 border border-white/20 text-[11px] font-bold text-slate-200 backdrop-blur-md shadow-lg animate-float-3">
                    <span className="text-emerald-400 mr-1.5">+</span>Zoom & Netflix UHD
                  </div>
                </div>
              ) : (
                /* Slide 1, 3, 4: Editorial Visual Frame Balancing the Right Half Across Full Width */
                <div className="relative w-full max-w-2xl rounded-3xl overflow-hidden border border-white/15 bg-[#071C3F]/80 shadow-2xl backdrop-blur-md">
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-gradient-to-br from-[#0b275f] via-[#071C3F] to-[#132f6b]">
                    {slide.backgroundImage && (
                      <img
                        src={slide.backgroundImage}
                        alt={slide.headline}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                        className="w-full h-full object-cover object-center transition-transform duration-700"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#061B45] via-[#061B45]/30 to-transparent pointer-events-none" />

                    {/* Integrated Store Guarantee Bar */}
                    <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-3 pointer-events-none">
                      <div className="bg-[#061B45]/85 backdrop-blur-md border border-white/15 px-3.5 py-2 rounded-xl shadow-lg flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-[#FF7900] flex items-center justify-center text-white font-bold text-[11px] shadow-md shrink-0">
                          ZS
                        </div>
                        <div className="leading-tight">
                          <span className="text-[10px] text-orange-400 font-bold uppercase tracking-wider block">
                            Verified Software Store
                          </span>
                          <span className="text-xs font-extrabold text-white">
                            Subsidized Nigerian Access
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick-Explore Popular Plans Footer Strip */}
                  <div className="p-4 sm:p-5 bg-[#061B45]/95 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {FLOATING_TOOLS.slice(0, 4).map((tool) => (
                      <button
                        key={tool.name}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate('products');
                        }}
                        className="group flex items-center gap-2.5 p-2.5 rounded-xl bg-[#0b2353]/80 hover:bg-[#113170] border border-white/10 hover:border-[#FF7900]/50 transition-all text-left cursor-pointer"
                      >
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-[10px] text-white shrink-0"
                          style={{ backgroundColor: tool.accent }}
                        >
                          {tool.initials}
                        </div>
                        <div className="min-w-0">
                          <span className="text-[11px] font-bold text-white block truncate group-hover:text-[#FF9200] transition-colors">
                            {tool.name}
                          </span>
                          <span className="text-[9px] text-slate-300 block truncate">
                            {tool.tagline}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className="relative w-full overflow-hidden bg-[#061B45] text-white select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleUserInteraction}
    >
      {/* Revolution-Style Horizontal Sliding Container */}
      <div className="relative w-full min-h-[640px] sm:min-h-[680px] lg:min-h-[720px] overflow-hidden">
        {transitionState ? (
          // During transition: Both outgoing and incoming slides move horizontally edge-to-edge
          <>
            {/* Outgoing Slide */}
            <div
              className="absolute inset-0 w-full h-full will-change-transform"
              style={{
                transform: transitionState.inProgress
                  ? `translate3d(${transitionState.direction === 'next' ? '-100%' : '100%'}, 0, 0)`
                  : 'translate3d(0, 0, 0)',
                transition: `transform ${TRANSITION_DURATION}ms cubic-bezier(0.25, 1, 0.5, 1)`,
              }}
            >
              {renderSlideContent(activeSlides[transitionState.fromIdx], false)}
            </div>

            {/* Incoming Slide */}
            <div
              className="absolute inset-0 w-full h-full will-change-transform"
              style={{
                transform: transitionState.inProgress
                  ? 'translate3d(0, 0, 0)'
                  : `translate3d(${transitionState.direction === 'next' ? '100%' : '-100%'}, 0, 0)`,
                transition: `transform ${TRANSITION_DURATION}ms cubic-bezier(0.25, 1, 0.5, 1)`,
              }}
            >
              {renderSlideContent(activeSlides[transitionState.toIdx], true)}
            </div>
          </>
        ) : (
          // Steady State: Single active slide rendered
          <div className="w-full h-full will-change-transform">
            {renderSlideContent(currentSlide, true)}
          </div>
        )}

        {/* Navigation Arrows (Left & Right Sides) */}
        {totalSlides > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleUserInteraction();
                handlePrev();
              }}
              className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 z-30 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#061B45]/70 hover:bg-[#FF7900] text-white border border-white/20 backdrop-blur-md flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 shadow-xl cursor-pointer"
              aria-label="Previous Slide"
              title="Previous slide (Left Arrow)"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleUserInteraction();
                handleNext();
              }}
              className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 z-30 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#061B45]/70 hover:bg-[#FF7900] text-white border border-white/20 backdrop-blur-md flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 shadow-xl cursor-pointer"
              aria-label="Next Slide"
              title="Next slide (Right Arrow)"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        {/* Elegant Full-Width Bottom Progress Bar & Carousel Indicators */}
        <div className="absolute bottom-6 left-0 right-0 z-30 w-full px-6 sm:px-14 lg:px-20 xl:px-24">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-white/10">
            
            {/* Slide Indicator Bars */}
            <div className="flex items-center gap-2.5">
              {activeSlides.map((slide, idx) => {
                const isActive = currentIndex === idx;
                return (
                  <button
                    key={`${slide.id}-${idx}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUserInteraction();
                      goToSlide(idx, idx > currentIndex ? 'next' : 'prev');
                    }}
                    className="group relative py-2 focus:outline-none cursor-pointer"
                    aria-label={`Go to slide ${idx + 1}`}
                  >
                    <div
                      className={`h-1.5 rounded-full transition-all duration-300 relative overflow-hidden ${
                        isActive
                          ? 'w-12 sm:w-16 bg-white/20'
                          : 'w-4 sm:w-6 bg-white/25 group-hover:bg-white/50'
                      }`}
                    >
                      {isActive && !isHovered && pauseSecondsLeft === 0 && (
                        <div
                          key={`progress-${currentIndex}-${progressKey}`}
                          className="absolute inset-y-0 left-0 bg-[#FF7900] rounded-full shadow-md shadow-orange-500/50"
                          style={{
                            animation: `hero-progress-fill ${AUTO_INTERVAL}ms linear forwards`,
                          }}
                        />
                      )}
                      {isActive && (isHovered || pauseSecondsLeft > 0) && (
                        <div className="absolute inset-0 bg-[#FF7900] rounded-full shadow-md shadow-orange-500/50" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Slide Counter, Interaction Hold Badge, and Play/Pause Indicator */}
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <span className="font-mono text-slate-400">
                0{currentIndex + 1} / 0{totalSlides}
              </span>

              {pauseSecondsLeft > 0 ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF7900]/20 border border-[#FF7900]/50 text-[#FF9200] text-[11px] font-bold">
                  <Pause className="w-3 h-3 text-[#FF7900]" />
                  <span>Interaction hold: {pauseSecondsLeft}s</span>
                </div>
              ) : isHovered ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 text-[11px]">
                  <Pause className="w-3 h-3 text-amber-400" />
                  <span>Paused on hover</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800/80 border border-slate-700 text-slate-400 text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block mr-1" />
                  <span>Autoplay ({Math.round(AUTO_INTERVAL / 1000)}s)</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
