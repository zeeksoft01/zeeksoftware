import {
  Product,
  HeroSlide,
  BenefitCard,
  CustomerReview,
  SiteSettings,
  FAQItem,
  LegalPolicies,
  AffiliateGuideConfig,
  PostPaymentConfig,
  EmailBrandingConfig,
  DailyAutomationConfig,
} from '../types';
import { env } from '../config/env';

export const PRODUCT_LOGO_BY_ID: Record<string, string> = {
  'prod-canva-pro-1y': '/product-logos/canva.svg',
  'prod-capcut-pro-1m': '/product-logos/capcut.svg',
  'prod-chatgpt-plus-1m': '/product-logos/chatgpt.svg',
  'prod-capcut-pro-6m': '/product-logos/capcut.svg',
  'prod-gemini-pro-18m': '/product-logos/gemini.svg',
  'prod-claude-pro-1m': '/product-logos/claude.svg',
  'prod-quillbot-prem-1m': '/product-logos/quillbot.svg',
  'prod-grammarly-prem-1m': '/product-logos/grammarly.svg',
  'prod-renderforest-pro-1m': '/product-logos/renderforest.svg',
  'prod-zoom-prem-1m': '/product-logos/zoom.svg',
  'prod-netflix-prem-1m': '/product-logos/netflix.svg',
  'prod-adobe-express-1y': '/product-logos/adobe-express.svg',
  'prod-lovable-pro-1m': '/product-logos/lovable.svg',
  'prod-camtasia-lifetime': '/product-logos/camtasia.svg',
};

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-canva-pro-1y',
    name: 'Canva Pro',
    category: 'Graphic Design & Creativity',
    image: '/product-logos/canva.svg',
    shortDescription: 'Explore advanced creative design features for presentations, social media content, marketing materials, and professional visual projects.',
    detailedDescription: 'Unlock premium Canva templates, brand kits, background remover, magic resize, and millions of premium graphics, audio tracks, and stock videos. Authorized access granted for your design workflow.',
    price: 3000,
    duration: '1 Year',
    isAvailable: true,
    isFeatured: true,
    seoTitle: 'Canva Pro 1 Year Subscription | Zeek Softwares',
    seoDescription: 'Get Canva Pro 1 Year at subsidized rates. Full access to premium templates, brand kits, and design elements.',
    fulfillmentInstructions: 'Activation invitation will be sent to your registered email or Canva account. Ensure you provide your Canva account email at checkout.',
    displayOrder: 1,
  },
  {
    id: 'prod-capcut-pro-1m',
    name: 'CapCut Pro',
    category: 'Video Editing',
    image: '/product-logos/capcut.svg',
    shortDescription: 'Access advanced video editing capabilities to improve content creation, visual storytelling, and professional editing workflows.',
    detailedDescription: 'Full access to CapCut Pro premium video filters, motion tracking, auto-captions, 4K export, and professional cloud workspace for mobile and PC.',
    price: 4000,
    duration: '1 Month',
    isAvailable: true,
    isFeatured: true,
    seoTitle: 'CapCut Pro 1 Month | Zeek Softwares',
    seoDescription: 'Access CapCut Pro video editing tools for seamless short-form video creation and high-end video exports.',
    fulfillmentInstructions: 'Login credentials or team invite provided securely upon payment verification.',
    displayOrder: 2,
  },
  {
    id: 'prod-chatgpt-plus-1m',
    name: 'ChatGPT Plus',
    category: 'AI & Productivity',
    image: '/product-logos/chatgpt.svg',
    shortDescription: 'Explore advanced AI-powered assistance for writing, research, brainstorming, learning, and productivity.',
    detailedDescription: 'Access OpenAI GPT-4o, advanced data analysis, browsing capabilities, custom GPTs, image generation via DALL-E, and rapid response times without peak throttling.',
    price: 4000,
    duration: '1 Month',
    isAvailable: true,
    isFeatured: true,
    seoTitle: 'ChatGPT Plus 1 Month Access | Zeek Softwares',
    seoDescription: 'Get ChatGPT Plus access at affordable rates. Boost your productivity with cutting-edge conversational intelligence.',
    fulfillmentInstructions: 'Instant shared/managed workspace access provided with clear step-by-step connection guide.',
    displayOrder: 3,
  },
  {
    id: 'prod-capcut-pro-6m',
    name: 'CapCut Pro',
    category: 'Video Editing',
    image: '/product-logos/capcut.svg',
    shortDescription: 'Extended 6-month access to CapCut Pro advanced editing suite, cloud assets, and high-frame export tools.',
    detailedDescription: 'Six full months of uninterrupted video editing features for YouTube, TikTok, Reels, and commercial client productions.',
    price: 15000,
    duration: '6 Months',
    isAvailable: true,
    isFeatured: true,
    seoTitle: 'CapCut Pro 6 Months Plan | Zeek Softwares',
    seoDescription: 'Save more with our 6-month CapCut Pro plan for active video editors and creators.',
    fulfillmentInstructions: 'Direct account credentials or authorized workspace invite issued to your WhatsApp and email.',
    displayOrder: 4,
  },
  {
    id: 'prod-gemini-pro-18m',
    name: 'Google Gemini Pro AI',
    category: 'AI & Productivity',
    image: '/product-logos/gemini.svg',
    shortDescription: "Discover Google's advanced AI capabilities for research, productivity, idea development, and creative workflows.",
    detailedDescription: 'Extended 18-month access to Google Gemini Advanced/Pro features, large context window processing, multi-modal analysis, and Google Workspace integration.',
    price: 3000,
    duration: '18 Months',
    isAvailable: true,
    isFeatured: true,
    seoTitle: 'Google Gemini Pro AI 18 Months | Zeek Softwares',
    seoDescription: 'Access Google Gemini Pro AI for 18 months at an unbeatable subsidized rate.',
    fulfillmentInstructions: 'Managed account credentials with personal profile partition provided upon payment confirmation.',
    displayOrder: 5,
  },
  {
    id: 'prod-claude-pro-1m',
    name: 'Claude Pro',
    category: 'AI & Productivity',
    image: '/product-logos/claude.svg',
    shortDescription: 'Explore intelligent AI assistance for writing, analysis, research, and complex professional tasks.',
    detailedDescription: 'Access Anthropic Claude 3.5 Sonnet and Opus, extended token limits, code debugging, document synthesis, and nuanced creative writing.',
    price: 10000,
    duration: '1 Month',
    isAvailable: true,
    isFeatured: true,
    seoTitle: 'Claude Pro 1 Month Subscription | Zeek Softwares',
    seoDescription: 'Supercharge your intellectual and programming workflows with Claude Pro access from Zeek Softwares.',
    fulfillmentInstructions: 'Dedicated or pooled workspace credentials provided with security guidelines.',
    displayOrder: 6,
  },
  {
    id: 'prod-quillbot-prem-1m',
    name: 'QuillBot Premium',
    category: 'Writing & Research',
    image: '/product-logos/quillbot.svg',
    shortDescription: 'Enhance your writing workflow with paraphrasing, editing, and language improvement tools.',
    detailedDescription: 'Unlimited paraphrasing modes, plagiarism checker, grammar scanner, summarizer, citation generator, and vocabulary enhancer.',
    price: 2500,
    duration: '1 Month',
    isAvailable: true,
    isFeatured: false,
    seoTitle: 'QuillBot Premium 1 Month | Zeek Softwares',
    seoDescription: 'Enhance research papers and essays with QuillBot Premium paraphrasing tools.',
    fulfillmentInstructions: 'Account login details delivered to your email and WhatsApp immediately after verification.',
    displayOrder: 7,
  },
  {
    id: 'prod-grammarly-prem-1m',
    name: 'Grammarly Premium',
    category: 'Writing & Research',
    image: '/product-logos/grammarly.svg',
    shortDescription: 'Improve writing clarity, grammar, tone, and professional communication.',
    detailedDescription: 'Advanced tone adjustments, sentence rewrites, vocabulary enhancements, style guides, and plagiarism detection across web, desktop, and mobile.',
    price: 2500,
    duration: '1 Month',
    isAvailable: true,
    isFeatured: false,
    seoTitle: 'Grammarly Premium 1 Month | Zeek Softwares',
    seoDescription: 'Polish your professional emails, proposals, and documents with Grammarly Premium.',
    fulfillmentInstructions: 'Direct account access with pre-configured license seat delivered within minutes.',
    displayOrder: 8,
  },
  {
    id: 'prod-renderforest-pro-1m',
    name: 'Renderforest Pro',
    category: 'Graphic Design & Creativity',
    image: '/product-logos/renderforest.svg',
    shortDescription: 'Create polished videos, graphics, branding assets, and digital presentations.',
    detailedDescription: 'Full HD video rendering, animated logo reveals, mockups, website builder access, and commercial music library.',
    price: 2500,
    duration: '1 Month',
    isAvailable: true,
    isFeatured: false,
    seoTitle: 'Renderforest Pro 1 Month | Zeek Softwares',
    seoDescription: 'Produce broadcast-grade promotional videos and 3D logo openers with Renderforest Pro.',
    fulfillmentInstructions: 'Dedicated login provided with full cloud export rights.',
    displayOrder: 9,
  },
  {
    id: 'prod-zoom-prem-1m',
    name: 'Zoom Premium',
    category: 'Communication & Entertainment',
    image: '/product-logos/zoom.svg',
    shortDescription: 'Explore enhanced online meeting and communication features for collaborative work.',
    detailedDescription: 'Host up to 300 participants without 40-minute limit, cloud recording storage, automated meeting transcripts, and breakout rooms.',
    price: 3500,
    duration: '1 Month',
    isAvailable: true,
    isFeatured: false,
    seoTitle: 'Zoom Premium 1 Month | Zeek Softwares',
    seoDescription: 'Host unlimited professional meetings and webinars with Zoom Premium.',
    fulfillmentInstructions: 'Host license assignment sent to your email or provisioned account credentials.',
    displayOrder: 10,
  },
  {
    id: 'prod-netflix-prem-1m',
    name: 'Netflix Premium',
    category: 'Communication & Entertainment',
    image: '/product-logos/netflix.svg',
    shortDescription: 'Access entertainment content through a properly authorized subscription arrangement.',
    detailedDescription: 'Ultra HD 4K streaming, multi-device support, spatial audio, and personalized private profile screen with dedicated PIN.',
    price: 3500,
    duration: '1 Month',
    isAvailable: true,
    isFeatured: false,
    seoTitle: 'Netflix Premium 1 Month | Zeek Softwares',
    seoDescription: 'Stream your favorite movies and series in 4K Ultra HD with a personal profile.',
    fulfillmentInstructions: 'Profile credentials with private security PIN delivered via WhatsApp/email.',
    displayOrder: 11,
  },
  {
    id: 'prod-adobe-express-1y',
    name: 'Adobe Express',
    category: 'Graphic Design & Creativity',
    image: '/product-logos/adobe-express.svg',
    shortDescription: 'Discover creative tools for building social media graphics, videos, presentations, and marketing content.',
    detailedDescription: 'Adobe Firefly generative AI integration, Photoshop-powered quick actions, premiere Adobe Fonts library, and cloud synchronization.',
    price: 3000,
    duration: '1 Year',
    isAvailable: true,
    isFeatured: true,
    seoTitle: 'Adobe Express 1 Year Plan | Zeek Softwares',
    seoDescription: 'Get 1 Year of Adobe Express with generative AI capabilities and premium stock assets.',
    fulfillmentInstructions: 'Adobe account email invitation or activated license credentials provided.',
    displayOrder: 12,
  },
  {
    id: 'prod-lovable-pro-1m',
    name: 'Lovable Pro',
    category: 'AI Development & Website Creation',
    image: '/product-logos/lovable.svg',
    shortDescription: 'Explore AI-assisted website and application development for creative digital projects.',
    detailedDescription: 'Full-stack AI app generator with high credit allowance, GitHub synchronization, instant deployment, and custom domain mapping.',
    price: 3000,
    duration: '1 Month',
    isAvailable: true,
    isFeatured: true,
    seoTitle: 'Lovable Pro 1 Month | Zeek Softwares',
    seoDescription: 'Build modern React and web apps with AI prompt-driven engineering using Lovable Pro.',
    fulfillmentInstructions: 'Invite sent to your registered developer email with active subscription rights.',
    displayOrder: 13,
  },
  {
    id: 'prod-camtasia-lifetime',
    name: 'Camtasia',
    category: 'Video Editing',
    image: '/product-logos/camtasia.svg',
    shortDescription: 'Create screen recordings, tutorials, presentations, and edited instructional videos.',
    detailedDescription: 'Industry-standard screen recorder and video editing software for Windows/Mac. Authorized perpetual workstation license with full visual effect library.',
    price: 5000,
    duration: 'Lifetime',
    isAvailable: true,
    isFeatured: true,
    seoTitle: 'Camtasia Lifetime License | Zeek Softwares',
    seoDescription: 'Record and edit high quality tutorials and courses with Camtasia perpetual access.',
    fulfillmentInstructions: 'Official download installer link and license activation key provided upon order approval.',
    displayOrder: 14,
  },
];

