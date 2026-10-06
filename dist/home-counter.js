(() => {
  "use strict";

  fetch("./api/home-view", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    keepalive: true,
  }).catch(() => {});
})();
