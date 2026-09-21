import { describe, it, expect } from "vitest";

import validators, {
  sanitizeText,
  isEmpty,
  getRequiredError,
  getTitleError,
  getNameError,
  getEmailError,
  getMobileError,
  getPasswordError,
  getNumberError,
  getPositiveAmountError,
  getNonNegativeNumberError,
  getDescriptionError,
  isValidDateString,
  getRequiredDateError,
  getDateRangeError,
  getNotPastDateError,
  getVehicleNumberError,
  getSelectError,
  getFileError,
  validateForm,
  hasErrors,
} from "./validators";

const today = new Date();
const toISODate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
const daysFromNow = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return toISODate(d);
};

describe("sanitizeText", () => {
  it("collapses internal whitespace and trims edges", () => {
    expect(sanitizeText("  Hello   World  ")).toBe("Hello World");
    expect(sanitizeText("   ")).toBe("");
    expect(sanitizeText("a\t b")).toBe("a b");
  });

  it("returns empty string for non-string input", () => {
    expect(sanitizeText(null)).toBe("");
    expect(sanitizeText(undefined)).toBe("");
    expect(sanitizeText(123)).toBe("");
  });
});

describe("isEmpty", () => {
  it("detects empty values", () => {
    expect(isEmpty(null)).toBe(true);
    expect(isEmpty(undefined)).toBe(true);
    expect(isEmpty("")).toBe(true);
    expect(isEmpty("   ")).toBe(true);
    expect(isEmpty([])).toBe(true);
    expect(isEmpty({})).toBe(true);
  });

  it("detects non-empty values", () => {
    expect(isEmpty("x")).toBe(false);
    expect(isEmpty(0)).toBe(false);
    expect(isEmpty(false)).toBe(false);
    expect(isEmpty([1])).toBe(false);
    expect(isEmpty({ a: 1 })).toBe(false);
  });
});

describe("getRequiredError", () => {
  it("rejects empty values", () => {
    expect(getRequiredError("")).toBe("This field is required.");
    expect(getRequiredError("   ")).toBe("This field is required.");
    expect(getRequiredError(null)).toBe("This field is required.");
  });

  it("accepts non-empty values and honours a custom label", () => {
    expect(getRequiredError("abc")).toBeNull();
    expect(getRequiredError(0)).toBeNull();
    expect(getRequiredError("", "Society name")).toBe("Society name is required.");
  });
});

describe("getTitleError", () => {
  it("requires a value", () => {
    expect(getTitleError("")).toBe("Title is required.");
    expect(getTitleError("   ")).toBe("Title is required.");
  });

  it("enforces a 4-character minimum", () => {
    expect(getTitleError("Ab")).toBe("Title must contain at least 4 characters.");
    expect(getTitleError("Gym")).toBe("Title must contain at least 4 characters.");
  });

  it("rejects numbers-only and special-characters-only", () => {
    expect(getTitleError("1234")).toBe("Title cannot contain only numbers.");
    expect(getTitleError("@@@!")).toBe("Title cannot contain only special characters.");
  });

  it("rejects excessive internal whitespace", () => {
    expect(getTitleError("Pool   House")).toBe("Title should not contain excessive spaces.");
  });

  it("accepts valid titles and honours a custom label", () => {
    expect(getTitleError("Clubhouse")).toBeNull();
    expect(getTitleError("Gym Hall")).toBeNull();
    expect(getTitleError("", "Amenity name")).toBe("Amenity name is required.");
  });
});

describe("getNameError", () => {
  it("requires a value and a minimum of 2 characters", () => {
    expect(getNameError("  ")).toBe("Name is required.");
    expect(getNameError("J")).toBe("Name must be at least 2 characters.");
  });

  it("rejects digits and invalid characters", () => {
    expect(getNameError("John2")).toBe("Name cannot contain numbers.");
    expect(getNameError("John!!")).toBe("Name should contain only letters and spaces.");
  });

  it("rejects excessive whitespace and invalid characters", () => {
    expect(getNameError("John  Doe")).toBe("Name should contain only letters and spaces.");
    expect(getNameError("John@Doe")).toBe("Name should contain only letters and spaces.");
  });

  it("accepts valid names", () => {
    expect(getNameError("John Doe")).toBeNull();
    expect(getNameError("D'Souza")).toBeNull();
    expect(getNameError("Mary-Ann O'Neil")).toBeNull();
  });
});

