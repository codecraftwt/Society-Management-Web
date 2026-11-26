import { describe, it, expect } from "vitest";
import {
  getInitials,
  cleanPhoneForTel,
  filterManagementTeam,
  getDesignationStyle,
} from "./managementTeamUtils";

describe("managementTeamUtils", () => {
  const sampleMembers = [
    {
      id: 1,
      name: "Rohan Sharma",
      designation: "Society Admin",
      designations: ["Society Admin", "Committee Member"],
      role_key: "SOCIETY_ADMIN",
      email: "rohan@society.test",
      phone: "+91 98765-43210",
    },
    {
      id: 2,
      name: "Asha Mehta",
      designation: "Committee Member",
      designations: ["Committee Member"],
      role_key: "COMMITTEE_MEMBER",
      email: "asha@society.test",
      phone: "9123456789",
    },
    {
      id: 3,
      name: "Vikram Patel",
      designation: "Accountant",
      designations: ["Accountant"],
      role_key: "ACCOUNTANT",
      email: "vikram@ca.test",
      phone: "9988776655",
      is_outsider: true,
    },
  ];

  it("extracts initials properly", () => {
    expect(getInitials("Rohan Sharma")).toBe("RS");
    expect(getInitials("Asha")).toBe("A");
    expect(getInitials("")).toBe("?");
  });

  it("cleans phone numbers for tel: links", () => {
    expect(cleanPhoneForTel("+91 98765-43210")).toBe("+919876543210");
    expect(cleanPhoneForTel(null)).toBe("");
  });

  it("filters by roleFilter and search query", () => {
    expect(filterManagementTeam(sampleMembers, { roleFilter: "ALL" })).toHaveLength(3);
    expect(filterManagementTeam(sampleMembers, { roleFilter: "SOCIETY_ADMIN" })).toHaveLength(1);
    expect(filterManagementTeam(sampleMembers, { roleFilter: "COMMITTEE" })).toHaveLength(2);
    expect(filterManagementTeam(sampleMembers, { roleFilter: "ACCOUNTANT" })).toHaveLength(1);
    expect(filterManagementTeam(sampleMembers, { search: "vikram" })).toHaveLength(1);
    expect(filterManagementTeam(sampleMembers, { search: "asha@society" })).toHaveLength(1);
  });

  it("returns distinct designation styles", () => {
    expect(getDesignationStyle("SOCIETY_ADMIN").color).not.toBe(
      getDesignationStyle("ACCOUNTANT").color
    );
  });
});
