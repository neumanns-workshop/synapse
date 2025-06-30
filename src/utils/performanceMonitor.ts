import { PerformanceObserver } from "react-native-performance";

// Performance marks for different operations
export const PerformanceMarks = {
  GRAPH_RENDER: "GRAPH_RENDER",
  PATH_CALCULATION: "PATH_CALCULATION",
  WORD_SELECTION: "WORD_SELECTION",
  DEFINITION_LOAD: "DEFINITION_LOAD",
  STATE_UPDATE: "STATE_UPDATE",
} as const;

// Performance measures for different operations
export const PerformanceMeasures = {
  GRAPH_RENDER_TIME: "GRAPH_RENDER_TIME",
  PATH_CALCULATION_TIME: "PATH_CALCULATION_TIME",
  WORD_SELECTION_TIME: "WORD_SELECTION_TIME",
  DEFINITION_LOAD_TIME: "DEFINITION_LOAD_TIME",
  STATE_UPDATE_TIME: "STATE_UPDATE_TIME",
} as const;

// Frame rate limiting configuration
let TARGET_FPS = 60;
let FRAME_TIME = 1000 / TARGET_FPS;
let lastFrameTime = 0;
let frameCount = 0;
let lastTime = Date.now();
let frameRate = 0;
let isFrameRateLimited = true;
let rafId: number | null = null;

// Initialize performance observer
const observer = new PerformanceObserver((list) => {
  const entries = list.getEntries();
  entries.forEach((entry) => {
    console.log(`Performance: ${entry.name} - ${entry.duration}ms`);
  });
});

// Start observing performance entries
observer.observe({ entryTypes: ["measure"] });

// Utility functions for performance monitoring
export const startMeasure = (markName: keyof typeof PerformanceMarks) => {
  if (global.performance) {
    global.performance.mark(markName);
  }
};

export const endMeasure = (
  startMark: keyof typeof PerformanceMarks,
  endMark: keyof typeof PerformanceMarks,
  measureName: keyof typeof PerformanceMeasures,
) => {
  if (global.performance) {
    global.performance.mark(endMark);
    global.performance.measure(measureName, startMark, endMark);
  }
};

// Memory usage monitoring
export const logMemoryUsage = () => {
  if (global.performance) {
    // @ts-ignore - memory property exists in some environments
    const memory = global.performance.memory;
    if (memory) {
      console.log("Memory Usage:", {
        totalJSHeapSize: `${Math.round(memory.totalJSHeapSize / 1024 / 1024)}MB`,
        usedJSHeapSize: `${Math.round(memory.usedJSHeapSize / 1024 / 1024)}MB`,
        jsHeapSizeLimit: `${Math.round(memory.jsHeapSizeLimit / 1024 / 1024)}MB`,
      });
    }
  }
};

// Frame rate monitoring and limiting
export const startFrameRateMonitoring = () => {
  const checkFrameRate = () => {
    const currentTime = Date.now();
    const elapsed = currentTime - lastTime;

    if (elapsed >= 1000) {
      frameRate = Math.round((frameCount * 1000) / elapsed);
      console.log(`Current FPS: ${frameRate}`);
      frameCount = 0;
      lastTime = currentTime;
    }

    // Frame rate limiting logic
    if (isFrameRateLimited) {
      const now = performance.now();
      const frameElapsed = now - lastFrameTime;

      if (frameElapsed < FRAME_TIME) {
        // If we're ahead of schedule, wait for the next frame
        const waitTime = Math.max(0, FRAME_TIME - frameElapsed);
        rafId = requestAnimationFrame(() => {
          setTimeout(() => {
            frameCount++;
            rafId = requestAnimationFrame(checkFrameRate);
          }, waitTime);
        });
        return;
      }

      lastFrameTime = now;
    }

    frameCount++;
    rafId = requestAnimationFrame(checkFrameRate);
  };

  rafId = requestAnimationFrame(checkFrameRate);
};

// Toggle frame rate limiting
export const toggleFrameRateLimit = (enabled: boolean) => {
  isFrameRateLimited = enabled;
  if (!enabled && rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  console.log(`Frame rate limiting ${enabled ? "enabled" : "disabled"}`);
};

// Set custom target FPS
export const setTargetFPS = (fps: number) => {
  if (fps < 1 || fps > 120) {
    console.warn("Target FPS must be between 1 and 120");
    return;
  }
  TARGET_FPS = fps;
  FRAME_TIME = 1000 / TARGET_FPS;
  console.log(`Target FPS set to ${fps}`);
};

// Cleanup function
export const cleanupPerformanceMonitoring = () => {
  observer.disconnect();
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
};