describe("getEmailError", () => {
  it("requires a value", () => {
    expect(getEmailError("")).toBe("Email is required.");
  });

  it("rejects malformed addresses", () => {
    expect(getEmailError("noat")).toBe("Please enter a valid email address.");
    expect(getEmailError("a@b")).toBe("Please enter a valid email address.");
    expect(getEmailError("a b@c.com")).toBe("Please enter a valid email address.");
  });

  it("accepts valid addresses (after trimming)", () => {
    expect(getEmailError("a@b.com")).toBeNull();
    expect(getEmailError(" user.name+tag@sub.domain.co.in ")).toBeNull();
  });
});

describe("getMobileError", () => {
  it("requires a value", () => {
    expect(getMobileError("")).toBe("Mobile number is required.");
  });

  it("rejects non-10-digit input", () => {
    expect(getMobileError("987654321")).toBe("Mobile number must be exactly 10 digits.");
    expect(getMobileError("98765432100")).toBe("Mobile number must be exactly 10 digits.");
    expect(getMobileError("abcdefghij")).toBe("Mobile number must be exactly 10 digits.");
    expect(getMobileError("987654321@")).toBe("Mobile number must be exactly 10 digits.");
  });

  it("rejects numbers not starting with 6-9", () => {
    expect(getMobileError("1234567890")).toBe(
      "Mobile number must start with a digit between 6 and 9."
    );
  });

  it("accepts valid Indian mobile numbers (spaces stripped)", () => {
    expect(getMobileError("9876543210")).toBeNull();
    expect(getMobileError("98765 43210")).toBeNull();
  });
});

describe("getPasswordError", () => {
  it("requires a value", () => {
    expect(getPasswordError("")).toBe("Password is required.");
    expect(getPasswordError("   ")).toBe("Password is required.");
    expect(getPasswordError("", "Temp password")).toBe("Temp password is required.");
  });

  it("enforces a minimum of 8 characters", () => {
    expect(getPasswordError("Ab1c")).toBe("Password must be at least 8 characters.");
    expect(getPasswordError("Ab1cdefg")).toBeNull();
  });

  it("requires at least one uppercase letter", () => {
    expect(getPasswordError("abcdefg1")).toBe(
      "Password must contain at least one uppercase letter."
    );
  });

  it("requires at least one lowercase letter", () => {
    expect(getPasswordError("ABCDEFG1")).toBe(
      "Password must contain at least one lowercase letter."
    );
  });

  it("requires at least one number", () => {
    expect(getPasswordError("Abcdefgh")).toBe("Password must contain at least one number.");
  });

  it("accepts strong passwords and honours a custom label", () => {
    expect(getPasswordError("Abcdefg1!@#")).toBeNull();
    expect(getPasswordError("short", "Temp password")).toBe(
      "Temp password must be at least 8 characters."
    );
  });
});

describe("getNumberError", () => {
  it("requires a value", () => {
    expect(getNumberError("", "Rent")).toBe("Rent is required.");
    expect(getNumberError(undefined, "Rent")).toBe("Rent is required.");
  });

  it("rejects non-numeric values", () => {
    expect(getNumberError("abc")).toBe("This field must be a valid number.");
  });

  it("honours allowZero", () => {
    expect(getNumberError("0")).toBeNull();
    expect(getNumberError("0", "Amount", { allowZero: false })).toBe(
      "Amount must be greater than 0."
    );
  });

  it("honours min and max", () => {
    expect(getNumberError("5", "Count", { min: 10 })).toBe("Count must be at least 10.");
    expect(getNumberError("100", "Count", { max: 50 })).toBe("Count must be at most 50.");
    expect(getNumberError("20", "Count", { min: 10, max: 50 })).toBeNull();
  });

  it("honours allowDecimal", () => {
    expect(getNumberError("1.5", "Count", { allowDecimal: false })).toBe(
      "Count must be a whole number."
    );
    expect(getNumberError("5", "Count", { allowDecimal: false })).toBeNull();
  });
});

