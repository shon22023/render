

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

// ディレクトリが存在しない場合のみ作成
if (!fs.existsSync(UPLOADVIDEO)) {
    fs.mkdirSync(UPLOADVIDEO, { recursive: true });
}
if (!fs.existsSync(LAPSVIDEO)) {
    fs.mkdirSync(LAPSVIDEO, { recursive: true });
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
      // #region agent log
      const logPath = '/Users/handa/Library/Mobile Documents/com~apple~CloudDocs/タイムラプス/.cursor/debug.log';
      fs.writeFileSync(logPath, JSON.stringify({location:'server/index.js:51',message:'execFFmpeg開始',data:{command:command},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})+'\n',{flag:'a'});
      // #endregion
      exec(command, (err, stdout, stderr) => {
        // #region agent log
        fs.writeFileSync(logPath, JSON.stringify({location:'server/index.js:53',message:'execFFmpegコールバック',data:{hasErr:!!err,errCode:err?.code,errMessage:err?.message,stderr:stderr?.substring(0,500),stdout:stdout?.substring(0,500)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})+'\n',{flag:'a'});
        // #endregion
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
    // #region agent log
    const logPath = '/Users/handa/Library/Mobile Documents/com~apple~CloudDocs/タイムラプス/.cursor/debug.log';
    fs.writeFileSync(logPath, JSON.stringify({location:'server/index.js:66',message:'/uploadVideoエンドポイント開始',data:{hasFile:!!req.file,fileSize:req.file?.size,fileName:req.file?.filename},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})+'\n',{flag:'a'});
    // #endregion
    
    // ファイルがアップロードされていない場合のエラーハンドリング
    if (!req.file) {
        // #region agent log
        fs.writeFileSync(logPath, JSON.stringify({location:'server/index.js:69',message:'ファイル未アップロード',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})+'\n',{flag:'a'});
        // #endregion
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

    // #region agent log
    fs.writeFileSync(logPath, JSON.stringify({location:'server/index.js:75',message:'パス設定後',data:{inputPath:inputPath,outputPath:outputPath,inputExists:fs.existsSync(inputPath),inputSize:fs.existsSync(inputPath)?fs.statSync(inputPath).size:null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})+'\n',{flag:'a'});
    // #endregion

    //FFmpegで倍速処理をする
     try {
        // FFmpegコマンド（改行を削除し、パスに引用符を追加）
        const cmd = `ffmpeg -y -i "${inputPath}" -filter:v "setpts=1/90*PTS" -an "${outputPath}"`;
        
        // #region agent log
        fs.writeFileSync(logPath, JSON.stringify({location:'server/index.js:84',message:'FFmpegコマンド実行前',data:{cmd:cmd},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})+'\n',{flag:'a'});
        // #endregion
        console.log("FFmpeg処理開始:", cmd);
        await execFFmpeg(cmd); //FFmpegの倍速処理を実行する関数
        
        // #region agent log
        fs.writeFileSync(logPath, JSON.stringify({location:'server/index.js:87',message:'FFmpeg実行完了',data:{outputExists:fs.existsSync(outputPath),outputSize:fs.existsSync(outputPath)?fs.statSync(outputPath).size:null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})+'\n',{flag:'a'});
        // #endregion
        
        fs.unlinkSync(inputPath); //FFmpegの処理完了後、もと動画は削除します
        console.log("チャンク処理完了:", outputPath);

        // JSON形式でレスポンスを返す
        // #region agent log
        fs.writeFileSync(logPath, JSON.stringify({location:'server/index.js:93',message:'成功レスポンス送信前',data:{processedFile:path.basename(outputPath),fileSize:fs.statSync(outputPath).size},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})+'\n',{flag:'a'});
        // #endregion
        res.json({
            success: true,
            message: "Chunk processed successfully",
            processedFile: path.basename(outputPath),
            fileSize: fs.statSync(outputPath).size,
            timestamp: new Date().toISOString()
        });

     } catch(error) {
        // #region agent log
        fs.writeFileSync(logPath, JSON.stringify({location:'server/index.js:101',message:'FFmpeg処理エラー',data:{errorMessage:error.toString(),errorStack:error.stack?.substring(0,500),inputExists:fs.existsSync(inputPath),outputExists:fs.existsSync(outputPath)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})+'\n',{flag:'a'});
        // #endregion
        console.error("FFmpeg処理エラー:", error);

        // 失敗時も動画は削除します。
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

        // #region agent log
        fs.writeFileSync(logPath, JSON.stringify({location:'server/index.js:108',message:'500エラーレスポンス送信',data:{error:error.toString()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})+'\n',{flag:'a'});
        // #endregion
        res.status(500).json({
          success: false,
          error: "FFmpeg processing failed",
          details: error.toString()
        });
     }

});

// =====================
// 動画連結エンドポイント（再送信・タイムアウト対応版）
// UPLOADVIDEO内のすべての倍速動画をFFmpegで連結
// =====================

app.get("/mergeVideos", async (req, res) => {
    // リクエストタイムアウト設定（5分）
    req.setTimeout(300000); // 300秒 = 5分
    res.setTimeout(300000);

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
        
        // 連結された動画ファイルの情報を取得
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

        // ヘッダー設定
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Disposition', `attachment; filename="timelapse_${Date.now()}.mp4"`);
        res.setHeader('Content-Length', fileSize);
        
        // ストリーミング送信用の変数
        let streamClosed = false;
        let streamError = null;
        
        // ファイルストリームを作成
        const readStream = fs.createReadStream(outputPath, {
            highWaterMark: 64 * 1024 // 64KB チャンク
        });

        // ストリームエラーハンドリング
        readStream.on('error', (error) => {
            console.error("✗ ファイル読み込みエラー:", error);
            streamError = error;
            
            if (!res.headersSent) {
                res.status(500).json({
                    success: false,
                    error: "File read error",
                    details: error.toString()
                });
            }
            
            // ファイル削除
            cleanupFile(outputPath);
        });

        // クライアント接続エラーハンドリング
        res.on('error', (error) => {
            console.error("✗ クライアント送信エラー:", error);
            streamClosed = true;
            readStream.destroy(); // ストリームを停止
            
            // ファイル削除
            cleanupFile(outputPath);
        });

        // クライアント接続切断ハンドリング
        req.on('close', () => {
            if (!streamClosed) {
                console.warn("⚠ クライアント接続が途中で切断されました");
                streamClosed = true;
                readStream.destroy();
                
                // ファイル削除
                cleanupFile(outputPath);
            }
        });

        // 送信完了ハンドリング
        res.on('finish', () => {
            streamClosed = true;
            console.log("✓ 動画送信完了");
            
            // ファイル削除
            cleanupFile(outputPath);
        });

        // ストリーミング送信開始
        console.log("動画ストリーミング送信開始...");
        readStream.pipe(res);

    } catch (error) {
        console.error("動画連結エラー:", error);
        
        // エラー時も一時ファイルを確実に削除
        try {
            const concatListFiles = fs.readdirSync(UPLOADVIDEO)
                .filter(file => file.startsWith('concat_list_') && file.endsWith('.txt'));
            concatListFiles.forEach(file => {
                const filePath = path.join(UPLOADVIDEO, file);
                fs.unlinkSync(filePath);
                console.log("✓ エラー時にconcatリスト削除:", filePath);
            });
            
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
        
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                error: "Video merging failed",
                details: error.toString()
            });
        }
    }
});

// ファイル削除ヘルパー関数
function cleanupFile(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log("✓ ファイル削除:", filePath);
        }
    } catch (err) {
        console.error("✗ ファイル削除エラー:", filePath, err);
    }
}

// =====================
// サーバー起動
// =====================
app.listen(PORT, () => {
    console.log(`FFmpeg server running on ${PORT}`);
  });