export const INITIAL_CATEGORIES: string[] = [
  'All Tools',
  'AI & Productivity',
  'Graphic Design & Creativity',
  'Video Editing',
  'Writing & Research',
  'Communication & Entertainment',
  'AI Development & Website Creation',
];

export const INITIAL_HERO_SLIDES: HeroSlide[] = [
  {
    id: 'slide-1',
    badge: 'WELCOME TO ZEEK SOFTWARES',
    headline: 'Premium Tools. Limitless Possibilities.',
    supportingText:
      'Experience a smarter way to create, learn, work, and grow. Discover premium AI tools and professional software at prices designed to make powerful technology more accessible.',
    cta1Label: 'EXPLORE PREMIUM TOOLS',
    cta1Action: 'products',
    cta2Label: 'CHAT WITH AN EXPERT',
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
    displayOrder: 1,
  },
  {
    id: 'slide-2',
    badge: 'YOUR DIGITAL TOOLKIT, REIMAGINED',
    headline: 'Everything You Need. One Digital Destination.',
    supportingText:
      'From artificial intelligence and graphic design to video editing and productivity, discover the digital tools that help bring your ideas to life.',
    cta1Label: 'VIEW ALL PRODUCTS',
    cta1Action: 'products',
    cta2Label: 'BECOME AN AFFILIATE',
    cta2Action: 'affiliate',
    backgroundImage:
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=2000&q=85',
    visualType: 'floating_logos',
    enableFloatingLogos: true,
    bgGradient: 'from-[#071C3F] via-[#0b2866] to-[#051433]',
    accentColor: '#FF9200',
    overlayOpacity: 0.75,
    backgroundPosition: 'center center',
    textAlignment: 'left',
    isActive: true,
    displayOrder: 2,
  },
  {
    id: 'slide-3',
    badge: 'BUILT FOR AMBITIOUS MINDS',
    headline: 'Create More. Achieve More.',
    supportingText:
      "Whether you're a freelancer, designer, entrepreneur, or digital creator, equip yourself with tools that make every project more productive.",
    cta1Label: 'DISCOVER YOUR NEXT TOOL',
    cta1Action: 'products',
    cta2Label: 'EXPLORE OUR PLANS',
    cta2Action: 'products',
    backgroundImage:
      'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=2000&q=85',
    visualType: 'photo',
    bgGradient: 'from-[#051638] via-[#0d275e] to-[#030e24]',
    accentColor: '#FF7900',
    overlayOpacity: 0.74,
    backgroundPosition: 'center right',
    textAlignment: 'left',
    isActive: true,
    displayOrder: 3,
  },
  {
    id: 'slide-4',
    badge: 'POWERFUL TOOLS. ANYWHERE YOU GO.',
    headline: 'Your Ambition. Powered by Technology.',
    supportingText:
      "Explore flexible digital solutions that support your creativity, productivity, and everyday work—whether you're at your desk or on the move.",
    cta1Label: 'SHOP DIGITAL TOOLS',
    cta1Action: 'products',
    cta2Label: 'JOIN OUR COMMUNITY',
    cta2Action: 'community',
    backgroundImage:
      'https://images.unsplash.com/photo-1589156280159-27698a70f29e?auto=format&fit=crop&w=2000&q=85',
    visualType: 'photo',
    bgGradient: 'from-[#071d44] via-[#102d6b] to-[#04112e]',
    accentColor: '#FF9200',
    overlayOpacity: 0.7,
    backgroundPosition: 'center right',
    textAlignment: 'left',
    isActive: true,
    displayOrder: 4,
  },
];

