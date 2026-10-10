const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

class Element {
  constructor(tag) { this.tag = tag; this.children = []; this.attributes = {}; this.dataset = {}; this.listeners = {}; }
  append(...nodes) { this.children.push(...nodes); }
  setAttribute(name, value) { this.attributes[name] = value; }
  addEventListener(name, callback) { this.listeners[name] = callback; }
  get childElementCount() { return this.children.length; }
}

function render(records) {
  const list = new Element("div");
  const empty = new Element("p");
  const head = new Element("head");
  const count = new Element("p");
  const filters = ["all", "x", "youtube"].map(type => {
    const button = new Element("button");
    button.dataset.recordFilter = type;
    return button;
  });
  const context = vm.createContext({
    URL,
    window: { VERIFICATION_RECORDS: records },
    document: {
      head,
      createElement: tag => new Element(tag),
      getElementById: id => ({ "verification-list": list, "verification-empty": empty, "verification-count": count })[id],
      querySelectorAll: () => filters,
    },
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../dist/other/verification/records.js"), "utf8"), context);
  return { list, empty, head, count, filters, parse: context.parseRecordUrl };
}

test("XとYouTubeの共有URLを判定し、時刻指定を保持する", () => {
  const { parse } = render([]);
  assert.equal(parse("https://x.com/miyu_lasp/status/2101662173160485241?s=20").url,
    "https://x.com/miyu_lasp/status/2101662173160485241");
  for (const url of ["https://youtu.be/7cjVj1ZyzyE?t=1m30s", "https://www.youtube.com/watch?v=7cjVj1ZyzyE&t=90", "https://youtube.com/shorts/7cjVj1ZyzyE?start=90"]) {
    assert.equal(parse(url).embed, "https://www.youtube-nocookie.com/embed/7cjVj1ZyzyE?start=90");
  }
});

test("任意のホストやHTML・スクリプトを埋め込みに使わない", () => {
  const { parse, head, list } = render([{ links: [{ url: "javascript:alert(1)" }] }]);
  for (const url of ["javascript:alert(1)", "https://youtube.com.evil.test/watch?v=7cjVj1ZyzyE", "https://x.com@evil.test/u/status/123", "https://x.com/profile", "https://youtu.be/bad"]) {
    assert.equal(parse(url), null);
  }
  assert.equal(head.children.length, 0);
  assert.equal(list.children.length, 0);
});

test("投稿を複数並べても公式スクリプトは1回だけ読み込み、代替本文とリンクを残す", () => {
  const { list, head, empty } = render([{ links: [
    { url: "https://x.com/test/status/123", text: "<script>text</script>", author: "作者" },
    { url: "https://twitter.com/test/status/456" },
    { url: "https://youtu.be/7cjVj1ZyzyE" },
  ] }]);
  assert.equal(head.children.length, 1);
  assert.equal(head.children[0].src, "https://platform.twitter.com/widgets.js");
  assert.equal(empty.hidden, true);
  const media = list.children[0].children.filter(node => node.className === "verification-media");
  assert.equal(media[0].children[0].children[0].children[0].textContent, "<script>text</script>");
  assert.equal(media[0].children[1].href, "https://x.com/test/status/123");
  assert.equal(media[2].children[0].referrerPolicy, "strict-origin-when-cross-origin");
  assert.equal(media[2].children[0].loading, "lazy");
});

test("複数記録を種類で絞り込み、件数と空の状態を更新する", () => {
  const x = { url: "https://x.com/test/status/123" };
  const youtube = { url: "https://youtu.be/M7lc1UVf-VE" };
  const { list, count, filters } = render([{ links: [x] }, { links: [youtube] }, { links: [x, youtube] }]);
  assert.equal(count.textContent, "3件 / 全3件");
  filters[2].listeners.click();
  assert.deepEqual(list.children.map(card => card.hidden), [true, false, false]);
  assert.equal(count.textContent, "2件 / 全3件");
  assert.equal(filters[2].attributes["aria-pressed"], "true");
  filters[0].listeners.click();
  assert.equal(list.children.filter(card => !card.hidden).length, 3);
  const onlyX = render([{ links: [x] }]);
  onlyX.filters[2].listeners.click();
  assert.equal(onlyX.empty.hidden, false);
  assert.equal(onlyX.count.textContent, "0件 / 全1件");
});
