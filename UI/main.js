
import { countTimer, stopTimer, minDisplay , secDisplay, resetTimer  } from "./timer.js";
import { startPomoTimer, stopPomoTimer, resetPomoTimer, getPomoTimeDisplay } from "./pomoTimer.js";


const sideBarButton = document.getElementById('sideBarButton');
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const videoButton = document.getElementById('videoButton');
const stopButton = document.getElementById('stopButton');
const recordStopButton = document.getElementById('recordStopButton');
const pauseFlash = document.getElementById('pauseFlash');

const modal = document.getElementById('modal');
const cameraButton = document.getElementById('cameraButton');
const screenButton = document.getElementById('screenButton');
const pomoTimerButton = document.getElementById('pomoTimerButton');
const canvasBlur = document.getElementById('canvasBlur');
let pomoFlug = false;
let timerStopFlug = false;




let recorder;
let chunks = [];
let drawInterval;
let isRecording = false;
let isBlur = false; //canvas内のぼかしがあるかどうか？


function ensureCanvasSize() {
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const cssW = Math.max(1, Math.round(rect.width));
  const cssH = Math.max(1, Math.round(rect.height));

  const maxDim = 1280;
  const scale = Math.min(1, maxDim / Math.max(cssW, cssH));
  const dpr = Math.min(1.5, window.devicePixelRatio || 1);

  const w = Math.max(1, Math.round(cssW * scale * dpr));
  const h = Math.max(1, Math.round(cssH * scale * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
}



sideBarButton.addEventListener('click', () => {
  console.log('sideBarButton clicked');
});

function setRootState() {
  const root = document.documentElement;
  root.classList.toggle("isRecording", !!isRecording);
  root.classList.toggle("isPaused", !!(recorder && recorder.state === "paused"));
}

function flashCenterIcon(symbol) {
  if (!pauseFlash) return;
  pauseFlash.textContent = symbol;
  pauseFlash.classList.add("show");
  window.setTimeout(() => pauseFlash.classList.remove("show"), 650);
}

function pauseRecording() {
  if (!recorder || recorder.state !== "recording") return;
  recorder.pause();
  clearInterval(drawInterval);
  timerStopFlug = false;
  if (pomoFlug) stopPomoTimer();
  else stopTimer();
  if (stopButton) stopButton.textContent = "再開";
  setRootState();
  flashCenterIcon("||");
}

function resumeRecording() {
  if (!recorder || recorder.state !== "paused") return;
  recorder.resume();
  drawInterval = setInterval(draw, 1000 / 15);
  timerStopFlug = true;
  if (pomoFlug) startPomoTimer();
  else countTimer();
  if (stopButton) stopButton.textContent = "一時停止";
  setRootState();
  flashCenterIcon("▶︎");
}

function togglePauseResume() {
  if (!recorder) return;
  if (recorder.state === "recording") pauseRecording();
  else if (recorder.state === "paused") resumeRecording();
}

async function stopRecording() {
  isRecording = false;
  setRootState();

  if (recorder && recorder.state !== 'inactive') {
    recorder.stop();
    timerStopFlug = false;
    console.log("timerStopFlug :", timerStopFlug);
  }

  resetTimer();
  resetPomoTimer();
  clearInterval(drawInterval);

  if (pomoFlug) stopPomoTimer();
  else stopTimer();

  recorder = null;
  pomoFlug = false;

  if (stopButton) stopButton.textContent = "一時停止";
  
  // 録画終了後、サーバーから連結された動画をダウンロード
  await downloadMergedVideo();
}

videoButton.addEventListener('click', async () => {
  if (!isRecording) {
    modal.showModal();
    return;
  }
  await stopRecording();
});

if (stopButton) {
  stopButton.addEventListener('click', () => {
    togglePauseResume();
  });
}

if (recordStopButton) {
  recordStopButton.addEventListener("click", async () => {
    if (!isRecording) return;
    await stopRecording();
  });
}

if (canvas) {
  canvas.addEventListener("pointerdown", () => {
    if (!isRecording) return;
    togglePauseResume();
  });
}

cameraButton.addEventListener('click', async () => {
  modal.close();
  pomoFlug = false;
  timerStopFlug = true;
  stopPomoTimer();
  countTimer();
  await startingCamera();
  if (recorder) {
    isRecording = true;
    setRootState();
    if (stopButton) stopButton.textContent = "一時停止";
    recorder.start(1000); // chunk 1秒ごとにデータを取得する
  }
});

screenButton.addEventListener('click', async () => {
  modal.close();
  pomoFlug = false;
  timerStopFlug = true;
  stopPomoTimer();
  countTimer();
  await startingScreenCapture();
  if (recorder) {
    isRecording = true;
    setRootState();
    if (stopButton) stopButton.textContent = "一時停止";
    recorder.start(1000); // chunk 1秒ごとにデータを取得する
  }
});

pomoTimerButton.addEventListener('click', async () => {
  modal.close();
  pomoFlug = true;
  timerStopFlug = true;
  resetPomoTimer();
  startPomoTimer();
  await startingScreenCapture();
  if (recorder) {
    isRecording = true;
    setRootState();
    if (stopButton) stopButton.textContent = "一時停止";
    recorder.start(1000); // chunk 1秒ごとにデータを取得する
  }
});



canvasBlur.addEventListener('click', () => {
  console.log("ボタンがクリックされました！")
     if(!isBlur) { // 現在の値がfalseの場合
       isBlur = true;
       canvasBlur.textContent = "ON";
        console.log("現在のisBlurの状態：", isBlur);
     } else if (isBlur) { // 現在の値がtureの場合
        isBlur = false;
         canvasBlur.textContent = "OFF";
         console.log("現在のisBlurの状態：", isBlur);
     }
});









// カメラの場合
async function startingCamera() {
  try {
    const CameraStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });
    video.srcObject = CameraStream; // video要素にカメラストリームを割り当てる
    await video.play(); // video要素を再生する（これで初めてカメラ映像がcanvasに動画が表示される）
    drawInterval = setInterval(draw, 1000 / 15); // 15fpsで描画

    // canvasを録画対象に
    ensureCanvasSize();
    const canvasStream = canvas.captureStream(15); // 一応ここでも15FPSで録画

    recorder = new MediaRecorder(canvasStream, {
      mimeType: "video/webm; codecs=vp8"
    });

    recorder.ondataavailable = e => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    // 録画停止時の処理（最終チャンクの送信用）
    recorder.onstop = async () => {
      if (chunks.length > 0) {
        await chunkBlob();
      }
    };

  } catch (error) {
    console.error('Error starting camera:', error);
    alert('カメラの起動に失敗しました');
    return;
  }
}

