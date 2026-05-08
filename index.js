const puppeteer = require("puppeteer");
const fetch = require("node-fetch");

// LINE
const LINE_ACCESS_TOKEN =
  process.env.LINE_ACCESS_TOKEN;

const LINE_USER_ID =
  process.env.LINE_USER_ID;

// 監視日
const TARGET_DATES = [
  "2026-05-09",
  "2026-05-10"
];

// =====================================
// メイン
// =====================================
async function checkAvailability() {

  console.log("Chrome起動");

  const browser =
    await puppeteer.launch({

      headless: "new",

      args: [

        "--no-sandbox",
        "--disable-setuid-sandbox",

        "--disable-blink-features=AutomationControlled"

      ]

    });

  const page =
    await browser.newPage();

  await page.setViewport({

    width: 1280,
    height: 720

  });

  await page.evaluateOnNewDocument(() => {

    Object.defineProperty(
      navigator,
      "webdriver",
      {
        get: () => false
      }
    );

  });

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
  );

  // APIレスポンス保存用
  let apiJson = null;

  // 通信監視
  page.on("response", async response => {

    const url = response.url();

    if (
      url.includes(
        "/api/shared/reserve/calendars"
      )
    ) {

      console.log("API検出");

      try {

        apiJson =
          await response.json();

        console.log("JSON取得成功");

      } catch (e) {

        console.log(
          "JSON取得失敗",
          e
        );

      }

    }

  });

  console.log("予約ページアクセス");

  await page.goto(
    "https://reserve.fumotoppara.net/reserved/reserved-calendar-list",
    {
      waitUntil: "networkidle2"
    }
  );

  // 通信待機
  await new Promise(
    r => setTimeout(r, 10000)
  );

  await browser.close();

  // API取得失敗
  if (!apiJson) {

    console.log(
      "APIレスポンス取得失敗"
    );

    return;

  }

  const list =
    apiJson.calendarsSiteDateList;

  // 空き判定
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

  // 通知文
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
