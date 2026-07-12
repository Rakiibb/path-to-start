// Simple fixed-credentials auth for the static clone.
// - Every student gets an AUTO-generated secret code (no manual codes).
// - Nobody sees another user's real name or roll — only the secret code.
// - EXCEPTION: users with role "captain" show their real name + title.

// Deterministic auto-generated code (stable per user, no manual assignment).
function scAutoCode(seed) {
  var s = String(seed), h = 0;
  for (var i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return "STU-" + (Math.abs(h) % 9000 + 1000);
}

var _students = [
  { name: "Ashfaq Rahman",  roll: "21" },
  { name: "Nabila Haque",   roll: "07" },
  { name: "Rafi Chowdhury", roll: "15" },
];

window.SC_ACCOUNTS = {};

// Captain (single fixed account) — real name + title are public.
window.SC_ACCOUNTS["captain01"] = {
  code: "captain01", password: "1234", role: "captain",
  name: "Mr. Karim", roll: "C-01", title: "Class Captain",
};

// Students — auto-generated code becomes their login ID.
_students.forEach(function (s) {
  var code = scAutoCode(s.name + "|" + s.roll);
  window.SC_ACCOUNTS[code.toLowerCase()] = {
    code: code, password: "1234", role: "student",
    name: s.name, roll: s.roll,
  };
});

// Expose generated student codes so the login page can list them.
window.SC_STUDENT_CODES = Object.values(window.SC_ACCOUNTS)
  .filter(function (a) { return a.role === "student"; })
  .map(function (a) { return a.code; });

function scGetUser() {
  try { return JSON.parse(localStorage.getItem("sc_user") || "null"); }
  catch (e) { return null; }
}
function scSetUser(u) { localStorage.setItem("sc_user", JSON.stringify(u)); }
function scLogout() { localStorage.removeItem("sc_user"); location.href = "login.html"; }

// Public identity helper — what OTHER users are allowed to see.
// Teachers can see the real name; everyone else sees only the code.
function scPublicLabel(targetUser) {
  var me = scGetUser();
  // Captains: real name + title are always public.
  if (targetUser.role === "captain") {
    return (targetUser.title || "Captain") + " " + targetUser.name;
  }
  // You always see your own real info.
  if (me && me.code === targetUser.code) {
    return targetUser.name + " (" + targetUser.code + ")";
  }
  // Everyone else: only the secret code, never name or roll.
  return targetUser.code;
}

(function guard() {
  var page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  if (page === "login.html") return;
  if (!scGetUser()) location.replace("login.html");
})();
