import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import prisma from "../../../lib/prisma";
import { Resend } from "resend";
import ReviewRequestEmail from "../../../components/emails/ReviewRequestEmail";

const resend = new Resend(process.env.RESEND_API_KEY);

// 從 .env 讀取審核者信箱清單，若沒設定則提供基本預設值
const PR_EMAILS = process.env.REVIEWER_EMAILS 
  ? process.env.REVIEWER_EMAILS.split(",").map(email => email.trim())
  : ["pr-dept@ntusa.ntu.edu.tw", "president@ntusa.ntu.edu.tw"];

export async function POST(request: Request) {
  try {
    // 1. 安全性檢查：確認發送請求的人是否有登入
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ errorCode: "UNAUTHORIZED" }, { status: 401 });
    }

    // 2. 解析前端傳過來的 JSON 資料
    const body = await request.json();

    // [修正] 移除 authorEmail，不再信任前端傳來的身分
    const { title, content, coverImage } = body;

    if (!title || !content) {
      return NextResponse.json({ errorCode: "TITLE_CONTENT_REQUIRED" }, { status: 400 });
    }

    // [修正] 強制使用後端驗證過的 Session 信箱作為作者
    const authorEmail = session.user.email;

    // 3. 透過 Prisma 將資料寫入 PostgreSQL 資料庫
    const newPost = await prisma.post.create({
      data: {
        title,
        content,
        coverImage,
        authorEmail, // 使用後端取得的信箱
        authorName: session.user.name, // 存入發文者的名字
        department: session.user.department, // 存入發文者的部門
      },
    });

    // 4. 寄送「新文章待審核」通知信給公關部
    try {
      await resend.emails.send({
        from: "NTUSA Website<noreply@notify.ntusa.ntu.edu.tw>", 
        to: PR_EMAILS,
        subject: `【待審核通知】新文章申請：「${title}」`,
        react: ReviewRequestEmail({
          postTitle: title,
          authorEmail: authorEmail,
          authorName: session.user.name || undefined,
          department: session.user.department || undefined,
        }) as React.ReactElement,
      });
      
      console.log("成功發送新文章待審核通知信給公關部");
    } catch (emailError) {
      console.error("發送公關部審核通知信失敗:", emailError);
    }

    return NextResponse.json(newPost, { status: 201 });

  } catch (error) {
    console.error("寫入資料庫失敗:", error);
    return NextResponse.json({ errorCode: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const posts = await prisma.post.findMany({
      where: { status: "APPROVED" },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(posts);
  } catch (error) {
    console.error("讀取文章失敗:", error);
    return NextResponse.json({ errorCode: "INTERNAL_ERROR" }, { status: 500 });
  }
}
