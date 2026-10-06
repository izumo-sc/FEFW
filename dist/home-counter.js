(() => {
  "use strict";

  const counter = document.querySelector("#home-view-counter");
  const count = document.querySelector("#home-view-count");
  if (!counter || !count) return;

  fetch("./api/home-view", {
    method: "POST",
    headers: { Accept: "application/json" },
    credentials: "same-origin",
    cache: "no-store",
    keepalive: true,
  })
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then((result) => {
      if (!Number.isSafeInteger(result.count) || result.count < 0) {
        throw new Error("Invalid counter response");
      }
      count.textContent = result.count.toLocaleString("ja-JP");
      counter.hidden = false;
    })
    .catch(() => {
      counter.hidden = true;
    });
})();
