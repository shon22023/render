

//Renderにデプロイする用のFFmpeg CLIのコードをかく

import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import crypto from "crypto";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

// CORS設定を追加
app.use(cors());
app.use(express.json());

//============
// chunk（動画）を一時的に保管して置くdir
//===========

const UPLOADVIDEO = "./server/uploadVideo";
const LAPSVIDEO = "./server/LAPSVIDEO";

fs.mkdirSync(UPLOADVIDEO, { recursive: true });
fs.mkdirSync(LAPSVIDEO, { recursive: true });


// =====================
// multer 設定（chunk受信）
// =====================

const multerSnapShot = multer.diskStorage({
     destination: LAPSVIDEO,
     filename: (_, __, cb) => {
        const id = crypto.randomUUID();
        cb(null, `${id}.webm`);
    }
});


const upload = multer({ storage: multerSnapShot });


// =====================
// FFmpeg 実行関数
// =====================

function execFFmpeg(command) {
    return new Promise((resolve, reject) => {
      exec(command, (err, stdout, stderr) => {
        if (err) return reject(stderr);
        resolve(stdout);
      });
    });
  }


// =====================
// 30分chunkアップロード
// FFmpeg CLI : 30分 => 20秒(90倍速)
// =====================

app.post("/uploadVideo", upload.single("video"), async (req, res) => {
    // ファイルがアップロードされていない場合のエラーハンドリング
    if (!req.file) {
        return res.status(400).json({
            success: false,
            error: "No video file uploaded"
        });
    }

    const inputPath = req.file.path; //倍速処理するファイルのパス
    const outputPath = path.join(
      UPLOADVIDEO,
      req.file.filename.replace(".webm", ".mp4")
    );

    //FFmpegで倍速処理をする
     try {
        // FFmpegコマンド（改行を削除し、パスに引用符を追加）
        const cmd = `ffmpeg -y -i "${inputPath}" -filter:v "setpts=1/90*PTS" -an "${outputPath}"`;
        
        console.log("FFmpeg処理開始:", cmd);
        await execFFmpeg(cmd); //FFmpegの倍速処理を実行する関数
        
        fs.unlinkSync(inputPath); //FFmpegの処理完了後、もと動画は削除します
        console.log("チャンク処理完了:", outputPath);

        // JSON形式でレスポンスを返す
        res.json({
            success: true,
            message: "Chunk processed successfully",
            processedFile: path.basename(outputPath),
            fileSize: fs.statSync(outputPath).size,
            timestamp: new Date().toISOString()
        });

     } catch(error) {
        console.error("FFmpeg処理エラー:", error);

        // 失敗時も動画は削除します。
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

        res.status(500).json({
          success: false,
          error: "FFmpeg processing failed",
          details: error.toString()
        });
     }

});

// =====================
// サーバー起動
// =====================
app.listen(PORT, () => {
    console.log(`FFmpeg server running on ${PORT}`);
  });
