import { Platform } from "react-native";

/**
 * Web-specific optimizations and utilities
 */

/**
 * Preload critical resources for better web performance
 */
export const preloadCriticalResources = (): void => {
  if (Platform.OS !== "web" || typeof window === "undefined") {
    return;
  }

  // Preload important fonts
  const fonts = [
    '/assets/fonts/MaterialCommunityIcons.ttf',
  ];

  fonts.forEach(font => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = font;
    link.as = 'font';
    link.type = 'font/ttf';
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  });
};

/**
 * Add web-specific meta tags for better SEO and performance
 */
export const addWebMetaTags = (): void => {
  if (Platform.OS !== "web" || typeof document === "undefined") {
    return;
  }

  const metaTags = [
    { name: 'description', content: 'Synapse - A word navigation puzzle game where you find paths between words using semantic similarity.' },
    { name: 'keywords', content: 'word game, puzzle, semantic, vocabulary, brain training, word association' },
    { name: 'author', content: 'Synapse Game' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no' },
    { name: 'theme-color', content: '#6750A4' },
    { property: 'og:title', content: 'Synapse - Word Navigation Game' },
    { property: 'og:description', content: 'Find paths between words using semantic similarity in this engaging puzzle game.' },
    { property: 'og:type', content: 'website' },
    { property: 'og:image', content: '/assets/icon.png' },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: 'Synapse - Word Navigation Game' },
    { name: 'twitter:description', content: 'Find paths between words using semantic similarity in this engaging puzzle game.' },
  ];

  metaTags.forEach(({ name, property, content }) => {
    const existingTag = document.querySelector(`meta[${name ? 'name' : 'property'}="${name || property}"]`);
    if (!existingTag) {
      const meta = document.createElement('meta');
      if (name) meta.name = name;
      if (property) meta.setAttribute('property', property);
      meta.content = content;
      document.head.appendChild(meta);
    }
  });
};

/**
 * Optimize images for web using modern formats when available
 */
export const optimizeImageLoading = (): void => {
  if (Platform.OS !== "web" || typeof window === "undefined") {
    return;
  }

  // Add support for WebP and AVIF images
  const images = document.querySelectorAll('img[data-src]');
  
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          const src = img.dataset.src;
          if (src) {
            img.src = src;
            img.removeAttribute('data-src');
            imageObserver.unobserve(img);
          }
        }
      });
    });

    images.forEach(img => imageObserver.observe(img));
  }
};

/**
 * Enable web app manifest and service worker for PWA features
 * Only loads if files actually exist to avoid console errors
 */
export const enablePWAFeatures = (): void => {
  if (Platform.OS !== "web" || typeof window === "undefined") {
    return;
  }

  // Check if manifest exists before adding link
  // Don't add if it doesn't exist to avoid console errors
  const existingManifest = document.querySelector('link[rel="manifest"]');
  if (!existingManifest) {
    // Only add manifest if we can verify it exists
    // For now, skip automatic manifest injection to avoid 404 errors
    console.debug('Skipping manifest.json - file not found or not configured');
  }

  // Register service worker for caching (only if it exists)
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      // Check if service worker file exists before registering
      fetch('/service-worker.js', { method: 'HEAD' })
        .then(response => {
          if (response.ok) {
            return navigator.serviceWorker.register('/service-worker.js');
          } else {
            console.debug('Skipping service worker registration - file not found');
            return null;
          }
        })
        .then(registration => {
          if (registration) {
            console.log('SW registered: ', registration);
          }
        })
        .catch(registrationError => {
          console.debug('SW registration failed: ', registrationError);
        });
    });
  }
};

/**
 * Initialize all web optimizations
 */
export const initializeWebOptimizations = (): void => {
  if (Platform.OS !== "web") {
    return;
  }

  // Run optimizations
  preloadCriticalResources();
  addWebMetaTags();
  optimizeImageLoading();
  enablePWAFeatures();

  // Add performance observer for monitoring
  if ('PerformanceObserver' in window) {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach(entry => {
        // Log slow operations in development
        if (__DEV__ && entry.duration > 100) {
          console.warn(`Slow operation detected: ${entry.name} took ${entry.duration}ms`);
        }
      });
    });

    observer.observe({ entryTypes: ['measure', 'navigation'] });
  }
}; 