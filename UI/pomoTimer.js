// ポモドーロタイマーの設定
const WORK_TIME = 25 * 60; // 25分（秒）
const BREAK_TIME = 5 * 60; // 5分（秒）

let pomoTimeLeft = WORK_TIME; // 残り時間（秒）
let isWorkTime = true; // true: 作業時間, false: 休憩時間
let pomoInterval = null;
let koma = 0; // コマ数をカウントする関数

// ポモドーロタイマーを開始する関数
export const startPomoTimer = () => {
  if (pomoInterval) {
    clearInterval(pomoInterval);
  }
  
  pomoInterval = setInterval(() => {
    pomoTimeLeft--;
    
    if (pomoTimeLeft <= 0) {
      // 時間切れ：作業時間と休憩時間を切り替え、コマ数を+1カウント
       koma++;
       console.log("コマ数をカウントしました！！現在のコマ数 :", koma);
      if (isWorkTime) {
        // 作業時間終了 → 休憩時間開始
        isWorkTime = false;
        pomoTimeLeft = BREAK_TIME;
        console.log("休憩時間開始！");
      } else {
        // 休憩時間終了 → 作業時間開始
        isWorkTime = true;
        pomoTimeLeft = WORK_TIME;
        console.log("作業時間開始！");
      }
    }
  }, 1000);
  
  console.log("ポモドーロタイマーが起動しました！");
};

// ポモドーロタイマーを停止する関数
export const stopPomoTimer = () => {
  if (pomoInterval) {
    clearInterval(pomoInterval);
    pomoInterval = null;
  }
  console.log("ポモドーロタイマーを止めました！");
};

// ポモドーロタイマーをリセットする関数
export const resetPomoTimer = () => {
  stopPomoTimer();
  koma = 0;
  isWorkTime = true;
  pomoTimeLeft = WORK_TIME;
};

// 残り時間を取得する関数（分:秒形式）
export const getPomoTimeDisplay = () => {
  const minutes = Math.floor(pomoTimeLeft / 60);
  const seconds = pomoTimeLeft % 60;
  const minDisplay = minutes < 10 ? "0" + minutes : String(minutes);
  const secDisplay = seconds < 10 ? "0" + seconds : String(seconds);

  return { minDisplay, secDisplay, isWorkTime };
};

// 現在のモードを取得
export const getPomoMode = () => isWorkTime;
export const getKomasuu = () => koma;

