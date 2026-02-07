(function () {
  var params = new URLSearchParams(window.location.search);
  var theme = params.get("theme");
  var allowed = ["default", "inverted", "high-contrast"];

  if (theme && allowed.indexOf(theme) !== -1) {
    document.documentElement.setAttribute("data-theme", theme);
  }

  var active = document.documentElement.getAttribute("data-theme") || "default";
  var label = document.querySelector("[data-theme-label]");
  if (label) {
    label.textContent = active;
  }
})();
