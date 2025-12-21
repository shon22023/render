
let hour = 0; // 時間
let min = 0; //分
let sec = 0; //秒
let blobCount = 0; //blob化するまでをカウントする(３０分)
let timerInterval;

// エクスポート用の変数
export let hourDisplay = "00";
export let minDisplay = "00";
export let secDisplay = "00";


//　タイマーを開始する関数
export const countTimer = () =>  {
    timerInterval = setInterval(startTimer, 1000);
     console.log("タイマーが起動しました！！");
}

// タイマーを停止する関数
export const stopTimer = () => {
  clearInterval(timerInterval);
 
   console.log("タイマーを止めました！");

}

// タイマーをリセットする関数
export const resetTimer = () => {

  clearInterval(timerInterval);

  hour = 0; // 時間
  min = 0; //分
  sec = 0; //秒



  hourDisplay = "00";
  minDisplay = "00";
  secDisplay = "00";
 
  blobCount = 0;
 
  console.log("タイマーをすべてリセットしました！！");

}


function startTimer() {
   blobCount++;
   sec++;
   
   if(sec >= 60) {
        sec = 0;
        min++;
        if(min >= 60) {
            min = 0;
            hour++;
        }
    }
   
   //数字が一桁の場合、数字の左側に０を付けて表示する
   hourDisplay = hour < 10 ? "0" + hour : String(hour);
   minDisplay = min < 10 ? "0" + min : String(min);
   secDisplay = sec < 10 ? "0" + sec : String(sec);
   
  //30分になったらblobCountをリセットする
   if(blobCount === 1800) {
     blobCount = 0;
   }
}

// エクスポート用の変数類
export const getBlobCount = () => blobCount;