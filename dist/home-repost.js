(() => {
  "use strict";

  const isMobile = navigator.userAgentData?.mobile
    || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    || (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  const link = document.querySelector(".home-x-repost");
  if (!isMobile || !link) return;

  // Let the OS open the post in X through its app-link association.
  // When app linking is unavailable, the same URL opens the web post.
  link.href = "https://x.com/miyu_lasp/status/2107854492263928003";
  link.removeAttribute("target");
})();
