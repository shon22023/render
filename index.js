

//Renderにデプロイする用のFFmpeg CLIのコードをかく

import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import crypto from "crypto";

const app = express();
const PORT = process.env.PORT || 3000;


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
    const inputPath = req.file.path; //倍速処理するファイルのパス
    const outputPath = path.join(
      UPLOADVIDEO,
      req.file.filename.replace(".webm", ".mp4")
    );

    //FFmpegで倍速処理をする
     try {

        const cmd = `
        ffmpeg -y -i ${inputPath}
        -filter:v "setpts=1/90*PTS"
        -an
        ${outputPath}
      `;
       await execFFmpeg(cmd); //FFmpegの倍速処理を実行する関数
       fs.unlinkSync(inputPath); //FFmpegの処理完了後、もと動画は速削除します


    res.json({
        success: true,
        processedFile: path.basename(outputPath)
      });

     } catch(error) {

    // 失敗時も動画は削除します。
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

    res.status(500).json({
      success: false,
      error: "FFmpeg processing failed"
    });
     }

});

// =====================
// サーバー起動
// =====================
app.listen(PORT, () => {
    console.log(`FFmpeg server running on ${PORT}`);
  });

