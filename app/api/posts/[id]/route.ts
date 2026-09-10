import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import prisma from "../../../../lib/prisma";
import { Resend } from "resend";
import ApprovalNotificationEmail from "../../../../components/emails/ApprovalNotificationEmail";
import ReviewRequestEmail from "../../../../components/emails/ReviewRequestEmail";

const resend = new Resend(process.env.RESEND_API_KEY);

// 從 .env 讀取審核者信箱清單
const PR_EMAILS = process.env.REVIEWER_EMAILS 
  ? process.env.REVIEWER_EMAILS.split(",").map(email => email.trim())
  : ["pr-dept@ntusa.ntu.edu.tw", "president@ntusa.ntu.edu.tw"];

// DELETE 方法：刪除文章
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ errorCode: "UNAUTHORIZED" }, { status: 401 });
    }

    const { id } = await params;

    // [修正] 先尋找文章，確認是否存在
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) {
      return NextResponse.json({ errorCode: "POST_NOT_FOUND" }, { status: 404 });
    }

    // [修正] 權限驗證：只有「原作者本人」或「具備管理權限 (admin/公關部)」可以刪除文章
    const userEmail = session.user.email;
    const userRole = session.user.role;
    const userDepartment = session.user.department;

    const isAuthor = post.authorEmail?.toLowerCase() === userEmail?.toLowerCase();
    const isReviewer = userRole === "admin" || userRole === "reviewer" || userDepartment === "公關部";

    if (!isAuthor && !isReviewer) {
      return NextResponse.json({ errorCode: "FORBIDDEN_DELETE" }, { status: 403 });
    }

    await prisma.post.delete({ where: { id } });
    revalidatePath("/");
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("刪除文章失敗:", error);
    return NextResponse.json({ errorCode: "INTERNAL_ERROR" }, { status: 500 });
  }
}

// PATCH 方法：更新文章狀態 (審核) + 寄送 Email
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ errorCode: "UNAUTHORIZED" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, rejectReason, title, content, coverImage } = body;

    // 先尋找文章
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) {
      return NextResponse.json({ errorCode: "POST_NOT_FOUND" }, { status: 404 });
    }

    const userEmail = session.user.email;
    const userRole = session.user.role;
    const userDepartment = session.user.department;

    const isAuthor = post.authorEmail === userEmail;
    const isDeptMember = post.department === userDepartment;
    // 編輯/刪除權限：admin、reviewer 或公關部全體成員
    const isReviewer = userRole === "admin" || userRole === "reviewer" || userDepartment === "公關部";
    // 審核權限：admin 與公關部成員 (role=reviewer)
    const canAudit = userRole === "admin" || userRole === "reviewer";

    // 1. 審核邏輯 (變更狀態)
    if (status && !title) {
      if (!canAudit) {
        return NextResponse.json({ errorCode: "FORBIDDEN_REVIEW" }, { status: 403 });
      }

      const validStatuses = ["DRAFT", "PENDING", "APPROVED", "REJECTED"];
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ errorCode: "INVALID_STATUS" }, { status: 400 });
      }

      if (status === "REJECTED" && (!rejectReason || rejectReason.trim() === "")) {
        return NextResponse.json({ errorCode: "REJECT_REASON_REQUIRED" }, { status: 400 });
      }

      const updatedPost = await prisma.post.update({
        where: { id },
        data: { 
          status,
          rejectReason: status === "REJECTED" ? rejectReason : null 
        },
      });

      // 寄送審核結果通知信給作者
      if (status === "APPROVED" || status === "REJECTED") {
        try {
          const actionName = status === "APPROVED" ? "核准" : "退回";
          await resend.emails.send({
            from: "NTUSA Website<noreply@notify.ntusa.ntu.edu.tw>",
            to: [post.authorEmail], 
            subject: `【文章審核通知】您的文章已${actionName}`,
            react: ApprovalNotificationEmail({
              postTitle: post.title,
              status: status as "APPROVED" | "REJECTED",
              rejectReason: status === "REJECTED" ? rejectReason : null
            }) as React.ReactElement,
          });
        } catch (emailError) {
          console.error("發送審核通知信失敗:", emailError);
        }
      }

      revalidatePath("/");
      return NextResponse.json(updatedPost, { status: 200 });
    }

    // 2. 編輯邏輯 (變更內容)
    if (title || content) {
      if (!isAuthor && !isDeptMember && !isReviewer) {
        return NextResponse.json({ errorCode: "FORBIDDEN_UPDATE" }, { status: 403 });
      }

      // [調整] 為了測試與安全性，只要是透過編輯器修改內容，一律回到 PENDING 重新審核
      // 除非是公關部在審核介面單純變更狀態 (那會走上面 status && !title 的分支)
      const finalStatus = "PENDING";

      const updatedPost = await prisma.post.update({
        where: { id },
        data: {
          title: title || post.title,
          content: content || post.content,
          coverImage: coverImage !== undefined ? coverImage : post.coverImage,
          status: finalStatus,
          rejectReason: null, // 清空先前的退回原因
        },
      });

      // 3. 寄送「文章已修改並重新送審」通知信給公關部 (僅當狀態為 PENDING 時)
      if (finalStatus === "PENDING") {
        try {
          await resend.emails.send({
            from: "NTUSA Website<noreply@notify.ntusa.ntu.edu.tw>",
            to: PR_EMAILS,
            subject: `【更新通知】文章已修改並重新送審：「${updatedPost.title}」`,
            react: ReviewRequestEmail({
              postTitle: updatedPost.title,
              authorEmail: userEmail,
              authorName: session.user.name || undefined,
              department: session.user.department || undefined,
            }) as React.ReactElement,
          });
          console.log("成功發送文章修改通知信給公關部");
        } catch (emailError) {
          console.error("發送文章修改通知信失敗:", emailError);
        }
      }

      revalidatePath("/");
      return NextResponse.json(updatedPost, { status: 200 });
    }

    return NextResponse.json({ errorCode: "BAD_REQUEST" }, { status: 400 });
  } catch (error) {
    console.error("更新文章狀態失敗:", error);
    return NextResponse.json({ errorCode: "INTERNAL_ERROR" }, { status: 500 });
  }
}
