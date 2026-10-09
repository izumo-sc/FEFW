const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

class Element {
  constructor() {
    this.children = []; this.dataset = {}; this.style = {}; this.listeners = {};
    this.attributes = {}; this.value = "";
    this.classList = { add() {}, toggle() {} };
  }
  set textContent(value) { this.children = []; this.text = String(value); }
  get textContent() { return (this.text || "") + this.children.map(x => x.textContent).join(""); }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.text = ""; this.children = children; }
  setAttribute(key, value) { this.attributes[key] = value; }
  addEventListener(type, listener) { this.listeners[type] = listener; }
  querySelectorAll() { return []; }
  fire(type) { this.listeners[type]?.(); }
}

function tracker(exchange = false) {
  const prefix = exchange ? "exchange-" : "";
  const ids = Object.fromEntries([
    "materials-list", "empty-state", "search-input", "controls", "reset-button", "reset-dialog",
    "save-status", "material-count", "required-total", "shortage-total",
    ...exchange ? [] : ["exchange-display-toggle", "exchange-display-state"],
  ].map(id => [prefix + id, new Element()]));
  const data = new Map();
  const listeners = {};
  const window = { addEventListener: (type, fn) => { listeners[type] = fn; }, setTimeout() {}, clearTimeout() {} };
  const context = vm.createContext({ window, localStorage: {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
  }, document: {
    getElementById: id => ids[id] || null,
    createElement: () => new Element(),
    createTextNode: text => { const node = new Element(); node.textContent = text; return node; },
  } });
  for (const file of ["materials.js", "exchange-data.js", "app.js"]) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, "../dist", file), "utf8"), context);
  }
  const row = name => ids[prefix + "materials-list"].children.find(x => x.dataset.name === name);
  return {
    get: id => ids[prefix + id].textContent,
    shortage: name => row(name).children[5].textContent,
    input(name, route, value) {
      const input = row(name).children[3].children[route].children[1];
      input.value = String(value); input.fire("input");
    },
    toggle: () => ids["exchange-display-toggle"].fire("click"),
    rows: () => ids[prefix + "materials-list"].children.length,
    sync(inventory) {
      data.set("fortune-weave-material-inventory-v3", JSON.stringify(inventory));
      listeners.storage({key: "fortune-weave-material-inventory-v3"});
    },
  };
}

test("上部の必要数・不足数に4ルートの交換分も含める", () => {
  const t = tracker();
  assert.equal(t.get("required-total"), "836");
  assert.equal(t.get("shortage-total"), "836");
  t.input("サンノミ", 0, 5);
  assert.equal(t.shortage("サンノミ"), "25（35）");
  assert.equal(t.get("shortage-total"), "831");
  t.input("サンノミ", 0, 20);
  assert.equal(t.shortage("サンノミ"), "15（30）");
  assert.equal(t.get("shortage-total"), "816");
});

test("余剰を他ルートに流用せず、必要ルートへの入力で不足を解消する", () => {
  const t = tracker();
  t.input("サンノミ", 0, 100);
  assert.equal(t.shortage("サンノミ"), "0（30）");
  assert.equal(t.get("shortage-total"), "801");
  for (const route of [1,2,3]) t.input("サンノミ", route, 10);
  assert.equal(t.shortage("サンノミ"), "0（0）");
  assert.equal(t.get("shortage-total"), "771");
});

test("交換専用素材の不足を集計し、OFF/ONで入力値を保持する", () => {
  const t = tracker();
  t.input("ラドンパイク", 0, 12);
  assert.equal(t.shortage("ラドンパイク"), "（9）");
  assert.equal(t.get("shortage-total"), "833");
  t.input("サンノミ", 0, 20);
  t.toggle();
  assert.equal(t.rows(),55);
  assert.equal(t.shortage("サンノミ"), "5");
  assert.equal(t.get("required-total"), "668");
  assert.equal(t.get("shortage-total"), "648");
  t.toggle();
  assert.equal(t.rows(),58);
  assert.equal(t.shortage("ラドンパイク"), "（9）");
  assert.equal(t.get("shortage-total"), "813");
});

test("ページ間同期後の追加入力も最新の数値で再計算する", () => {
  const t = tracker();
  t.sync({サンノミ:{leda:20}});
  t.input("サンノミ", 1, 10);
  assert.equal(t.shortage("サンノミ"), "15（20）");
  assert.equal(t.get("shortage-total"), "806");
});

test("武器交換ページは交換分のみをルート別上限で集計する", () => {
  const t = tracker(true);
  assert.equal(t.get("required-total"), "168");
  t.input("サンノミ", 0, 100);
  assert.equal(t.shortage("サンノミ"), "30");
  assert.equal(t.get("shortage-total"), "158");
});

test("括弧内は交換分のみで、復興分と独立して不足を表示する", () => {
  const t = tracker();
  assert.equal(t.shortage("サンノミ"), "25（40）");
  for (const route of [0, 1, 2, 3]) t.input("サンノミ", route, 10);
  assert.equal(t.shortage("サンノミ"), "25（0）");
  assert.equal(t.get("shortage-total"), "796");
});
