// Simple fixed-credentials auth for the static clone.
window.SC_ACCOUNTS = {
  student: { id: "student", password: "1234", role: "student", name: "Student User" },
  teacher: { id: "teacher", password: "1234", role: "teacher", name: "Teacher User" },
};
function scGetUser() {
  try { return JSON.parse(localStorage.getItem("sc_user") || "null"); }
  catch (e) { return null; }
}
function scSetUser(u) { localStorage.setItem("sc_user", JSON.stringify(u)); }
function scLogout() { localStorage.removeItem("sc_user"); location.href = "login.html"; }
(function guard() {
  var page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  if (page === "login.html") return;
  if (!scGetUser()) location.replace("login.html");
})();
