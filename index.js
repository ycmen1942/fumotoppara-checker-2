const puppeteer = require("puppeteer");
const fetch = require("node-fetch");

// LINE
const LINE_ACCESS_TOKEN =
  process.env.LINE_ACCESS_TOKEN;

const LINE_USER_ID =
  process.env.LINE_USER_ID;

// 監視日
const TARGET_DATES = [
  "2026-05-09"
];

// API
const API_URL =
  "https://reserve.fumotoppara.net/api/shared/reserve/calendars";

// =====================================
// メイン
// =====================================
async function checkAvailability() {

  console.log("Chrome起動");

  const browser =
    await puppeteer.launch({

      headless: true,

      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox"
      ]

    });

  const page =
    await browser.newPage();

  // 普通のChromeっぽくする
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
  );

  console.log("予約ページアクセス");

  // 一度ページ開く
await page.goto(
  "https://reserve.fumotoppara.net/reserved/reserved-calendar-list",
  {
    waitUntil: "networkidle2"
  }
);

console.log("待機中");

await page.waitForResponse(
  response =>
    response.url().includes(
      "/api/shared/reserve/calendars"
    ),
  {
    timeout: 15000
  }
);

console.log("API通信検出");

console.log("API取得");

  // ブラウザ内部でAPI実行
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

  // キャンプ宿泊のみ
  const available = list.filter(item => {

    return (

      item.siteGroupCd === "01" &&
      item.stayDiv === "STAY" &&
      TARGET_DATES.includes(item.calDate) &&
      item.remainCount > 0

    );

  });

  console.log("空き検出:", available);

  if (available.length === 0) {

    console.log("空きなし");

    return;

  }

  let message =
    "【ふもとっぱら空き通知】\n\n";

  available.forEach(item => {

    message +=
      `${item.calDate}\n` +
      `残り: ${item.remainCount}\n\n`;

  });

  await sendLine(message);

}

// =====================================
// LINE通知
// =====================================
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

checkAvailability();
