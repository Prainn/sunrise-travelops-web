import { describe, expect, it } from "vitest";
import { isValidVehiclePrice, vehiclePriceTotal } from "./vehicle-price";

describe("vehicle quote amounts", () => {
  it("keeps cents exact including the contract maximum and accepts zero", () => {
    expect(vehiclePriceTotal("123.45", 3)).toBe("370.35");
    expect(vehiclePriceTotal("0", 3)).toBe("0.00");
    expect(vehiclePriceTotal("9999999999.99", 10000)).toBe("99999999999900.00");
  });
  it("does not turn missing or invalid input into an offered price", () => {
    for (const amount of ["", "-1", "1.001", "01", "NaN", "1e3", "10000000000"]) {
      expect(isValidVehiclePrice(amount)).toBe(false);
      expect(vehiclePriceTotal(amount, 3)).toBeNull();
    }
    expect(vehiclePriceTotal(null, 3)).toBeNull();
    expect(vehiclePriceTotal("1", null)).toBeNull();
  });
});
