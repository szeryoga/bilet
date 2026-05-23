(function () {
  var STORAGE_KEY = "ticket-config";
  var DEFAULT_NUMBER = "№ ПД 361339070";
  var QR_ANIMATION_MS = 1000;
  var QR_MIN_SCALE = 0.03;
  var QR_BG = "#35354f";

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
    var animationFrameId = 0;
    var canvas = document.createElement("canvas");
    var context = canvas.getContext("2d");
    var qrImage = new Image();
    var mirroredCanvas = document.createElement("canvas");
    var mirroredContext = mirroredCanvas.getContext("2d");
    var isReady = false;

    canvas.className = "qr-animation-canvas";
    qrAnimationLayer.appendChild(canvas);

    function prepareImages() {
      var width = qrImage.naturalWidth || qrImage.width;
      var height = qrImage.naturalHeight || qrImage.height;

      canvas.width = width;
      canvas.height = height;
      mirroredCanvas.width = width;
      mirroredCanvas.height = height;
      mirroredContext.setTransform(1, 0, 0, 1, 0, 0);
      mirroredContext.clearRect(0, 0, width, height);
      mirroredContext.translate(width, 0);
      mirroredContext.scale(-1, 1);
      mirroredContext.drawImage(qrImage, 0, 0);
      isReady = true;
    }

    qrImage.addEventListener("load", prepareImages);
    qrImage.src = "img/qr.png";

    function stopAnimation() {
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
        animationFrameId = 0;
      }
      qrHitbox.classList.remove("is-animating");
      if (isReady) {
        context.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    function drawFrame(progress) {
      var theta = progress * Math.PI * 2;
      var width = canvas.width;
      var height = canvas.height;
      var source = Math.cos(theta) >= 0 ? qrImage : mirroredCanvas;
      var scaleX = Math.max(Math.abs(Math.cos(theta)), QR_MIN_SCALE);
      var drawWidth = Math.max(1, Math.round(width * scaleX));
      var offsetX = Math.floor((width - drawWidth) / 2);

      context.fillStyle = QR_BG;
      context.fillRect(0, 0, width, height);
      context.imageSmoothingEnabled = false;
      context.drawImage(source, offsetX, 0, drawWidth, height);
    }

    function startAnimation() {
      var startTime = 0;

      stopAnimation();
      qrHitbox.classList.add("is-animating");

      function step(timestamp) {
        var elapsed;
        var progress;

        if (!startTime) {
          startTime = timestamp;
        }

        elapsed = timestamp - startTime;
        progress = Math.min(elapsed / QR_ANIMATION_MS, 1);
        drawFrame(progress);

        if (progress < 1) {
          animationFrameId = window.requestAnimationFrame(step);
        } else {
          stopAnimation();
        }
      }

      animationFrameId = window.requestAnimationFrame(step);
    }

    qrHitbox.addEventListener("click", function () {
      if (!isReady) {
        return;
      }
      startAnimation();
    });
  }

  registerServiceWorker();
  setupPage();
  ticketPage();
})();
