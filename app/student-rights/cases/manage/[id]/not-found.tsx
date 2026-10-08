import Link from "next/link";

export default function PublicCaseNotFound() {
  return (
    <section className="case-manager">
      <Link className="case-manager-back" href="/student-rights/cases/manage">
        ← 返回所有案件
      </Link>
      <div className="case-manager-panel">
        <h1>找不到案件</h1>
        <p>這筆案件可能已不存在，或網址不正確。</p>
      </div>
    </section>
  );
}
