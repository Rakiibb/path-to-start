// Simple fixed-credentials auth for the static clone.
// Each student has a UNIQUE public CODE. Only that code is shown to others —
// real name / roll are private to the student and the teacher.
window.SC_ACCOUNTS = {
  // Teacher (single fixed account)
  "teacher01": {
    code: "teacher01", password: "1234", role: "teacher",
    name: "Mr. Karim", roll: "T-01",
  },
  // Students — login with their unique code + password
  "falcon42":  { code: "falcon42",  password: "1234", role: "student", name: "Ashfaq Rahman", roll: "21" },
  "tiger07":   { code: "tiger07",   password: "1234", role: "student", name: "Nabila Haque",  roll: "07" },
  "phoenix15": { code: "phoenix15", password: "1234", role: "student", name: "Rafi Chowdhury", roll: "15" },
};

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
  if (me && (me.role === "teacher" || me.code === targetUser.code)) {
    return targetUser.name + " (" + targetUser.code + ")";
  }
  return targetUser.code;
}

(function guard() {
  var page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  if (page === "login.html") return;
  if (!scGetUser()) location.replace("login.html");
})();
