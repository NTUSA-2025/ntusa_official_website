import { isValidElement, type ChangeEvent, type ReactElement, type ReactNode } from "react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import en from "@/messages/en.json";
import zh from "@/messages/zh-TW.json";
import type { ImageUploadErrorCode } from "@/lib/upload";
import Editor from "./Editor";

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_R2_PUBLIC_URL = "https://pub-test.r2.dev";
});

const mocks = vi.hoisted(() => ({
  alert: vi.fn(),
  uploadImage: vi.fn(),
  useEditor: vi.fn(),
  useState: vi.fn(),
  useTranslations: vi.fn(),
}));

vi.mock("react", async (importOriginal) => ({
  ...await importOriginal<typeof import("react")>(),
  useState: mocks.useState,
  useRef: () => ({ current: null }),
}));
vi.mock("@tiptap/react", () => ({ useEditor: mocks.useEditor, EditorContent: () => null }));
vi.mock("@tiptap/starter-kit", () => ({ default: { configure: () => ({}) } }));
vi.mock("@tiptap/extension-image", () => ({ default: {} }));
vi.mock("@tiptap/extension-placeholder", () => ({ default: { configure: () => ({}) } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next-intl", () => ({ useTranslations: mocks.useTranslations }));
vi.mock("@/lib/upload", () => ({ uploadImage: mocks.uploadImage }));

type FileInputProps = {
  children?: ReactNode;
  type?: string;
  accept?: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>;
};

function findFileInputs(node: ReactNode): ReactElement<FileInputProps, "input">[] {
  if (Array.isArray(node)) return node.flatMap(findFileInputs);
  if (!isValidElement<FileInputProps>(node)) return [];
  const children = findFileInputs(node.props.children);
  return node.type === "input" && node.props.type === "file"
    ? [node as ReactElement<FileInputProps, "input">, ...children]
    : children;
}

const image = new File(["image"], "photo.jpg", { type: "image/jpeg" });
const uploadErrors = [
  { code: "emptyFile", zh: "圖片檔案是空的，請重新選擇。", en: "This image file is empty. Please choose another file." },
  { code: "invalidFormat", zh: "無法辨識圖片格式，請改用 JPG、PNG、WebP 或 BMP。", en: "This image format could not be read. Please use JPG, PNG, WebP, or BMP." },
  { code: "invalidImage", zh: "無法讀取圖片內容，檔案可能已損毀或不完整。請重新匯出為 JPG 或 PNG，再上傳。", en: "The image contents could not be read. The file may be damaged or incomplete. Please export it again as JPG or PNG." },
  { code: "processingFailed", zh: "瀏覽器無法處理這張圖片，請改用 JPG、PNG、WebP 或 BMP，或嘗試較小的圖片。", en: "Your browser could not process this image. Try JPG, PNG, WebP, or BMP, or use a smaller image." },
  { code: "tooLarge", zh: "圖片壓縮後仍超過上傳限制，請使用較小或較低解析度的圖片。", en: "The image is still too large after compression. Please use a smaller or lower-resolution image." },
  { code: "sessionExpired", zh: "登入已失效，請重新登入後再上傳圖片。", en: "Your session has expired. Please sign in again before uploading an image." },
  { code: "permissionDenied", zh: "目前的帳號沒有上傳圖片的權限，請確認登入帳號。", en: "This account cannot upload images. Please check which account you signed in with." },
  { code: "networkFailed", zh: "無法連線，請檢查網路後重試。", en: "Could not connect. Check your network connection and try again." },
  { code: "serverFailed", zh: "圖片上傳服務暫時無法使用，請稍後再試。", en: "The image upload service is temporarily unavailable. Please try again later." },
  { code: "uploadFailed", zh: "圖片上傳失敗，請稍後再試。", en: "Image upload failed. Please try again later." },
] satisfies { code: ImageUploadErrorCode; zh: string; en: string }[];

describe("Editor image upload alerts", () => {
  let locale: "zh-TW" | "en";
  let stateSetters: ReturnType<typeof vi.fn>[];
  const chain = { focus: vi.fn(), setImage: vi.fn(), run: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    locale = "zh-TW";
    stateSetters = [];
    vi.stubGlobal("alert", mocks.alert);
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.useState.mockImplementation((initial: unknown) => {
      const setter = vi.fn();
      stateSetters.push(setter);
      return [initial, setter];
    });
    mocks.useTranslations.mockImplementation((namespace: string) => (key: string) => {
      let value: unknown = locale === "zh-TW" ? zh : en;
      for (const part of `${namespace}.${key}`.split(".")) {
        value = (value as Record<string, unknown>)[part];
      }
      if (typeof value !== "string") throw new Error(`Missing ${locale} translation: ${namespace}.${key}`);
      return value;
    });
    chain.focus.mockReturnValue(chain);
    chain.setImage.mockReturnValue(chain);
    mocks.useEditor.mockReturnValue({
      isActive: () => false,
      can: () => ({ undo: () => false, redo: () => false }),
      chain: () => chain,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  async function selectImage(source: "cover" | "body") {
    const inputs = findFileInputs(Editor({ authorEmail: "editor@example.com" }));
    expect(inputs).toHaveLength(2);
    const input = { files: [image], value: "photo.jpg" } as unknown as HTMLInputElement;
    await inputs[source === "cover" ? 0 : 1].props.onChange?.({ currentTarget: input } as ChangeEvent<HTMLInputElement>);
    return input;
  }

  it("allows HEIC selection for cover and body images", () => {
    const inputs = findFileInputs(Editor({ authorEmail: "editor@example.com" }));
    expect(inputs).toHaveLength(2);
    for (const input of inputs) {
      expect(input.props.accept).toContain(".heic");
      expect(input.props.accept).toContain(".heif");
    }
  });

  it.each(uploadErrors)("shows the correct Chinese $code alert for a cover image", async ({ code, zh: message }) => {
    mocks.uploadImage.mockResolvedValue({ ok: false, errorCode: code });

    const input = await selectImage("cover");

    expect(mocks.alert).toHaveBeenCalledTimes(1);
    expect(mocks.alert).toHaveBeenCalledWith(message);
    expect(stateSetters[1]).not.toHaveBeenCalled();
    expect(input.value).toBe("");
  });

  it.each(uploadErrors)("shows the correct English $code alert for a body image", async ({ code, en: message }) => {
    locale = "en";
    mocks.uploadImage.mockResolvedValue({ ok: false, errorCode: code });

    const input = await selectImage("body");

    expect(mocks.alert).toHaveBeenCalledTimes(1);
    expect(mocks.alert).toHaveBeenCalledWith(message);
    expect(chain.setImage).not.toHaveBeenCalled();
    expect(input.value).toBe("");
  });

  it("uses the generic alert if an unexpected upload error escapes", async () => {
    mocks.uploadImage.mockRejectedValue(new Error("unexpected"));

    await selectImage("cover");

    expect(mocks.alert).toHaveBeenCalledWith("圖片上傳失敗，請稍後再試。");
  });

  it("inserts successful uploads without showing an error alert", async () => {
    const url = "https://example.com/photo.webp";
    mocks.uploadImage.mockResolvedValue({ ok: true, url });

    await selectImage("cover");
    expect(stateSetters[1]).toHaveBeenCalledWith(url);

    await selectImage("body");
    expect(chain.setImage).toHaveBeenCalledWith({ src: url });
    expect(chain.run).toHaveBeenCalledTimes(1);
    expect(mocks.alert).not.toHaveBeenCalled();
  });

  it("shows newly uploaded R2 images through the same-origin proxy", async () => {
    mocks.uploadImage.mockResolvedValue({ ok: true, url: "https://pub-test.r2.dev/photo.webp" });

    await selectImage("body");

    expect(chain.setImage).toHaveBeenCalledWith({ src: "/r2/photo.webp" });
  });

  it("shows existing R2 body images through the same-origin proxy", () => {
    Editor({
      authorEmail: "editor@example.com",
      initialData: {
        id: "post-1",
        title: "Test",
        content: '<p><img src="https://pub-test.r2.dev/old.webp"></p>',
        coverImage: null,
      },
    });

    expect(mocks.useEditor).toHaveBeenCalledWith(expect.objectContaining({
      content: '<p><img src="/r2/old.webp"></p>',
    }));
  });
});
