import { describe, it, expect } from "vitest";
import { hasPermission } from "../../utils/permissions";

describe("Event Management Frontend Logic & Permission Tests", () => {
  it("should confirm events module is present in PERMISSIONS and permissions.js helper", () => {
    const adminUser = { role: "ADMIN" };
    const residentUser = { role: "RESIDENT" };
    const accountantUser = { role: "ACCOUNTANT" };

    expect(hasPermission(adminUser, "events", "view")).toBe(true);
    expect(hasPermission(adminUser, "events", "create")).toBe(true);
    expect(hasPermission(residentUser, "events", "view")).toBe(true);
    expect(hasPermission(accountantUser, "events", "view")).toBe(false);
  });

  it("should correctly count image vs video media in event objects", () => {
    const sampleMedia = [
      { id: 1, media_type: "IMAGE", url: "https://example.com/p1.jpg" },
      { id: 2, media_type: "IMAGE", url: "https://example.com/p2.jpg" },
      { id: 3, media_type: "VIDEO", url: "https://example.com/v1.mp4" },
    ];

    const photoCount = sampleMedia.filter((m) => m.media_type === "IMAGE").length;
    const videoCount = sampleMedia.filter((m) => m.media_type === "VIDEO").length;

    expect(photoCount).toBe(2);
    expect(videoCount).toBe(1);
  });
});
