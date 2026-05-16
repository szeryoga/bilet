(function () {
  var STORAGE_KEY = "ticket-config";
  var DEFAULT_NUMBER = "№ ПД 361339070";

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
    var qrAnimation = document.getElementById("qr-animation");
    if (!qrHitbox || !qrAnimation) {
      return;
    }

    qrHitbox.addEventListener("click", function () {
      qrHitbox.classList.add("is-animating");
      qrAnimation.src = "img/qr_spin.gif?ts=" + Date.now();
      qrAnimation.classList.add("is-visible");

      window.clearTimeout(qrAnimation._hideTimer);
      qrAnimation._hideTimer = window.setTimeout(function () {
        qrAnimation.classList.remove("is-visible");
        qrAnimation.removeAttribute("src");
        qrHitbox.classList.remove("is-animating");
      }, 1550);
    });
  }

  setupPage();
  ticketPage();
})();
