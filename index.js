const fetch = require("node-fetch");

const LINE_ACCESS_TOKEN =
  process.env.LINE_ACCESS_TOKEN;

const LINE_USER_ID =
  process.env.LINE_USER_ID;

const TARGET_DATES = [
  "2026-05-08"
];

const API_URL =
  "https://reserve.fumotoppara.net/api/shared/reserve/calendars";

async function checkAvailability() {

  console.log("API取得開始");

  const response = await fetch(API_URL, {

    headers: {

      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",

      "Accept":
        "application/json, text/plain, */*",

      "Referer":
        "https://reserve.fumotoppara.net/reserved/reserved-calendar-list",

      "Origin":
        "https://reserve.fumotoppara.net"

    }

  });

  console.log("HTTP:", response.status);

  if (!response.ok) {

    console.log("API失敗");

    return;

  }

  const json = await response.json();

  const list =
    json.calendarsSiteDateList;

  const available = list.filter(item => {

    return (

      item.siteGroupCd === "01" &&
      item.stayDiv === "STAY" &&
      TARGET_DATES.includes(item.calDate) &&
      item.remainCount > 0

    );

  });

  console.log(available);

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
    "LINE:",
    response.status
  );

}

checkAvailability();
