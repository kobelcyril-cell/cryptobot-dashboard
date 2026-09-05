"use strict";

let countdownInterval;

function startRebalanceCountdown(big4) {
  clearInterval(countdownInterval);
  const value = document.getElementById("rebalance-countdown");
  const box = value.parentElement;
  const dateLabel = document.getElementById("rebalance-at");
  const target = new Date(big4?.next_rebalance_at);
  if (!big4?.next_rebalance_at) {
    value.textContent = "Bot-Neustart erforderlich";
    dateLabel.textContent = "–";
    box.classList.add("due");
    return;
  }
  dateLabel.textContent = Number.isFinite(target.getTime())
    ? target.toLocaleString("de-CH", {dateStyle: "medium", timeStyle: "short"}) : "–";

  const draw = () => {
    if (big4?.split_rebalance_active) {
      value.textContent = "Umschichtung laeuft";
      box.classList.add("due");
      return;
    }
    const secondsTotal = Math.floor((target.getTime() - Date.now()) / 1000);
    if (!Number.isFinite(secondsTotal) || secondsTotal <= 0) {
      value.textContent = "Jetzt faellig";
      box.classList.add("due");
      return;
    }
    box.classList.remove("due");
    const days = Math.floor(secondsTotal / 86400);
    const hours = Math.floor(secondsTotal % 86400 / 3600);
    const minutes = Math.floor(secondsTotal % 3600 / 60);
    const seconds = secondsTotal % 60;
    value.textContent = `${days} T ${String(hours).padStart(2,"0")} Std ` +
      `${String(minutes).padStart(2,"0")} Min ${String(seconds).padStart(2,"0")} Sek`;
  };
  draw();
  countdownInterval = setInterval(draw, 1000);
}

function loadRebalanceTime() {
  fetch(`dashboard-data.json?t=${Date.now()}`, {cache: "no-store"})
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then(data => startRebalanceCountdown(data.operations?.big4))
    .catch(() => {
      document.getElementById("rebalance-countdown").textContent = "Daten werden geladen …";
    });
}

loadRebalanceTime();
setInterval(loadRebalanceTime, 10000);
