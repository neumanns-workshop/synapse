// Test file for src/utils/svgUtils.ts
import { hasTouchableProperty } from "../svgUtils";

describe("svgUtils", () => {
  describe("hasTouchableProperty", () => {
    it("should return true when props contain onPress", () => {
      const props = { onPress: () => {} };
      expect(hasTouchableProperty(props)).toBe(true);
    });

    it("should return true when props contain onPressIn", () => {
      const props = { onPressIn: () => {} };
      expect(hasTouchableProperty(props)).toBe(true);
    });

    it("should return true when props contain onPressOut", () => {
      const props = { onPressOut: () => {} };
      expect(hasTouchableProperty(props)).toBe(true);
    });

    it("should return true when props contain onLongPress", () => {
      const props = { onLongPress: () => {} };
      expect(hasTouchableProperty(props)).toBe(true);
    });

    it("should return true when props contain disabled", () => {
      const props = { disabled: true };
      expect(hasTouchableProperty(props)).toBe(true);
    });

    it("should return true when props contain disabled set to false", () => {
      const props = { disabled: false };
      expect(hasTouchableProperty(props)).toBe(true);
    });

    it("should return true when props contain multiple touchable properties", () => {
      const props = {
        onPress: () => {},
        onLongPress: () => {},
        disabled: false,
      };
      expect(hasTouchableProperty(props)).toBe(true);
    });

    it("should return false when props do not contain any touchable properties", () => {
      const props = {
        fill: "red",
        stroke: "blue",
        width: 100,
        height: 50,
      };
      expect(hasTouchableProperty(props)).toBe(false);
    });

    it("should return false when props is an empty object", () => {
      const props = {};
      expect(hasTouchableProperty(props)).toBe(false);
    });

    it("should return false when props is null", () => {
      const props = null as unknown as Record<string, unknown>;
      expect(hasTouchableProperty(props)).toBe(false);
    });

    it("should return false when props is undefined", () => {
      const props = undefined as unknown as Record<string, unknown>;
      expect(hasTouchableProperty(props)).toBe(false);
    });

    it("should return false when touchable properties have undefined values", () => {
      const props = { onPress: undefined };
      expect(hasTouchableProperty(props)).toBe(false);
    });

    it("should return true when touchable properties have null values", () => {
      const props = { onPress: null };
      expect(hasTouchableProperty(props)).toBe(true);
    });
  });
});
