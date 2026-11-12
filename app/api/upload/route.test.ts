import { beforeEach, describe, expect, it, vi } from "vitest";
import { getServerSession } from "next-auth/next";
import sharp from "sharp";
import { POST } from "./route";

const { send } = vi.hoisted(() => ({ send: vi.fn() }));

vi.mock("next-auth/next", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: class { send = send; },
  PutObjectCommand: class {
    constructor(public input: Record<string, unknown>) {}
  },
}));

function uploadRequest(file: File): Request {
  const formData = new FormData();
  formData.append("image", file);
  return new Request("http://localhost/api/upload", { method: "POST", body: formData });
}

describe("image upload API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerSession).mockResolvedValue({ user: { email: "editor@ntusa.ntu.edu.tw" } } as Awaited<ReturnType<typeof getServerSession>>);
    send.mockResolvedValue({});
  });

  it("rejects HTML sent directly to the API", async () => {
    const file = new File(["<script>alert(1)</script>"], "attack.html", { type: "text/html" });
    const response = await POST(uploadRequest(file));
    expect(response.status).toBe(415);
    expect(send).not.toHaveBeenCalled();
  });

  it("rejects a false WebP MIME type", async () => {
    const file = new File(["<script>alert(1)</script>"], "attack.webp", { type: "image/webp" });
    const response = await POST(uploadRequest(file));
    expect(response.status).toBe(400);
    expect(send).not.toHaveBeenCalled();
  });

  it("rejects files larger than the upload limit", async () => {
    const file = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.webp", { type: "image/webp" });
    const response = await POST(uploadRequest(file));
    expect(response.status).toBe(413);
    expect(send).not.toHaveBeenCalled();
  });

  it("rejects oversized requests before parsing multipart data", async () => {
    const request = new Request("http://localhost/api/upload", {
      method: "POST",
      headers: { "content-length": String(7 * 1024 * 1024) },
      body: "not multipart data",
    });
    const response = await POST(request);
    expect(response.status).toBe(413);
    expect(send).not.toHaveBeenCalled();
  });

  it("stores a valid WebP with a fixed content type and extension", async () => {
    const file = new File([new Uint8Array([
      82, 73, 70, 70, 4, 0, 0, 0, 87, 69, 66, 80, 86, 80, 56, 32,
    ])], "photo.webp", { type: "image/webp" });
    const response = await POST(uploadRequest(file));
    expect(response.status).toBe(200);
    expect(send).toHaveBeenCalledOnce();
    const command = send.mock.calls[0][0] as { input: { Key: string; ContentType: string } };
    expect(command.input.Key).toMatch(/^[0-9a-f-]+\.webp$/);
    expect(command.input.ContentType).toBe("image/webp");
  });

  it.each(["jpeg", "png"] as const)("converts a Safari %s fallback to WebP", async (format) => {
    const input = await sharp({ create: { width: 2, height: 2, channels: 4, background: "#ff0000" } })
      .toFormat(format)
      .toBuffer();
    const file = new File([new Uint8Array(input)], `photo.${format}`, { type: `image/${format}` });

    const response = await POST(uploadRequest(file));

    expect(response.status).toBe(200);
    const command = send.mock.calls[0][0] as { input: { Key: string; ContentType: string; Body: Buffer } };
    expect(command.input.Key).toMatch(/\.webp$/);
    expect(command.input.ContentType).toBe("image/webp");
    expect(command.input.Body.toString("ascii", 0, 4)).toBe("RIFF");
    expect(command.input.Body.toString("ascii", 8, 12)).toBe("WEBP");
  });

  it("rejects a damaged Safari fallback with a valid JPEG header", async () => {
    const file = new File([new Uint8Array([0xff, 0xd8, 0xff, 0x00])], "broken.jpg", { type: "image/jpeg" });
    const response = await POST(uploadRequest(file));
    expect(response.status).toBe(400);
    expect(send).not.toHaveBeenCalled();
  });
});
