// Shared helpers only — sidebar/navbar are now static HTML in each page.
function toast(msg) {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}
function tierFor(v) { return v >= 3 ? "red" : v === 2 ? "high" : v === 1 ? "warning" : "safe"; }
function tierLabel(t) { return { safe:"Safe", warning:"Warning", high:"High Risk", red:"RED ALERT" }[t]; }
