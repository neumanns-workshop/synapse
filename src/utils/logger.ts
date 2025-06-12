/**
 * Production Logger & Anti-Tampering System
 *
 * 🧠 Synapse Game Logging System
 * Built with love, protected with sass.
 */

// Initialize cheeky warning function (called later)
function initializeAntiTampering() {
  const isDev = process.env.NODE_ENV === "development";

  if (!isDev && typeof window !== "undefined") {
    // Cheeky console warning
    console.log(
      "%c🧠 Synapse Neural Network Detected!",
      "font-size: 20px; font-weight: bold; color: #6366f1; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);",
    );

    console.log(
      "%c🎯 Hey there, word wizard! 🎯\n\n" +
        "🔍 Curious about how the magic works? We love that!\n" +
        "🎮 But tampering with the game state is like using a dictionary in Scrabble...\n" +
        "🚫 ...technically possible, but where's the fun in that?\n\n" +
        "💡 Want to contribute? Check out our GitHub instead!\n" +
        "🌟 Play fair, stay clever, and enjoy the neural journey! 🌟",
      "font-size: 14px; color: #4f46e5; line-height: 1.6;",
    );

    console.log(
      "%cP.S. Our algorithms are watching... 👁️👁️",
      "font-size: 12px; color: #dc2626; font-style: italic;",
    );
  }
}

interface AppMetrics {
  sessionStart: number;
  pageLoads: number;
  errors: number;
  warnings: number;
  gameStarts: number;
  gameCompletions: number;
  performanceMarks: Map<string, number>;
}

class ProductionLogger {
  private metrics: AppMetrics;
  private isDev: boolean;
  private sessionId: string;

  constructor() {
    this.isDev = process.env.NODE_ENV === "development";
    this.sessionId = this.generateSessionId();
    this.metrics = {
      sessionStart: Date.now(),
      pageLoads: 0,
      errors: 0,
      warnings: 0,
      gameStarts: 0,
      gameCompletions: 0,
      performanceMarks: new Map(),
    };

    // Initialize anti-tampering protection
    initializeAntiTampering();
    this.initializeHealthMonitoring();
  }

