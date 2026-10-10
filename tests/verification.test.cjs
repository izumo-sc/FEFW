const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

class Element {
  constructor(tag) { this.tag = tag; this.children = []; this.attributes = {}; }
  append(...nodes) { this.children.push(...nodes); }
  setAttribute(name, value) { this.attributes[name] = value; }
  get childElementCount() { return this.children.length; }
}

function render(records) {
  const list = new Element("div");
  const empty = new Element("p");
  const head = new Element("head");
  const context = vm.createContext({
    URL,
    window: { VERIFICATION_RECORDS: records },
    document: {
      head,
      createElement: tag => new Element(tag),
      getElementById: id => id === "verification-list" ? list : empty,
    },
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../dist/other/verification/records.js"), "utf8"), context);
  return { list, empty, head, parse: context.parseRecordUrl };
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
  const media = list.children[0].children;
  assert.equal(media[0].children[0].children[0].textContent, "<script>text</script>");
  assert.equal(media[0].children[1].href, "https://x.com/test/status/123");
  assert.equal(media[2].children[0].referrerPolicy, "strict-origin-when-cross-origin");
  assert.equal(media[2].children[0].loading, "lazy");
});