export const INITIAL_BENEFITS: BenefitCard[] = [
  {
    id: 'benefit-1',
    title: 'Affordable Premium Tools',
    text: 'Explore powerful AI applications and professional software at subsidized prices.',
    iconName: 'Sparkles',
  },
  {
    id: 'benefit-2',
    title: 'Convenient Ordering',
    text: 'Choose your preferred software plan, complete checkout, and receive clear order confirmation.',
    iconName: 'ShoppingBag',
  },
  {
    id: 'benefit-3',
    title: 'Flexible Payment Options',
    text: 'Pay securely through Paystack or select an available alternative payment method.',
    iconName: 'CreditCard',
  },
  {
    id: 'benefit-4',
    title: 'Dedicated Customer Support',
    text: 'Contact our team through WhatsApp, Telegram, or email whenever you need assistance.',
    iconName: 'Headphones',
  },
];

export const INITIAL_REVIEWS: CustomerReview[] = [
  {
    id: 'rev-1',
    customerName: 'Chinedu O.',
    rating: 5,
    reviewMessage: 'Got my Canva Pro 1 Year plan activated in less than 20 minutes. Everything works seamlessly and I have full access to brand kits.',
    productPurchased: 'Canva Pro',
    reviewDate: '2026-09-14',
    isApproved: true,
    isFeatured: true,
  },
  {
    id: 'rev-2',
    customerName: 'Fatima B.',
    rating: 5,
    reviewMessage: 'ChatGPT Plus has transformed my research workflow. Payment was straightforward via Paystack and customer service on WhatsApp was polite and fast.',
    productPurchased: 'ChatGPT Plus',
    reviewDate: '2026-09-28',
    isApproved: true,
    isFeatured: true,
  },
  {
    id: 'rev-3',
    customerName: 'Emmanuel K.',
    rating: 5,
    reviewMessage: 'CapCut Pro 6 months subscription is totally worth it. The video exports are crisp with zero watermark. Kudos Zeek Softwares!',
    productPurchased: 'CapCut Pro',
    reviewDate: '2026-10-05',
    isApproved: true,
    isFeatured: true,
  },
  {
    id: 'rev-4',
    customerName: 'Blessing A.',
    rating: 5,
    reviewMessage: 'I was skeptical at first, but their bank transfer verification took just minutes on WhatsApp. Legit and reliable service.',
    productPurchased: 'Google Gemini Pro AI',
    reviewDate: '2026-10-12',
    isApproved: true,
    isFeatured: true,
  },
];