  private generateSessionId(): string {
    return `synapse_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeHealthMonitoring() {
    // Track page load
    this.metrics.pageLoads++;

    // Monitor performance (only in browser environment)
    if (typeof window !== "undefined" && window.addEventListener) {
      window.addEventListener("error", (event) => {
        this.error("Global Error", {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
        });
      });

      window.addEventListener("unhandledrejection", (event) => {
        this.error("Unhandled Promise Rejection", {
          reason: event.reason,
        });
      });
    }
  }

  // Public logging methods
  debug(message: string, ...args: any[]) {
    if (this.isDev) {
      console.log(`🔍 [DEBUG] ${message}`, ...args);
    }
  }

  info(message: string, ...args: any[]) {
    if (this.isDev) {
      console.log(`ℹ️ [INFO] ${message}`, ...args);
    }
    // In production, only log critical info to a service
    this.sendToAnalytics("info", message, args);
  }

  warn(message: string, ...args: any[]) {
    this.metrics.warnings++;
    if (this.isDev) {
      console.warn(`⚠️ [WARN] ${message}`, ...args);
    }
    this.sendToAnalytics("warning", message, args);
  }

  error(message: string, ...args: any[]) {
    this.metrics.errors++;
    console.error(`❌ [ERROR] ${message}`, ...args);
    this.sendToAnalytics("error", message, args);
  }

  // Game-specific metrics
  gameStarted(gameType: "daily" | "random" | "challenge") {
    this.metrics.gameStarts++;
    this.info(`Game started: ${gameType}`);
    this.mark(`game_start_${gameType}`);
  }

  gameCompleted(gameType: "daily" | "random" | "challenge", success: boolean) {
    this.metrics.gameCompletions++;
    this.info(`Game completed: ${gameType}`, { success });
    this.measure(`game_duration_${gameType}`, `game_start_${gameType}`);
  }

  // Performance monitoring
  mark(name: string) {
    const timestamp = Date.now();
    this.metrics.performanceMarks.set(name, timestamp);

    if (typeof performance !== "undefined") {
      performance.mark(name);
    }
  }

  measure(name: string, startMark: string) {
    const startTime = this.metrics.performanceMarks.get(startMark);
    if (startTime) {
      const duration = Date.now() - startTime;
      this.info(`Performance: ${name}`, { duration: `${duration}ms` });

      if (typeof performance !== "undefined") {
        try {
          performance.measure(name, startMark);
        } catch (e) {
          // Ignore performance API errors
        }
      }
    }
  }

  // Health check
  getHealthMetrics() {
    const uptime = Date.now() - this.metrics.sessionStart;
    return {
      sessionId: this.sessionId,
      uptime,
      ...this.metrics,
      performanceMarks: Object.fromEntries(this.metrics.performanceMarks),
    };
  }

  private sendToAnalytics(level: string, message: string, data?: any) {
    // In production, this would send to your analytics service
    // For now, we'll just store locally or send to a lightweight endpoint
    if (!this.isDev && typeof window !== "undefined") {
      try {
        // Could integrate with services like:
        // - Sentry for error tracking
        // - Google Analytics for events
        // - PostHog for product analytics
        // - Custom endpoint for health metrics

        const logEvent = {
          timestamp: Date.now(),
          level,
          message,
          data,
          sessionId: this.sessionId,
          url: window.location.href,
          userAgent: navigator.userAgent.substring(0, 100), // Truncated for privacy
        };

        // Store in localStorage as fallback (with size limits)
        this.storeLogEvent(logEvent);
      } catch (error) {
        // Fail silently in production
      }
    }
  }

  private storeLogEvent(event: any) {
    try {
      const logs = JSON.parse(localStorage.getItem("synapse_logs") || "[]");
      logs.push(event);

      // Keep only last 50 events to prevent storage bloat
      if (logs.length > 50) {
        logs.splice(0, logs.length - 50);
      }

      localStorage.setItem("synapse_logs", JSON.stringify(logs));
    } catch (error) {
      // Storage failed, ignore
    }
  }
}

// Create singleton instance
const logger = new ProductionLogger();

// Export clean interface
export const Logger = {
  debug: (message: string, ...args: any[]) => logger.debug(message, ...args),
  info: (message: string, ...args: any[]) => logger.info(message, ...args),
  warn: (message: string, ...args: any[]) => logger.warn(message, ...args),
  error: (message: string, ...args: any[]) => logger.error(message, ...args),

  // Game metrics
  gameStarted: (gameType: "daily" | "random" | "challenge") =>
    logger.gameStarted(gameType),
  gameCompleted: (
    gameType: "daily" | "random" | "challenge",
    success: boolean,
  ) => logger.gameCompleted(gameType, success),

  // Performance
  mark: (name: string) => logger.mark(name),
  measure: (name: string, startMark: string) => logger.measure(name, startMark),

  // Health
  getHealthMetrics: () => logger.getHealthMetrics(),
};

export default Logger;

// Additional anti-tampering measures (browser only)
if (
  typeof window !== "undefined" &&
  typeof window.setInterval === "function" &&
  process.env.NODE_ENV !== "development" &&
  process.env.NODE_ENV !== "test"
) {
  // Detect console manipulation attempts
  let devtools = false;
  const threshold = 160;

  const devtoolsInterval = setInterval(() => {
    if (
      window.outerHeight - window.innerHeight > threshold ||
      window.outerWidth - window.innerWidth > threshold
    ) {
      if (!devtools) {
        devtools = true;
        console.log(
          "%c🕵️ DevTools detected! 🕵️\n" +
            "Remember: Real neural networks don't need debugging! 🧠✨",
          "font-size: 16px; color: #f59e0b; font-weight: bold;",
        );
      }
    }
  }, 1000);

  // Clean up interval on page unload
  if (typeof window !== "undefined" && window.addEventListener) {
    window.addEventListener("beforeunload", () => {
      if (devtoolsInterval) {
        clearInterval(devtoolsInterval);
      }
    });
  }
}
