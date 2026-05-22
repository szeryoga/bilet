(function () {
  var STORAGE_KEY = "ticket-config";
  var DEFAULT_NUMBER = "№ ПД 361339070";
  var DEFAULT_ANIMATION_GIF = "qr_spin_1500.gif";

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
      animationGif: params.get("animationGif") || "",
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
      animationGif: document.getElementById("animation-gif"),
    };

    var config = readConfig();
    fields.from.value = config.from || "";
    fields.to.value = config.to || "";
    fields.date.value = config.date || todayIso();
    fields.number.value = config.number || DEFAULT_NUMBER;
    fields.animationGif.value = config.animationGif || DEFAULT_ANIMATION_GIF;

    form.addEventListener("submit", function () {
      writeConfig({
        from: fields.from.value.trim(),
        to: fields.to.value.trim(),
        date: fields.date.value || todayIso(),
        number: fields.number.value.trim() || DEFAULT_NUMBER,
        animationGif: fields.animationGif.value || DEFAULT_ANIMATION_GIF,
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
    var animationGif = config.animationGif || DEFAULT_ANIMATION_GIF;
    var animationMsMatch = animationGif.match(/qr_spin_(\d+)\.gif$/);
    var animationMs = animationMsMatch ? Number(animationMsMatch[1]) : 1500;

    if (urlConfig.from || urlConfig.to || urlConfig.date || urlConfig.number || urlConfig.animationGif) {
      config = {
        from: urlConfig.from || config.from,
        to: urlConfig.to || config.to,
        date: urlConfig.date || config.date,
        number: urlConfig.number || config.number,
        animationGif: urlConfig.animationGif || config.animationGif,
      };
      writeConfig(config);
      from = config.from || "Девяткино";
      to = config.to || "Кавголово";
      dateLabel = formatDate(config.date || todayIso());
      number = config.number || DEFAULT_NUMBER;
      animationGif = config.animationGif || DEFAULT_ANIMATION_GIF;
      animationMsMatch = animationGif.match(/qr_spin_(\d+)\.gif$/);
      animationMs = animationMsMatch ? Number(animationMsMatch[1]) : 1500;
    }

    document.getElementById("ticket-route").textContent = from + " - " + to;
    document.getElementById("ticket-direction").textContent =
      "Разовый билет в одну сторону на " + dateLabel;
    document.getElementById("ticket-purchased").textContent =
      "Куплен " + dateLabel + " - " + number;

    var qrHitbox = document.getElementById("qr-hitbox");
    var qrAnimation = document.getElementById("qr-animation");
    if (!qrHitbox || !qrAnimation) {
      return;
    }
    var animationUrl = "img/" + animationGif;
    var preloadImage = new Image();
    var animationToken = 0;

    function stopAnimation() {
      window.clearTimeout(qrAnimation._hideTimer);
      qrAnimation.classList.remove("is-visible");
      qrAnimation.removeAttribute("src");
      qrHitbox.classList.remove("is-animating");
    }

    function armHideTimer(token) {
      window.clearTimeout(qrAnimation._hideTimer);
      qrAnimation._hideTimer = window.setTimeout(function () {
        if (token !== animationToken) {
          return;
        }
        stopAnimation();
      }, animationMs + 80);
    }

    preloadImage.src = animationUrl;

    qrAnimation.addEventListener("load", function () {
      qrHitbox.classList.add("is-animating");
      qrAnimation.classList.add("is-visible");
      armHideTimer(animationToken);
    });

    qrHitbox.addEventListener("click", function () {
      animationToken += 1;
      stopAnimation();
      void qrAnimation.offsetWidth;
      qrAnimation.src = animationUrl;

      if (qrAnimation.complete) {
        qrHitbox.classList.add("is-animating");
        qrAnimation.classList.add("is-visible");
        armHideTimer(animationToken);
      }
    });
  }

  setupPage();
  ticketPage();
})();
