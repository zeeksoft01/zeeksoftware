import React, { useState, useEffect } from 'react';
import {
  Shield,
  Package,
  ShoppingCart,
  Settings,
  FileText,
  Star,
  Mail,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Clock,
  Check,
  X,
  Edit,
  Trash2,
  Plus,
  Search,
  ExternalLink,
  DollarSign,
  Key,
  Eye,
  LogOut,
  RefreshCw,
  Building,
  Coins,
  Send,
  MessageCircle,
  Upload,
  Image as ImageIcon,
  Loader2,
  ArrowUp,
  ArrowDown,
  Copy,
  Sparkles,
  Layers,
  Sliders,
  GripVertical,
  Smartphone,
  Monitor,
  RotateCcw,
  Download,
  Reply,
} from 'lucide-react';
import {
  Product,
  Order,
  CustomerReview,
  SiteSettings,
  FAQItem,
  LegalPolicies,
  HeroSlide,
  ContactMessage,
  InquiryStatus,
  AuditLog,
  Affiliate,
  AffiliateWithdrawal,
  ReferralAttribution,
  SystemUser,
  UserRole,
  UserStatus,
} from '../types';
import { api } from '../api/client';
import { HeroSliderManager } from '../components/admin/HeroSliderManager';
import { BrandIdentitySettings } from '../components/admin/BrandIdentitySettings';
import { AffiliateProgrammeAdmin } from '../components/admin/AffiliateProgrammeAdmin';
import { EmailMarketingAdmin } from '../components/admin/EmailMarketingAdmin';
import { ProductDeliveryAdmin } from '../components/admin/ProductDeliveryAdmin';

interface AdminPageProps {
  authToken?: string | null;
  authUser?: SystemUser | null;
  onLogout?: () => void;
  onClose: () => void;
  onRefreshPublicData: () => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({
  authToken: propAuthToken,
  authUser: propAuthUser,
  onLogout: propOnLogout,
  onClose,
  onRefreshPublicData,
}) => {
  const token = propAuthToken && propAuthUser?.role === 'admin' ? propAuthToken : null;
  const currentAdmin =
    propAuthUser && propAuthUser.role === 'admin'
      ? {
          _id: propAuthUser._id,
          email: propAuthUser.email,
          name: propAuthUser.fullName || propAuthUser.name || propAuthUser.email,
          role: propAuthUser.role,
        }
      : null;

  // Active admin tab
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'orders'
    | 'products'
    | 'email_marketing'
    | 'product_delivery'
    | 'hero'
    | 'branding'
    | 'cms'
    | 'settings'
    | 'reviews'
    | 'inquiries'
    | 'affiliates'
    | 'admins'
    | 'logs'
  >('overview');

  const [sliderPreviewDevice, setSliderPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [draggedSlideIdx, setDraggedSlideIdx] = useState<number | null>(null);

  // Dashboard Data State
  const [stats, setStats] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<CustomerReview[]>([]);
  const [inquiries, setInquiries] = useState<ContactMessage[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [referredCustomers, setReferredCustomers] = useState<ReferralAttribution[]>([]);
  const [withdrawals, setWithdrawals] = useState<AffiliateWithdrawal[]>([]);
  const [adminUsers, setAdminUsers] = useState<SystemUser[]>([]);
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [userStatusFilter, setUserStatusFilter] = useState<string>('all');
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [exchangeRateInput, setExchangeRateInput] = useState<string>('1550');
  const [syncUsdtWithUsdRate, setSyncUsdtWithUsdRate] = useState<boolean>(false);
  const [isSavingExchangeRate, setIsSavingExchangeRate] = useState<boolean>(false);
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [policies, setPolicies] = useState<LegalPolicies | null>(null);

  // User / Admin Registration Modal State
  const [showRegisterAdminModal, setShowRegisterAdminModal] = useState(false);
  const [isRegisteringAdmin, setIsRegisteringAdmin] = useState(false);
  const [newAdminForm, setNewAdminForm] = useState<{
    fullName: string;
    email: string;
    phone: string;
    password: string;
    role: UserRole;
    status: UserStatus;
    isVerified: boolean;
  }>({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    role: 'affiliate',
    status: 'active',
    isVerified: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [saveErrorMsg, setSaveErrorMsg] = useState('');

  // Selected Order for Modal View / Action
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderCredentials, setOrderCredentials] = useState('');

  // Product Edit & Confirmation Modals
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    tone?: 'danger' | 'warning';
    onConfirm: () => Promise<void>;
  } | null>(null);
  const [isConfirmingAction, setIsConfirmingAction] = useState(false);

  // Direct Image Upload State
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Search in Orders
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');

  // Inquiries Direct Reply & Status Workflow state
  const [inquiryStatusFilter, setInquiryStatusFilter] = useState<'all' | InquiryStatus>('all');
  const [replyingInquiryId, setReplyingInquiryId] = useState<string | null>(null);
  const [replySubject, setReplySubject] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [replyNextStatus, setReplyNextStatus] = useState<InquiryStatus>('Replied');
  const [sendingReply, setSendingReply] = useState(false);
  const [replyFeedback, setReplyFeedback] = useState<{
    inquiryId: string;
    ok: boolean;
    text: string;
  } | null>(null);

  // Direct Image File Processor (Input & Drag/Drop)
  const processImageFile = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setImageUploadError('Please select a valid image file (PNG, JPG, WEBP, or SVG).');
      return;
    }

    if (file.size > 12 * 1024 * 1024) {
      setImageUploadError('Image size exceeds 12MB. Please select a smaller photo.');
      return;
    }

    setImageUploadError('');
    setIsUploadingImage(true);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        try {
          if (!token) {
            throw new Error('Admin authentication required to upload images to Cloudinary.');
          }
          if (!isNewProduct && editingProduct?.id) {
            const res = await api.uploadProductImage(token, editingProduct.id, base64, file.name);
            setEditingProduct((prev) => (prev ? { ...prev, image: res.url } : null));
            onRefreshPublicData();
          } else {
            const res = await api.uploadImage(token, base64, file.name);
            setEditingProduct((prev) => (prev ? { ...prev, image: res.url } : null));
          }
          setSaveSuccessMsg(`Product image "${file.name}" uploaded to Cloudinary successfully.`);
        } catch (uploadErr: unknown) {
          const msg = uploadErr instanceof Error ? uploadErr.message : 'Cloudinary upload failed.';
          setImageUploadError(msg);
        } finally {
          setIsUploadingImage(false);
        }
      };
      reader.onerror = () => {
        setImageUploadError('Error reading image file from device.');
        setIsUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setImageUploadError(msg);
      setIsUploadingImage(false);
    }
  };

  const handleDirectImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  // Generic asset upload helper for brand logos, favicons, OG cards, and slider backgrounds
  const [isUploadingBrand, setIsUploadingBrand] = useState<string | null>(null);
  const [uploadingSlideIdx, setUploadingSlideIdx] = useState<number | null>(null);