describe("getPositiveAmountError", () => {
  it("requires a value", () => {
    expect(getPositiveAmountError("", "Rent")).toBe("Rent is required.");
  });

  it("rejects non-numeric, zero and negative values", () => {
    expect(getPositiveAmountError("abc", "Rent")).toBe("Rent must be a valid number.");
    expect(getPositiveAmountError("0", "Rent")).toBe("Rent must be greater than 0.");
    expect(getPositiveAmountError("-5", "Rent")).toBe("Rent must be greater than 0.");
  });

  it("accepts positive amounts including decimals", () => {
    expect(getPositiveAmountError("100", "Rent")).toBeNull();
    expect(getPositiveAmountError("10.5", "Rent")).toBeNull();
  });
});

describe("getNonNegativeNumberError", () => {
  it("requires a value", () => {
    expect(getNonNegativeNumberError("", "Opening balance")).toBe(
      "Opening balance is required."
    );
  });

  it("rejects negatives but allows zero", () => {
    expect(getNonNegativeNumberError("-1", "Opening balance")).toBe(
      "Opening balance cannot be negative."
    );
    expect(getNonNegativeNumberError("0", "Opening balance")).toBeNull();
    expect(getNonNegativeNumberError("25", "Opening balance")).toBeNull();
  });
});

describe("getDescriptionError", () => {
  it("rejects empty values", () => {
    expect(getDescriptionError("")).toBe("Description cannot be empty.");
    expect(getDescriptionError("   ")).toBe("Description cannot be empty.");
  });

  it("enforces the maximum length (default 1000)", () => {
    expect(getDescriptionError("x".repeat(1001))).toBe(
      "Description must be at most 1000 characters."
    );
    expect(getDescriptionError("x".repeat(1000))).toBeNull();
  });

  it("honours a custom max length", () => {
    expect(getDescriptionError("hello world", "Bio", 5)).toBe("Bio must be at most 5 characters.");
  });
});

describe("isValidDateString", () => {
  it("accepts date-only and datetime-local values", () => {
    expect(isValidDateString("2026-09-21")).toBe(true);
    expect(isValidDateString("2026-09-21T14:30")).toBe(true);
    expect(isValidDateString("2026-09-21T14:30:00")).toBe(true);
    expect(isValidDateString("2026-09-21 14:30:00")).toBe(true);
  });

  it("rejects impossible and malformed dates", () => {
    expect(isValidDateString("2026-13-40")).toBe(false);
    expect(isValidDateString("not-a-date")).toBe(false);
    expect(isValidDateString("garbage")).toBe(false);
    expect(isValidDateString("")).toBe(false);
    expect(isValidDateString(null)).toBe(false);
  });
});

describe("getRequiredDateError", () => {
  it("requires a value", () => {
    expect(getRequiredDateError("")).toBe("Date is required.");
  });

  it("rejects invalid dates and accepts valid ones", () => {
    expect(getRequiredDateError("2026-13-40")).toBe("Please enter a valid date.");
    expect(getRequiredDateError("2026-09-21")).toBeNull();
  });
});

describe("getDateRangeError", () => {
  it("returns null when either side is empty", () => {
    expect(getDateRangeError("", "2026-09-21")).toBeNull();
    expect(getDateRangeError("2026-09-21", "")).toBeNull();
  });

  it("rejects an end date earlier than the start date", () => {
    expect(getDateRangeError("2026-09-21", "2026-09-20")).toBe(
      "End date cannot be earlier than start date."
    );
  });

  it("accepts valid ranges (including equality)", () => {
    expect(getDateRangeError("2026-09-20", "2026-09-21")).toBeNull();
    expect(getDateRangeError("2026-09-21", "2026-09-21")).toBeNull();
  });
});

describe("getNotPastDateError", () => {
  it("is neutral for empty or invalid values", () => {
    expect(getNotPastDateError("")).toBeNull();
    expect(getNotPastDateError("garbage")).toBeNull();
  });

  it("rejects past dates", () => {
    expect(getNotPastDateError(daysFromNow(-1))).toBe("Date cannot be in the past.");
  });

  it("accepts today and future dates", () => {
    expect(getNotPastDateError(today)).toBeNull();
    expect(getNotPastDateError(daysFromNow(1))).toBeNull();
    expect(getNotPastDateError(daysFromNow(30))).toBeNull();
  });
});

