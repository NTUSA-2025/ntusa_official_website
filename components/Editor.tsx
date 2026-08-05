"use client";

import { useState, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder"; // 引入 Placeholder
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { uploadImage } from "../lib/upload";

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

export default function Editor({ authorEmail, department, userRole, initialData }: EditorProps) {
  const router = useRouter();
  const t = useTranslations("editor");
  const tToolbar = useTranslations("editor.toolbar");

  const [title, setTitle] = useState(initialData?.title || "");
  const [coverImage, setCoverImage] = useState<string | null>(initialData?.coverImage || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 初始化 Tiptap 編輯器
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Image,
      Placeholder.configure({
        placeholder: t("contentPlaceholder"),
        emptyEditorClass: "is-editor-empty",
      }),
    ],
    immediatelyRender: false,
    content: initialData?.content || "", // 如果有初始資料則填入
    editorProps: {
      attributes: {
        // 加入 tiptap class 以配合 globals.css 中的樣式
        // 加入 text-gray-900 強制深色文字，避免在深色模式下變成白底白字
        className: "tiptap prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[400px] border border-gray-300 rounded-md p-4 text-gray-900",
      },
    },
  });

  // 處理封面圖片上傳
  const onCoverImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsUploadingImage(true);
      const url = await uploadImage(e.target.files[0]);
      if (url) setCoverImage(url);
      setIsUploadingImage(false);
    }
  };

  // 處理內文圖片上傳
  const onEditorImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && editor) {
      setIsUploadingImage(true);
      const url = await uploadImage(e.target.files[0]);
      if (url) {
        editor.chain().focus().setImage({ src: url }).run();
      }
      setIsUploadingImage(false);
      
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !editor || editor.isEmpty) {
      alert(t("missingFields"));
      return;
    }

    setIsSubmitting(true);
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
          content: editor.getHTML(),
          coverImage,
          authorEmail,
          status: targetStatus,
        }),
      });

      if (res.ok) {
        alert(isEdit && targetStatus === "APPROVED" ? t("updateSuccessNoReview") || t("updateSuccess") : (isEdit ? t("updateSuccess") : t("submitSuccess")));
        router.push(isEdit ? "/review" : "/");
      } else {
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
          <img src={coverImage} alt="Cover Preview" crossOrigin="anonymous" className="mb-2 max-w-xs rounded-md shadow-sm object-cover" />
        )}
        <input 
          type="file" 
          accept="image/*" 
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

           <div className="flex-grow"></div> {/* 將插入圖片推到最右邊 */}

           {/* 插入圖片 */}
           <input type="file" accept="image/*" ref={fileInputRef} onChange={onEditorImageChange} className="hidden" />
           <button
             onClick={() => fileInputRef.current?.click()}
             className="px-3 py-1.5 rounded text-sm font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50 border border-blue-200"
             disabled={isUploadingImage}
           >
             {isUploadingImage ? tToolbar("uploadingImage") : tToolbar("insertImage")}
           </button>
        </div>
        
        {/* Tiptap 編輯器本體 */}
        <EditorContent editor={editor} className="bg-white min-h-[400px] cursor-text" onClick={() => editor?.commands.focus()} />
      </div>

      {/* 提交按鈕 */}
      <div className="flex justify-end mt-4">
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
