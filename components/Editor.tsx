"use client";

import { useState, useRef, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder"; // 引入 Placeholder
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { proxyR2Html, proxyR2Url, unproxyR2Html } from "@/lib/r2-proxy";
import { uploadImage, type ImageUploadErrorCode } from "../lib/upload";
import { hasLinkCredentials } from "@/lib/post-link-url";

interface EditorProps {
  authorEmail: string;
  department?: string;
  userRole?: string;
  initialData?: {
    id: string;
    title: string;
    content: string;
    coverImage: string | null;
    status?: string;
  };
}

interface LinkSelection {
  from: number;
  to: number;
  text: string;
  isExistingLink: boolean;
}

export default function Editor({ authorEmail, department, userRole, initialData }: EditorProps) {
  const router = useRouter();
  const t = useTranslations("editor");
  const tToolbar = useTranslations("editor.toolbar");

  const [title, setTitle] = useState(initialData?.title || "");
  const [coverImage, setCoverImage] = useState<string | null>(initialData?.coverImage || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [linkSelection, setLinkSelection] = useState<LinkSelection | null>(null);
  const [linkText, setLinkText] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkError, setLinkError] = useState("");

  const uploadErrorMessages: Record<ImageUploadErrorCode, string> = {
    emptyFile: t("uploadErrors.emptyFile"),
    invalidFormat: t("uploadErrors.invalidFormat"),
    invalidImage: t("uploadErrors.invalidImage"),
    processingFailed: t("uploadErrors.processingFailed"),
    tooLarge: t("uploadErrors.tooLarge"),
    sessionExpired: t("uploadErrors.sessionExpired"),
    permissionDenied: t("uploadErrors.permissionDenied"),
    networkFailed: t("uploadErrors.networkFailed"),
    serverFailed: t("uploadErrors.serverFailed"),
    uploadFailed: t("uploadErrors.uploadFailed"),
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const linkTextInputRef = useRef<HTMLInputElement>(null);
  const linkUrlInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!linkSelection) return;
    const input = linkSelection.from === linkSelection.to ? linkTextInputRef : linkUrlInputRef;
    input.current?.focus();
  }, [linkSelection]);

  // 初始化 Tiptap 編輯器
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        link: {
          openOnClick: false,
        },
      }),
      Image,
      Placeholder.configure({
        placeholder: t("contentPlaceholder"),
        emptyEditorClass: "is-editor-empty",
      }),
    ],
    immediatelyRender: false,
    content: proxyR2Html(initialData?.content || ""), // 既有內文圖片也使用本站代理顯示
    editorProps: {
      attributes: {
        // 加入 tiptap class 以配合 globals.css 中的樣式
        // 加入 text-gray-900 強制深色文字，避免在深色模式下變成白底白字
        className: "tiptap prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[400px] border border-gray-300 rounded-md p-4 text-gray-900",
      },
    },
  });

  const uploadSelectedImage = async (file: File): Promise<string | null> => {
    setIsUploadingImage(true);
    try {
      const result = await uploadImage(file);
      if (result.ok) return result.url;
      alert(uploadErrorMessages[result.errorCode]);
      return null;
    } catch (error) {
      console.error("圖片上傳發生未預期錯誤:", error);
      alert(uploadErrorMessages.uploadFailed);
      return null;
    } finally {
      setIsUploadingImage(false);
    }
  };

  // 處理封面圖片上傳
  const onCoverImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    const url = await uploadSelectedImage(file);
    if (url) setCoverImage(url);
    input.value = "";
  };

  // 處理內文圖片上傳
  const onEditorImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file || !editor) return;
    const url = await uploadSelectedImage(file);
    if (url) editor.chain().focus().setImage({ src: proxyR2Url(url) || url }).run();
    input.value = "";
  };

  const onOpenLinkPanel = () => {
    if (!editor) return;
    if (linkSelection) {
      setLinkSelection(null);
      return;
    }

    const isExistingLink = editor.isActive("link");
    if (isExistingLink && editor.state.selection.empty) editor.commands.extendMarkRange("link");
    const { from, to } = editor.state.selection;
    setLinkSelection({ from, to, text: editor.state.doc.textBetween(from, to, " "), isExistingLink });
    setLinkText("");
    setLinkUrl(isExistingLink ? editor.getAttributes("link").href || "" : "");
    setLinkError("");
  };

  const onApplyLink = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editor || !linkSelection) return;

    if (linkSelection.from === linkSelection.to && !linkText.trim()) {
      setLinkError(tToolbar("linkTextRequired"));
      return;
    }

    const input = linkUrl.trim();
    const hasScheme = /^[a-z][a-z\d+.-]*:/i.test(input);
    const hasHostPort = /^[^/:\s]+:\d+(?:[/?#]|$)/.test(input);
    const candidate = hasScheme && !hasHostPort ? input : `https://${input}`;
    let href: string;
    try {
      const url = new URL(candidate);
      if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Invalid protocol");
      if (hasLinkCredentials(candidate)) {
        setLinkError(tToolbar("credentialedLink"));
        return;
      }
      href = url.href;
    } catch {
      setLinkError(tToolbar("invalidLink"));
      return;
    }

    const chain = editor.chain().focus().setTextSelection({ from: linkSelection.from, to: linkSelection.to });
    if (linkSelection.from === linkSelection.to) {
      chain.insertContent({ type: "text", text: linkText.trim(), marks: [{ type: "link", attrs: { href } }] }).run();
    } else {
      chain.setLink({ href }).run();
    }
    setLinkSelection(null);
  };

  const onRemoveLink = () => {
    if (!editor || !linkSelection) return;
    editor.chain().focus().setTextSelection({ from: linkSelection.from, to: linkSelection.to }).unsetLink().run();
    setLinkSelection(null);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !editor || editor.isEmpty) {
      alert(t("missingFields"));
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");
    try {
      const isEdit = !!initialData?.id;
      const url = isEdit ? `/api/posts/${initialData.id}` : "/api/posts";
      const method = isEdit ? "PATCH" : "POST";

      // 決定修改後的文章狀態
      // 1. 如果是新文章，不傳 status (由後端預設為 PENDING)
      // 2. 如果是修改文章：
      //    - 如果是公關部或 Admin 修改，則維持原狀 (可能是已核准)
      //    - 如果是其他部門修改，則一律回到 PENDING 重新審核
      let targetStatus = undefined;
      if (isEdit) {
        const isReviewer = userRole === "admin" || department === "公關部";
        targetStatus = isReviewer ? (initialData?.status || "PENDING") : "PENDING";
      }

      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content: unproxyR2Html(editor.getHTML()),
          coverImage,
          authorEmail,
          status: targetStatus,
        }),
      });

      if (res.ok) {
        alert(isEdit && targetStatus === "APPROVED" ? t("updateSuccessNoReview") || t("updateSuccess") : (isEdit ? t("updateSuccess") : t("submitSuccess")));
        router.push(isEdit ? "/review" : "/");
      } else {
        const errorResponse = await res.json().catch(() => null);
        if (errorResponse?.errorCode === "UNSAFE_LINK_URL") {
          setSubmitError(t("unsafeLinkInContent"));
          return;
        }
        throw new Error(isEdit ? t("updateFailedInternal") : t("submitFailedInternal"));
      }
    } catch (error) {
      alert(t("submitError"));
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 封裝按鈕樣式函數，讓工具列程式碼更乾淨
  const getButtonClass = (isActive: boolean = false) => 
    `px-2 py-1.5 rounded text-sm font-medium transition-colors ${isActive ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-200'}`;

  return (
    <div className="flex flex-col gap-6 text-gray-900">
      {/* 部門顯示 (唯讀) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t("departmentLabel")}</label>
        <div className="w-full px-4 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-600 font-medium">
          {department || "一般部門"}
        </div>
      </div>

      {/* 標題區 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t("titleLabel")}</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("titlePlaceholder")}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
        />
      </div>

      {/* 封面圖區 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t("coverLabel")}</label>
        {coverImage && (
          <img src={proxyR2Url(coverImage)!} alt="Cover Preview" className="mb-2 max-w-xs rounded-md shadow-sm object-cover" />
        )}
        <input 
          type="file" 
          accept="image/*,.heic,.heif"
          onChange={onCoverImageChange} 
          disabled={isUploadingImage}
          className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>

      {/* 編輯器工具列與內文區 */}
      <div className="border border-gray-300 rounded-md bg-gray-50 shadow-sm overflow-hidden">
        {/* 工具列 (支援換行顯示) */}
        <div className="border-b border-gray-300 p-2 flex flex-wrap gap-1 bg-gray-100">
           {/* 文字樣式 */}
           <button onClick={() => editor?.chain().focus().toggleBold().run()} className={getButtonClass(editor?.isActive('bold'))}>{tToolbar("bold")}</button>
           <button onClick={() => editor?.chain().focus().toggleItalic().run()} className={getButtonClass(editor?.isActive('italic'))}>{tToolbar("italic")}</button>
           <button onClick={() => editor?.chain().focus().toggleStrike().run()} className={getButtonClass(editor?.isActive('strike'))}>{tToolbar("strike")}</button>
           
           <div className="w-px bg-gray-300 mx-1 my-1"></div>
           
           {/* 標題 */}
           <button onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} className={getButtonClass(editor?.isActive('heading', { level: 1 }))}>H1</button>
           <button onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} className={getButtonClass(editor?.isActive('heading', { level: 2 }))}>H2</button>
           <button onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} className={getButtonClass(editor?.isActive('heading', { level: 3 }))}>H3</button>
           
           <div className="w-px bg-gray-300 mx-1 my-1"></div>

           {/* 列表與區塊 */}
           <button onClick={() => editor?.chain().focus().toggleBulletList().run()} className={getButtonClass(editor?.isActive('bulletList'))}>{tToolbar("bulletList")}</button>
           <button onClick={() => editor?.chain().focus().toggleOrderedList().run()} className={getButtonClass(editor?.isActive('orderedList'))}>{tToolbar("orderedList")}</button>
           <button onClick={() => editor?.chain().focus().toggleBlockquote().run()} className={getButtonClass(editor?.isActive('blockquote'))}>{tToolbar("blockquote")}</button>
           <button onClick={() => editor?.chain().focus().setHorizontalRule().run()} className={getButtonClass()}>{tToolbar("hr")}</button>

           <div className="w-px bg-gray-300 mx-1 my-1"></div>

           {/* 歷史紀錄 */}
           <button onClick={() => editor?.chain().focus().undo().run()} disabled={!editor?.can().undo()} className="px-2 py-1.5 rounded text-sm font-medium text-gray-600 hover:bg-gray-200 disabled:opacity-30">{tToolbar("undo")}</button>
           <button onClick={() => editor?.chain().focus().redo().run()} disabled={!editor?.can().redo()} className="px-2 py-1.5 rounded text-sm font-medium text-gray-600 hover:bg-gray-200 disabled:opacity-30">{tToolbar("redo")}</button>

           <div className="w-px bg-gray-300 mx-1 my-1"></div>

           {/* 連結 */}
           <button type="button" onClick={onOpenLinkPanel} aria-expanded={!!linkSelection} aria-controls="editor-link-panel" className={getButtonClass(!!linkSelection || editor?.isActive('link'))}>{editor?.isActive('link') ? tToolbar("editLink") : tToolbar("insertLink")}</button>

           <div className="flex-grow"></div> {/* 將插入圖片推到最右邊 */}

           {/* 插入圖片 */}
           <input type="file" accept="image/*,.heic,.heif" ref={fileInputRef} onChange={onEditorImageChange} className="hidden" />
           <button
             onClick={() => fileInputRef.current?.click()}
             className="px-3 py-1.5 rounded text-sm font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50 border border-blue-200"
             disabled={isUploadingImage}
           >
             {isUploadingImage ? tToolbar("uploadingImage") : tToolbar("insertImage")}
           </button>
        </div>

        {linkSelection && (
          <form
            id="editor-link-panel"
            onSubmit={onApplyLink}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                setLinkSelection(null);
                editor?.commands.focus();
              }
            }}
            className="border-b border-blue-200 bg-blue-50 p-4"
          >
            <div className="flex flex-col gap-3 max-w-xl">
              <p className="font-semibold text-sm text-blue-900">{linkSelection.isExistingLink ? tToolbar("editLink") : tToolbar("insertLink")}</p>
              {linkSelection.from === linkSelection.to ? (
                <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
                  {tToolbar("linkText")}
                  <input ref={linkTextInputRef} type="text" value={linkText} onChange={(event) => { setLinkText(event.target.value); setLinkError(""); }} placeholder={tToolbar("linkTextPlaceholder")} className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" />
                </label>
              ) : (
                <p className="text-sm text-gray-700">{tToolbar("selectedText")}: <span className="font-medium break-words">{linkSelection.text}</span></p>
              )}
              <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
                {tToolbar("linkUrl")}
                <input ref={linkUrlInputRef} type="text" inputMode="url" autoComplete="url" value={linkUrl} onChange={(event) => { setLinkUrl(event.target.value); setLinkError(""); }} placeholder="https://example.com" aria-invalid={!!linkError} aria-describedby={linkError ? "editor-link-hint editor-link-error" : "editor-link-hint"} className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" />
              </label>
              <p id="editor-link-hint" className="text-xs text-gray-600">{tToolbar("linkHint")}</p>
              {linkError && <p id="editor-link-error" role="alert" className="text-sm text-red-700">{linkError}</p>}
              <div className="flex flex-wrap items-center justify-end gap-2">
                {linkSelection.isExistingLink && <button type="button" onClick={onRemoveLink} className="mr-auto rounded-md px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50">{tToolbar("removeLink")}</button>}
                <button type="button" onClick={() => { setLinkSelection(null); editor?.commands.focus(); }} className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">{tToolbar("cancelLink")}</button>
                <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">{tToolbar("applyLink")}</button>
              </div>
            </div>
          </form>
        )}
        
        {/* Tiptap 編輯器本體 */}
        <EditorContent editor={editor} className="bg-white min-h-[400px] cursor-text" onFocus={() => setLinkSelection(null)} onClick={() => editor?.commands.focus()} />
      </div>

      {/* 提交按鈕 */}
      <div className="flex flex-col items-end gap-3 mt-4">
        {submitError && <p role="alert" className="text-sm text-red-700">{submitError}</p>}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || isUploadingImage || !title.trim()}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-8 rounded-md disabled:bg-gray-400 transition-colors shadow-sm"
        >
          {isSubmitting ? t("submitButtonLoading") : t("submitButton")}
        </button>
      </div>
    </div>
  );
}