// 画面キャプチャの場合
async function startingScreenCapture() {
  const screenStream = await navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: false
  });

  video.srcObject = screenStream;
  await video.play();

  // canvas描画開始（15FPS）
  drawInterval = setInterval(draw, 1000 / 15);

  // canvasを録画対象に
  ensureCanvasSize();
  const canvasStream = canvas.captureStream(15);

  recorder = new MediaRecorder(canvasStream, {
    mimeType: "video/webm; codecs=vp8"
  });

  recorder.ondataavailable = e => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  // 録画停止時の処理（最終チャンクの送信用）
  recorder.onstop = async () => {
    if (chunks.length > 0) {
      await chunkBlob();
    }
  };

};


// 動画撮影ご３０分経過したら、動画をblob化してサーバーに送信する
async function chunkBlob() {
  const blob = new Blob(chunks, { type: "video/webm" });
  chunks = []; // chunksをリセット
  
  if (blob.size === 0) {
     console.log("動画データが空です");
     return;
  }
  
  console.log("動画をBlob化しました！サイズ:", blob.size);
  
  // サーバーに動画を送信
  try {
    const formData = new FormData();
    formData.append("video", blob, "chunk.webm");
    
    const response = await fetch("https://render-g2nd.onrender.com/uploadVideo", {
      method: "POST",
      body: formData
    });
    
    // HTTPステータスコードをチェック
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    if (result.success) {
      console.log("動画のアップロードに成功しました:", result.processedFile);
      console.log("ファイルサイズ:", result.fileSize, "bytes");
      console.log("タイムスタンプ:", result.timestamp);
    } else {
      console.error("動画のアップロードに失敗しました:", result.error);
    }
  } catch (error) {
    console.error("動画送信エラー:", error);
    alert("動画のアップロードに失敗しました。ネットワーク接続を確認してください。");
  }
}



