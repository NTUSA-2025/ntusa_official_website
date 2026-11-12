import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_REQUEST_BYTES = 6 * 1024 * 1024;

function isWebp(buffer: Buffer): boolean {
  return buffer.length >= 12
    && buffer.toString("ascii", 0, 4) === "RIFF"
    && buffer.toString("ascii", 8, 12) === "WEBP";
}

function isPng(buffer: Buffer): boolean {
  return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
}

function isJpeg(buffer: Buffer): boolean {
  return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
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
    if (!["image/webp", "image/jpeg", "image/png"].includes(file.type)) {
      return NextResponse.json({ errorCode: "INVALID_FILE_TYPE" }, { status: 415 });
    }

    const input = Buffer.from(await file.arrayBuffer());
    const validHeader = file.type === "image/webp" ? isWebp(input)
      : file.type === "image/png" ? isPng(input) : isJpeg(input);
    if (!validHeader) {
      return NextResponse.json({ errorCode: "INVALID_IMAGE" }, { status: 400 });
    }

    // Safari may not encode WebP in canvas. Convert its JPEG/PNG fallback on the server.
    let buffer = input;
    if (file.type !== "image/webp") {
      try {
        buffer = await sharp(input, { failOn: "error", limitInputPixels: 40_000_000 })
          .webp({ quality: 80 })
          .toBuffer();
      } catch {
        return NextResponse.json({ errorCode: "INVALID_IMAGE" }, { status: 400 });
      }
      if (buffer.length > MAX_IMAGE_BYTES) {
        return NextResponse.json({ errorCode: "FILE_TOO_LARGE" }, { status: 413 });
      }
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