  const uploadAssetFile = async (file: File): Promise<string> => {
    if (!file) throw new Error('No file selected');
    if (!file.type.startsWith('image/')) {
      throw new Error('Please select an image file (PNG, JPG, WEBP, SVG, or ICO).');
    }
    if (file.size > 15 * 1024 * 1024) {
      throw new Error('File exceeds 15MB limit. Please select a smaller file.');
    }
    if (!token) {
      throw new Error('Admin authentication required to upload assets to Cloudinary.');
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        try {
          const res = await api.uploadImage(token, base64, file.name);
          resolve(res.url);
        } catch (err: unknown) {
          reject(err instanceof Error ? err : new Error('Failed to upload asset to Cloudinary.'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read image file from disk'));
      reader.readAsDataURL(file);
    });
  };

  // Hero Slide Management
  const handleAddSlide = () => {
    const newSlide: HeroSlide = {
      id: `slide-${Date.now()}`,
      badge: 'NEW AI SOFTWARE',
      headline: 'Next-Gen AI Intelligence. Subsidized Access.',
      supportingText: 'Access subsidized professional AI tools, design platforms, and productivity suites with instant Nigerian setup.',
      cta1Label: 'EXPLORE TOOLS',
      cta1Action: 'products',
      cta2Label: 'CHAT ON WHATSAPP',
      cta2Action: 'whatsapp',
      backgroundImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1920&q=85',
      visualType: 'photo',
      bgGradient: 'from-[#061B45] via-[#092257] to-[#041230]',
      accentColor: '#FF7900',
      overlayOpacity: 0.72,
      isActive: true,
      displayOrder: slides.length + 1,
    };
    setSlides([...slides, newSlide]);
    setSaveSuccessMsg('New hero slide added. Remember to click "Save All Hero Slides".');
  };

  const handleDeleteSlide = (index: number) => {
    if (slides.length <= 1) {
      setSaveErrorMsg('You must keep at least 1 hero slide.');
      return;
    }
    const filtered = slides.filter((_, i) => i !== index);
    setSlides(filtered);
    setSaveSuccessMsg('Slide removed. Remember to click "Save All Hero Slides".');
  };

  const handleDuplicateSlide = (index: number) => {
    const target = slides[index];
    const copy: HeroSlide = {
      ...target,
      id: `slide-${Date.now()}`,
      badge: `${target.badge} (Copy)`,
      displayOrder: slides.length + 1,
    };
    setSlides([...slides, copy]);
    setSaveSuccessMsg('Slide duplicated. Remember to click "Save All Hero Slides".');
  };

  const handleMoveSlide = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= slides.length) return;
    const newSlides = [...slides];
    const temp = newSlides[index];
    newSlides[index] = newSlides[targetIdx];
    newSlides[targetIdx] = temp;
    setSlides(newSlides);
  };

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
    setSaveSuccessMsg('Slides rearranged. Remember to click "Save All Hero Slides".');
  };

  const handleResetDefaultSlides = () => {
    if (!token) return;
    setConfirmDialog({
      title: 'Reset Hero Slides',
      message:
        'Reset hero section to the 4 default luxury agency slides? Any custom slide edits will be replaced.',
      confirmLabel: 'Reset Slides',
      tone: 'warning',
      onConfirm: async () => {
        try {
          setIsLoading(true);
          setSaveErrorMsg('');
          const restored = await api.resetHeroSlides(token);
          setSlides(restored);
          setSaveSuccessMsg('Restored 4 default luxury hero slides successfully.');
          onRefreshPublicData();
        } catch (err: unknown) {
          setSaveErrorMsg(err instanceof Error ? err.message : String(err));
        } finally {
          setIsLoading(false);
        }
      },
    });
  };

  const handleSlideBgUpload = async (index: number, file: File) => {
    try {
      setUploadingSlideIdx(index);
      const url = await uploadAssetFile(file);
      const newSlides = [...slides];
      newSlides[index].backgroundImage = url;
      setSlides(newSlides);
      setSaveSuccessMsg(`Background image for slide ${index + 1} updated.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSaveErrorMsg(msg);
    } finally {
      setUploadingSlideIdx(null);
    }
  };

  // Brand Asset Upload (Logo, Favicon, OG Image)
  const handleBrandAssetUpload = async (
    field:
      | 'logoUrl'
      | 'lightLogoUrl'
      | 'darkLogoUrl'
      | 'faviconUrl'
      | 'mobileIconUrl'
      | 'socialShareImageUrl',
    file: File
  ) => {
    if (!settings) return;
    try {
      setIsUploadingBrand(field);
      const url = await uploadAssetFile(file);
      setSettings({
        ...settings,
        [field]: url,
      });
      setSaveSuccessMsg(`Brand asset "${file.name}" uploaded successfully. Remember to click "Save Settings".`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSaveErrorMsg(msg);
    } finally {
      setIsUploadingBrand(null);
    }
  };

  const handleLogout = () => {
    if (propOnLogout) {
      propOnLogout();
    } else {
      localStorage.removeItem('zeek_auth_token');
      localStorage.removeItem('zeek_auth_user');
    }
    onClose();
  };

  // Fetch all admin data when token changes
  const loadAdminData = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const [
        dashRes,
        ordersRes,
        reviewsRes,
        inquiriesRes,
        logsRes,
        bootstrap,
        affiliatesRes,
        referredRes,
        withdrawalsRes,
        adminsRes,
      ] = await Promise.all([
        api.getAdminDashboard(token),
        api.getAdminOrders(token),
        api.getAdminReviews(token),
        api.getAdminInquiries(token),
        api.getAuditLogs(token),
        api.getBootstrap(),
        api.getAdminAffiliates(token),
        api.getAdminReferredCustomers(token).catch(() => [] as ReferralAttribution[]),
        api.getAdminWithdrawals(token),
        api.getAdminUsers(token),
      ]);

      setStats(dashRes.stats);
      setOrders(ordersRes);
      setReviews(reviewsRes);
      setInquiries(inquiriesRes);
      setAuditLogs(logsRes);
      setAffiliates(affiliatesRes);
      setReferredCustomers(referredRes);
      setWithdrawals(withdrawalsRes);
      setAdminUsers(adminsRes);
      setProducts(bootstrap.allProducts || bootstrap.products);
      setSettings(bootstrap.settings);
      setExchangeRateInput(String(bootstrap.settings?.usdNgnRate || 1550));
      setSlides(bootstrap.heroSlides);
      setFaqs(bootstrap.faqs);
      setPolicies(bootstrap.policies);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/unauthorized|forbidden|expired|invalid|disabled|503|401|403/i.test(msg)) {
        handleLogout();
      } else {
        console.error('Failed to load admin data:', err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Register a new user / admin account (only callable by logged-in verified admin)
  const handleRegisterAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setIsRegisteringAdmin(true);
    setSaveErrorMsg('');
    setSaveSuccessMsg('');
    try {
      const created = await api.registerAdminUser(token, newAdminForm);
      setAdminUsers((prev) => [created, ...prev]);
      setShowRegisterAdminModal(false);
      setNewAdminForm({
        fullName: '',
        email: '',
        phone: '',
        password: '',
        role: 'affiliate',
        status: 'active',
        isVerified: false,
      });
      setSaveSuccessMsg(
        `User "${created.email}" created (${created.role} • ${created.status}${
          created.isVerified ? ' • verified' : ' • pending verification'
        }).`
      );
      loadAdminData();
    } catch (err: unknown) {
      setSaveErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setIsRegisteringAdmin(false);
    }
  };

  const handleUpdateUserField = async (
    user: SystemUser,
    updates: Partial<Pick<SystemUser, 'role' | 'status' | 'isVerified'>>
  ) => {
    if (!token) return;
    setSaveErrorMsg('');
    setSaveSuccessMsg('');
    try {
      const updated = await api.updateAdminUser(token, user._id, updates);
      setAdminUsers((prev) => prev.map((u) => (u._id === user._id ? updated : u)));
      setSaveSuccessMsg(
        `Updated ${updated.email}: ${updated.role} • ${updated.status} • ${
          updated.isVerified ? 'Verified' : 'Unverified'
        }.`
      );
      if (updates.role !== undefined || updates.status !== undefined) {
        api.getAdminAffiliates(token).then(setAffiliates).catch(() => {});
      }
    } catch (err: unknown) {
      setSaveErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDeleteAdminUser = (user: SystemUser) => {
    if (!token) return;
    setConfirmDialog({
      title: 'Delete User Account',
      message: `Are you sure you want to permanently remove "${user.email}" (${user.role}) from the unified MongoDB users collection?`,
      confirmLabel: 'Delete User',
      tone: 'danger',
      onConfirm: async () => {
        setSaveErrorMsg('');
        setSaveSuccessMsg('');
        try {
          await api.deleteAdminUser(token, user._id);
          setAdminUsers((prev) => prev.filter((u) => u._id !== user._id));
          setSaveSuccessMsg(`User account "${user.email}" deleted.`);
          loadAdminData();
        } catch (err: unknown) {
          setSaveErrorMsg(err instanceof Error ? err.message : String(err));
        }
      },
    });
  };

  useEffect(() => {
    if (!token) {
      onClose();
      return;
    }
    loadAdminData();
  }, [token]);

  // Order Action: Verify manual payment
  const handleVerifyOrderPayment = async (orderId: string) => {
    if (!token) return;
    try {
      await api.updateAdminOrder(token, orderId, {
        paymentStatus: 'paid',
        fulfillmentStatus: 'Payment Confirmed',
      });
      setSaveSuccessMsg(`Order ${orderId} verified and marked as PAID.`);
      loadAdminData();
      onRefreshPublicData();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, paymentStatus: 'paid', fulfillmentStatus: 'Payment Confirmed' } : null));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSaveErrorMsg(msg);
    }
  };

  // Order Action: Fulfill / Add Activation Credentials
  const handleFulfillOrder = async (orderId: string) => {
    if (!token) return;
    try {
      await api.updateAdminOrder(token, orderId, {
        fulfillmentStatus: 'Delivered',
        activationCredentials: orderCredentials,
      });
      setSaveSuccessMsg(`Order ${orderId} marked as DELIVERED with activation credentials.`);
      loadAdminData();
      onRefreshPublicData();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, fulfillmentStatus: 'Delivered', activationCredentials: orderCredentials } : null));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSaveErrorMsg(msg);
    }
  };

  // Save Product (Add or Edit)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editingProduct) return;

    if (!editingProduct.image?.trim()) {
      setSaveErrorMsg('Please upload a product image or choose a visual preset before saving.');
      return;
    }

    const activeRate = settings?.usdNgnRate || 1550;
    const isUsdMode = editingProduct.priceSourceCurrency === 'USD';
    const parsedUsdPrice = Number(editingProduct.usdPrice);
    if (isUsdMode && (Number.isNaN(parsedUsdPrice) || parsedUsdPrice <= 0)) {
      setSaveErrorMsg('Please enter a valid USD base price greater than $0.');
      return;
    }

    const hasCommissionOverride =
      typeof editingProduct.commissionRateOverride === 'number' &&
      !Number.isNaN(editingProduct.commissionRateOverride);

    if (
      hasCommissionOverride &&
      ((editingProduct.commissionRateOverride as number) < 0 ||
        (editingProduct.commissionRateOverride as number) > 100)
    ) {
      setSaveErrorMsg('Product affiliate commission rate must be between 0% and 100%.');
      return;
    }

    const computedNgnPrice = isUsdMode
      ? Math.max(100, Math.round(parsedUsdPrice * activeRate))
      : Math.max(100, Math.round(Number(editingProduct.price) || 0));

    const payload: any = {
      ...editingProduct,
      priceSourceCurrency: isUsdMode ? 'USD' : 'NGN',
      usdPrice: isUsdMode ? parsedUsdPrice : isNewProduct ? undefined : null,
      price: computedNgnPrice,
      commissionRateOverride: hasCommissionOverride
        ? Number(editingProduct.commissionRateOverride)
        : isNewProduct
        ? undefined
        : null,
      detailedDescription:
        editingProduct.detailedDescription?.trim() || editingProduct.shortDescription?.trim() || '',
    };

    try {
      if (isNewProduct) {
        await api.createProduct(token, payload);
        setSaveSuccessMsg('New product added to database successfully.');
      } else if (editingProduct.id) {
        await api.updateProduct(token, editingProduct.id, payload);
        setSaveSuccessMsg(`Product ${editingProduct.name} updated successfully.`);
      }

      setEditingProduct(null);
      loadAdminData();
      onRefreshPublicData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSaveErrorMsg(msg);
    }
  };

  // Manual Admin Dollar Exchange Rate Update
  const handleUpdateExchangeRate = async () => {
    if (!token) return;
    const nextRate = Number(exchangeRateInput);
    if (Number.isNaN(nextRate) || nextRate <= 0) {
      setSaveErrorMsg('Please enter a valid positive Naira exchange rate (e.g. 1600).');
      return;
    }

    setIsSavingExchangeRate(true);
    setSaveErrorMsg('');
    setSaveSuccessMsg('');
    try {
      const res = await api.updateExchangeRate(token, nextRate, syncUsdtWithUsdRate);
      setSettings(res.settings);
      setExchangeRateInput(String(res.settings.usdNgnRate));
      await loadAdminData();
      onRefreshPublicData();
      setSaveSuccessMsg(
        `Dollar exchange rate updated to $1 = ₦${res.settings.usdNgnRate.toLocaleString('en-NG')}. Recalculated ${res.updatedProductsCount} USD-priced product${res.updatedProductsCount === 1 ? '' : 's'} automatically.`
      );
    } catch (err: unknown) {
      setSaveErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSavingExchangeRate(false);
    }
  };

  // Delete Product
  const handleDeleteProduct = (id: string, name: string) => {
    if (!token) return;
    setConfirmDialog({
      title: 'Delete Product',
      message: `Are you sure you want to delete "${name}"? This action will permanently remove it from your MongoDB catalog.`,
      confirmLabel: 'Delete Product',
      tone: 'danger',
      onConfirm: async () => {
        setDeletingProductId(id);
        setSaveErrorMsg('');
        setSaveSuccessMsg('');
        try {
          await api.deleteProduct(token, id);
          setProducts((prev) => prev.filter((p) => p.id !== id));
          setSaveSuccessMsg(`Product "${name}" deleted successfully.`);
          await loadAdminData();
          onRefreshPublicData();
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          setSaveErrorMsg(msg);
        } finally {
          setDeletingProductId(null);
        }
      },
    });
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !settings) return;

    try {
      await api.updateSettings(token, settings);
      setSaveSuccessMsg('Store & payment settings saved successfully.');
      loadAdminData();
      onRefreshPublicData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSaveErrorMsg(msg);
    }
  };

  // Mark Inquiry as Read
  const handleMarkInquiryRead = async (id: string) => {
    if (!token) return;
    try {
      await api.markInquiryRead(token, id);
      setInquiries((prev) => prev.map((i) => (i.id === id ? { ...i, isRead: true } : i)));
      setStats((prev: any) =>
        prev ? { ...prev, unreadInquiries: Math.max(0, (prev.unreadInquiries || 1) - 1) } : prev
      );
      setSaveSuccessMsg('Inquiry marked as read.');
    } catch (err: unknown) {
      setSaveErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const handleOpenInquiryReply = (inq: ContactMessage) => {
    if (replyingInquiryId === inq.id) {
      setReplyingInquiryId(null);
      return;
    }
    const rawSubj = (inq.subject || 'Website Enquiry').trim();
    const prefilled = /^re:/i.test(rawSubj) ? rawSubj : `Re: ${rawSubj}`;
    setReplyingInquiryId(inq.id);
    setReplySubject(prefilled);
    setReplyMessage(`Hi ${inq.fullName || 'there'},\n\nThank you for reaching out to Zeek Softwares regarding "${rawSubj}".\n\n`);
    setReplyNextStatus('Replied');
    setReplyFeedback(null);
  };

  const handleSendInquiryReply = async (e: React.FormEvent, inq: ContactMessage) => {
    e.preventDefault();
    if (!token) return;
    if (!replySubject.trim() || !replyMessage.trim()) {
      setReplyFeedback({
        inquiryId: inq.id,
        ok: false,
        text: 'Please provide both a subject line and a reply message.',
      });
      return;
    }
    setSendingReply(true);
    setReplyFeedback(null);
    setSaveErrorMsg('');
    try {
      const res = await api.replyToInquiry(token, inq.id, {
        subject: replySubject.trim(),
        message: replyMessage.trim(),
        status: replyNextStatus,
      });
      setInquiries((prev) => prev.map((i) => (i.id === inq.id ? res.inquiry : i)));
      if (!inq.isRead) {
        setStats((prev: any) =>
          prev ? { ...prev, unreadInquiries: Math.max(0, (prev.unreadInquiries || 1) - 1) } : prev
        );
      }
      if (res.sendResult.sent) {
        setReplyFeedback({
          inquiryId: inq.id,
          ok: true,
          text: `Email reply sent to ${inq.email} via Brevo and saved to enquiry history.`,
        });
        setSaveSuccessMsg(`Reply sent to ${inq.email} via Brevo.`);
        setReplyingInquiryId(null);
      } else {
        setReplyFeedback({
          inquiryId: inq.id,
          ok: false,
          text:
            res.sendResult.error ||
            'Brevo could not deliver the reply yet. Failure details have been logged on the enquiry.',
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send reply.';
      setReplyFeedback({ inquiryId: inq.id, ok: false, text: msg });
      setSaveErrorMsg(msg);
    } finally {
      setSendingReply(false);
    }
  };

  const handleChangeInquiryStatus = async (id: string, status: InquiryStatus) => {
    if (!token) return;
    try {
      const updated = await api.updateInquiryStatus(token, id, status);
      setInquiries((prev) => prev.map((i) => (i.id === id ? updated : i)));
      setSaveSuccessMsg(`Enquiry status updated to "${status}".`);
    } catch (err: unknown) {
      setSaveErrorMsg(err instanceof Error ? err.message : 'Failed to update enquiry status.');
    }
  };

  // Save FAQs via CMS API
  const handleSaveFaqs = async () => {
    if (!token) return;
    try {
      await api.updateCMS(token, 'faqs', { faqs });
      setSaveSuccessMsg('Frequently Asked Questions updated successfully.');
      onRefreshPublicData();
    } catch (err: unknown) {
      setSaveErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  // Save Policies via CMS API
  const handleSavePolicies = async () => {
    if (!token || !policies) return;
    try {
      await api.updateCMS(token, 'policies', { policies });
      setSaveSuccessMsg('Legal policies updated successfully.');
      onRefreshPublicData();
    } catch (err: unknown) {
      setSaveErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  // Update Affiliate Withdrawal Status
  const handleWithdrawalStatus = async (
    withdrawalId: string,
    status: AffiliateWithdrawal['status']
  ) => {
    if (!token) return;
    try {
      await api.updateAdminWithdrawal(token, withdrawalId, { status });
      setSaveSuccessMsg(`Withdrawal ${withdrawalId} updated to ${status}.`);
      loadAdminData();
    } catch (err: unknown) {
      setSaveErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  // Approve / Feature / Delete Review
  const handleReviewAction = async (id: string, action: 'approve' | 'feature' | 'delete') => {
    if (!token) return;
    try {
      if (action === 'delete') {
        await api.deleteReview(token, id);
      } else if (action === 'approve') {
        await api.updateReview(token, id, { isApproved: true });
      } else if (action === 'feature') {
        const rev = reviews.find((r) => r.id === id);
        await api.updateReview(token, id, { isFeatured: !rev?.isFeatured });
      }
      setSaveSuccessMsg('Review updated.');
      loadAdminData();
      onRefreshPublicData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSaveErrorMsg(msg);
    }
  };

  // Filtered orders
  const filteredOrders = orders.filter((o) => {
    if (orderStatusFilter !== 'all') {
      if (orderStatusFilter === 'paid' && o.paymentStatus !== 'paid') return false;
      if (orderStatusFilter === 'awaiting_verification' && o.paymentStatus !== 'awaiting_verification') return false;
      if (orderStatusFilter === 'pending' && o.paymentStatus !== 'pending') return false;
      if (orderStatusFilter === 'delivered' && o.fulfillmentStatus !== 'Delivered') return false;
    }

    if (orderSearchQuery.trim()) {
      const q = orderSearchQuery.toLowerCase();
      const matchId = o.id.toLowerCase().includes(q);
      const matchEmail = o.customerEmail.toLowerCase().includes(q);
      const matchName = o.customerName.toLowerCase().includes(q);
      const matchPhone = o.customerWhatsApp.includes(q);
      if (!matchId && !matchEmail && !matchName && !matchPhone) return false;
    }

    return true;
  });

  if (!token) {
    return null;
  }

  // -------------------------------------------------------------
  // AUTHENTICATED ADMIN DASHBOARD
  // -------------------------------------------------------------
  return (
    <div className="fixed inset-0 z-50 bg-[#F1F5F9] flex flex-col overflow-hidden">
      
      {/* Top Navbar */}
      <header className="bg-[#061B45] text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#FF7900] flex items-center justify-center font-bold text-white shadow-md">
            ZS
          </div>
          <div>
            <h2 className="text-base font-extrabold tracking-tight">
              Zeek Softwares Administration
            </h2>
            <span className="text-[10px] text-orange-400 font-semibold tracking-wider uppercase block">
              {currentAdmin
                ? `${currentAdmin.name} (${currentAdmin.role})`
                : 'Production Database CMS'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadAdminData}
            title="Refresh Data"
            className="p-2 rounded-lg bg-[#0c2a63] hover:bg-[#133883] text-slate-200 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0c2a63] hover:bg-[#133883] text-white transition-colors"
          >
            Storefront
          </button>

          <button
            onClick={handleLogout}
            className="p-2 rounded-lg bg-red-950/60 hover:bg-red-900 text-red-300 transition-colors"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar Tabs */}
        <aside className="w-64 bg-[#071C3F] text-slate-300 p-4 space-y-1.5 border-r border-[#0f2e6e] overflow-y-auto shrink-0 hidden md:block">
          {[
            { id: 'overview', label: 'Dashboard Overview', icon: TrendingUp },
            { id: 'orders', label: 'Order Management', icon: ShoppingCart, badge: stats?.ordersAwaitingVerification },
            { id: 'products', label: 'Products & Pricing', icon: Package, count: products.length },
            { id: 'email_marketing', label: 'Email Marketing & CRM', icon: Send },
            { id: 'product_delivery', label: 'Payment & Delivery', icon: Download },
            { id: 'hero', label: 'Hero Slider Manager', icon: Sliders, count: slides.length },
            { id: 'branding', label: 'Brand Identity Settings', icon: Sparkles },
            { id: 'cms', label: 'CMS & Policies', icon: FileText },
            { id: 'settings', label: 'Payment & Business', icon: Settings },
            { id: 'reviews', label: 'Customer Reviews', icon: Star, badge: stats?.pendingReviews },
            { id: 'inquiries', label: 'Inquiries / Contact', icon: Mail, badge: stats?.unreadInquiries },
            { id: 'affiliates', label: 'Affiliates & Payouts', icon: Coins, count: affiliates.length },
            { id: 'admins', label: 'Users & Roles', icon: Shield, count: adminUsers.length },
            { id: 'logs', label: 'System Audit Logs', icon: Key },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center justify-between transition-colors ${
                  isActive
                    ? 'bg-[#FF7900] text-white shadow-md'
                    : 'text-slate-300 hover:bg-[#0c2a63]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </div>
                {tab.badge ? (
                  <span className="w-5 h-5 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold">
                    {tab.badge}
                  </span>
                ) : tab.count ? (
                  <span className="text-[10px] opacity-75 font-mono">{tab.count}</span>
                ) : null}
              </button>
            );
          })}
        </aside>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Notifications */}
          {saveSuccessMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{saveSuccessMsg}</span>
              </div>
              <button onClick={() => setSaveSuccessMsg('')}>
                <X className="w-4 h-4 text-emerald-600" />
              </button>
            </div>
          )}

          {saveErrorMsg && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{saveErrorMsg}</span>
              </div>
              <button onClick={() => setSaveErrorMsg('')}>
                <X className="w-4 h-4 text-red-600" />
              </button>
            </div>
          )}

          {/* Mobile Admin Tabs Horizontal Scroller */}
          <div className="md:hidden flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'orders', label: 'Orders' },
              { id: 'products', label: 'Products' },
              { id: 'email_marketing', label: 'Email Marketing' },
              { id: 'product_delivery', label: 'Delivery' },
              { id: 'hero', label: 'Hero Slider' },
              { id: 'branding', label: 'Brand Identity' },
              { id: 'cms', label: 'CMS' },
              { id: 'settings', label: 'Payment' },
              { id: 'reviews', label: 'Reviews' },
              { id: 'inquiries', label: 'Inquiries' },
              { id: 'affiliates', label: 'Affiliates' },
              { id: 'admins', label: 'Users & Roles' },
              { id: 'logs', label: 'Logs' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                  activeTab === t.id
                    ? 'bg-[#FF7900] text-white shadow-sm'
                    : 'bg-white text-slate-700 border border-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* DEDICATED TAB: SECTION A - EMAIL MARKETING & CRM */}
          {activeTab === 'email_marketing' && settings && (
            <EmailMarketingAdmin
              token={token}
              settings={settings}
              setSettings={setSettings}
              products={products}
              uploadAssetFile={uploadAssetFile}
              onRefreshPublicData={onRefreshPublicData}
              setSaveSuccessMsg={setSaveSuccessMsg}
              setSaveErrorMsg={setSaveErrorMsg}
            />
          )}

          {/* DEDICATED TAB: SECTION B - PAYMENT & PRODUCT DELIVERY */}
          {activeTab === 'product_delivery' && settings && (
            <ProductDeliveryAdmin
              token={token}
              settings={settings}
              setSettings={setSettings}
              products={products}
              onRefreshPublicData={onRefreshPublicData}
              loadAdminData={loadAdminData}
              setSaveSuccessMsg={setSaveSuccessMsg}
              setSaveErrorMsg={setSaveErrorMsg}
            />
          )}

          {/* DEDICATED TAB: HERO SLIDER MANAGER */}
          {activeTab === 'hero' && settings && (
            <HeroSliderManager
              slides={slides}
              setSlides={setSlides}
              settings={settings}
              setSettings={setSettings}
              token={token}
              uploadAssetFile={uploadAssetFile}
              onRefreshPublicData={onRefreshPublicData}
              setSaveSuccessMsg={setSaveSuccessMsg}
              setSaveErrorMsg={setSaveErrorMsg}
            />
          )}

          {/* DEDICATED TAB: BRAND IDENTITY SETTINGS */}
          {activeTab === 'branding' && settings && (
            <BrandIdentitySettings
              settings={settings}
              setSettings={setSettings}
              token={token}
              uploadAssetFile={uploadAssetFile}
              onRefreshPublicData={onRefreshPublicData}
              setSaveSuccessMsg={setSaveSuccessMsg}
              setSaveErrorMsg={setSaveErrorMsg}
            />
          )}

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-black text-[#061B45]">
                  Store Executive Overview
                </h3>
                <p className="text-xs text-slate-500">
                  Real-time breakdown of verified earnings, unverified claims, and fulfillment tasks.
                </p>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Verified Revenue */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase">
                    <span>Verified Revenue</span>
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-black text-emerald-700">
                    ₦{(stats?.verifiedRevenue || 0).toLocaleString('en-NG')}
                  </div>
                  <span className="text-[11px] text-emerald-600 font-semibold block">
                    {stats?.verifiedPaidOrders || 0} Confirmed Paid Orders
                  </span>
                </div>

                {/* Unverified Claims */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase">
                    <span>Awaiting Verification</span>
                    <Clock className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="text-2xl font-black text-amber-700">
                    ₦{(stats?.unverifiedClaimsAmount || 0).toLocaleString('en-NG')}
                  </div>
                  <span className="text-[11px] text-amber-600 font-semibold block">
                    {stats?.ordersAwaitingVerification || 0} Manual Payments to Review
                  </span>
                </div>

                {/* Fulfillment Required */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase">
                    <span>Fulfillment Queue</span>
                    <Package className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-2xl font-black text-blue-700">
                    {stats?.ordersRequiringFulfillment || 0}
                  </div>
                  <span className="text-[11px] text-blue-600 font-semibold block">
                    Orders ready for credentials delivery
                  </span>
                </div>

                {/* Total Products */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase">
                    <span>Active Software</span>
                    <Package className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="text-2xl font-black text-[#061B45]">
                    {stats?.activeProducts || 0} / {stats?.totalProducts || 0}
                  </div>
                  <span className="text-[11px] text-slate-500 font-semibold block">
                    Plans available in public store
                  </span>
                </div>
              </div>

              {/* Recent Orders Overview */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-[#061B45] uppercase tracking-wider">
                    Recent Customer Orders
                  </h4>
                  <button
                    onClick={() => setActiveTab('orders')}
                    className="text-xs text-[#FF7900] font-bold hover:underline"
                  >
                    View All Orders →
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3">Order ID</th>
                        <th className="p-3">Customer</th>
                        <th className="p-3">Product</th>
                        <th className="p-3">Amount</th>
                        <th className="p-3">Method</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {orders.slice(0, 6).map((ord, idx) => (
                        <tr key={`${ord.id}-${idx}`} className="hover:bg-slate-50/80">
                          <td className="p-3 font-mono font-bold text-slate-900">{ord.id}</td>
                          <td className="p-3">
                            <span className="font-semibold block">{ord.customerName}</span>
                            <span className="text-slate-400 text-[10px]">{ord.customerWhatsApp}</span>
                          </td>
                          <td className="p-3">{ord.items[0]?.productName} ({ord.items[0]?.duration})</td>
                          <td className="p-3 font-bold text-slate-900">₦{ord.totalAmount.toLocaleString('en-NG')}</td>
                          <td className="p-3">{ord.paymentMethod}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                ord.paymentStatus === 'paid'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : ord.paymentStatus === 'awaiting_verification'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {ord.paymentStatus}
                            </span>
                          </td>
                          <td className="p-3">
                            <button
                              onClick={() => {
                                setSelectedOrder(ord);
                                setOrderCredentials(ord.activationCredentials || '');
                              }}
                              className="px-2.5 py-1 rounded bg-[#061B45] text-white text-[10px] font-bold"
                            >
                              Manage
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ORDERS MANAGEMENT */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-xl font-black text-[#061B45]">
                    Order Verification & Fulfillment
                  </h3>
                  <p className="text-xs text-slate-500">
                    Review manual bank transfers, USDT transactions, verify payments, and issue activation credentials.
                  </p>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={orderSearchQuery}
                      onChange={(e) => setOrderSearchQuery(e.target.value)}
                      placeholder="Search ID, name, email..."
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                    />
                  </div>

                  <select
                    value={orderStatusFilter}
                    onChange={(e) => setOrderStatusFilter(e.target.value)}
                    className="py-2 px-3 text-xs rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="all">All Statuses</option>
                    <option value="awaiting_verification">Awaiting Verification</option>
                    <option value="paid">Paid & Confirmed</option>
                    <option value="delivered">Delivered</option>
                  </select>
                </div>
              </div>

              {/* Orders Table */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#061B45] text-white uppercase font-bold">
                    <tr>
                      <th className="p-3.5">Order ID</th>
                      <th className="p-3.5">Customer</th>
                      <th className="p-3.5">Items & Plan</th>
                      <th className="p-3.5">Amount</th>
                      <th className="p-3.5">Payment Method</th>
                      <th className="p-3.5">Payment Status</th>
                      <th className="p-3.5">Fulfillment</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400">
                          No matching orders found.
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((ord, idx) => (
                        <tr key={`${ord.id}-${idx}`} className="hover:bg-slate-50">
                          <td className="p-3.5 font-mono font-bold text-slate-900">{ord.id}</td>
                          <td className="p-3.5">
                            <span className="font-bold text-slate-900 block">{ord.customerName}</span>
                            <span className="text-slate-400 text-[10px] block">{ord.customerEmail}</span>
                            <span className="text-slate-500 font-mono text-[10px]">{ord.customerWhatsApp}</span>
                          </td>
                          <td className="p-3.5">
                            {ord.items.map((i, itemIdx) => (
                              <div key={`${i.productId || 'item'}-${itemIdx}`} className="font-medium text-slate-800">
                                {i.productName} ({i.duration})
                              </div>
                            ))}
                          </td>
                          <td className="p-3.5 font-bold text-[#061B45]">
                            ₦{ord.totalAmount.toLocaleString('en-NG')}
                          </td>
                          <td className="p-3.5">
                            <span className="font-semibold text-slate-700">{ord.paymentMethod}</span>
                            {ord.paymentReference && (
                              <span className="text-[10px] text-slate-400 block font-mono truncate max-w-[120px]">
                                {ord.paymentReference}
                              </span>
                            )}
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                ord.paymentStatus === 'paid'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : ord.paymentStatus === 'awaiting_verification'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {ord.paymentStatus}
                            </span>
                          </td>
                          <td className="p-3.5 font-semibold text-slate-800">
                            {ord.fulfillmentStatus}
                          </td>
                          <td className="p-3.5 text-right space-x-1">
                            {ord.paymentStatus !== 'paid' && (
                              <button
                                onClick={() => handleVerifyOrderPayment(ord.id)}
                                className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold shadow-sm"
                                title="Verify Payment"
                              >
                                Verify Paid
                              </button>
                            )}

                            <button
                              onClick={() => {
                                setSelectedOrder(ord);
                                setOrderCredentials(ord.activationCredentials || '');
                              }}
                              className="px-2.5 py-1 rounded bg-[#061B45] hover:bg-[#0c2a63] text-white text-[10px] font-bold"
                            >
                              Details
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

          {/* TAB 3: PRODUCTS & PRICING */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              <div className="flex flex-wrap justify-between items-center gap-3">
                <div>
                  <h3 className="text-xl font-black text-[#061B45]">
                    Product Catalog & Pricing
                  </h3>
                  <p className="text-xs text-slate-500">
                    Add products, set USD or fixed NGN pricing, configure per-product affiliate commission %, or upload images.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {settings && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('settings')}
                      className="px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-[#FF7900] text-xs font-bold text-[#061B45] flex items-center gap-2 transition-colors"
                    >
                      <DollarSign className="w-3.5 h-3.5 text-[#FF7900]" />
                      <span className="font-mono tabular-nums">
                        $1 = ₦{(settings.usdNgnRate || 1550).toLocaleString('en-NG')}
                      </span>
                      <span className="text-[10px] text-[#FF7900] underline">Edit Rate</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setIsNewProduct(true);
                      setImageUploadError('');
                      setShowUrlInput(false);
                      setEditingProduct({
                        name: '',
                        category: 'AI & Productivity',
                        priceSourceCurrency: 'NGN',
                        usdPrice: undefined,
                        price: 3000,
                        duration: '1 Month',
                        commissionRateOverride: undefined,
                        isAvailable: true,
                        isFeatured: false,
                        shortDescription: '',
                        detailedDescription: '',
                        image: '',
                        fulfillmentInstructions: 'Invitation link will be emailed to your address.',
                      });
                    }}
                    className="btn-zeek-orange px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add New Product</span>
                  </button>
                </div>
              </div>

              {/* Products Table */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#061B45] text-white uppercase font-bold">
                    <tr>
                      <th className="p-3.5">Software</th>
                      <th className="p-3.5">Category</th>
                      <th className="p-3.5">Plan Duration</th>
                      <th className="p-3.5">Price (NGN)</th>
                      <th className="p-3.5">Affiliate %</th>
                      <th className="p-3.5">Availability</th>
                      <th className="p-3.5">Featured</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {products.map((p, idx) => {
                      const defaultCommRate = settings?.defaultCommissionRate ?? 0;
                      const customRate =
                        typeof p.commissionRateOverride === 'number'
                          ? p.commissionRateOverride
                          : settings?.productCommissionRates?.[p.id];
                      const hasCustomRate = typeof customRate === 'number' && !Number.isNaN(customRate);
                      const effectiveRate = hasCustomRate ? customRate : defaultCommRate;

                      return (
                        <tr key={`${p.id}-${idx}`} className="hover:bg-slate-50">
                          <td className="p-3.5 flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 p-1 shrink-0 flex items-center justify-center">
                              <img
                                src={p.image}
                                alt={p.name}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 block">{p.name}</span>
                              <span className="text-[10px] text-slate-400 line-clamp-1">{p.shortDescription}</span>
                            </div>
                          </td>
                          <td className="p-3.5 font-medium">{p.category}</td>
                          <td className="p-3.5 font-semibold text-slate-800">{p.duration}</td>
                          <td className="p-3.5 font-mono tabular-nums">
                            <span className="font-black text-[#FF7900] block">
                              ₦{p.price.toLocaleString('en-NG')}
                            </span>
                            {p.priceSourceCurrency === 'USD' && typeof p.usdPrice === 'number' ? (
                              <span className="text-[10px] font-bold text-[#061B45] block">
                                Base ${p.usdPrice.toFixed(2)} USD
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 block">Fixed NGN</span>
                            )}
                          </td>
                          <td className="p-3.5 font-mono tabular-nums">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                hasCustomRate
                                  ? 'bg-orange-50 text-[#FF7900] border border-orange-200'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {effectiveRate}% {hasCustomRate ? 'Custom' : 'Default'}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                p.isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {p.isAvailable ? 'In Stock' : 'Disabled'}
                            </span>
                          </td>
                          <td className="p-3.5">
                            {p.isFeatured ? (
                              <span className="text-amber-500 font-bold">★ Featured</span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="p-3.5 text-right space-x-1">
                            <button
                              onClick={() => {
                                setIsNewProduct(false);
                                setImageUploadError('');
                                setShowUrlInput(false);
                                setEditingProduct({
                                  ...p,
                                  priceSourceCurrency: p.priceSourceCurrency || 'NGN',
                                  commissionRateOverride:
                                    typeof p.commissionRateOverride === 'number'
                                      ? p.commissionRateOverride
                                      : settings?.productCommissionRates?.[p.id],
                                });
                              }}
                              className="p-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
                              title="Edit Product"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(p.id, p.name)}
                              disabled={deletingProductId === p.id}
                              className="p-1.5 rounded bg-red-50 hover:bg-red-100 text-red-600 disabled:opacity-50"
                              title="Delete Product"
                            >
                              {deletingProductId === p.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: CMS & CONTENT MANAGEMENT */}
          {activeTab === 'cms' && (
            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-black text-[#061B45]">
                  Content Management System (CMS)
                </h3>
                <p className="text-xs text-slate-500">
                  Update Hero slides, Announcement banner, Frequently Asked Questions, and Policies.
                </p>
              </div>

              {/* Announcement Banner Editor */}
              {settings && (
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <h4 className="text-sm font-bold text-[#061B45] uppercase tracking-wider">
                    Header Announcement Banner
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="announcementActive"
                        checked={settings.announcementActive}
                        onChange={(e) => setSettings({ ...settings, announcementActive: e.target.checked })}
                        className="w-4 h-4 text-[#FF7900] rounded"
                      />
                      <label htmlFor="announcementActive" className="text-xs font-bold text-slate-700">
                        Enable Announcement Bar
                      </label>
                    </div>

                    <div>
                      <input
                        type="text"
                        value={settings.announcementText}
                        onChange={(e) => setSettings({ ...settings, announcementText: e.target.value })}
                        placeholder="Announcement text..."
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#FF7900]"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveSettings}
                      className="btn-zeek-orange px-4 py-2 rounded-lg text-xs font-bold uppercase"
                    >
                      Save Announcement
                    </button>
                  </div>
                </div>
              )}

              {/* Hero Slider Manager */}
              {settings && (
                <HeroSliderManager
                  slides={slides}
                  setSlides={setSlides}
                  settings={settings}
                  setSettings={setSettings}
                  token={token}
                  uploadAssetFile={uploadAssetFile}
                  onRefreshPublicData={onRefreshPublicData}
                  setSaveSuccessMsg={setSaveSuccessMsg}
                  setSaveErrorMsg={setSaveErrorMsg}
                />
              )}

              {/* FAQ Manager */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-[#061B45] uppercase tracking-wider">
                      Frequently Asked Questions ({faqs.length})
                    </h4>
                    <p className="text-xs text-slate-500">
                      Edit or add questions displayed on the storefront FAQ section.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setFaqs([
                          ...faqs,
                          {
                            id: `faq-${Date.now()}`,
                            question: 'New Question',
                            answer: 'Answer details...',
                          },
                        ])
                      }
                      className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add FAQ</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveFaqs}
                      className="btn-zeek-orange px-4 py-2 rounded-xl text-xs font-bold uppercase"
                    >
                      Save FAQs
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {faqs.map((faq, idx) => (
                    <div key={faq.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={faq.question}
                          onChange={(e) => {
                            const updated = [...faqs];
                            updated[idx] = { ...faq, question: e.target.value };
                            setFaqs(updated);
                          }}
                          className="flex-1 px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white"
                          placeholder="Question"
                        />
                        <button
                          type="button"
                          onClick={() => setFaqs(faqs.filter((_, i) => i !== idx))}
                          className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600"
                          title="Delete FAQ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <textarea
                        rows={2}
                        value={faq.answer}
                        onChange={(e) => {
                          const updated = [...faqs];
                          updated[idx] = { ...faq, answer: e.target.value };
                          setFaqs(updated);
                        }}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                        placeholder="Answer"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Legal Policies Editor */}
              {policies && (
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-bold text-[#061B45] uppercase tracking-wider">
                        Legal & Renewal Policies
                      </h4>
                      <p className="text-xs text-slate-500">
                        Last updated: {policies.lastUpdated}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleSavePolicies}
                      className="btn-zeek-orange px-4 py-2 rounded-xl text-xs font-bold uppercase"
                    >
                      Save Policies
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Privacy Policy
                      </label>
                      <textarea
                        rows={4}
                        value={policies.privacyPolicy}
                        onChange={(e) => setPolicies({ ...policies, privacyPolicy: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Refund & Guarantee Policy
                      </label>
                      <textarea
                        rows={4}
                        value={policies.refundPolicy}
                        onChange={(e) => setPolicies({ ...policies, refundPolicy: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Renewal Guidelines
                      </label>
                      <textarea
                        rows={4}
                        value={policies.renewalGuidelines}
                        onChange={(e) => setPolicies({ ...policies, renewalGuidelines: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Affiliate Programme Terms & Public Policy
                      </label>
                      <textarea
                        rows={4}
                        value={policies.affiliateTerms || ''}
                        onChange={(e) => setPolicies({ ...policies, affiliateTerms: e.target.value })}
                        placeholder="Public affiliate guidelines and payout terms..."
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: BUSINESS & PAYMENT SETTINGS */}
          {activeTab === 'settings' && settings && (
            <div className="space-y-6 max-w-4xl">
              <div>
                <h3 className="text-xl font-black text-[#061B45]">
                  Store, Exchange Rate & Payment Settings
                </h3>
                <p className="text-xs text-slate-500">
                  Manage the manual Dollar-to-Naira product pricing rate, bank transfer details, crypto addresses, and Paystack integration.
                </p>
              </div>

              {/* 0. Dedicated Dollar Exchange Rate Settings (Manual Admin-Controlled Only) */}
              {(() => {
                const usdProducts = products.filter((p) => p.priceSourceCurrency === 'USD' && typeof p.usdPrice === 'number');
                const previewRate = Number(exchangeRateInput) || settings.usdNgnRate || 1550;
                return (
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-5 h-5 text-[#FF7900]" />
                          <h4 className="text-sm font-black text-[#061B45] uppercase tracking-wider">
                            Dollar Exchange Rate Settings
                          </h4>
                        </div>
                        <p className="text-xs text-slate-500">
                          Controlled exclusively by Admin (external auto-fetch disabled). Updating this rate recalculates Naira prices for all USD-based products without overwriting their original USD prices.
                        </p>
                      </div>

                      <div className="px-4 py-2 rounded-2xl bg-[#061B45] text-white text-right shrink-0">
                        <span className="text-[10px] uppercase tracking-wider text-slate-300 block font-bold">
                          Active Store Rate
                        </span>
                        <span className="text-base font-black font-mono tabular-nums text-[#FF7900]">
                          $1 = ₦{(settings.usdNgnRate || 1550).toLocaleString('en-NG')}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                          New Dollar-to-Naira Rate ($1 = ₦) *
                        </label>
                        <input
                          type="number"
                          min={1}
                          step="1"
                          value={exchangeRateInput}
                          onChange={(e) => setExchangeRateInput(e.target.value)}
                          placeholder="e.g. 1600"
                          className="w-full px-3.5 py-2.5 text-sm font-mono font-bold rounded-xl border border-slate-300 tabular-nums focus:outline-none focus:ring-2 focus:ring-[#FF7900]"
                        />
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block">
                          Sample Preview ($10 Product)
                        </span>
                        <span className="font-black text-[#061B45] font-mono tabular-nums">
                          $10.00 = ₦{Math.round(10 * previewRate).toLocaleString('en-NG')}
                        </span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          {usdProducts.length} USD-priced product{usdProducts.length === 1 ? '' : 's'} linked
                        </span>
                      </div>

                      <button
                        type="button"
                        disabled={isSavingExchangeRate}
                        onClick={handleUpdateExchangeRate}
                        className="btn-zeek-orange px-5 py-3 rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                      >
                        {isSavingExchangeRate ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                        <span>Update Exchange Rate</span>
                      </button>
                    </div>

                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={syncUsdtWithUsdRate}
                        onChange={(e) => setSyncUsdtWithUsdRate(e.target.checked)}
                        className="w-4 h-4 text-[#FF7900] rounded"
                      />
                      <span>
                        Also sync USDT crypto checkout conversion rate (currently 1 USDT = ₦{settings.usdtNgnRate.toLocaleString('en-NG')})
                      </span>
                    </label>
                  </div>
                );
              })()}

              <form onSubmit={handleSaveSettings} className="space-y-6">
                
                {/* Brand Identity & Visual Assets Settings */}
                <BrandIdentitySettings
                  settings={settings}
                  setSettings={setSettings}
                  token={token}
                  uploadAssetFile={uploadAssetFile}
                  onRefreshPublicData={onRefreshPublicData}
                  setSaveSuccessMsg={setSaveSuccessMsg}
                  setSaveErrorMsg={setSaveErrorMsg}
                />

                {/* 1. Direct Bank Details */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center gap-2">
                    <Building className="w-5 h-5 text-blue-600" />
                    <h4 className="text-sm font-bold text-[#061B45] uppercase tracking-wider">
                      Sterling Bank Details (Naira Direct Transfer)
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Bank Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={settings.bankName}
                        onChange={(e) => setSettings({ ...settings, bankName: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Account Number *
                      </label>
                      <input
                        type="text"
                        required
                        value={settings.accountNumber}
                        onChange={(e) => setSettings({ ...settings, accountNumber: e.target.value })}
                        className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Account Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={settings.accountName}
                        onChange={(e) => setSettings({ ...settings, accountName: e.target.value })}
                        className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. USDT Crypto Settings (Multi-Network: TRC20, BEP20, etc.) */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Coins className="w-5 h-5 text-emerald-600" />
                      <h4 className="text-sm font-bold text-[#061B45] uppercase tracking-wider">
                        USDT Crypto Receiving Configuration
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setSettings({
                          ...settings,
                          usdtNetworks: [
                            ...(settings.usdtNetworks || []),
                            { network: 'USDT (NEW)', address: '' },
                          ],
                        })
                      }
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#061B45] text-[11px] font-bold inline-flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Network</span>
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      USDT to NGN Exchange Rate (1 USDT = ? NGN)
                    </label>
                    <input
                      type="number"
                      value={settings.usdtNgnRate}
                      onChange={(e) => setSettings({ ...settings, usdtNgnRate: Number(e.target.value) })}
                      className="w-full sm:max-w-xs px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 tabular-nums"
                    />
                  </div>

                  <div className="space-y-3">
                    {(settings.usdtNetworks || []).map((net, nIdx) => (
                      <div
                        key={nIdx}
                        className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
                      >
                        <div className="sm:col-span-4">
                          <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                            Network Name
                          </label>
                          <input
                            type="text"
                            value={net.network}
                            onChange={(e) => {
                              const nets = [...(settings.usdtNetworks || [])];
                              nets[nIdx] = { ...nets[nIdx], network: e.target.value };
                              setSettings({ ...settings, usdtNetworks: nets });
                            }}
                            placeholder="e.g. USDT (BEP20)"
                            className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white"
                          />
                        </div>
                        <div className="sm:col-span-7">
                          <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                            Wallet Address
                          </label>
                          <input
                            type="text"
                            value={net.address}
                            onChange={(e) => {
                              const nets = [...(settings.usdtNetworks || [])];
                              nets[nIdx] = { ...nets[nIdx], address: e.target.value };
                              setSettings({ ...settings, usdtNetworks: nets });
                            }}
                            placeholder="Paste wallet address..."
                            className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 bg-white"
                          />
                        </div>
                        <div className="sm:col-span-1 flex justify-end">
                          {(settings.usdtNetworks || []).length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const nets = (settings.usdtNetworks || []).filter((_, i) => i !== nIdx);
                                setSettings({ ...settings, usdtNetworks: nets });
                              }}
                              className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600"
                              title="Remove Network"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Bybit & Binance */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center gap-2">
                    <Send className="w-5 h-5 text-purple-600" />
                    <h4 className="text-sm font-bold text-[#061B45] uppercase tracking-wider">
                      Exchange UID Transfers
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Bybit UID
                      </label>
                      <input
                        type="text"
                        value={settings.bybitUid}
                        onChange={(e) => setSettings({ ...settings, bybitUid: e.target.value })}
                        className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Binance UID
                      </label>
                      <input
                        type="text"
                        value={settings.binanceUid}
                        onChange={(e) => setSettings({ ...settings, binanceUid: e.target.value })}
                        className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Customer Support Channels */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <h4 className="text-sm font-bold text-[#061B45] uppercase tracking-wider">
                    Customer Support & Community Links
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Support WhatsApp Number *
                      </label>
                      <input
                        type="tel"
                        name="supportWhatsApp"
                        autoComplete="tel"
                        value={settings.supportWhatsApp}
                        onChange={(e) => setSettings({ ...settings, supportWhatsApp: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Support Email *
                      </label>
                      <input
                        type="email"
                        name="supportEmail"
                        autoComplete="email"
                        value={settings.supportEmail}
                        onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Telegram Username
                      </label>
                      <input
                        type="text"
                        value={settings.telegramUsername}
                        onChange={(e) => setSettings({ ...settings, telegramUsername: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        WhatsApp Community Invitation URL
                      </label>
                      <input
                        type="url"
                        name="whatsappCommunityUrl"
                        autoComplete="url"
                        value={settings.whatsappCommunityUrl}
                        onChange={(e) => setSettings({ ...settings, whatsappCommunityUrl: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Telegram Channel / Community URL (Synced with Thank-You Emails)
                      </label>
                      <input
                        type="url"
                        name="telegramChannelUrl"
                        autoComplete="url"
                        value={settings.telegramChannelUrl || ''}
                        onChange={(e) => setSettings({ ...settings, telegramChannelUrl: e.target.value })}
                        placeholder="https://t.me/..."
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="btn-zeek-orange px-8 py-3.5 rounded-xl text-xs sm:text-sm font-extrabold uppercase tracking-wider shadow-lg"
                  >
                    Save Business & Payment Settings
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 6: CUSTOMER REVIEWS */}
          {activeTab === 'reviews' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-black text-[#061B45]">
                  Customer Reviews Verification
                </h3>
                <p className="text-xs text-slate-500">
                  Approve genuine user submissions before displaying them publicly on the website.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reviews.map((rev) => (
                  <div key={rev.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-sm text-[#061B45]">{rev.customerName}</h4>
                        <span className="text-[10px] text-slate-400">{rev.reviewDate} {rev.productPurchased && `• ${rev.productPurchased}`}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${rev.isApproved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {rev.isApproved ? 'Approved' : 'Pending Approval'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-amber-400">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`w-3.5 h-3.5 ${i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                      ))}
                    </div>

                    <p className="text-xs text-slate-700 italic">
                      "{rev.reviewMessage}"
                    </p>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <button
                        onClick={() => handleReviewAction(rev.id, 'feature')}
                        className={`text-[10px] font-bold ${rev.isFeatured ? 'text-amber-600' : 'text-slate-400'}`}
                      >
                        {rev.isFeatured ? '★ Featured on Carousel' : '☆ Not Featured'}
                      </button>

                      <div className="space-x-1">
                        {!rev.isApproved && (
                          <button
                            onClick={() => handleReviewAction(rev.id, 'approve')}
                            className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold"
                          >
                            Approve
                          </button>
                        )}
                        <button
                          onClick={() => handleReviewAction(rev.id, 'delete')}
                          className="px-2.5 py-1 rounded bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-bold"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: INQUIRIES & DIRECT REPLY WORKFLOW */}
          {activeTab === 'inquiries' && (() => {
            const getEffectiveStatus = (inq: ContactMessage): InquiryStatus => {
              if (inq.status) return inq.status;
              if ((inq.replies || []).some((r) => r.status === 'sent')) return 'Replied';
              return 'New';
            };
            const statusOptions: InquiryStatus[] = [
              'New',
              'Replied',
              'Awaiting Response',
              'Resolved',
            ];
            const filteredInquiries = inquiries.filter((inq) =>
              inquiryStatusFilter === 'all' ? true : getEffectiveStatus(inq) === inquiryStatusFilter
            );

            return (
              <div className="space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-black text-[#061B45]">
                      Customer Enquiries & Direct Brevo Reply ({filteredInquiries.length})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Review website enquiries, reply directly to the customer’s email via Brevo, and track conversation status.
                    </p>
                  </div>

                  {/* Status Filter Pills */}
                  <div className="flex flex-wrap gap-1.5">
                    {(['all', ...statusOptions] as const).map((st) => {
                      const count =
                        st === 'all'
                          ? inquiries.length
                          : inquiries.filter((i) => getEffectiveStatus(i) === st).length;
                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setInquiryStatusFilter(st)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                            inquiryStatusFilter === st
                              ? 'bg-[#FF7900] text-white shadow-sm'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span>{st === 'all' ? 'All Enquiries' : st}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                              inquiryStatusFilter === st
                                ? 'bg-white/25 text-white'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-4">
                  {filteredInquiries.length === 0 ? (
                    <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
                      No enquiries match this filter.
                    </div>
                  ) : (
                    filteredInquiries.map((inq) => {
                      const currentStatus = getEffectiveStatus(inq);
                      const isComposerOpen = replyingInquiryId === inq.id;
                      const replies = inq.replies || [];

                      return (
                        <div
                          key={inq.id}
                          className={`bg-white p-5 rounded-3xl border shadow-sm space-y-3 transition-all ${
                            inq.isRead
                              ? 'border-slate-200'
                              : 'border-orange-300 ring-1 ring-orange-100'
                          }`}
                        >
                          {/* Top Row */}
                          <div className="flex flex-wrap justify-between items-start gap-3">
                            <div className="space-y-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="font-black text-sm sm:text-base text-[#061B45]">
                                  {inq.subject}
                                </h4>
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                    currentStatus === 'Replied'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : currentStatus === 'Resolved'
                                      ? 'bg-blue-100 text-blue-800'
                                      : currentStatus === 'Awaiting Response'
                                      ? 'bg-purple-100 text-purple-800'
                                      : 'bg-orange-100 text-orange-800'
                                  }`}
                                >
                                  {currentStatus}
                                </span>
                                {!inq.isRead && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">
                                    Unread
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                <span>
                                  From: <strong className="text-[#061B45]">{inq.fullName}</strong> (
                                  <span className="font-mono">{inq.email}</span>)
                                </span>
                                {inq.whatsApp && <span>• WhatsApp: {inq.whatsApp}</span>}
                                <span className="text-slate-400">
                                  • {(inq.createdAt || '').slice(0, 16).replace('T', ' ')}
                                </span>
                              </div>
                            </div>

                            {/* Action Toolbar */}
                            <div className="flex flex-wrap items-center gap-2">
                              <select
                                value={currentStatus}
                                onChange={(e) =>
                                  handleChangeInquiryStatus(inq.id, e.target.value as InquiryStatus)
                                }
                                aria-label="Enquiry Status"
                                className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-[11px] font-bold text-[#061B45]"
                              >
                                {statusOptions.map((st) => (
                                  <option key={st} value={st}>
                                    Status: {st}
                                  </option>
                                ))}
                              </select>

                              {!inq.isRead && (
                                <button
                                  type="button"
                                  onClick={() => handleMarkInquiryRead(inq.id)}
                                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#061B45] text-[11px] font-bold"
                                >
                                  Mark as Read
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleOpenInquiryReply(inq)}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-colors ${
                                  isComposerOpen
                                    ? 'bg-[#061B45] text-white'
                                    : 'btn-zeek-orange shadow-sm'
                                }`}
                              >
                                <Reply className="w-3.5 h-3.5" />
                                <span>{isComposerOpen ? 'Close Composer' : 'Reply'}</span>
                              </button>
                            </div>
                          </div>

                          {/* Original Customer Message */}
                          <p className="text-xs sm:text-sm text-slate-700 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 whitespace-pre-line">
                            {inq.message}
                          </p>

                          {/* Per-Enquiry Reply Feedback Banner */}
                          {replyFeedback && replyFeedback.inquiryId === inq.id && (
                            <div
                              className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 ${
                                replyFeedback.ok
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                  : 'bg-red-50 border-red-200 text-red-800'
                              }`}
                            >
                              <span>{replyFeedback.text}</span>
                              <button
                                type="button"
                                onClick={() => setReplyFeedback(null)}
                                className="p-0.5"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}

                          {/* Inline Email Reply Composer */}
                          {isComposerOpen && (
                            <form
                              onSubmit={(e) => handleSendInquiryReply(e, inq)}
                              className="p-4 sm:p-5 rounded-2xl bg-[#F8FAFC] border border-[#061B45]/15 space-y-3 animate-in fade-in duration-150"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                                <span className="text-xs font-black text-[#061B45] uppercase tracking-wider flex items-center gap-1.5">
                                  <Send className="w-3.5 h-3.5 text-[#FF7900]" />
                                  <span>Direct Email Reply via Brevo</span>
                                </span>
                                <span className="text-[11px] font-mono text-slate-500">
                                  Reply-To: {settings?.supportEmail || 'support@zeeksoftwares.com'}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                                    Recipient Email
                                  </label>
                                  <input
                                    type="email"
                                    readOnly
                                    value={inq.email}
                                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 bg-slate-100 text-slate-700"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                                    Email Subject <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    type="text"
                                    name="replySubject"
                                    required
                                    value={replySubject}
                                    onChange={(e) => setReplySubject(e.target.value)}
                                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#FF7900]"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                                  Reply Message <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                  rows={5}
                                  required
                                  value={replyMessage}
                                  onChange={(e) => setReplyMessage(e.target.value)}
                                  placeholder="Type your response to this customer..."
                                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#FF7900]"
                                />
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-bold text-slate-600">
                                    Status after send:
                                  </span>
                                  <select
                                    value={replyNextStatus}
                                    onChange={(e) =>
                                      setReplyNextStatus(e.target.value as InquiryStatus)
                                    }
                                    className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-semibold"
                                  >
                                    {statusOptions.map((st) => (
                                      <option key={st} value={st}>
                                        {st}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setReplyingInquiryId(null)}
                                    className="px-3.5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-xs font-bold text-slate-700"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="submit"
                                    disabled={sendingReply}
                                    className="btn-zeek-orange px-5 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-50"
                                  >
                                    {sendingReply ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Send className="w-3.5 h-3.5" />
                                    )}
                                    <span>{sendingReply ? 'Sending...' : 'Send Reply'}</span>
                                  </button>
                                </div>
                              </div>
                            </form>
                          )}

                          {/* Sent Reply History Thread */}
                          {replies.length > 0 && (
                            <div className="pt-2 border-t border-slate-100 space-y-2">
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                                Reply History ({replies.length})
                              </span>
                              <div className="space-y-2">
                                {replies.map((rep) => (
                                  <div
                                    key={rep.id}
                                    className={`p-3 rounded-2xl border text-xs space-y-1 ${
                                      rep.status === 'sent'
                                        ? 'bg-emerald-50/60 border-emerald-200'
                                        : 'bg-red-50/70 border-red-200'
                                    }`}
                                  >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <div className="font-bold text-[#061B45]">
                                        {rep.subject}{' '}
                                        <span className="font-normal text-slate-500">
                                          → {rep.toEmail} (by {rep.sentBy})
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono text-[10px] text-slate-500">
                                          {rep.sentAt?.slice(0, 16).replace('T', ' ')}
                                        </span>
                                        <span
                                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                            rep.status === 'sent'
                                              ? 'bg-emerald-100 text-emerald-800'
                                              : 'bg-red-100 text-red-800'
                                          }`}
                                        >
                                          {rep.status}
                                        </span>
                                      </div>
                                    </div>
                                    <p className="text-slate-700 whitespace-pre-line">{rep.message}</p>
                                    {rep.error && (
                                      <p className="text-[11px] font-semibold text-red-700">
                                        Brevo Error: {rep.error}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })()}

          {/* TAB 7B: AFFILIATES, COMMISSIONS, GUIDE CMS & PAYOUTS */}
          {activeTab === 'affiliates' && settings && (
            <AffiliateProgrammeAdmin
              settings={settings}
              setSettings={setSettings}
              policies={policies}
              setPolicies={setPolicies}
              onSavePolicies={handleSavePolicies}
              products={products}
              affiliates={affiliates}
              referredCustomers={referredCustomers}
              withdrawals={withdrawals}
              token={token}
              uploadAssetFile={uploadAssetFile}
              onRefreshPublicData={onRefreshPublicData}
              loadAdminData={loadAdminData}
              setSaveSuccessMsg={setSaveSuccessMsg}
              setSaveErrorMsg={setSaveErrorMsg}
              handleWithdrawalStatus={handleWithdrawalStatus}
            />
          )}

          {/* TAB 8: AUDIT LOGS */}
          {activeTab === 'logs' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-black text-[#061B45]">
                  Security & Audit Activity Trail
                </h3>
                <p className="text-xs text-slate-500">
                  Chronological record of manual payment confirmations, price updates, and store changes.
                </p>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#061B45] text-white uppercase font-bold">
                    <tr>
                      <th className="p-3">Timestamp</th>
                      <th className="p-3">Action</th>
                      <th className="p-3">User</th>
                      <th className="p-3">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.map((log, idx) => (
                      <tr key={`${log.id || 'log'}-${idx}`} className="hover:bg-slate-50">
                        <td className="p-3 font-mono text-[11px] text-slate-500">
                          {log.timestamp.replace('T', ' ').substring(0, 19)}
                        </td>
                        <td className="p-3 font-bold text-slate-900">{log.action}</td>
                        <td className="p-3">{log.adminUser}</td>
                        <td className="p-3 text-slate-700">{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: UNIFIED USERS, ROLES & STATUS MANAGEMENT */}
          {activeTab === 'admins' && (() => {
            const q = userSearchQuery.trim().toLowerCase();
            const filteredUsers = adminUsers.filter((u) => {
              const matchesRole =
                userRoleFilter === 'all' ? true : u.role === userRoleFilter;
              const matchesStatus =
                userStatusFilter === 'all' ? true : u.status === userStatusFilter;
              const displayName = (u.fullName || u.name || '').toLowerCase();
              const matchesSearch =
                !q ||
                displayName.includes(q) ||
                u.email.toLowerCase().includes(q) ||
                u._id.toLowerCase().includes(q);
              return matchesRole && matchesStatus && matchesSearch;
            });

            return (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-black text-[#061B45]">
                      Users, Roles & Status ({filteredUsers.length} / {adminUsers.length})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Basic user records in <code className="font-mono text-slate-700">users</code> (default role: <code className="font-mono text-slate-700">affiliate</code>). Affiliates link via <code className="font-mono text-slate-700">userId</code> &rarr; <code className="font-mono text-slate-700">users._id</code>.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowRegisterAdminModal(true)}
                    className="btn-zeek-orange px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Register User / Admin</span>
                  </button>
                </div>

                {/* Filters Bar */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[
                      { id: 'all', label: 'All Users' },
                      { id: 'affiliate', label: 'Affiliates' },
                      { id: 'admin', label: 'Admins' },
                      { id: 'user', label: 'User (Inactive)' },
                    ].map((pill) => (
                      <button
                        key={pill.id}
                        type="button"
                        onClick={() => setUserRoleFilter(pill.id)}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-colors ${
                          userRoleFilter === pill.id
                            ? 'bg-[#061B45] text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {pill.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={userStatusFilter}
                      onChange={(e) => setUserStatusFilter(e.target.value)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
                    >
                      <option value="all">All Statuses</option>
                      <option value="active">Active</option>
                      <option value="pending">Pending</option>
                      <option value="suspended">Suspended</option>
                      <option value="disabled">Disabled</option>
                    </select>

                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        placeholder="Search name, email, user ID..."
                        className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs w-52"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#061B45] text-white uppercase font-bold">
                      <tr>
                        <th className="p-3.5">User</th>
                        <th className="p-3.5">Role</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5">Verification</th>
                        <th className="p-3.5">Details</th>
                        <th className="p-3.5">Last Login</th>
                        <th className="p-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-400">
                            No users match the selected filters.
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((usr) => {
                          const isSelf = currentAdmin?._id === usr._id;
                          const displayName = usr.fullName || usr.name || usr.email;
                          return (
                            <tr key={usr._id} className="hover:bg-slate-50">
                              <td className="p-3.5">
                                <strong className="text-slate-900 block">
                                  {displayName} {isSelf && <span className="text-[10px] text-[#FF7900]">(You)</span>}
                                </strong>
                                <span className="text-[11px] text-slate-500 font-mono block">{usr.email}</span>
                                <span className="text-[10px] text-slate-400 font-mono block">_id: {usr._id}</span>
                                {usr.phone && <span className="text-[10px] text-slate-400">{usr.phone}</span>}
                              </td>
                              <td className="p-3.5">
                                <select
                                  value={usr.role}
                                  disabled={isSelf}
                                  onChange={(e) =>
                                    handleUpdateUserField(usr, { role: e.target.value as UserRole })
                                  }
                                  className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-[11px] font-bold text-slate-800 disabled:opacity-50"
                                >
                                  <option value="affiliate">affiliate</option>
                                  <option value="admin">admin</option>
                                  <option value="user">user (inactive)</option>
                                </select>
                              </td>
                              <td className="p-3.5">
                                <select
                                  value={usr.status}
                                  disabled={isSelf}
                                  onChange={(e) =>
                                    handleUpdateUserField(usr, { status: e.target.value as UserStatus })
                                  }
                                  className={`px-2 py-1 rounded-lg border text-[11px] font-bold disabled:opacity-50 ${
                                    usr.status === 'active'
                                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                      : usr.status === 'pending'
                                      ? 'bg-amber-50 border-amber-200 text-amber-800'
                                      : 'bg-red-50 border-red-200 text-red-800'
                                  }`}
                                >
                                  <option value="active">active</option>
                                  <option value="pending">pending</option>
                                  <option value="suspended">suspended</option>
                                  <option value="disabled">disabled</option>
                                </select>
                              </td>
                              <td className="p-3.5">
                                {usr.isVerified ? (
                                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold inline-flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3" /> Verified
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                                    Unverified
                                  </span>
                                )}
                              </td>
                              <td className="p-3.5 text-slate-600 text-[11px]">
                                <div className="text-[10px] text-slate-500">
                                  By {usr.createdBy || 'System'}
                                </div>
                                {usr.verifiedBy && (
                                  <div className="text-[10px] text-slate-400">Verified: {usr.verifiedBy}</div>
                                )}
                              </td>
                              <td className="p-3.5 font-mono text-[11px] text-slate-500">
                                {usr.lastLoginAt ? usr.lastLoginAt.replace('T', ' ').substring(0, 16) : 'Never'}
                              </td>
                              <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                                <button
                                  type="button"
                                  disabled={isSelf && usr.isVerified}
                                  onClick={() =>
                                    handleUpdateUserField(usr, { isVerified: !usr.isVerified })
                                  }
                                  className={`px-2.5 py-1 rounded text-[10px] font-bold disabled:opacity-40 ${
                                    usr.isVerified
                                      ? 'bg-amber-50 hover:bg-amber-100 text-amber-700'
                                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                  }`}
                                >
                                  {usr.isVerified ? 'Unverify' : 'Verify'}
                                </button>
                                <button
                                  type="button"
                                  disabled={isSelf}
                                  onClick={() => handleDeleteAdminUser(usr)}
                                  className="p-1.5 rounded bg-red-50 hover:bg-red-100 text-red-600 disabled:opacity-40 inline-flex items-center"
                                  title="Delete User"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </main>
      </div>

      {/* ORDER DETAILS & FULFILLMENT MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Order Details</span>
                <h3 className="text-lg font-black text-[#061B45]">{selectedOrder.id}</h3>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-1 rounded text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <strong className="text-slate-900">{selectedOrder.customerName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Email:</span>
                <span>{selectedOrder.customerEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">WhatsApp:</span>
                <a
                  href={`https://wa.me/${selectedOrder.customerWhatsApp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-[#16A34A] underline"
                >
                  {selectedOrder.customerWhatsApp}
                </a>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount:</span>
                <strong className="text-[#FF7900]">₦{selectedOrder.totalAmount.toLocaleString('en-NG')}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Status:</span>
                <span className="font-bold">{selectedOrder.paymentStatus}</span>
              </div>
              {selectedOrder.paymentReference && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Reference:</span>
                  <span className="font-mono">{selectedOrder.paymentReference}</span>
                </div>
              )}
            </div>

            {/* Verification Button if pending */}
            {selectedOrder.paymentStatus !== 'paid' && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                <h5 className="text-xs font-bold text-amber-900 uppercase">Manual Payment Review</h5>
                <p className="text-xs text-amber-800">
                  Confirm receipt in your Sterling Bank account or USDT wallet before clicking below.
                </p>
                <button
                  onClick={() => handleVerifyOrderPayment(selectedOrder.id)}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase"
                >
                  Confirm & Mark Order as PAID
                </button>
              </div>
            )}

            {/* Fulfillment credentials section */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase">
                Digital Activation / Access Credentials
              </label>
              <textarea
                rows={4}
                value={orderCredentials}
                onChange={(e) => setOrderCredentials(e.target.value)}
                placeholder="Enter invitation link, activation key, or login credentials to be accessible by customer in Order Lookup..."
                className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#FF7900]"
              />
              <button
                onClick={() => handleFulfillOrder(selectedOrder.id)}
                className="btn-zeek-orange w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider"
              >
                Save Credentials & Mark Fulfilled
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRODUCT CREATE / EDIT MODAL */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-[#061B45]">
                {isNewProduct ? 'Add New Product Plan' : `Edit: ${editingProduct.name}`}
              </h3>
              <button onClick={() => setEditingProduct(null)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.name || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Category *</label>
                  <select
                    value={editingProduct.category || 'AI & Productivity'}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="AI & Productivity">AI & Productivity</option>
                    <option value="Graphic Design & Creativity">Graphic Design & Creativity</option>
                    <option value="Video Editing">Video Editing</option>
                    <option value="Writing & Research">Writing & Research</option>
                    <option value="Communication & Entertainment">Communication & Entertainment</option>
                    <option value="AI Development & Website Creation">AI Development & Website Creation</option>
                  </select>
                </div>
              </div>

              {/* Pricing Currency Basis & Auto NGN Conversion */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Pricing Currency & Conversion Mode
                  </label>
                  <span className="text-[11px] font-mono font-bold text-slate-500 tabular-nums">
                    Active Rate: $1 = ₦{(settings?.usdNgnRate || 1550).toLocaleString('en-NG')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setEditingProduct({
                        ...editingProduct,
                        priceSourceCurrency: 'NGN',
                      })
                    }
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                      (editingProduct.priceSourceCurrency || 'NGN') === 'NGN'
                        ? 'bg-[#061B45] text-white border-[#061B45]'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Fixed NGN Price
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const rate = settings?.usdNgnRate || 1550;
                      const initialUsd =
                        typeof editingProduct.usdPrice === 'number' && editingProduct.usdPrice > 0
                          ? editingProduct.usdPrice
                          : Math.max(1, Number(((editingProduct.price || rate) / rate).toFixed(2)));
                      setEditingProduct({
                        ...editingProduct,
                        priceSourceCurrency: 'USD',
                        usdPrice: initialUsd,
                        price: Math.max(100, Math.round(initialUsd * rate)),
                      });
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                      editingProduct.priceSourceCurrency === 'USD'
                        ? 'bg-[#FF7900] text-white border-[#FF7900]'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    USD Base ($ Auto-Converted)
                  </button>
                </div>

                {editingProduct.priceSourceCurrency === 'USD' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        Base USD Price ($) *
                      </label>
                      <input
                        type="number"
                        min={0.01}
                        step="0.01"
                        required
                        value={editingProduct.usdPrice ?? ''}
                        onChange={(e) => {
                          const usd = Number(e.target.value);
                          const rate = settings?.usdNgnRate || 1550;
                          setEditingProduct({
                            ...editingProduct,
                            usdPrice: e.target.value === '' ? undefined : usd,
                            price: Number.isNaN(usd) ? 0 : Math.max(100, Math.round(usd * rate)),
                          });
                        }}
                        placeholder="e.g. 10"
                        className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 bg-white tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        Auto-Calculated NGN Price
                      </label>
                      <div className="px-3 py-2 text-xs font-mono font-black text-[#FF7900] rounded-xl border border-slate-200 bg-white tabular-nums">
                        ₦{(editingProduct.price || 0).toLocaleString('en-NG')}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Selling Price in NGN *
                    </label>
                    <input
                      type="number"
                      min={100}
                      required
                      value={editingProduct.price || 0}
                      onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 bg-white tabular-nums"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Plan Duration *</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.duration || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, duration: e.target.value })}
                    placeholder="e.g. 1 Month, 1 Year, Lifetime"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase">
                      Affiliate Commission %
                    </label>
                    {typeof editingProduct.commissionRateOverride === 'number' && (
                      <button
                        type="button"
                        onClick={() =>
                          setEditingProduct({
                            ...editingProduct,
                            commissionRateOverride: undefined,
                          })
                        }
                        className="text-[10px] font-bold text-[#FF7900] hover:underline"
                      >
                        Reset to Default ({settings?.defaultCommissionRate ?? 0}%)
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.5"
                    value={
                      typeof editingProduct.commissionRateOverride === 'number'
                        ? editingProduct.commissionRateOverride
                        : ''
                    }
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        commissionRateOverride:
                          e.target.value === '' ? undefined : Number(e.target.value),
                      })
                    }
                    placeholder={`Default (${settings?.defaultCommissionRate ?? 0}%)`}
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 tabular-nums"
                  />
                </div>
              </div>

              {/* Product Logo / Image Direct Upload & Dropzone */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Product Logo / Visual Asset (Direct Upload) *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowUrlInput(!showUrlInput)}
                    className="text-[11px] font-semibold text-[#FF7900] hover:underline"
                  >
                    {showUrlInput ? 'Hide URL paste' : 'Or paste web image link'}
                  </button>
                </div>

                {imageUploadError && (
                  <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{imageUploadError}</span>
                  </div>
                )}

                {/* Direct Upload Drag & Drop Box */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleDirectImageUpload}
                  accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                  className="hidden"
                />

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const file = e.dataTransfer.files?.[0];
                    if (file) processImageFile(file);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-4 sm:p-5 text-center cursor-pointer transition-all flex flex-col sm:flex-row items-center gap-4 ${
                    editingProduct.image
                      ? 'border-emerald-300 bg-emerald-50/40 hover:border-emerald-400'
                      : 'border-slate-300 bg-white hover:border-[#FF7900] hover:bg-orange-50/20'
                  }`}
                >
                  {/* Image Preview Box */}
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl bg-white border border-slate-200 p-2 overflow-hidden relative shrink-0 flex items-center justify-center shadow-sm">
                    {editingProduct.image ? (
                      <img
                        src={editingProduct.image}
                        alt="Product Logo Preview"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-slate-400" />
                    )}

                    {isUploadingImage && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white">
                        <Loader2 className="w-6 h-6 animate-spin text-[#FF7900]" />
                      </div>
                    )}
                  </div>

                  {/* Upload Prompt Text & Action Buttons */}
                  <div className="flex-1 text-center sm:text-left space-y-2">
                    <div>
                      <h5 className="text-xs font-bold text-slate-900">
                        {editingProduct.image ? 'Logo / Visual Attached' : 'Upload Product Logo Directly'}
                      </h5>
                      <p className="text-[11px] text-slate-500">
                        Click here or drag & drop a brand logo or image from your device (PNG, JPG, WEBP, SVG)
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                        disabled={isUploadingImage}
                        className="px-3.5 py-1.5 rounded-xl bg-[#061B45] hover:bg-[#0c2a63] text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50"
                      >
                        {isUploadingImage ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FF7900]" />
                            <span>Uploading...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-3.5 h-3.5 text-[#FF7900]" />
                            <span>{editingProduct.image ? 'Replace Logo' : 'Select Logo from Device'}</span>
                          </>
                        )}
                      </button>

                      {editingProduct.image && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingProduct({ ...editingProduct, image: '' });
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-200 hover:bg-red-100 hover:text-red-700 text-slate-700 text-xs font-medium transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Presets for Official Product Logos */}
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5">
                    Or pick an official brand logo preset:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { name: 'Canva', url: '/product-logos/canva.svg' },
                      { name: 'CapCut', url: '/product-logos/capcut.svg' },
                      { name: 'ChatGPT', url: '/product-logos/chatgpt.svg' },
                      { name: 'Gemini', url: '/product-logos/gemini.svg' },
                      { name: 'Claude', url: '/product-logos/claude.svg' },
                      { name: 'QuillBot', url: '/product-logos/quillbot.svg' },
                      { name: 'Grammarly', url: '/product-logos/grammarly.svg' },
                      { name: 'Renderforest', url: '/product-logos/renderforest.svg' },
                      { name: 'Zoom', url: '/product-logos/zoom.svg' },
                      { name: 'Netflix', url: '/product-logos/netflix.svg' },
                      { name: 'Adobe Express', url: '/product-logos/adobe-express.svg' },
                      { name: 'Lovable', url: '/product-logos/lovable.svg' },
                      { name: 'Camtasia', url: '/product-logos/camtasia.svg' },
                    ].map((preset, pIdx) => (
                      <button
                        key={`${preset.name}-${pIdx}`}
                        type="button"
                        onClick={() => setEditingProduct({ ...editingProduct, image: preset.url })}
                        className="px-2 py-1 text-[10px] rounded-lg bg-white border border-slate-200 hover:border-[#FF7900] text-slate-700 font-semibold hover:text-[#FF7900] transition-colors inline-flex items-center gap-1"
                      >
                        <img src={preset.url} alt="" className="w-3.5 h-3.5 object-contain" />
                        <span>{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Optional Web URL Input */}
                {showUrlInput && (
                  <div className="pt-2 border-t border-slate-200 animate-in fade-in duration-150">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Direct Logo / Image URL
                    </label>
                    <input
                      type="text"
                      value={editingProduct.image || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, image: e.target.value })}
                      placeholder="https://... or /product-logos/canva.svg"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Short Description *</label>
                <textarea
                  rows={2}
                  required
                  value={editingProduct.shortDescription || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, shortDescription: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Detailed Description</label>
                <textarea
                  rows={3}
                  value={editingProduct.detailedDescription || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, detailedDescription: e.target.value })}
                  placeholder="Full features, eligibility, and usage notes..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Fulfillment Instructions Notice</label>
                <textarea
                  rows={2}
                  value={editingProduct.fulfillmentInstructions || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, fulfillmentInstructions: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                />
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={editingProduct.isAvailable ?? true}
                    onChange={(e) => setEditingProduct({ ...editingProduct, isAvailable: e.target.checked })}
                    className="w-4 h-4 text-[#FF7900] rounded"
                  />
                  <span>Available for Sale</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={editingProduct.isFeatured ?? false}
                    onChange={(e) => setEditingProduct({ ...editingProduct, isFeatured: e.target.checked })}
                    className="w-4 h-4 text-[#FF7900] rounded"
                  />
                  <span>Featured Product</span>
                </label>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  className="btn-zeek-orange w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider"
                >
                  {isNewProduct ? 'Create Product' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IN-APP CONFIRMATION MODAL (replaces window.confirm for iframe compatibility) */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                    confirmDialog.tone === 'warning'
                      ? 'bg-amber-50 text-amber-600'
                      : 'bg-red-50 text-red-600'
                  }`}
                >
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-black text-[#061B45]">{confirmDialog.title}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{confirmDialog.message}</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={isConfirmingAction}
                  onClick={() => setConfirmDialog(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isConfirmingAction}
                  onClick={async () => {
                    setIsConfirmingAction(true);
                    try {
                      await confirmDialog.onConfirm();
                    } finally {
                      setIsConfirmingAction(false);
                      setConfirmDialog(null);
                    }
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition-colors disabled:opacity-50 ${
                    confirmDialog.tone === 'warning'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {isConfirmingAction && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{confirmDialog.confirmLabel}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REGISTER NEW USER / ADMIN MODAL */}
      {showRegisterAdminModal && (
        <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#FF7900]" />
                <h3 className="text-lg font-black text-[#061B45]">Register User / Admin</h3>
              </div>
              <button type="button" onClick={() => setShowRegisterAdminModal(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleRegisterAdmin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  autoComplete="name"
                  required
                  value={newAdminForm.fullName}
                  onChange={(e) => setNewAdminForm({ ...newAdminForm, fullName: e.target.value })}
                  placeholder="e.g. Samuel Adeyemi"
                  className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    required
                    value={newAdminForm.email}
                    onChange={(e) => setNewAdminForm({ ...newAdminForm, email: e.target.value })}
                    placeholder="user@zeeksoftwares.com"
                    className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    autoComplete="tel"
                    value={newAdminForm.phone}
                    onChange={(e) => setNewAdminForm({ ...newAdminForm, phone: e.target.value })}
                    placeholder="+234..."
                    className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Password (min 6 chars) <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  name="new-password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={newAdminForm.password}
                  onChange={(e) => setNewAdminForm({ ...newAdminForm, password: e.target.value })}
                  placeholder="Strong password..."
                  className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Role *
                  </label>
                  <select
                    value={newAdminForm.role}
                    onChange={(e) =>
                      setNewAdminForm({ ...newAdminForm, role: e.target.value as UserRole })
                    }
                    className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="affiliate">Affiliate (Default)</option>
                    <option value="admin">Admin</option>
                    <option value="user">User (Inactive)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Status *
                  </label>
                  <select
                    value={newAdminForm.status}
                    onChange={(e) =>
                      setNewAdminForm({ ...newAdminForm, status: e.target.value as UserStatus })
                    }
                    className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="suspended">Suspended</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newAdminForm.isVerified}
                  onChange={(e) => setNewAdminForm({ ...newAdminForm, isVerified: e.target.checked })}
                  className="w-4 h-4 text-[#FF7900] rounded"
                />
                <span>Verified (required for Admin dashboard sign-in)</span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRegisterAdminModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRegisteringAdmin}
                  className="btn-zeek-orange px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isRegisteringAdmin && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Create Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
