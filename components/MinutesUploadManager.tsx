"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export interface MinuteRecord {
  id: string;
  title: string;
  date: string;
  url: string;
  authorEmail?: string | null;
  authorName?: string | null;
  department?: string | null;
  createdAt?: string | Date;
}

interface Props {
  initialMinutes: MinuteRecord[];
  currentUserEmail: string;
  currentUserRole?: string | null;
  currentUserDepartment?: string | null;
}

export default function MinutesUploadManager({
  initialMinutes,
  currentUserEmail,
  currentUserRole,
  currentUserDepartment,
}: Props) {
  const router = useRouter();
  const t = useTranslations("minutesUpload");
  const tCommon = useTranslations("common");

  const todayStr = new Date().toISOString().split("T")[0];

  const [date, setDate] = useState(todayStr);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [minutesList, setMinutesList] = useState<MinuteRecord[]>(initialMinutes);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const canDelete = (minute: MinuteRecord) => {
    const isAuthor = minute.authorEmail?.toLowerCase() === currentUserEmail.toLowerCase();
    const isManager = currentUserRole === "admin" || currentUserRole === "reviewer" || currentUserDepartment === "公關部";
    return isAuthor || isManager;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!title.trim()) {
      setErrorMessage(t("errors.titleRequired"));
      return;
    }
    if (!date.trim()) {
      setErrorMessage(t("errors.dateRequired"));
      return;
    }
    if (!url.trim()) {
      setErrorMessage(t("errors.urlRequired"));
      return;
    }

    try {
      new URL(url.trim());
    } catch {
      setErrorMessage(t("errors.invalidUrl"));
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/minutes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          date: date.trim(),
          url: url.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.errorCode || t("errors.submitFailed"));
      }

      const createdItem: MinuteRecord = await res.json();
      setMinutesList((prev) => [createdItem, ...prev].sort((a, b) => b.date.localeCompare(a.date)));
      setTitle("");
      setUrl("");
      setSuccessMessage(t("successAdd"));
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("errors.submitFailed");
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, itemTitle: string) => {
    if (!window.confirm(t("deleteConfirm", { title: itemTitle }))) {
      return;
    }

    setDeletingId(id);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/minutes/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.errorCode || t("errors.deleteFailed"));
      }

      setMinutesList((prev) => prev.filter((item) => item.id !== id));
      setSuccessMessage(t("successDelete"));
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("errors.deleteFailed");
      setErrorMessage(msg);
    } finally {
      setDeletingId(null);
    }
  };

  const startEditing = (minute: MinuteRecord) => {
    setEditingId(minute.id);
    setEditDate(minute.date);
    setEditTitle(minute.title);
    setEditUrl(minute.url);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditDate("");
    setEditTitle("");
    setEditUrl("");
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    if (!editTitle.trim()) {
      setErrorMessage(t("errors.titleRequired"));
      return;
    }
    if (!editDate.trim()) {
      setErrorMessage(t("errors.dateRequired"));
      return;
    }
    if (!editUrl.trim()) {
      setErrorMessage(t("errors.urlRequired"));
      return;
    }

    try {
      new URL(editUrl.trim());
    } catch {
      setErrorMessage(t("errors.invalidUrl"));
      return;
    }

    setIsUpdating(true);
    try {
      const res = await fetch(`/api/minutes/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          date: editDate.trim(),
          url: editUrl.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.errorCode || t("errors.updateFailed"));
      }

      const updatedItem: MinuteRecord = await res.json();
      setMinutesList((prev) => prev
        .map((item) => item.id === updatedItem.id ? updatedItem : item)
        .sort((a, b) => b.date.localeCompare(a.date))
      );
      cancelEditing();
      setSuccessMessage(t("successUpdate"));
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("errors.updateFailed");
      setErrorMessage(msg);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* 訊息回饋 */}
      {errorMessage && (
        <div className="p-4 rounded-md bg-red-50 text-red-700 text-sm border border-red-200">
          ⚠️ {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="p-4 rounded-md bg-green-50 text-green-700 text-sm border border-green-200">
          ✅ {successMessage}
        </div>
      )}

      {/* 上傳會議紀錄表單 */}
      <div className="bg-white p-6 sm:p-8 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-2">{t("formTitle")}</h2>
        <p className="text-sm text-gray-500 mb-6">{t("formSubtitle")}</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 會議日期 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                {t("fields.date")} <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 text-sm"
              />
            </div>

            {/* 顯示名稱 */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                {t("fields.title")} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder={t("fields.titlePlaceholder")}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 text-sm"
              />
            </div>
          </div>

          {/* Google Drive / 檔案連結 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              {t("fields.url")} <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              required
              placeholder="https://drive.google.com/file/d/.../view?usp=sharing"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 text-sm"
            />
          </div>

          {/* 說明提示卡片 */}
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg text-xs sm:text-sm text-blue-900 space-y-1">
            <p className="font-semibold flex items-center gap-1">
              💡 {t("driveTipTitle")}
            </p>
            <p className="text-blue-800 leading-relaxed">
              {t("driveTipContent")}
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || !url.trim() || !date.trim()}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isSubmitting ? t("submitting") : t("submitButton")}
            </button>
          </div>
        </form>
      </div>

      {/* 已發布紀錄清單 */}
      <div className="bg-white p-6 sm:p-8 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">{t("listTitle")}</h2>
          <span className="text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full">
            {t("totalCount", { count: minutesList.length })}
          </span>
        </div>

        {minutesList.length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">{t("noMinutesYet")}</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {minutesList.map((item) => {
              const userCanManage = canDelete(item);
              return (
                <div key={item.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {editingId === item.id ? (
                    <form onSubmit={handleUpdate} className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="text-xs font-semibold text-gray-600">
                        {t("fields.date")}
                        <input
                          type="date"
                          required
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-800"
                        />
                      </label>
                      <label className="text-xs font-semibold text-gray-600">
                        {t("fields.title")}
                        <input
                          type="text"
                          required
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-800"
                        />
                      </label>
                      <label className="sm:col-span-2 text-xs font-semibold text-gray-600">
                        {t("fields.url")}
                        <input
                          type="url"
                          required
                          value={editUrl}
                          onChange={(e) => setEditUrl(e.target.value)}
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-800"
                        />
                      </label>
                      <div className="sm:col-span-2 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={cancelEditing}
                          disabled={isUpdating}
                          className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 border border-gray-200 rounded-md transition-colors disabled:opacity-50"
                        >
                          {t("cancelEdit")}
                        </button>
                        <button
                          type="submit"
                          disabled={isUpdating}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50"
                        >
                          {isUpdating ? t("updating") : t("saveEdit")}
                        </button>
                      </div>
                    </form>
                  ) : (
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                        {item.date}
                      </span>
                      <h3 className="font-semibold text-gray-800 text-base truncate">
                        {item.title}
                      </h3>
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-3 flex-wrap">
                      {item.authorName && <span>{t("publishedBy", { name: item.authorName })}</span>}
                      {item.department && <span>{item.department}</span>}
                    </div>
                  </div>
                  )}

                  {editingId !== item.id && <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 text-xs font-semibold bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 rounded-md transition-colors flex items-center gap-1"
                    >
                      🔗 {t("openLink")}
                    </a>
                    {userCanManage && (
                      <button
                        type="button"
                        onClick={() => startEditing(item)}
                        className="px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-md transition-colors"
                      >
                        {t("editButton")}
                      </button>
                    )}
                    {userCanManage && (
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id, item.title)}
                        disabled={deletingId === item.id}
                        className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 rounded-md transition-colors disabled:opacity-50"
                      >
                        {deletingId === item.id ? t("deleting") : tCommon("delete")}
                      </button>
                    )}
                  </div>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