describe("getVehicleNumberError", () => {
  it("requires a value", () => {
    expect(getVehicleNumberError("")).toBe("Vehicle number is required.");
  });

  it("rejects invalid Indian number plates", () => {
    expect(getVehicleNumberError("1234")).toMatch(/valid Indian/);
    expect(getVehicleNumberError("MH1AB1234")).toMatch(/valid Indian/);
  });

  it("accepts valid plates (case/spacing-insensitive)", () => {
    expect(getVehicleNumberError("MH12AB1234")).toBeNull();
    expect(getVehicleNumberError("mj 12 cd 5678")).toBeNull();
    expect(getVehicleNumberError("KA05M1234")).toBeNull();
  });
});

describe("getSelectError", () => {
  it("requires a selection", () => {
    expect(getSelectError("")).toBe("Selection is required.");
    expect(getSelectError(null)).toBe("Selection is required.");
  });

  it("rejects placeholder options", () => {
    expect(getSelectError("-- Choose --")).toBe("Please select a valid selection.");
    expect(getSelectError("select")).toBe("Please select a valid selection.");
    expect(getSelectError("Select One")).toBe("Please select a valid selection.");
  });

  it("accepts real selections", () => {
    expect(getSelectError("Gym Hall", "Amenity")).toBeNull();
    expect(getSelectError("0")).toBeNull();
  });
});

describe("getFileError", () => {
  it("enforces required files", () => {
    expect(getFileError(null, "Document", { required: true })).toBe(
      "Document is required."
    );
    expect(getFileError(null, "Document", { required: false })).toBeNull();
  });

  it("enforces the size limit", () => {
    const file = { name: "doc.pdf", size: 11 * 1024 * 1024 };
    expect(getFileError(file, "Document", { maxSizeMB: 10 })).toBe(
      "Document size exceeds maximum limit of 10 MB."
    );
    const small = { name: "doc.pdf", size: 1024 };
    expect(getFileError(small, "Document", { maxSizeMB: 10 })).toBeNull();
  });

  it("enforces allowed extensions", () => {
    const file = { name: "doc.pdf" };
    expect(
      getFileError(file, "Document", { allowedExtensions: ["pdf", "jpg"] })
    ).toBeNull();
    const txt = { name: "doc.txt" };
    expect(
      getFileError(txt, "Document", { allowedExtensions: ["pdf", "jpg"] })
    ).toBe("Document type must be one of: pdf, jpg");
  });
});

describe("validateForm + hasErrors", () => {
  it("validates all fields and returns a field->error map", () => {
    const errors = validateForm(
      { name: "", amount: "abc" },
      { name: getRequiredError, amount: [getPositiveAmountError] }
    );
    expect(errors).toEqual({
      name: "This field is required.",
      amount: "Amount must be a valid number.",
    });
  });

  it("only reports fields with rules and supports rule arrays", () => {
    const errors = validateForm(
      { title: "Gym Hall", phone: "987" },
      { title: getTitleError, phone: [getRequiredError, getMobileError] }
    );
    expect(errors.title).toBeUndefined();
    expect(errors.phone).toBe("Mobile number must be exactly 10 digits.");
  });

  it("hasErrors only flags non-empty messages", () => {
    expect(hasErrors({})).toBe(false);
    expect(hasErrors({ name: null })).toBe(false);
    expect(hasErrors({ name: "" })).toBe(false);
    expect(hasErrors({ name: "Name is required." })).toBe(true);
  });
});

describe("default validators export", () => {
  it("exposes every named validator", () => {
    expect(validators.sanitizeText).toBe(sanitizeText);
    expect(validators.validateForm).toBe(validateForm);
    expect(validators.hasErrors).toBe(hasErrors);
    expect(typeof validators.getFileError).toBe("function");
    expect(typeof validators.getPasswordError).toBe("function");
    expect(typeof validators.getNotPastDateError).toBe("function");
  });
});