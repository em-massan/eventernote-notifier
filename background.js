const FETCH_URL = "https://www.eventernote.com/";
const TARGET_URL = "https://www.eventernote.com/users/notice";
const INTERVAL_MINUTES = 30;
const INTERVAL_MS = INTERVAL_MINUTES * 60 * 1000;

// 拡張機能がインストールされたとき
chrome.runtime.onInstalled.addListener(updateBadge);

// 拡張機能が起動したとき
chrome.runtime.onStartup.addListener(updateBadge);

// タブが更新されたとき
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete" || !tab.url) return;

  if (await isElapsedInterval() || isTargetUrl(tab.url)) {
    await updateBadge();
  }
});

// タブがアクティブになったとき
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  if (await isElapsedInterval()) {
    updateBadge();
  }
});

// アイコンがクリックされた
chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.create({ url: TARGET_URL });
});

async function isElapsedInterval() {
  const { lastCheckTime = 0 } = await chrome.storage.local.get("lastCheckTime");
  return (Date.now() - lastCheckTime) >= INTERVAL_MS;
}

function isTargetUrl(url) {
  return url.startsWith(TARGET_URL);
}

async function updateBadge() {
  console.log("updateBadge()");

  try {
    // HTMLを取得
    const res = await fetch(FETCH_URL, {
      credentials: "include" // セッションCookieを使用
    });
    const html = await res.text();

    chrome.storage.local.set({ lastCheckTime: Date.now() });

    chrome.action.setBadgeBackgroundColor({ color: "#d00" });

    // HTMLから新着件数部を取得する
    const count = extractNoticeCount(html);

    chrome.action.setBadgeText({
      text: count && count > 0 ? String(count) : "0"
    });
  } catch (e) {
    // 例外(ネットワークエラーetc)
    chrome.action.setBadgeText({ text: "" });
    console.error("failed to fetch notice", e);
  }
}

function extractNoticeCount(html) {
  const match = html.match(
    /<div class="notice arrow_box">[\s\S]*?<a[^>]*href="\/users\/notice"[^>]*>(\d+)<\/a>/i
  );

  if (!match) return null;

  return parseInt(match[1], 10);
}
