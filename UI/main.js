
import { countTimer, stopTimer, hourDisplay , minDisplay , secDisplay, getBlobCount, resetTimer  } from "./timer.js";
import { startPomoTimer, stopPomoTimer, resetPomoTimer, getPomoTimeDisplay, getKomasuu } from "./pomoTimer.js";


const sideBarButton = document.getElementById('sideBarButton');
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const videoButton = document.getElementById('videoButton');
const stopButton = document.getElementById('stopButton');

const modal = document.getElementById('modal');
const cameraButton = document.getElementById('cameraButton');
const screenButton = document.getElementById('screenButton');
const pomoTimerButton = document.getElementById('pomoTimerButton');
let pomoFlug = false;
let timerStopFlug = false;




let recorder;
let chunks = [];
let drawInterval;



sideBarButton.addEventListener('click', () => {
  console.log('sideBarButton clicked');
});

videoButton.addEventListener('click', async () => {
  if (videoButton.textContent === '開始') {
    modal.showModal(); // モーダルを表示する
  } else {
   
  //====== 録画を終了した時 ========
    videoButton.textContent = '開始';
    if (recorder && recorder.state !== 'inactive') {

      recorder.stop();
      timerStopFlug = false;
        console.log("timerStopFlug :", timerStopFlug);
    }
    resetTimer();
    resetPomoTimer();
    clearInterval(drawInterval); // canvasの描画の停止
    if (pomoFlug) {
      stopPomoTimer(); // ポモドーロタイマー停止
    } else {
      stopTimer(); //timer.jsのタイマーカウントの停止
    }
    recorder = null;
    pomoFlug = false;
  }
});

stopButton.addEventListener('click', () => {
  if (stopButton.textContent === "一時停止") {
    if (recorder && recorder.state === 'recording') {
      stopButton.textContent = "再開";
      recorder.pause();
      clearInterval(drawInterval); // canvasの描画停止
      if (pomoFlug) {
        stopPomoTimer(); // ポモドーロタイマー停止
      } else {
        stopTimer(); // timer.jsのタイマーカウントの停止
      }
    }
  } else if (stopButton.textContent === "再開") {
    if (recorder && recorder.state === 'paused') {
      stopButton.textContent = "一時停止";
      recorder.resume();
      drawInterval = setInterval(draw, 1000 / 15); //canvasの描画再開
      if (pomoFlug) {
        startPomoTimer(); // ポモドーロタイマー再開
      } else {
        countTimer(); //timer.jsのタイマー再開
      }
    }
  }
});

cameraButton.addEventListener('click', async () => {
  modal.close();
  pomoFlug = false;
  timerStopFlug = true;
  stopPomoTimer();
  countTimer();
  await startingCamera();
  if (recorder) {
    videoButton.textContent = '終了';
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
    videoButton.textContent = '終了';
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
    videoButton.textContent = '終了';
    recorder.start(1000); // chunk 1秒ごとにデータを取得する
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



// canvasにカメラ映像を描画する
function draw() {
  const ctx = canvas.getContext('2d');

// ========= タイマーが起動しているかどうか？？ ===========
  const timerStopFlugColor = timerStopFlug ? "isStart" : "isStop";
 

// ======= videoの描画 ======
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height); // video要素をcanvasに描画する
  
  ctx.fillStyle = "#fff";
  ctx.font = "20px Arial";
  
  // ポモドーロモードか通常モードかで表示を切り替え
  if (pomoFlug) {
    const { minDisplay: pomoMin, secDisplay: pomoSec, isWorkTime } = getPomoTimeDisplay();
    const modeText = isWorkTime ? "作業中" : "休憩中";
   

    if(timerStopFlugColor === "isStart") {
    ctx.fillText(`${modeText} ${pomoMin}:${pomoSec} (コマ数: ${getKomasuu()})`, 10, 30 );
    } else {
      ctx.fillStyle = "#ff4500"; //timerFlugColorがisStopだったら赤色にして表示する。
      ctx.fillText(`${modeText} ${pomoMin}:${pomoSec} (コマ数: ${getKomasuu()})`, 10, 30 );
    }

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

    if(timerStopFlugColor === "isStart") {
      ctx.fillText(`${minDisplay}:${secDisplay}`, 10, 30 );
      } else {
        ctx.fillStyle = "#ff4500"; //timerFlugColorがisStopだったら赤色にして表示する。
        ctx.fillText(`${minDisplay}:${secDisplay}`, 10, 30 );
      }
  }
}