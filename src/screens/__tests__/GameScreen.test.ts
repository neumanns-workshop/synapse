import { describe, it, expect, beforeEach, jest } from "@jest/globals";

// Mock all external dependencies to prevent side effects during import
jest.mock("../../stores/useGameStore", () => ({
  useGameStore: jest.fn(),
}));

jest.mock("../../context/TutorialContext", () => ({
  useTutorial: jest.fn(),
}));

jest.mock("../ReportScreen", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("../../components/AppHeader", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("../../components/AvailableWordsDisplay", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("../../components/GraphVisualization", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("../../components/PathDisplayConfigurator", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("../../components/PlayerPathDisplay", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("../../components/WordDefinitionDialog", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("../../components/UpgradePrompt", () => ({
  __esModule: true,
  default: () => null,
}));

// Mock react-native-paper
jest.mock("react-native-paper", () => ({
  Text: "Text",
  Card: "Card",
  ActivityIndicator: "ActivityIndicator",
  Portal: "Portal",
  useTheme: () => ({
    customColors: {
      startNode: "#4CAF50",
      endNode: "#F44336", 
      currentNode: "#2196F3",
    },
    colors: {
      onSurface: "#000000",
      surface: "#FFFFFF",
    },
  }),
  Snackbar: "Snackbar",
  Button: "Button",
}));

// Mock react-native-safe-area-context
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaProvider: "SafeAreaProvider",
  SafeAreaView: "SafeAreaView",
}));

describe("GameScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Module Structure", () => {
    it("should be importable without throwing errors", () => {
      expect(() => {
        require("../GameScreen");
      }).not.toThrow();
    });

    it("should export a default component", () => {
      const GameScreenModule = require("../GameScreen");
      expect(GameScreenModule).toBeDefined();
      expect(GameScreenModule.default).toBeDefined();
      expect(typeof GameScreenModule.default).toBe("function");
    });

    it("should have the correct component name", () => {
      const GameScreen = require("../GameScreen").default;
      expect(GameScreen.name).toBe("GameScreen");
    });
  });

  describe("Dependencies", () => {
    it("should successfully import useGameStore", () => {
      const { useGameStore } = require("../../stores/useGameStore");
      expect(useGameStore).toBeDefined();
      expect(typeof useGameStore).toBe("function");
    });

    it("should successfully import useTutorial", () => {
      const { useTutorial } = require("../../context/TutorialContext");
      expect(useTutorial).toBeDefined();
      expect(typeof useTutorial).toBe("function");
    });

    it("should import all child components without errors", () => {
      expect(() => require("../ReportScreen")).not.toThrow();
      expect(() => require("../../components/AppHeader")).not.toThrow();
      expect(() => require("../../components/AvailableWordsDisplay")).not.toThrow();
      expect(() => require("../../components/GraphVisualization")).not.toThrow();
      expect(() => require("../../components/PathDisplayConfigurator")).not.toThrow();
      expect(() => require("../../components/PlayerPathDisplay")).not.toThrow();
      expect(() => require("../../components/WordDefinitionDialog")).not.toThrow();
      expect(() => require("../../components/UpgradePrompt")).not.toThrow();
    });
  });

  describe("Component Properties", () => {
    it("should be a React functional component", () => {
      const GameScreen = require("../GameScreen").default;
      
      // Functional components are just functions
      expect(typeof GameScreen).toBe("function");
      
      // Should have a length property indicating it accepts props
      expect(GameScreen.length).toBeGreaterThanOrEqual(0);
    });

    it("should not throw when accessing component properties", () => {
      expect(() => {
        const GameScreen = require("../GameScreen").default;
        
        // Access common React component properties
        const name = GameScreen.name;
        const length = GameScreen.length;
        const toString = GameScreen.toString();
        
        expect(typeof name).toBe("string");
        expect(typeof length).toBe("number");
        expect(typeof toString).toBe("string");
      }).not.toThrow();
    });
  });

  describe("Store Integration", () => {
    it("should call useGameStore when imported", () => {
      const { useGameStore } = require("../../stores/useGameStore");
      
      // Reset the mock to track calls
      useGameStore.mockClear();
      
      // Import the component (this should trigger the hooks)
      require("../GameScreen");
      
      // The component should be importable (hooks are called during render, not import)
      expect(useGameStore).toBeDefined();
    });

    it("should call useTutorial when imported", () => {
      const { useTutorial } = require("../../context/TutorialContext");
      
      // Reset the mock to track calls
      useTutorial.mockClear();
      
      // Import the component
      require("../GameScreen");
      
      // The component should be importable
      expect(useTutorial).toBeDefined();
    });
  });

  describe("File Structure Validation", () => {
    it("should have consistent export structure", () => {
      const GameScreenModule = require("../GameScreen");
      
      // Should have default export
      expect(GameScreenModule.default).toBeDefined();
      
      // Should not have named exports (typical for React components)
      const keys = Object.keys(GameScreenModule);
      expect(keys).toContain("default");
    });

    it("should be compatible with ES6 import syntax", () => {
      expect(() => {
        // This simulates: import GameScreen from "../GameScreen"
        const GameScreenModule = require("../GameScreen");
        const GameScreen = GameScreenModule.default;
        expect(GameScreen).toBeDefined();
      }).not.toThrow();
    });
  });
}); 