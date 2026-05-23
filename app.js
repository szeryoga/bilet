(function () {
  var STORAGE_KEY = "ticket-config";
  var DEFAULT_NUMBER = "№ ПД 361339070";
  var DEFAULT_ANIMATION_GIF = "qr_spin_1000.gif";

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {
        return;
      });
    });
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function todayIso() {
    var now = new Date();
    return [
      now.getFullYear(),
      pad(now.getMonth() + 1),
      pad(now.getDate()),
    ].join("-");
  }

  function readConfig() {
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      return {};
    }
  }

  function writeConfig(config) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (error) {
      return;
    }
  }

  function queryConfig() {
    var params = new URLSearchParams(window.location.search);
    return {
      from: params.get("from") || "",
      to: params.get("to") || "",
      date: params.get("date") || "",
      number: params.get("number") || "",
    };
  }

  function formatDate(isoDate) {
    var source = isoDate || todayIso();
    var parts = source.split("-");
    if (parts.length !== 3) {
      return source;
    }

    var date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    if (Number.isNaN(date.getTime())) {
      return source;
    }

    return new Intl.DateTimeFormat("ru-RU", {
      day: "numeric",
      month: "long",
    }).format(date);
  }

  function setupPage() {
    var form = document.getElementById("ticket-form");
    if (!form) {
      return;
    }

    var fields = {
      from: document.getElementById("from"),
      to: document.getElementById("to"),
      date: document.getElementById("date"),
      number: document.getElementById("number"),
    };

    var config = readConfig();
    fields.from.value = config.from || "";
    fields.to.value = config.to || "";
    fields.date.value = config.date || todayIso();
    fields.number.value = config.number || DEFAULT_NUMBER;

    form.addEventListener("submit", function () {
      writeConfig({
        from: fields.from.value.trim(),
        to: fields.to.value.trim(),
        date: fields.date.value || todayIso(),
        number: fields.number.value.trim() || DEFAULT_NUMBER,
      });
    });
  }

  function ticketPage() {
    var route = document.getElementById("ticket-route");
    if (!route) {
      return;
    }

    var urlConfig = queryConfig();
    var config = readConfig();
    var from = config.from || "Девяткино";
    var to = config.to || "Кавголово";
    var dateLabel = formatDate(config.date || todayIso());
    var number = config.number || DEFAULT_NUMBER;
    var animationGif = DEFAULT_ANIMATION_GIF;
    var animationMsMatch = animationGif.match(/qr_spin_(\d+)\.gif$/);
    var animationMs = animationMsMatch ? Number(animationMsMatch[1]) : 1500;

    if (urlConfig.from || urlConfig.to || urlConfig.date || urlConfig.number) {
      config = {
        from: urlConfig.from || config.from,
        to: urlConfig.to || config.to,
        date: urlConfig.date || config.date,
        number: urlConfig.number || config.number,
      };
      writeConfig(config);
      from = config.from || "Девяткино";
      to = config.to || "Кавголово";
      dateLabel = formatDate(config.date || todayIso());
      number = config.number || DEFAULT_NUMBER;
    }

    document.getElementById("ticket-route").textContent = from + " - " + to;
    document.getElementById("ticket-direction").textContent =
      "Разовый билет в одну сторону на " + dateLabel;
    document.getElementById("ticket-purchased").textContent =
      "Куплен " + dateLabel + " - " + number;

    var qrHitbox = document.getElementById("qr-hitbox");
    var qrAnimationLayer = document.getElementById("qr-animation-layer");
    if (!qrHitbox || !qrAnimationLayer) {
      return;
    }
    var animationUrl = "img/" + animationGif;
    var animationToken = 0;

    function stopAnimation() {
      window.clearTimeout(qrHitbox._hideTimer);
      qrHitbox.classList.remove("is-animating");
      while (qrAnimationLayer.firstChild) {
        qrAnimationLayer.removeChild(qrAnimationLayer.firstChild);
      }
    }

    function armHideTimer(token) {
      window.clearTimeout(qrHitbox._hideTimer);
      qrHitbox._hideTimer = window.setTimeout(function () {
        if (token !== animationToken) {
          return;
        }
        stopAnimation();
      }, animationMs + 80);
    }

    qrHitbox.addEventListener("click", function () {
      animationToken += 1;
      stopAnimation();
      qrHitbox.classList.add("is-animating");

      var animationImage = document.createElement("img");
      animationImage.className = "qr-animation";
      animationImage.alt = "";
      animationImage.src = animationUrl + "?play=" + animationToken;
      qrAnimationLayer.appendChild(animationImage);

      armHideTimer(animationToken);
    });
  }

  registerServiceWorker();
  setupPage();
  ticketPage();
})();