export const DEFAULT_AFFILIATE_GUIDE: AffiliateGuideConfig = {
  buttonText: 'How to Earn From Our Affiliate',
  title: 'How to Earn From Our Affiliate Programme',
  description:
    'Turn your audience, network, and recommendations into Naira commissions. Every registered partner receives one personal referral link that works across every product in the Zeek Softwares store.',
  heroImageUrl:
    'https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=1400&q=80',
  promoEyebrow: 'Zeek Softwares Affiliate Programme',
  promoHeadline: 'Share One Personal Link. Earn Across Every Product.',
  promoDescription:
    'Partner with Zeek Softwares and earn commissions when customers purchase AI tools and software plans through your unique personal referral link—with direct Naira bank payouts.',
  registerTitle: 'Become Affiliate',
  registerSubtitle:
    'Join the Zeek Softwares Affiliate Programme and earn commissions per eligible referral across every product.',
  highlightCards: [
    {
      label: 'Storewide Link',
      value: '1 Unique Link',
      subtitle: 'Works across every product in the catalog',
    },
    {
      label: 'Per-Product Rates',
      value: 'Admin Managed',
      subtitle: 'Custom commission rate per tool',
    },
    {
      label: 'Minimum Payout',
      value: '₦100 Min',
      subtitle: 'Direct Nigerian bank payout',
    },
    {
      label: 'Real-Time Portal',
      value: 'Live Ledger',
      subtitle: 'Monitor clicks, orders & payouts',
    },
  ],
  ctaBannerTitle: 'Ready to Start Earning With Zeek Softwares?',
  ctaBannerDescription:
    'Registration is free and takes under two minutes. Get your unique personal affiliate link and earn across every software subscription in our store.',
  sections: [
    {
      id: 'guide-step-1',
      stepNumber: '01',
      title: 'How to Register as an Affiliate',
      content:
        'Click any "Become Affiliate" button on the store, enter your full name, email address, WhatsApp number, password, and Nigerian bank account details for payouts. Your partner account and unique referral code are generated immediately upon signup.',
      linkLabel: 'Become an Affiliate Now',
      linkUrl: '#register-affiliate',
      displayOrder: 1,
    },
    {
      id: 'guide-step-2',
      stepNumber: '02',
      title: 'How to Access and Copy Your Personal Affiliate Link',
      content:
        'Sign in to your account and open the Affiliate Portal dashboard. You will see one dedicated personal referral link (for example: ?ref=ZEEK1234) with a one-click Copy button. You do not need to create separate links for different software plans—this single personal link works storewide.',
      displayOrder: 2,
    },
    {
      id: 'guide-step-3',
      stepNumber: '03',
      title: 'How to Share Your Link With Potential Customers',
      content:
        'Share your personal link across WhatsApp statuses, Telegram communities, Instagram bios, TikTok/YouTube video descriptions, blog tutorials, or direct chats with students, creators, freelancers, and business owners looking for subsidized AI and software plans.',
      displayOrder: 3,
    },
    {
      id: 'guide-step-4',
      stepNumber: '04',
      title: 'How Referrals Are Tracked',
      content:
        'When a visitor clicks your personal referral link, our system records the click and saves your referral identity in their browser and order records. Even if they browse other pages or compare multiple software plans before checking out, your referral attribution stays connected.',
      displayOrder: 4,
    },
    {
      id: 'guide-step-5',
      stepNumber: '05',
      title: 'How Commissions Are Calculated',
      content:
        'Commissions on qualifying paid orders are calculated automatically using the commission percentage configured by the Admin for each product (or the active programme rate). Rates apply at the time of verified payment and never alter past recorded earnings.',
      displayOrder: 5,
    },
    {
      id: 'guide-step-6',
      stepNumber: '06',
      title: 'How Your Single Link Covers All Products',
      content:
        'Your unique affiliate referral link is not locked to a single tool. Whether your referred customer browses Canva Pro, ChatGPT Plus, CapCut Pro, Claude Pro, or any other plan in our catalog, your referral is tracked automatically.',
      displayOrder: 6,
    },
    {
      id: 'guide-step-7',
      stepNumber: '07',
      title: 'How Affiliates Can Monitor Their Earnings',
      content:
        'Inside your Affiliate Portal, you can monitor total link clicks, referred customers, qualifying sales count, available balance, total lifetime earnings, individual commission breakdowns, and withdrawal request statuses in real time.',
      displayOrder: 7,
    },
    {
      id: 'guide-step-8',
      stepNumber: '08',
      title: 'How and When Affiliates Receive Their Payments',
      content:
        'Once your available balance meets the minimum withdrawal threshold, submit a payout request directly inside your Affiliate Portal. Our Admin reviews pending requests and sends Naira bank transfers straight to your verified Nigerian bank account, updating your status and sending email confirmation once completed.',
      displayOrder: 8,
    },
  ],
};

