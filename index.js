const puppeteer = require("puppeteer");
const fetch = require("node-fetch");

// ==============================
// LINE
// ==============================
const LINE_ACCESS_TOKEN =
  process.env.LINE_ACCESS_TOKEN;

const LINE_USER_ID =
  process.env.LINE_USER_ID;

// ==============================
// 監視したい日
// 複数可
// ==============================
const TARGET_DATES = [

  "2026-05-09",
  "2026-05-10"

];

// ==============================
// API
// ==============================
const API_URL =
  "https://reserve.fumotoppara.net/api/shared/reserve/calendars";

// ==============================
// メイン
// ==============================
async function checkAvailability() {

  console.log("Chrome起動");

  const browser =
    await puppeteer.launch({

      // Bot判定回避
      headless: "new",

      args: [

        "--no-sandbox",
        "--disable-setuid-sandbox",

        "--disable-blink-features=AutomationControlled",

        "--window-size=1280,720"

      ]

    });

  const page =
    await browser.newPage();

  // 画面サイズ
  await page.setViewport({

    width: 1280,
    height: 720

  });

  // webdriver隠し
  await page.evaluateOnNewDocument(() => {

    Object.defineProperty(
      navigator,
      "webdriver",
      {
        get: () => false
      }
    );

  });

  // Chromeっぽくする
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
  );

  console.log("予約ページアクセス");

  // ページ表示
  await page.goto(
    "https://reserve.fumotoppara.net/reserved/reserved-calendar-list",
    {
      waitUntil: "networkidle2"
    }
  );

  // JS実行待ち
  await new Promise(
    r => setTimeout(r, 5000)
  );

  console.log("API取得");

  // ブラウザ内部fetch
  const result = await page.evaluate(
    async (API_URL) => {

      try {

        const response =
          await fetch(API_URL);

        const text =
          await response.text();

        return {

          ok: response.ok,
          status: response.status,
          text

        };

      } catch (e) {

        return {

          ok: false,
          error: e.toString()

        };

      }

    },
    API_URL
  );

  console.log(result);

  if (!result.ok) {

    console.log("API失敗");

    await browser.close();

    return;

  }

  const json =
    JSON.parse(result.text);

  await browser.close();

  const list =
    json.calendarsSiteDateList;

  // ==============================
  // 空き判定
  // ==============================
  const available = list.filter(item => {

    return (

      item.siteGroupCd === "01" &&
      item.stayDiv === "STAY" &&
      TARGET_DATES.includes(item.calDate) &&
      item.remainCount > 0

    );

  });

  console.log(
    "空き検出:",
    available
  );

  // 空きなし
  if (available.length === 0) {

    console.log("空きなし");

    return;

  }

  // ==============================
  // 通知文
  // ==============================
  let message =
    "【ふもとっぱら空き通知】\n\n";

  available.forEach(item => {

    message +=

      `${item.calDate}\n` +
      `残り: ${item.remainCount}\n\n`;

  });

  // LINE通知
  await sendLine(message);

}

// ==============================
// LINE通知
// ==============================
async function sendLine(message) {

  const response = await fetch(

    "https://api.line.me/v2/bot/message/push",

    {

      method: "POST",

      headers: {

        "Content-Type":
          "application/json",

        Authorization:
          `Bearer ${LINE_ACCESS_TOKEN}`

      },

      body: JSON.stringify({

        to: LINE_USER_ID,

        messages: [
          {
            type: "text",
            text: message
          }
        ]

      })

    }

  );

  console.log(
    "LINE Status:",
    response.status
  );

}

// 実行
checkAvailability();
