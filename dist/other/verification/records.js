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
    const card = element("article", "", "verification-record");
    if (record.title) card.append(element("h2", record.title));
    if (record.body) card.append(element("p", record.body, "verification-body"));
    for (const source of record.links || []) {
      const media = parseRecordUrl(source.url);
      if (!media) continue;
      const container = element("div", "", "verification-media");
      if (media.type === "x") {
        hasX = true;
        const quote = element("blockquote", "", "twitter-tweet");
        quote.setAttribute("data-dnt", "true");
        quote.setAttribute("data-lang", "ja");
        if (source.text) quote.append(element("p", source.text));
        if (source.author) quote.append(element("p", `— ${source.author}`));
        quote.append(link(source.date || "Xで投稿を見る", media.url.replace("https://x.com/", "https://twitter.com/")));
        container.append(quote);
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
    if (card.childElementCount) list.append(card);
  }
  document.getElementById("verification-empty").hidden = list.childElementCount > 0;
  if (hasX) {
    const script = document.createElement("script");
    script.src = "https://platform.twitter.com/widgets.js";
    script.async = true;
    script.charset = "utf-8";
    document.head.append(script);
  }
})();