export const DEFAULT_POST_PAYMENT_CONFIG: PostPaymentConfig = {
  defaultDestinationType: 'whatsapp',
  whatsappNumber: '2347045200361',
  whatsappMessageTemplate:
    'Hello Zeek Softwares, my payment for Order {{orderId}} ({{productName}} — {{amount}}) is confirmed. Please assist with activation.',
  customRedirectUrl: '',
  downloadPageHeadline: 'Your Order Is Confirmed!',
  downloadPageInstructions:
    'Access your purchased software tools and digital deliverables below. Your links are verified and ready.',
};

export const DEFAULT_EMAIL_BRANDING: EmailBrandingConfig = {
  websiteUrl: env.appUrl && !env.appUrl.includes('MY_APP_URL') ? env.appUrl : 'https://zeeksoftwares.com',
  footerNote:
    'You are receiving this email because you interacted with Zeek Softwares — verified digital tools, AI plans, and creative subscriptions.',
  facebookUrl: '',
  instagramUrl: '',
  twitterUrl: '',
  youtubeUrl: '',
  batchSize: 20,
  batchDelayMs: 1500,
  dailySendLimit: 280,
  orderConfirmationSubject: 'Order Confirmed & Access Ready — {{orderId}} | Zeek Softwares',
  orderConfirmationIntro:
    'Thank you for your verified order with Zeek Softwares! Below are your order details and next-step access instructions.',
  thankYouEnabled: true,
  thankYouSubject: 'Thank You for Purchasing With {{storeName}} ({{orderId}}) — Join Our Community!',
  thankYouGreeting: 'Thank you for your purchase, {{firstName}}!',
  thankYouBodyHtml:
    '<p>We truly appreciate your order with <strong>{{storeName}}</strong>! Your support means the world to us.</p><p>Join our official customer communities below to get instant software updates, setup tips, early promo access, and priority community support:</p>',
  thankYouWhatsappBtnLabel: 'JOIN OUR WHATSAPP COMMUNITY',
  thankYouTelegramBtnLabel: 'JOIN OUR TELEGRAM COMMUNITY',
};

