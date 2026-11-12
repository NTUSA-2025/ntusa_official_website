import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import imageCompression from "browser-image-compression";
import { heicTo } from "heic-to/csp";
import { uploadImage } from "./upload";

vi.mock("browser-image-compression", () => ({ default: vi.fn() }));
vi.mock("heic-to/csp", () => ({ heicTo: vi.fn() }));

const fetchMock = vi.fn();
const imageFile = new File(["image"], "photo.jpg", { type: "image/jpeg" });
const webpFile = new File(["webp"], "photo.webp", { type: "image/webp" });

describe("uploadImage feedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(imageCompression).mockResolvedValue(webpFile);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("uploads compressed WebP and returns its URL", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ url: "https://example.com/photo.webp" }), { status: 200 }));

    await expect(uploadImage(imageFile)).resolves.toEqual({ ok: true, url: "https://example.com/photo.webp" });
    expect(imageCompression).toHaveBeenCalledWith(imageFile, {
      maxSizeMB: 0.8,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      fileType: "image/webp",
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/upload", expect.objectContaining({ method: "POST" }));
    expect(heicTo).not.toHaveBeenCalled();
  });

  it.each([
    ["photo.heic", "image/heic"],
    ["photo.HEIF", ""],
  ])("converts %s to JPEG before WebP compression", async (name, type) => {
    const heicFile = new File(["heic data"], name, { type });
    vi.mocked(heicTo).mockResolvedValue(new Blob(["jpeg data"], { type: "image/jpeg" }));
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ url: "https://example.com/photo.webp" }), { status: 200 }));

    await expect(uploadImage(heicFile)).resolves.toEqual({ ok: true, url: "https://example.com/photo.webp" });

    expect(heicTo).toHaveBeenCalledWith({ blob: heicFile, type: "image/jpeg", quality: 0.9 });
    const jpegFile = vi.mocked(imageCompression).mock.calls[0][0];
    expect(jpegFile).toBeInstanceOf(File);
    expect(jpegFile.name).toBe("photo.jpg");
    expect(jpegFile.type).toBe("image/jpeg");
    expect(await jpegFile.text()).toBe("jpeg data");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reports HEIC decoding failures without sending an upload request", async () => {
    vi.mocked(heicTo).mockRejectedValue(new Error("Cannot decode HEIC"));

    await expect(uploadImage(new File(["broken"], "photo.heic", { type: "image/heic" })))
      .resolves.toEqual({ ok: false, errorCode: "processingFailed" });
    expect(imageCompression).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    [401, "UNAUTHORIZED", "sessionExpired"],
    [403, "FORBIDDEN", "permissionDenied"],
    [413, "FILE_TOO_LARGE", "tooLarge"],
    [415, "INVALID_FILE_TYPE", "invalidFormat"],
    [400, "INVALID_IMAGE", "invalidFormat"],
    [500, "INTERNAL_ERROR", "serverFailed"],
  ] as const)("reports API error %i as %s", async (status, apiCode, expected) => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ errorCode: apiCode }), { status }));

    await expect(uploadImage(imageFile)).resolves.toEqual({ ok: false, errorCode: expected });
  });

  it("reports a non-JSON 413 response from the hosting platform as too large", async () => {
    fetchMock.mockResolvedValue(new Response("Payload Too Large", { status: 413 }));

    await expect(uploadImage(imageFile)).resolves.toEqual({ ok: false, errorCode: "tooLarge" });
  });

  it("distinguishes image processing from network failures", async () => {
    vi.mocked(imageCompression).mockRejectedValueOnce(new Error("Cannot decode image"));
    await expect(uploadImage(imageFile)).resolves.toEqual({ ok: false, errorCode: "processingFailed" });
    expect(fetchMock).not.toHaveBeenCalled();

    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(uploadImage(imageFile)).resolves.toEqual({ ok: false, errorCode: "networkFailed" });
  });

  it("rejects an empty file and a non-image before compression", async () => {
    await expect(uploadImage(new File([], "empty.jpg", { type: "image/jpeg" }))).resolves.toEqual({ ok: false, errorCode: "emptyFile" });
    await expect(uploadImage(new File(["text"], "notes.txt", { type: "text/plain" }))).resolves.toEqual({ ok: false, errorCode: "invalidFormat" });
    expect(imageCompression).not.toHaveBeenCalled();
  });
});
