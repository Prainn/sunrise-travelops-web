import { describe, expect, it } from "vitest";
import { findInvalidMailAddresses, parseMailAddresses } from "./mail-addresses";

describe("mail-addresses", () => {
  it("parses display-name addresses, comma/semicolon lists, and space-separated emails", () => {
    expect(parseMailAddresses("John Doe <john@example.com>, Jane Smith <jane@example.com>")).toEqual([
      "john@example.com",
      "jane@example.com",
    ]);
    expect(parseMailAddresses("a@example.com；b@example.com\nc@example.com d@example.com")).toEqual([
      "a@example.com",
      "b@example.com",
      "c@example.com",
      "d@example.com",
    ]);
  });

  it("identifies invalid email addresses", () => {
    expect(findInvalidMailAddresses(["valid@example.com", "broken@", "not-an-email"])).toEqual([
      "broken@",
      "not-an-email",
    ]);
  });
});
