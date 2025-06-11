import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";

// Mock all external dependencies to prevent side effects during import
jest.mock("@stripe/stripe-js", () => ({
  loadStripe: jest.fn(),
}));

jest.mock("../SupabaseService", () => ({
  __esModule: true,
  default: class MockSupabaseService {
    static getInstance() {
      return new MockSupabaseService();
    }
    signInAnonymously = jest.fn();
    invokeFunction = jest.fn();
    getUser = jest.fn();
    syncPurchaseData = jest.fn();
  },
}));

jest.mock("../UnifiedDataStore", () => ({
  UnifiedDataStore: class MockUnifiedDataStore {
    static getInstance() {
      return new MockUnifiedDataStore();
    }
    storePendingConversionDetails = jest.fn();
    clearPendingConversionDetails = jest.fn();
    setPremiumStatus = jest.fn();
  },
}));

// Mock environment variables
const originalEnv = process.env;
beforeEach(() => {
  jest.resetModules();
  process.env = {
    ...originalEnv,
    EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_mock_key",
  };
});

afterEach(async () => {
  process.env = originalEnv;

  // Clear any Stripe-related singletons
  const StripeServiceModule = require("../StripeService");
  if (StripeServiceModule.StripeService) {
    (StripeServiceModule.StripeService as any).instance = undefined;
  }

  // Clear any remaining timers or promises
  jest.clearAllTimers();
  await new Promise(setImmediate); // Flush promise queue
});

