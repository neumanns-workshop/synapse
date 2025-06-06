// Test file for src/assets/icons.ts
import { ICONS, getIconForPlatform, type IconName } from "../icons";

describe("icons", () => {
  describe("ICONS constant", () => {
    it("should define all expected icon names", () => {
      // Test that all expected icons are defined
      expect(ICONS).toHaveProperty("HOME");
      expect(ICONS).toHaveProperty("PLAY");
      expect(ICONS).toHaveProperty("STATS");
      expect(ICONS).toHaveProperty("SETTINGS");
      expect(ICONS).toHaveProperty("SHARE");
      expect(ICONS).toHaveProperty("BACK");
      expect(ICONS).toHaveProperty("REFRESH");
      expect(ICONS).toHaveProperty("HINT");
      expect(ICONS).toHaveProperty("INFO");
      expect(ICONS).toHaveProperty("CLOSE");
    });

    it("should have the correct icon values", () => {
      // Test the string values of a few key icons
      expect(ICONS.HOME).toBe("home");
      expect(ICONS.PLAY).toBe("play");
      expect(ICONS.SETTINGS).toBe("settings");
      expect(ICONS.BACK).toBe("arrow-back");
      expect(ICONS.CLOSE).toBe("close");
    });
  });

  describe("getIconForPlatform", () => {
    it("should return the correct icon name for each valid IconName", () => {
      // Test that getIconForPlatform returns the correct icon name for each IconName
      const iconNames: IconName[] = Object.keys(ICONS) as IconName[];

      iconNames.forEach((iconName) => {
        expect(getIconForPlatform(iconName)).toBe(ICONS[iconName]);
      });
    });

    it("should handle all defined icon names", () => {
      // Test a sample of specific icons
      expect(getIconForPlatform("HOME")).toBe("home");
      expect(getIconForPlatform("PLAY")).toBe("play");
      expect(getIconForPlatform("STATS")).toBe("bar-chart");
      expect(getIconForPlatform("SETTINGS")).toBe("settings");
      expect(getIconForPlatform("SHARE")).toBe("share");
      expect(getIconForPlatform("BACK")).toBe("arrow-back");
      expect(getIconForPlatform("REFRESH")).toBe("refresh");
      expect(getIconForPlatform("HINT")).toBe("lightbulb");
      expect(getIconForPlatform("INFO")).toBe("info");
      expect(getIconForPlatform("CLOSE")).toBe("close");
    });
  });

  describe("IconName type", () => {
    it("should be the keyof typeof ICONS", () => {
      // This test verifies that our IconName type is consistent with ICONS
      // Create a variable explicitly typed as IconName to verify type compatibility
      const validIconNames: IconName[] = [
        "HOME",
        "PLAY",
        "STATS",
        "SETTINGS",
        "SHARE",
        "BACK",
        "REFRESH",
        "HINT",
        "INFO",
        "CLOSE",
      ];

      // The test passes if TypeScript compilation succeeds with these assignments
      // We also verify at runtime that each name is a valid key
      validIconNames.forEach((name) => {
        expect(Object.keys(ICONS).includes(name)).toBe(true);
      });
    });
  });
});
