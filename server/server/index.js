

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

const UPLOADVIDEO = "./video/uploadVideo";
const LAPSVIDEO = "./video/lapsVideo";

// ディレクトリを作成（既に存在する場合はエラーを無視）
try {
    fs.mkdirSync(UPLOADVIDEO, { recursive: true });
} catch (error) {
    // ディレクトリが既に存在する場合は無視
    if (error.code !== 'EEXIST') {
        throw error;
    }
}

try {
    fs.mkdirSync(LAPSVIDEO, { recursive: true });
} catch (error) {
    // ディレクトリが既に存在する場合は無視
    if (error.code !== 'EEXIST') {
        throw error;
    }
}


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
// 動画連結エンドポイント
// UPLOADVIDEO内のすべての倍速動画をFFmpegで連結
// =====================

app.get("/mergeVideos", async (req, res) => {
    try {
        // UPLOADVIDEOディレクトリ内のすべての.mp4ファイルを取得
        const files = fs.readdirSync(UPLOADVIDEO)
            .filter(file => file.endsWith('.mp4'))
            .map(file => path.join(UPLOADVIDEO, file))
            .sort(); // ファイル名でソート（時系列順）

        if (files.length === 0) {
            return res.status(404).json({
                success: false,
                error: "No video files found to merge"
            });
        }

        console.log(`連結する動画ファイル数: ${files.length}`);

        // 連結後の出力ファイルパス
        const outputPath = path.join(UPLOADVIDEO, `merged_${Date.now()}.mp4`);
        
        // FFmpeg concat demuxer用のファイルリストを作成
        const concatListPath = path.join(UPLOADVIDEO, `concat_list_${Date.now()}.txt`);
        const concatListContent = files.map(file => `file '${file.replace(/'/g, "'\\''")}'`).join('\n');
        fs.writeFileSync(concatListPath, concatListContent);

        // FFmpegで動画を連結
        const cmd = `ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c copy "${outputPath}"`;
        
        console.log("動画連結開始:", cmd);
        await execFFmpeg(cmd);
        
        // 連結リストファイルを削除
        fs.unlinkSync(concatListPath);
        
        // 連結された動画ファイルを読み込む
        const mergedVideoBuffer = fs.readFileSync(outputPath);
        const fileSize = fs.statSync(outputPath).size;
        
        console.log("動画連結完了:", outputPath, "サイズ:", fileSize);

        // 一時ファイルをクリーンアップ（連結済みの個別ファイルを削除）
        files.forEach(file => {
            try {
                fs.unlinkSync(file);
                console.log("削除:", file);
            } catch (err) {
                console.error("ファイル削除エラー:", file, err);
            }
        });

        // 連結された動画をクライアントに返す
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Disposition', `attachment; filename="timelapse_${Date.now()}.mp4"`);
        res.setHeader('Content-Length', fileSize);
        
        // レスポンス送信完了後に即座に削除（厳格な削除処理）
        res.on('finish', () => {
            try {
                if (fs.existsSync(outputPath)) {
                    fs.unlinkSync(outputPath);
                    console.log("✓ 連結ファイル即座に削除:", outputPath);
                }
            } catch (err) {
                console.error("✗ 連結ファイル削除エラー:", err);
            }
        });

        // エラー時も確実に削除
        res.on('error', () => {
            try {
                if (fs.existsSync(outputPath)) {
                    fs.unlinkSync(outputPath);
                    console.log("✓ エラー時に連結ファイル削除:", outputPath);
                }
            } catch (err) {
                console.error("✗ エラー時削除失敗:", err);
            }
        });

        res.send(mergedVideoBuffer);

    } catch (error) {
        console.error("動画連結エラー:", error);
        
        // エラー時も一時ファイルを確実に削除
        try {
            const concatListPath = path.join(UPLOADVIDEO, `concat_list_${Date.now()}.txt`);
            if (fs.existsSync(concatListPath)) {
                fs.unlinkSync(concatListPath);
                console.log("✓ エラー時にconcatリスト削除");
            }
            
            // 処理中に作成された可能性のある連結ファイルも削除
            const mergedFiles = fs.readdirSync(UPLOADVIDEO)
                .filter(file => file.startsWith('merged_') && file.endsWith('.mp4'));
            mergedFiles.forEach(file => {
                const filePath = path.join(UPLOADVIDEO, file);
                fs.unlinkSync(filePath);
                console.log("✓ エラー時に連結ファイル削除:", filePath);
            });
        } catch (cleanupErr) {
            console.error("✗ エラー時のクリーンアップ失敗:", cleanupErr);
        }
        
        res.status(500).json({
            success: false,
            error: "Video merging failed",
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