export const getDefaultDailyAutomationConfig = (): DailyAutomationConfig => ({
  key: 'daily_automation',
  enabled: false,
  sendTime: '09:00',
  timezone: 'Africa/Lagos',
  targetCategories: ['All Contacts'],
  days: {
    monday: {
      day: 'monday',
      title: 'Monday Motivation',
      enabled: true,
      subject: 'Happy Monday {{firstName}} — Start Your Week Strong!',
      greetingTemplate: 'Hello {{firstName}}, happy Monday! We hope you are having a wonderful start to your week.',
      bodyHtml:
        '<p>Every big win starts with consistent action and the right digital tools in your corner.</p><p>Whether you are designing, editing video, writing proposals, or scaling projects this week, stay focused and make today count.</p>',
      imageUrl: '',
      ctaLabel: 'Explore Software Tools',
      ctaUrl: '/products',
    },
    tuesday: {
      day: 'tuesday',
      title: 'Tuesday Business Tips',
      enabled: true,
      subject: 'Tuesday Business Tip: Work Smarter Without Overspending',
      greetingTemplate: 'Hello {{firstName}}, happy Tuesday! Here is a quick productivity tip to boost your workflow today.',
      bodyHtml:
        '<p>Automation and AI assistants can save you hours of repetitive work every week. Pair clear templates with reliable creative and research tools to deliver client projects twice as fast.</p>',
      imageUrl: '',
      ctaLabel: 'See Productivity Plans',
      ctaUrl: '/products',
    },
    wednesday: {
      day: 'wednesday',
      title: 'Wednesday Inspiration',
      enabled: true,
      subject: 'Midweek Inspiration — Keep Building Momentum, {{firstName}}',
      greetingTemplate: 'Hello {{firstName}}, happy Wednesday! You are halfway through the week—keep pushing forward.',
      bodyHtml:
        '<p>Great work is rarely about working nonstop—it is about showing up with clarity, creativity, and dependable systems. Take five minutes today to review your top goal for the week.</p>',
      imageUrl: '',
      ctaLabel: 'Visit Zeek Softwares',
      ctaUrl: '/',
    },
    thursday: {
      day: 'thursday',
      title: 'Thursday Growth Message',
      enabled: true,
      subject: 'Thursday Growth: Level Up Your Digital Skills & Income',
      greetingTemplate: 'Hello {{firstName}}, happy Thursday! Let us help you unlock new growth opportunities this week.',
      bodyHtml:
        '<p>Expanding your toolkit opens doors to better projects, higher output, and new revenue streams—including sharing tools you already love with your network.</p>',
      imageUrl: '',
      ctaLabel: 'Browse Catalog',
      ctaUrl: '/products',
    },
    friday: {
      day: 'friday',
      title: 'Friday Special Message',
      enabled: true,
      subject: 'Happy Friday {{firstName}} — Wrap Up Strong & Celebrate Progress',
      greetingTemplate: 'Hello {{firstName}}, happy Friday! Congratulations on everything you accomplished this week.',
      bodyHtml:
        '<p>Before the weekend begins, lock in your final deliverables and set yourself up for an effortless start next week with verified tools ready whenever you need them.</p>',
      imageUrl: '',
      ctaLabel: 'View Featured Tools',
      ctaUrl: '/products',
    },
    saturday: {
      day: 'saturday',
      title: 'Saturday Engagement Message',
      enabled: true,
      subject: 'Happy Weekend {{firstName}} — Something Helpful for Your Saturday',
      greetingTemplate: 'Hello {{firstName}}, happy Saturday! Wishing you a refreshing and productive weekend.',
      bodyHtml:
        '<p>Weekends are great for learning new skills, organizing upcoming creative projects, or connecting with our community on WhatsApp and Telegram for tips and updates.</p>',
      imageUrl: '',
      ctaLabel: 'Chat With Support',
      ctaUrl: '/contact',
    },
    sunday: {
      day: 'sunday',
      title: 'Sunday Appreciation and Inspiration',
      enabled: true,
      subject: 'Thank You From Zeek Softwares — Wishing You a Peaceful Sunday',
      greetingTemplate: 'Hello {{firstName}}, happy Sunday! Thank you for being a valued part of the Zeek Softwares community.',
      bodyHtml:
        '<p>We truly appreciate your trust in Zeek Softwares. Take time today to rest, reflect, and prepare for an amazing week ahead. Our team is always here whenever you need assistance.</p>',
      imageUrl: '',
      ctaLabel: 'Visit Store',
      ctaUrl: '/',
    },
  },
  updatedAt: new Date().toISOString(),
});

