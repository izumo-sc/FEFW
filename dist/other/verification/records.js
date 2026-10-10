function parseRecordUrl(value) {
  let url;
  try { url = new URL(value); } catch { return null; }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
  const host = url.hostname;
  if (["x.com", "www.x.com", "twitter.com", "www.twitter.com", "mobile.twitter.com"].includes(host)) {
    const match = url.pathname.match(/^\/(?:[\w]+\/status|i\/web\/status)\/(\d+)(?:\/|$)/);
    return match ? { type: "x", url: `https://x.com${match[0].replace(/\/$/, "")}` } : null;
  }
  let id;
  if (host === "youtu.be") id = url.pathname.slice(1);
  else if (["youtube.com", "www.youtube.com", "m.youtube.com", "www.youtube-nocookie.com"].includes(host)) {
    id = url.pathname === "/watch" ? url.searchParams.get("v") : url.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)\/?$/)?.[1];
  }
  if (!/^[\w-]{11}$/.test(id || "")) return null;
  const rawStart = url.searchParams.get("start") || url.searchParams.get("t") || "";
  const time = rawStart.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/);
  const seconds = time ? Number(time[1] || 0) * 3600 + Number(time[2] || 0) * 60 + Number(time[3] || 0) : 0;
  const start = Number.isSafeInteger(seconds) && seconds > 0 ? `?start=${seconds}` : "";
  return { type: "youtube", url: url.href, embed: `https://www.youtube-nocookie.com/embed/${id}${start}` };
}

(() => {
  const list = document.getElementById("verification-list");
  if (!list) return;
  let hasX = false;
  const cards = [];
  const element = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  const link = (text, url) => {
    const node = element("a", text);
    node.href = url;
    node.target = "_blank";
    node.rel = "noopener noreferrer";
    return node;
  };
  for (const record of window.VERIFICATION_RECORDS || []) {
    const sources = (record.links || []).map(source => ({ source, media: parseRecordUrl(source.url) })).filter(item => item.media);
    if (!sources.length && !record.title && !record.body) continue;
    const card = element("article", "", "verification-record");
    const types = new Set(sources.map(item => item.media.type));
    const labels = [...types].map(type => type === "x" ? "X" : "YouTube");
    if (labels.length) card.append(element("p", labels.join(" / "), "verification-record-label"));
    if (record.title) card.append(element("h2", record.title));
    if (record.body) card.append(element("p", record.body, "verification-body"));
    for (const { source, media } of sources) {
      const container = element("div", "", "verification-media");
      if (media.type === "x") {
        hasX = true;
        const preview = element("div", "", "verification-preview");
        preview.tabIndex = 0;
        preview.setAttribute("role", "region");
        preview.setAttribute("aria-label", record.title ? `${record.title}のX投稿` : "X投稿（枠内をスクロールできます）");
        const quote = element("blockquote", "", "twitter-tweet");
        quote.setAttribute("data-dnt", "true");
        quote.setAttribute("data-lang", "ja");
        if (source.text) quote.append(element("p", source.text));
        if (source.author) quote.append(element("p", `— ${source.author}`));
        quote.append(link(source.date || "Xで投稿を見る", media.url.replace("https://x.com/", "https://twitter.com/")));
        preview.append(quote);
        container.append(preview);
      } else {
        const frame = element("iframe", "", "verification-video");
        frame.src = media.embed;
        frame.title = source.title || record.title || "YouTube動画";
        frame.loading = "lazy";
        frame.referrerPolicy = "strict-origin-when-cross-origin";
        frame.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
        frame.allowFullscreen = true;
        container.append(frame);
      }
      const original = link(media.type === "x" ? "Xで投稿を見る ↗" : "YouTubeで動画を見る ↗", media.url);
      original.className = "verification-source";
      container.append(original);
      card.append(container);
    }
    list.append(card);
    cards.push({ card, types });
  }
  const empty = document.getElementById("verification-empty");
  const count = document.getElementById("verification-count");
  const filters = [...document.querySelectorAll("[data-record-filter]")];
  const filterRecords = type => {
    let visible = 0;
    for (const item of cards) {
      item.card.hidden = type !== "all" && !item.types.has(type);
      if (!item.card.hidden) visible++;
    }
    for (const button of filters) button.setAttribute("aria-pressed", String(button.dataset.recordFilter === type));
    if (count) count.textContent = `${visible}件 / 全${cards.length}件`;
    empty.hidden = visible > 0;
    empty.textContent = cards.length ? "該当する検証記録はありません。" : "検証記録は準備中です。";
  };
  for (const button of filters) button.addEventListener("click", () => filterRecords(button.dataset.recordFilter));
  filterRecords("all");
  if (hasX) {
    const script = document.createElement("script");
    script.src = "https://platform.twitter.com/widgets.js";
    script.async = true;
    script.charset = "utf-8";
    document.head.append(script);
  }
})();
