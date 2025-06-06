// Test file for src/utils/StyleUtils.ts
import { getPointerEventStyles, getShadowStyles } from "../StyleUtils";

// Mock the Platform module directly
jest.mock("react-native", () => ({
  Platform: {
    OS: "ios",
    select: jest.fn((obj) => obj.ios),
  },
}));

// Import Platform after mocking
import { Platform } from "react-native";

describe("StyleUtils", () => {
  describe("getPointerEventStyles", () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it("should return style.pointerEvents on web platform", () => {
      // Override Platform.OS for this test
      Platform.OS = "web";

      const result = getPointerEventStyles("none");
      expect(result).toEqual({ style: { pointerEvents: "none" } });
    });

    it("should return pointerEvents prop on native platforms", () => {
      // First test with iOS
      Platform.OS = "ios";

      const result = getPointerEventStyles("box-none");
      expect(result).toEqual({ pointerEvents: "box-none" });

      // Then test with Android
      Platform.OS = "android";

      const androidResult = getPointerEventStyles("auto");
      expect(androidResult).toEqual({ pointerEvents: "auto" });
    });

    it("should handle all valid pointer event values", () => {
      Platform.OS = "android";

      expect(getPointerEventStyles("auto")).toEqual({ pointerEvents: "auto" });
      expect(getPointerEventStyles("none")).toEqual({ pointerEvents: "none" });
      expect(getPointerEventStyles("box-none")).toEqual({
        pointerEvents: "box-none",
      });
      expect(getPointerEventStyles("box-only")).toEqual({
        pointerEvents: "box-only",
      });
    });
  });

  describe("getShadowStyles", () => {
    beforeEach(() => {
      jest.clearAllMocks();
      // Update mock implementation for each test
      (Platform.select as jest.Mock).mockImplementation(
        (obj) => obj[Platform.OS],
      );
    });

    it("should return iOS-specific shadow styles on iOS", () => {
      Platform.OS = "ios";

      const result = getShadowStyles();
      expect(result).toEqual({
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      });
    });

    it("should return Android-specific elevation on Android", () => {
      Platform.OS = "android";

      const result = getShadowStyles();
      expect(result).toEqual({
        elevation: 2,
      });
    });

    it("should return web-specific boxShadow on web", () => {
      Platform.OS = "web";

      const result = getShadowStyles();
      expect(result).toEqual({
        boxShadow: "0px 1px 2px rgba(0, 0, 0, 0.1)",
      });
    });

    it("should use custom values when provided", () => {
      // Test with iOS
      Platform.OS = "ios";

      const customOptions = {
        elevation: 5,
        shadowColor: "#333",
        shadowOpacity: 0.25,
        shadowRadius: 4,
        shadowOffset: { width: 2, height: 3 },
      };

      const result = getShadowStyles(customOptions);
      expect(result).toEqual({
        shadowColor: "#333",
        shadowOffset: { width: 2, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      });

      // Test with Android
      Platform.OS = "android";

      const androidResult = getShadowStyles(customOptions);
      expect(androidResult).toEqual({
        elevation: 5,
      });

      // Test with web
      Platform.OS = "web";

      const webResult = getShadowStyles(customOptions);
      expect(webResult).toEqual({
        boxShadow: "0px 3px 4px rgba(0, 0, 0, 0.25)",
      });
    });
  });
});
