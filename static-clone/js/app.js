// Shared layout: sidebar + navbar renderer
const NAV_ITEMS = [
  { href: "index.html", label: "Dashboard", icon: "📊" },
  { href: "captain-feedback.html", label: "Captain Feedback", icon: "🛡️" },
  { href: "seat-planner.html", label: "Seat Planner", icon: "🪑" },
  { href: "sos.html", label: "SOS", icon: "🚨" },
  { href: "school-rules.html", label: "School Rules", icon: "📖" },
  { href: "notifications.html", label: "Notifications", icon: "🔔" },
  { href: "ai-syllabus.html", label: "AI Syllabus", icon: "✨" },
  { href: "profile.html", label: "Profile", icon: "👤" },
  { href: "student-management.html", label: "Student Management", icon: "👥" },
];

function renderLayout(pageTitle) {
  const path = location.pathname.split("/").pop() || "index.html";

  const sidebar = document.getElementById("sidebar");
  if (sidebar) {
    sidebar.innerHTML = `
      <div class="brand">
        <div class="brand-icon">🎓</div>
        <div class="brand-name">SmartClass</div>
      </div>
      ${NAV_ITEMS.map(n => `
        <a href="${n.href}" class="nav-item ${path === n.href ? "active" : ""}">
          <span class="icon">${n.icon}</span>
          <span>${n.label}</span>
        </a>
      `).join("")}
    `;
  }

  const navbar = document.getElementById("navbar");
  if (navbar) {
    navbar.innerHTML = `
      <div>
        <div class="subtitle">SmartClass</div>
        <div class="title">${pageTitle}</div>
      </div>
      <div class="right">
        <button class="sos-btn" onclick="location.href='sos.html'">
          <span>⚠️</span> SOS
        </button>
        <a href="notifications.html" class="btn outline small" title="Notifications">🔔</a>
        <div class="row" style="border:1px solid var(--border);border-radius:10px;padding:4px 10px 4px 4px;gap:8px;">
          <div class="avatar">${initials(DB.user.name)}</div>
          <div>
            <div style="font-size:13px;font-weight:500;">${DB.user.name}</div>
            <div class="text-xs text-muted" style="text-transform:capitalize;">${DB.user.role}</div>
          </div>
        </div>
      </div>
    `;
  }
}

function toast(msg) {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}

function tierFor(verified) {
  if (verified >= 3) return "red";
  if (verified === 2) return "high";
  if (verified === 1) return "warning";
  return "safe";
}
function tierLabel(t) {
  return { safe: "Safe", warning: "Warning", high: "High Risk", red: "RED ALERT" }[t];
}