export const getInitialSettings = (): SiteSettings => ({
  storeName: 'Zeek Softwares',
  tagline: 'Premium AI Tools. Premium Apps. Subsidized Rates.',
  secondaryTagline: 'Powerful Tools. Smarter Work. Affordable Access.',
  slogan: 'THE TOTAL SOFTWARE SOLUTION',
  supportWhatsApp: '07045200361',
  internationalWhatsApp: '2347045200361',
  supportEmail: 'Zeeksoftwares@gmail.com',
  telegramUsername: '@Zeeksoftware',
  telegramChannelUrl: 'https://t.me/EazyCashHustle',
  whatsappCommunityUrl: 'https://chat.whatsapp.com/GmuCpw6aMBf6D5vB0ESj0k?s=cl&p=a&mlu=4&ilr=4',
  currency: 'NGN',
  logoUrl: '',
  lightLogoUrl: '',
  darkLogoUrl: '',
  faviconUrl: '',
  logoWidth: 160,
  socialShareImageUrl: '',
  bankName: 'Sterling Bank',
  accountNumber: '0143766798',
  accountName: 'Nwokporo Ezekiel Chiadikaobi',
  usdtEnabled: true,
  usdtNetworks: [
    { network: 'USDT (TRC20)', address: 'TYo7uWJp9GvK9Z4L2R1F8M6X3P5A9Qe1Vb' },
    { network: 'USDT (BEP20 / BSC)', address: '0xde96acbcaedbb4a4d101aa3d6fbaa463cde15fe3' },
  ],
  usdtNgnRate: 1550,
  usdNgnRate: 1550,
  bybitUid: '119370841',
  bybitEnabled: true,
  binanceUid: '579348809',
  binanceEnabled: true,
  paystackEnabled: true,
  paystackPublicKey: env.paystackPublicKey,
  paystackMode: env.paystackMode,
  announcementText: '🔥 Special Promotion: Up to 70% off on premium AI subscriptions! Subsidized rates for Nigerian creators & students.',
  announcementActive: true,
  primaryColor: '#061B45',
  accentColor: '#FF7900',
  heroAutoplayDuration: 4000,
  heroTransitionSpeed: 900,
  defaultCommissionRate: 0,
  productCommissionRates: {},
  recurringCommissionsEnabled: true,
  minWithdrawalAmount: 100,
  referralCookieDays: 30,
  affiliateGuide: DEFAULT_AFFILIATE_GUIDE,
  postPaymentConfig: DEFAULT_POST_PAYMENT_CONFIG,
  emailBranding: DEFAULT_EMAIL_BRANDING,
});

export const INITIAL_FAQS: FAQItem[] = [
  {
    id: 'faq-1',
    question: 'What is Zeek Softwares?',
    answer: 'Zeek Softwares is a digital software store offering selected AI tools, productivity applications, and creative software plans at subsidized rates.',
  },
  {
    id: 'faq-2',
    question: 'How do I buy a product?',
    answer: 'Browse our Products page, select a product and plan, click Buy Now, enter your order information, and choose your preferred available payment method.',
  },
  {
    id: 'faq-3',
    question: 'What payment methods do you accept?',
    answer: 'Supported payment methods include Paystack checkout and configured alternative options such as bank transfer, USDT, or supported platform transfers. Availability may vary depending on the payment provider and the selected method.',
  },
  {
    id: 'faq-4',
    question: 'How will I receive my purchased software?',
    answer: 'Delivery or activation instructions depend on the product purchased. The applicable process will be displayed on the product page or communicated through your order confirmation and support channel.',
  },
  {
    id: 'faq-5',
    question: 'Can I renew my subscription?',
    answer: 'Renewal availability depends on the selected product and current plan terms. Contact our support team for available options.',
  },
  {
    id: 'faq-6',
    question: 'What if I have a payment problem?',
    answer: 'Contact Zeek Softwares on WhatsApp or email with your order number and payment reference.',
  },
  {
    id: 'faq-7',
    question: 'Can I pay with USDT?',
    answer: 'USDT payments are available only when the website displays a configured and supported receiving method. Confirm the correct network and amount before transferring.',
  },
  {
    id: 'faq-8',
    question: 'How do I know my payment has been confirmed?',
    answer: 'Paystack payments are verified through our secure payment system. Alternative payment submissions are reviewed before being marked as paid.',
  },
  {
    id: 'faq-9',
    question: 'Can I contact you before purchasing?',
    answer: 'Yes. Use the WhatsApp, Telegram, or email contact buttons on our website.',
  },
  {
    id: 'faq-10',
    question: 'How long does the activation take?',
    answer: 'Activation is instant as soon as your payment is confirmed.',
  },
];

