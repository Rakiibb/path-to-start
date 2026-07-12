// Sample data + localStorage helpers
const DEFAULT_DATA = {
  user: { name: "Rahim Khan", role: "student", roll: "05", id: "u1" },
  captains: [
    { id: "c1", name: "Kuddus Ali" },
    { id: "c2", name: "Minto Rahman" },
    { id: "c3", name: "Bolto Ahmed" },
    { id: "c4", name: "Sifat Islam" },
    { id: "c5", name: "Rifat Hasan" },
    { id: "c6", name: "Nayeem Kabir" },
  ],
  feedback: [
    { id: "f1", captainId: "c1", title: "Unfair seat allocation", category: "Leadership", description: "Captain assigned seats without asking anyone, favoring his friends.", status: "Verified", createdAt: "2026-07-10T10:20:00Z" },
    { id: "f2", captainId: "c1", title: "Rude behavior in class", category: "Behavior", description: "Shouted at classmates during group work.", status: "Verified", createdAt: "2026-07-09T12:00:00Z" },
    { id: "f3", captainId: "c1", title: "Missing class fund entries", category: "Fund Issue", description: "500tk unaccounted from last picnic collection.", status: "Verified", createdAt: "2026-07-08T09:00:00Z" },
    { id: "f4", captainId: "c2", title: "Not helping with academics", category: "Academic", description: "Refused to share notes despite requests.", status: "Verified", createdAt: "2026-07-07T14:00:00Z" },
    { id: "f5", captainId: "c2", title: "Ignores complaints", category: "Communication", description: "Doesn't respond to messages about class issues.", status: "Pending", createdAt: "2026-07-11T08:00:00Z" },
    { id: "f6", captainId: "c3", title: "Good leadership overall", category: "Leadership", description: "But sometimes late in decisions.", status: "Pending", createdAt: "2026-07-11T11:00:00Z" },
    { id: "f7", captainId: "c4", title: "Late for duties", category: "Behavior", description: "Frequently late to class supervision.", status: "Rejected", createdAt: "2026-07-06T09:00:00Z" },
    { id: "f8", captainId: "c5", title: "Fund misuse suspicion", category: "Fund Issue", description: "Class fund report is missing details.", status: "Pending", createdAt: "2026-07-11T15:00:00Z" },
  ],
  classFeedback: [
    { id: "cf1", title: "AC not working properly", category: "Other", description: "The AC in room 302 has been leaking for two weeks.", status: "Verified", createdAt: "2026-07-10T09:00:00Z" },
    { id: "cf2", title: "Need more library hours", category: "Academic", description: "Library closes too early during exam week.", status: "Pending", createdAt: "2026-07-11T10:00:00Z" },
  ],
  students: [
    { id: "s1", name: "Rahim Khan", roll: "05", height: 165 },
    { id: "s2", name: "Karim Uddin", roll: "12", height: 172 },
    { id: "s3", name: "Sadia Akter", roll: "08", height: 158 },
    { id: "s4", name: "Nayeem Kabir", roll: "22", height: 168 },
    { id: "s5", name: "Rifat Hasan", roll: "17", height: 175 },
    { id: "s6", name: "Sifat Islam", roll: "30", height: 160 },
  ],
  rules: [
    { id: "r1", title: "No mobile phones in class", body: "Mobile phones must remain switched off during all class hours.", category: "Discipline" },
    { id: "r2", title: "Uniform mandatory", body: "All students must wear the prescribed school uniform on all working days.", category: "Uniform" },
    { id: "r3", title: "Punctuality", body: "Students arriving after 8:15 AM will be marked late.", category: "Attendance" },
    { id: "r4", title: "Homework submission", body: "All homework must be submitted before the start of the next class.", category: "Academic" },
  ],
  notifications: [
    { id: "n1", title: "New Feedback Received", message: "A new feedback about a captain has been submitted.", category: "Feedback", read: false, createdAt: "2026-07-11T12:00:00Z" },
    { id: "n2", title: "SOS Resolved", message: "The last SOS emergency has been resolved.", category: "SOS", read: false, createdAt: "2026-07-10T18:00:00Z" },
    { id: "n3", title: "New Rule Added", message: "A new school rule has been published.", category: "Rules", read: true, createdAt: "2026-07-09T09:00:00Z" },
  ],
  sos: [
    { id: "sos1", message: "Injured student in Room 204, need help immediately.", status: "Resolved", createdAt: "2026-07-10T14:30:00Z" },
  ],
  syllabi: [
    { id: "sy1", subject: "Physics", title: "Chapter 5 — Motion", body: "Kinematics, equations of motion, projectile examples, past-year problem set.", createdAt: "2026-07-08T09:00:00Z" },
  ],
  seatMap: {
    // seatNumber(1-24) -> studentId
    1: "s1", 2: "s2", 3: "s3", 5: "s4", 7: "s5", 12: "s6",
  },
};

const STORE_KEY = "smartclass_static_v1";

function loadData() {
  const raw = localStorage.getItem(STORE_KEY);
  if (!raw) {
    localStorage.setItem(STORE_KEY, JSON.stringify(DEFAULT_DATA));
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
  }
  try { return JSON.parse(raw); }
  catch { return JSON.parse(JSON.stringify(DEFAULT_DATA)); }
}

function saveData(data) {
  localStorage.setItem(STORE_KEY, JSON.stringify(data));
}

function resetData() {
  localStorage.removeItem(STORE_KEY);
  return loadData();
}

const DB = loadData();

function uid(prefix = "id") { return prefix + "_" + Math.random().toString(36).slice(2, 9); }

function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}
function fmtDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return s + "s ago";
  if (s < 3600) return Math.floor(s/60) + "m ago";
  if (s < 86400) return Math.floor(s/3600) + "h ago";
  return Math.floor(s/86400) + "d ago";
}
function initials(name) {
  return name.split(/\s+/).slice(0,2).map(w => w[0]?.toUpperCase() || "").join("");
}
