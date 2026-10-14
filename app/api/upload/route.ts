import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_REQUEST_BYTES = 6 * 1024 * 1024;

function isWebp(buffer: Buffer): boolean {
  return buffer.length >= 12
    && buffer.toString("ascii", 0, 4) === "RIFF"
    && buffer.toString("ascii", 8, 12) === "WEBP";
}

// 初始化 R2 客戶端
const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ errorCode: "UNAUTHORIZED" }, { status: 401 });
    }

    const contentLength = Number(request.headers.get("content-length"));
    if (contentLength > MAX_REQUEST_BYTES) {
      return NextResponse.json({ errorCode: "FILE_TOO_LARGE" }, { status: 413 });
    }

    const formData = await request.formData();
    const file = formData.get("image");

    if (!(file instanceof File)) {
      return NextResponse.json({ errorCode: "NO_FILE" }, { status: 400 });
    }
    if (file.size === 0 || file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ errorCode: "FILE_TOO_LARGE" }, { status: 413 });
    }
    if (file.type !== "image/webp") {
      return NextResponse.json({ errorCode: "INVALID_FILE_TYPE" }, { status: 415 });
    }

    // 將 File 轉換為 Buffer 以供 SDK 使用
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!isWebp(buffer)) {
      return NextResponse.json({ errorCode: "INVALID_IMAGE" }, { status: 400 });
    }
    const fileName = `${crypto.randomUUID()}.webp`;

    // 3. 呼叫 R2 S3 API 上傳
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileName,
        Body: buffer,
        ContentType: "image/webp",
      })
    );

    // 4. 回傳結果
    // 使用 .env 中定義的公開 URL 組合出圖片路徑
    const publicUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${fileName}`;
    
    return NextResponse.json({ url: publicUrl });

  } catch (error) {
    console.error("上傳至 R2 失敗:", error);
    return NextResponse.json({ errorCode: "INTERNAL_ERROR" }, { status: 500 });
  }
}