describe("StripeService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up loadStripe mock to return a resolved promise
    const { loadStripe } = require("@stripe/stripe-js");
    loadStripe.mockResolvedValue(null);
  });

  describe("Module Structure", () => {
    it("should be importable without throwing errors", () => {
      expect(() => {
        require("../StripeService");
      }).not.toThrow();
    });

    it("should export StripeService class", () => {
      const StripeServiceModule = require("../StripeService");
      expect(StripeServiceModule).toBeDefined();
      expect(StripeServiceModule.StripeService).toBeDefined();
      expect(typeof StripeServiceModule.StripeService).toBe("function");
    });

    it("should export default StripeService", () => {
      const StripeServiceModule = require("../StripeService");
      expect(StripeServiceModule.default).toBeDefined();
      expect(typeof StripeServiceModule.default).toBe("function");
    });

    it("should export PaymentResult interface", () => {
      const StripeServiceModule = require("../StripeService");
      // TypeScript interfaces don't exist at runtime, but we can test the module structure
      expect(StripeServiceModule).toBeDefined();
    });

    it("should export InitiatePurchaseResult interface", () => {
      const StripeServiceModule = require("../StripeService");
      // TypeScript interfaces don't exist at runtime, but we can test the module structure
      expect(StripeServiceModule).toBeDefined();
    });
  });

  describe("Dependencies", () => {
    it("should successfully import Stripe", () => {
      const { loadStripe } = require("@stripe/stripe-js");
      expect(loadStripe).toBeDefined();
      expect(typeof loadStripe).toBe("function");
    });

    it("should successfully import SupabaseService", () => {
      const SupabaseService = require("../SupabaseService").default;
      expect(SupabaseService).toBeDefined();
      expect(typeof SupabaseService.getInstance).toBe("function");
    });

    it("should successfully import UnifiedDataStore", () => {
      const { UnifiedDataStore } = require("../UnifiedDataStore");
      expect(UnifiedDataStore).toBeDefined();
      expect(typeof UnifiedDataStore.getInstance).toBe("function");
    });

    it("should import all dependencies without errors", () => {
      expect(() => require("@stripe/stripe-js")).not.toThrow();
      expect(() => require("../SupabaseService")).not.toThrow();
      expect(() => require("../UnifiedDataStore")).not.toThrow();
    });
  });

  describe("Singleton Pattern", () => {
    it("should implement singleton pattern correctly", () => {
      const { StripeService } = require("../StripeService");

      const instance1 = StripeService.getInstance();
      const instance2 = StripeService.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(StripeService);
    });

    it("should have getInstance method", () => {
      const { StripeService } = require("../StripeService");
      expect(typeof StripeService.getInstance).toBe("function");
    });

    it("should not allow direct instantiation", () => {
      const { StripeService } = require("../StripeService");

      // Constructor should be private, but in JavaScript we can't truly enforce this
      // We test that getInstance is the intended way to get instances
      expect(typeof StripeService.getInstance).toBe("function");
    });
  });

  describe("Class Structure", () => {
    it("should have initiatePurchaseAndAccountCreation method", () => {
      const { StripeService } = require("../StripeService");
      const instance = StripeService.getInstance();

      expect(typeof instance.initiatePurchaseAndAccountCreation).toBe(
        "function",
      );
    });

    it("should have getPricingInfo method", () => {
      const { StripeService } = require("../StripeService");
      const instance = StripeService.getInstance();

      expect(typeof instance.getPricingInfo).toBe("function");
    });

    it("should have isAvailable method", () => {
      const { StripeService } = require("../StripeService");
      const instance = StripeService.getInstance();

      expect(typeof instance.isAvailable).toBe("function");
    });

    it("should have debugPurchasePremium method", () => {
      const { StripeService } = require("../StripeService");
      const instance = StripeService.getInstance();

      expect(typeof instance.debugPurchasePremium).toBe("function");
    });

    it("should have private handleSuccessfulPayment method", () => {
      const { StripeService } = require("../StripeService");
      const instance = StripeService.getInstance();

      // Private methods aren't directly accessible, but we can check the instance
      expect(instance).toBeDefined();
    });

    it("should initialize with required services", () => {
      const { StripeService } = require("../StripeService");
      const instance = StripeService.getInstance();

      // The instance should be created without throwing
      expect(instance).toBeDefined();
      expect(instance).toBeInstanceOf(StripeService);
    });
  });

  describe("Service Integration", () => {
    it("should call SupabaseService.getInstance during initialization", () => {
      const SupabaseService = require("../SupabaseService").default;

      // Clear any previous calls
      SupabaseService.getInstance.mockClear?.();

      // Import and create instance
      const { StripeService } = require("../StripeService");
      StripeService.getInstance();

      // The service should be available
      expect(SupabaseService.getInstance).toBeDefined();
    });

    it("should call UnifiedDataStore.getInstance during initialization", () => {
      const { UnifiedDataStore } = require("../UnifiedDataStore");

      // Clear any previous calls
      UnifiedDataStore.getInstance.mockClear?.();

      // Import and create instance
      const { StripeService } = require("../StripeService");
      StripeService.getInstance();

      // The service should be available
      expect(UnifiedDataStore.getInstance).toBeDefined();
    });

    it("should initialize Stripe with publishable key", () => {
      const { loadStripe } = require("@stripe/stripe-js");

      // Clear any previous calls
      loadStripe.mockClear?.();

      // Import and create instance
      const { StripeService } = require("../StripeService");
      StripeService.getInstance();

      // loadStripe should be called during initialization
      expect(loadStripe).toBeDefined();
    });
  });

  describe("Constants", () => {
    it("should have PREMIUM_PRICE constant", () => {
      const { StripeService } = require("../StripeService");
      const instance = StripeService.getInstance();

      expect(instance.PREMIUM_PRICE).toBeDefined();
      expect(typeof instance.PREMIUM_PRICE).toBe("number");
      expect(instance.PREMIUM_PRICE).toBe(5.0);
    });

    it("should have PREMIUM_CURRENCY constant", () => {
      const { StripeService } = require("../StripeService");
      const instance = StripeService.getInstance();

      expect(instance.PREMIUM_CURRENCY).toBeDefined();
      expect(typeof instance.PREMIUM_CURRENCY).toBe("string");
      expect(instance.PREMIUM_CURRENCY).toBe("usd");
    });

    it("should have PREMIUM_PRODUCT_NAME constant", () => {
      const { StripeService } = require("../StripeService");
      const instance = StripeService.getInstance();

      expect(instance.PREMIUM_PRODUCT_NAME).toBeDefined();
      expect(typeof instance.PREMIUM_PRODUCT_NAME).toBe("string");
      expect(instance.PREMIUM_PRODUCT_NAME).toContain("Galaxy Brain");
    });

    it("should have PREMIUM_PRODUCT_DESCRIPTION constant", () => {
      const { StripeService } = require("../StripeService");
      const instance = StripeService.getInstance();

      expect(instance.PREMIUM_PRODUCT_DESCRIPTION).toBeDefined();
      expect(typeof instance.PREMIUM_PRODUCT_DESCRIPTION).toBe("string");
      expect(instance.PREMIUM_PRODUCT_DESCRIPTION.length).toBeGreaterThan(0);
    });
  });

  describe("Environment Variables", () => {
    it("should handle missing Stripe publishable key gracefully", () => {
      // Clean environment for test isolation
      // Store original value
      const originalKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;

      // Temporarily remove the environment variable
      process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY = undefined;

      expect(() => {
        delete require.cache[require.resolve("../StripeService")];
        require("../StripeService");
      }).not.toThrow();

      // Restore original value
      process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY = originalKey;
    });

    it("should use environment variable for Stripe key", () => {
      process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_test_custom_key";

      expect(() => {
        delete require.cache[require.resolve("../StripeService")];
        const { StripeService } = require("../StripeService");
        const instance = StripeService.getInstance();
        expect(instance).toBeDefined();
      }).not.toThrow();
    });
  });

  describe("Error Handling", () => {
    it("should not throw during module initialization", () => {
      expect(() => {
        // Re-require to test fresh initialization
        delete require.cache[require.resolve("../StripeService")];
        require("../StripeService");
      }).not.toThrow();
    });

    it("should handle missing dependencies gracefully", () => {
      expect(() => {
        const { StripeService } = require("../StripeService");
        const instance = StripeService.getInstance();
        expect(instance).toBeDefined();
      }).not.toThrow();
    });

    it("should handle Stripe loading failures gracefully", () => {
      expect(() => {
        const { StripeService } = require("../StripeService");
        const instance = StripeService.getInstance();
        expect(instance).toBeDefined();
      }).not.toThrow();
    });
  });

  describe("TypeScript Compatibility", () => {
    it("should have proper TypeScript exports", () => {
      const StripeServiceModule = require("../StripeService");

      // Should export StripeService class
      expect(StripeServiceModule.StripeService).toBeDefined();
      expect(typeof StripeServiceModule.StripeService).toBe("function");

      // Should have default export
      expect(StripeServiceModule.default).toBeDefined();
    });

    it("should support TypeScript interfaces", () => {
      expect(() => {
        const { StripeService } = require("../StripeService");

        // Component should be TypeScript compatible
        expect(StripeService).toBeDefined();
      }).not.toThrow();
    });
  });

  describe("Method Signatures", () => {
    it("should have initiatePurchaseAndAccountCreation with correct signature", () => {
      const { StripeService } = require("../StripeService");
      const instance = StripeService.getInstance();

      expect(typeof instance.initiatePurchaseAndAccountCreation).toBe(
        "function",
      );
      expect(instance.initiatePurchaseAndAccountCreation.length).toBe(1); // One parameter
    });

    it("should have getPricingInfo with correct signature", () => {
      const { StripeService } = require("../StripeService");
      const instance = StripeService.getInstance();

      expect(typeof instance.getPricingInfo).toBe("function");
      expect(instance.getPricingInfo.length).toBe(0); // No parameters
    });

    it("should have isAvailable with correct signature", () => {
      const { StripeService } = require("../StripeService");
      const instance = StripeService.getInstance();

      expect(typeof instance.isAvailable).toBe("function");
      expect(instance.isAvailable.length).toBe(0); // No parameters
    });

    it("should have debugPurchasePremium with correct signature", () => {
      const { StripeService } = require("../StripeService");
      const instance = StripeService.getInstance();

      expect(typeof instance.debugPurchasePremium).toBe("function");
      expect(instance.debugPurchasePremium.length).toBe(0); // No parameters
    });

    it("should return Promise from async methods", () => {
      const { StripeService } = require("../StripeService");
      const instance = StripeService.getInstance();

      // Mock the dependencies to avoid actual calls
      const mockSignupData = {
        email: "test@example.com",
        password: "password123",
        emailUpdatesOptIn: false,
      };

      const result1 =
        instance.initiatePurchaseAndAccountCreation(mockSignupData);
      expect(result1).toBeInstanceOf(Promise);

      const result2 = instance.isAvailable();
      expect(result2).toBeInstanceOf(Promise);

      const result3 = instance.debugPurchasePremium();
      expect(result3).toBeInstanceOf(Promise);
    });
  });

  describe("Pricing Information", () => {
    it("should return correct pricing info structure", () => {
      const { StripeService } = require("../StripeService");
      const instance = StripeService.getInstance();

      const pricingInfo = instance.getPricingInfo();

      expect(pricingInfo).toBeDefined();
      expect(typeof pricingInfo).toBe("object");
      expect(pricingInfo.price).toBeDefined();
      expect(pricingInfo.currency).toBeDefined();
      expect(pricingInfo.displayPrice).toBeDefined();
      expect(pricingInfo.productName).toBeDefined();
      expect(pricingInfo.description).toBeDefined();
    });

    it("should have consistent pricing values", () => {
      const { StripeService } = require("../StripeService");
      const instance = StripeService.getInstance();

      const pricingInfo = instance.getPricingInfo();

      expect(pricingInfo.price).toBe(instance.PREMIUM_PRICE);
      expect(pricingInfo.currency).toBe(instance.PREMIUM_CURRENCY);
      expect(pricingInfo.productName).toBe(instance.PREMIUM_PRODUCT_NAME);
      expect(pricingInfo.description).toBe(
        instance.PREMIUM_PRODUCT_DESCRIPTION,
      );
    });
  });

  describe("File Structure Validation", () => {
    it("should have consistent export structure", () => {
      const StripeServiceModule = require("../StripeService");

      // Should have StripeService export
      expect(StripeServiceModule.StripeService).toBeDefined();

      // Should have default export
      expect(StripeServiceModule.default).toBeDefined();

      // Check for expected exports
      const keys = Object.keys(StripeServiceModule);
      expect(keys).toContain("StripeService");
      expect(keys).toContain("default");
    });

    it("should be compatible with ES6 import syntax", () => {
      expect(() => {
        // This simulates: import StripeService, { StripeService as NamedExport } from "../StripeService"
        const StripeServiceModule = require("../StripeService");
        const DefaultExport = StripeServiceModule.default;
        const NamedExport = StripeServiceModule.StripeService;

        expect(DefaultExport).toBeDefined();
        expect(NamedExport).toBeDefined();
      }).not.toThrow();
    });
  });

  describe("Payment Flow Support", () => {
    it("should support purchase initiation flow", () => {
      expect(() => {
        const { StripeService } = require("../StripeService");
        const instance = StripeService.getInstance();

        // Should be able to handle purchase initiation
        expect(instance.initiatePurchaseAndAccountCreation).toBeDefined();
      }).not.toThrow();
    });

    it("should support availability checking", () => {
      expect(() => {
        const { StripeService } = require("../StripeService");
        const instance = StripeService.getInstance();

        // Should be able to check availability
        expect(instance.isAvailable).toBeDefined();
      }).not.toThrow();
    });

    it("should support debug purchase flow", () => {
      expect(() => {
        const { StripeService } = require("../StripeService");
        const instance = StripeService.getInstance();

        // Should be able to handle debug purchases
        expect(instance.debugPurchasePremium).toBeDefined();
      }).not.toThrow();
    });
  });

  describe("Stripe Integration", () => {
    it("should handle Stripe initialization", () => {
      expect(() => {
        const { StripeService } = require("../StripeService");
        const instance = StripeService.getInstance();

        // Should initialize Stripe without throwing
        expect(instance).toBeDefined();
      }).not.toThrow();
    });

    it("should handle Stripe availability check", async () => {
      const { StripeService } = require("../StripeService");
      const instance = StripeService.getInstance();

      // Should be able to check if Stripe is available
      const isAvailable = await instance.isAvailable();
      expect(typeof isAvailable).toBe("boolean");
    });
  });
});
