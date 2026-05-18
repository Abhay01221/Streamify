export const SUBSCRIPTION_PLANS = {
  FREE_TRIAL: {
    name: 'Free Trial',
    price: 0,
    duration: 30,
    screens: 1,
    maxQuality: '720p',
    downloads: false,
    features: ['30 days free', '1 screen', '720p max', 'Ad-supported'],
  },
  BASIC: {
    name: 'Basic',
    price: 4.99,
    duration: 30,
    screens: 1,
    maxQuality: '1080p',
    downloads: false,
    features: ['$4.99/month', '1 screen', '1080p', 'No ads'],
  },
  STANDARD: {
    name: 'Standard',
    price: 9.99,
    duration: 30,
    screens: 2,
    maxQuality: '1080p',
    downloads: true,
    downloadLimit: 10,
    features: ['$9.99/month', '2 screens', '1080p', '10 downloads/month'],
  },
  PREMIUM: {
    name: 'Premium',
    price: 14.99,
    duration: 30,
    screens: 4,
    maxQuality: '4K',
    downloads: true,
    downloadLimit: -1, // Unlimited
    features: ['$14.99/month', '4 screens', '4K + HDR', 'Unlimited downloads'],
  },
};

export const AGE_RATINGS = {
  G: 'General Audiences',
  PG: 'Parental Guidance',
  PG_13: 'Parents Strongly Cautioned',
  R: 'Restricted',
  NC_17: 'No One 17 and Under',
};

export const GENRES = [
  'Action',
  'Comedy',
  'Drama',
  'Fantasy',
  'Horror',
  'Mystery',
  'Romance',
  'Sci-Fi',
  'Thriller',
  'Animation',
  'Adventure',
  'Crime',
  'Documentary',
  'Family',
  'History',
  'Music',
  'War',
  'Western',
];

export const LANGUAGES = [
  'English',
  'Spanish',
  'French',
  'German',
  'Italian',
  'Portuguese',
  'Russian',
  'Japanese',
  'Korean',
  'Chinese',
  'Hindi',
  'Arabic',
];

export const VIDEO_QUALITIES = [
  { label: '360p', value: 360 },
  { label: '480p', value: 480 },
  { label: '720p', value: 720 },
  { label: '1080p', value: 1080 },
  { label: '4K', value: 2160 },
];

export const SUPPORTED_SUBTITLE_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'zh', name: 'Chinese' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ar', name: 'Arabic' },
];