export const INITIAL_POLICIES: LegalPolicies = {
  lastUpdated: '2026-10-18',
  privacyPolicy: `### Introduction
Welcome to Zeek Softwares. We value the privacy of customers and visitors who interact with our website. This Privacy Policy explains how personal information is collected, used, stored, and protected when customers browse our products, place orders, contact support, or use our website.

### Information We Collect
Depending on how you use our website, we may collect:
- Full name
- Email address
- Telephone or WhatsApp number
- Product orders and purchase history
- Payment transaction references and statuses
- Customer support enquiries
- Technical information necessary for website security and operation

We do not require customers to disclose their bank card PINs or payment passwords.

### How We Use Your Information
Customer information may be used to:
- Process orders
- Verify payments
- Provide order information
- Assist with digital product fulfillment
- Respond to customer support requests
- Prevent fraud and unauthorized transactions
- Maintain and improve the website
- Send marketing communications where permitted and consented to

### Payment Processing
We use Paystack for supported online payment transactions. Customers may also choose available alternative payment methods. Payment processing is subject to the applicable payment provider's policies. Sensitive payment information should be handled by the authorized payment provider. Our website must not store full card details or CVV information.

### Information Sharing
We may share only the information reasonably necessary with service providers involved in payment processing, hosting, communication, or fulfillment. We will not claim that data is never shared when necessary service providers actually process customer information.

### Data Security
We use appropriate technical and organizational safeguards to help protect personal information from unauthorized access, misuse, and disclosure.

### Data Retention
We retain information only for legitimate operational, legal, accounting, and customer support purposes, according to applicable requirements and our documented retention settings.

### Customer Privacy Requests
Customers can contact Zeek Softwares to ask questions about their personal information or request appropriate access, correction, or deletion, subject to applicable laws and recordkeeping requirements.

### Privacy Enquiries
For privacy-related questions, contact: Zeeksoftwares@gmail.com`,
  refundPolicy: `### Our Commitment
At Zeek Softwares, we aim to provide clear product information and helpful customer support. We encourage customers to review the selected product, subscription duration, payment amount, and activation requirements before completing payment.

### Refund Requests
Refund eligibility depends on the circumstances of the transaction, the nature of the digital product, applicable consumer protection laws, and whether the product or service has been delivered. Customers may contact us to request a review of issues such as:
- Duplicate payments
- Incorrect charges
- Payment confirmed but order not fulfilled
- Incorrect product delivered
- An activation issue that cannot reasonably be resolved
- Other circumstances where a refund is legally required

### How to Request a Refund
Contact Zeek Softwares using:
- WhatsApp: 07045200361
- Email: Zeeksoftwares@gmail.com

Provide:
- Customer name
- Order number
- Product purchased
- Payment reference
- Description of the issue

### Refund Review
Our support team will review the request, transaction status, fulfillment records, and applicable circumstances. Approved refunds will be processed through an appropriate supported refund method. Processing time may depend on the payment provider and receiving financial institution.

### Important Notice
Nothing in this policy is intended to remove or limit non-waivable consumer rights under applicable law. Do not invent fixed refund deadlines, cancellation restrictions, or guarantees without administrator approval.`,
  renewalGuidelines: `### Understanding Subscription Durations
Some products on Zeek Softwares are offered with defined access durations such as:
- 1 Month
- 6 Months
- 1 Year
- 18 Months
- Other clearly described arrangements

Customers should always review the product listing to understand the specific duration and activation conditions of their selected plan.

### Renewal Information
Where renewal is available, customers can contact Zeek Softwares before the end of their plan to enquire about current pricing and renewal arrangements.

### How to Request Renewal
1. Contact Zeek Softwares on WhatsApp.
2. Provide the product name.
3. Provide the current plan details or previous order number.
4. Request the available renewal options.
5. Review the new price and duration.
6. Complete payment through an approved method.
7. Await confirmation and next-step instructions.

### Important Renewal Notes
- Renewal availability may vary by product.
- Renewal prices may change.
- Access duration and start date must be clearly confirmed in the specific product terms.
- Renewal must not be represented as automatic unless a real recurring billing system has been implemented and the customer has explicitly agreed.
- Customers should not be charged automatically without appropriate authorization.
- If a plan is not renewable, the product page should state that clearly.

### Need Assistance?
WhatsApp: 07045200361
Email: Zeeksoftwares@gmail.com`,
  affiliateTerms: `### Affiliate Programme Agreement
By registering for the Zeek Softwares Affiliate Programme, you agree to these Terms and Conditions.

### 1. Eligibility & Promotion
Affiliates may promote Zeek Softwares products via ethical marketing methods including social media, personal websites, and direct communication. Prohibited methods include spam, misleading claims, brand impersonation, and fraudulent traffic.

### 2. Commission & Attribution
Commissions are calculated as a percentage of verified, paid customer orders attributed to your unique personal referral link. Unpaid orders, chargebacks, and self-referrals do not qualify for commissions.

### 3. Withdrawals
The minimum withdrawal threshold is ₦100. Payouts are made directly to the registered Nigerian bank account provided in your affiliate dashboard. Payouts are reviewed and processed within 24 hours.

### 4. Termination
Zeek Softwares reserves the right to suspend or terminate affiliate accounts found violating these terms or engaging in suspicious activities.`,
};