// =====================
// サーバーから連結された動画をダウンロードする（再送信・タイムアウト対応）
// =====================
async function downloadMergedVideo() {
  // リトライ設定
  const maxRetries = 3; // 最大3回再試行
  const retryDelay = 30000; // 30秒待機
  const requestTimeout = 120000; // 120秒（動画ダウンロードは時間がかかるため長めに設定）
  
  // リトライループ
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`動画ダウンロード試行 ${attempt + 1}/${maxRetries}...`);
      
      // タイムアウト制御用のAbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), requestTimeout);
      
      const response = await fetch("https://render-g2nd.onrender.com/mergeVideos", {
        method: "GET",
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // HTTPステータスコードをチェック
      if (!response.ok) {
        if (response.status === 404) {
          alert("ダウンロードできる動画がありません。録画を開始してください。");
          return; // 404の場合はリトライしない
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // 動画データをBlobとして取得（これも時間がかかる可能性がある）
      const blob = await response.blob();
      
      // ダウンロード用のリンクを作成
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `timelapse_${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log("動画のダウンロードが完了しました");
      alert("タイムラプス動画のダウンロードが完了しました！");
      return; // 成功したら終了
      
    } catch (error) {
      const isLastAttempt = attempt === maxRetries - 1;
      
      // エラーの種類を判定
      if (error.name === 'AbortError') {
        console.warn(`リクエストがタイムアウトしました (試行 ${attempt + 1}/${maxRetries})`);
      } else {
        console.warn(`動画ダウンロードエラー (試行 ${attempt + 1}/${maxRetries}):`, error.message);
      }
      
      // 最後の試行でない場合はリトライ
      if (!isLastAttempt) {
        console.log(`${retryDelay / 1000}秒後にリトライします...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        // 最後の試行で失敗した場合
        console.error("動画ダウンロードエラー（リトライ上限に達しました）:", error);
        alert("動画のダウンロードに失敗しました。ネットワーク接続を確認してください。");
      }
    }
  }
}


// canvasにカメラ映像を描画する
function draw() {
  const ctx = canvas.getContext('2d');
  ensureCanvasSize();

// ========= タイマーが起動しているかどうか？？ ===========
  const timerStopFlugColor = timerStopFlug ? "isStart" : "isStop";
 

// ======= videoの描画 ======
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (video && video.readyState >= 2) {
    const cw = canvas.width;
    const ch = canvas.height;
    const vw = video.videoWidth || cw;
    const vh = video.videoHeight || ch;
    const s = Math.max(cw / vw, ch / vh);
    const dw = vw * s;
    const dh = vh * s;
    const dx = (cw - dw) / 2;
    const dy = (ch - dh) / 2;
    ctx.drawImage(video, dx, dy, dw, dh);
    if(isBlur) {
      console.log("現在のisBlurの状態:", isBlur);
      ctx.filter = "blur(100px)"; // もし、isBlurがtureだったらぼかしをcanvas内全体に表示する。
      ctx.beginPath(); 
      ctx.fill(); // ぼかしありで描画を開始
    }
  }
  
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "18px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial";
  
  // canvas内タイマー表示は維持（ユーザー要望）。それ以外の常時テキストは表示しない。
  if (pomoFlug) {
    const { minDisplay: pomoMin, secDisplay: pomoSec } = getPomoTimeDisplay();
    ctx.fillText(`${pomoMin}:${pomoSec}`, 14, 28);

  } else {
    // 動画撮影ご３０分経過したら、チャンクを送信する
    if(getBlobCount() === 1800) {
      console.log("30分経過：チャンク送信開始");
      // 一時的に録画を停止してチャンクを送信
      if (recorder && recorder.state === 'recording') {
        recorder.stop();
        // 少し待ってから録画を再開
        setTimeout(() => {
          if (recorder) {
            recorder.start(1000);
            console.log("録画再開");
          }
        }, 1000);
      }
    }

    // canvasにタイマーを表示する(普通の状態)

    ctx.fillText(`${minDisplay}:${secDisplay}`, 14, 28);
  }
}