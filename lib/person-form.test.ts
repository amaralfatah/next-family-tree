import { describe, expect, it } from "vitest";
import { checkedDate } from "@/lib/person-form";

describe("checkedDate", () => {
  it("keeps every precision the form can express", () => {
    expect(checkedDate("", "", "", "birth")).toEqual({ date: null, precision: "unknown" });
    expect(checkedDate("2002", "", "", "birth")).toEqual({ date: "2002-01-01", precision: "year" });
    expect(checkedDate("2002", "3", "", "birth")).toEqual({ date: "2002-03-01", precision: "month" });
    expect(checkedDate(" 2002 ", "3", " 24 ", "birth")).toEqual({ date: "2002-03-24", precision: "day" });
  });

  it("refuses a day or month it would otherwise drop", () => {
    expect(() => checkedDate("2002", "", "24", "birth")).toThrow("person.dateNeedsMonth");
    expect(() => checkedDate("", "3", "", "death")).toThrow("person.dateNeedsYear");
    expect(() => checkedDate("", "3", "24", "start")).toThrow("person.dateNeedsYear");
  });

  it("refuses a date that isn't on the calendar", () => {
    expect(() => checkedDate("2023", "2", "29", "birth")).toThrow("person.dateInvalid");
    expect(() => checkedDate("2002", "4", "0", "birth")).toThrow("person.dateInvalid");
    expect(() => checkedDate("0", "", "", "birth")).toThrow("person.dateInvalid");
  });
});
