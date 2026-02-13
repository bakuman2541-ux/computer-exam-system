/***************************************
 * Admin - บันทึกคะแนนเก็บ (admin-score.js)
 * ✅ UI สวยเหมือนหน้าอื่น
 * ✅ แก้ปุ่มกดไม่ได้ / modal กดไม่ได้
 * ✅ แก้รายการงานขึ้นซ้ำ
 * ✅ ไม่กระทบคะแนนเดิมใน Scores
 ***************************************/

// ✅ ใส่ URL WebApp ของ Apps Script ของคุณ
const API_URL = "https://script.google.com/macros/s/AKfycby_Rd8q2Xdj1kSJOVvgho1Fcqa9OtAYMhQzcU8IHww1puOc0KZ_CMSas_-swjLZsDK20Q/exec";

const levelEl = document.getElementById("level");
const roomEl  = document.getElementById("room");
const termEl  = document.getElementById("term");

const assignmentSelect = document.getElementById("assignmentSelect");

const btnManageAssignments = document.getElementById("btnManageAssignments");
const btnLoad = document.getElementById("btnLoad");
const btnSave = document.getElementById("btnSave");
const msg     = document.getElementById("msg");
const tbody   = document.getElementById("tbody");

const metaTotal = document.getElementById("metaTotal");
const metaDone  = document.getElementById("metaDone");

// modal
const modalBackdrop = document.getElementById("modalBackdrop");
const btnCloseModal = document.getElementById("btnCloseModal");
const btnAddRow = document.getElementById("btnAddRow");
const btnSaveAssignments = document.getElementById("btnSaveAssignments");
const assGrid = document.getElementById("assGrid");

// search
const searchEl = document.getElementById("search");

const LEVELS = ["P2","P3","P4","P5","P6","M1","M2","M3"];

let currentStudents = [];
let assignments = [];
let selectedAssignment = null;

function setMsg(text, ok=true){
  msg.textContent = text || "";
  msg.style.color = ok ? "#16a34a" : "#dc2626";
}

// ======================= API =======================
async function apiGet(params){
  try{
    const url = API_URL + "?" + new URLSearchParams(params).toString();
    const r = await fetch(url);
    return await r.json();
  }catch(err){
    return { ok:false, error:"Failed to fetch (GET) - " + err.message };
  }
}

// ✅ Apps Script ไม่รองรับ OPTIONS (preflight) => ใช้ text/plain
async function apiPost(action, body){
  try{
    const url = API_URL + "?action=" + encodeURIComponent(action);
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body)
    });
    return await r.json();
  }catch(err){
    return { ok:false, error:"Failed to fetch (POST) - " + err.message };
  }
}

// ======================= INIT =======================
function initLevels(){
  levelEl.innerHTML = LEVELS.map(l => `<option value="${l}">${l}</option>`).join("");
  fillRooms();
}
function fillRooms(){
  const rooms = [];
  for(let i=1;i<=20;i++) rooms.push(String(i));
  roomEl.innerHTML = rooms.map(r => `<option value="${r}">ห้อง ${r}</option>`).join("");
}

async function loadAssignments(){
  assignmentSelect.innerHTML = `<option value="">(กำลังโหลดรายการงาน...)</option>`;
  const level = levelEl.value;
  const room  = roomEl.value;
  const term  = termEl.value;

  const res = await apiGet({ action:"getAssignments", level, room, term });
  if(!res.ok){
    assignmentSelect.innerHTML = `<option value="">(ยังไม่มีงานที่เปิดใช้)</option>`;
    assignments = [];
    selectedAssignment = null;
    metaTotal.textContent = "คะแนนเต็ม: -";
    return;
  }

  assignments = res.assignments || [];

  const active = assignments.filter(a => String(a.active||"TRUE").toUpperCase() === "TRUE");
  if(active.length === 0){
    assignmentSelect.innerHTML = `<option value="">(ยังไม่มีงานที่เปิดใช้)</option>`;
    selectedAssignment = null;
    metaTotal.textContent = "คะแนนเต็ม: -";
    return;
  }

  assignmentSelect.innerHTML = active.map(a =>
    `<option value="${a.code}">${a.name} (เต็ม ${a.total})</option>`
  ).join("");

  assignmentSelect.value = active[0].code;
  selectedAssignment = active[0];
  metaTotal.textContent = "คะแนนเต็ม: " + (selectedAssignment?.total || "-");
}

// ======================= TABLE =======================
function maskCitizen(id){
  const s = String(id||"");
  if(s.length < 13) return s;
  return s.slice(0,3) + "********" + s.slice(-2);
}

function renderStudents(list){
  tbody.innerHTML = "";
  if(!Array.isArray(list) || list.length === 0){
    return;
  }

  list.forEach((st, idx) => {
    const tr = document.createElement("tr");

    const no = st.no ?? (idx + 1);
    const name = st.name ?? st.fullname ?? "-";
    const studentNo = st.studentNo ?? "-";
    const citizenId = st.citizenId ?? "-";

    tr.innerHTML = `
      <td>${no}</td>
      <td>${name}</td>
      <td>${studentNo}</td>
      <td>${maskCitizen(citizenId)}</td>
      <td style="text-align:right;">
        <input
          class="scoreInput"
          type="number"
          min="0"
          step="1"
          style="width:110px;text-align:right;"
          data-citizen="${citizenId}"
          data-studentno="${studentNo}"
          placeholder="0-${selectedAssignment?.total ?? 0}"
        />
      </td>
    `;
    tbody.appendChild(tr);
  });

  updateMetaDone();
}

function updateMetaDone(){
  const total = document.querySelectorAll(".scoreInput").length;
  let filled = 0;
  document.querySelectorAll(".scoreInput").forEach(inp => {
    if(String(inp.value||"").trim() !== "") filled++;
  });
  metaDone.textContent = `กรอกแล้ว: ${filled} คน`;
}

// ======================= LOAD STUDENTS =======================
btnLoad.addEventListener("click", async () => {
  setMsg("กำลังโหลดรายชื่อนักเรียน...", true);

  const level = levelEl.value;
  const room  = roomEl.value;

  const res = await apiGet({ action:"getRoomStudents", level, room });
  if(!res.ok){
    setMsg("❌ โหลดรายชื่อไม่สำเร็จ: " + (res.error || ""), false);
    return;
  }

  currentStudents = res.students || [];
  renderStudents(currentStudents);

  setMsg(`✅ โหลดรายชื่อสำเร็จ ${currentStudents.length} คน`, true);
});

// ======================= SAVE SCORES =======================
btnSave.addEventListener("click", async () => {
  const level = levelEl.value;
  const room  = roomEl.value;
  const term  = termEl.value;

  if(!selectedAssignment){
    setMsg("❌ กรุณาเลือกงานก่อน", false);
    return;
  }

  const examName = selectedAssignment.name;
  const total = Number(selectedAssignment.total || 0);

  const rows = [];
  document.querySelectorAll(".scoreInput").forEach(inp => {
    const citizenId = String(inp.dataset.citizen || "").trim();
    const studentNo = String(inp.dataset.studentno || "").trim();
    const val = String(inp.value || "").trim();

    if(!citizenId || !studentNo) return;
    if(val === "") return;

    let score = Number(val);
    if(isNaN(score)) score = 0;
    if(score < 0) score = 0;
    if(score > total) score = total;

    rows.push({ citizenId, studentNo, score });
  });

  if(rows.length === 0){
    setMsg("ยังไม่มีคะแนนที่กรอก", false);
    return;
  }

  setMsg("กำลังบันทึกคะแนน...", true);
  btnSave.disabled = true;

  try{
    const payload = {
      level, room, term,
      type: "ASSIGNMENT",
      exam: examName,
      total,
      rows
    };

    const res = await apiPost("saveRoomScores", payload);
    if(!res.ok) throw new Error(res.error || "saveRoomScores failed");

    setMsg(`✅ บันทึกสำเร็จ (${res.saved} รายการ)`, true);
  }catch(err){
    setMsg("❌ บันทึกไม่สำเร็จ: " + err.message, false);
  }finally{
    btnSave.disabled = false;
  }
});

// input listener
document.addEventListener("input", (e) => {
  if(e.target && e.target.classList.contains("scoreInput")){
    updateMetaDone();
  }
});

// search filter
searchEl.addEventListener("input", () => {
  const q = String(searchEl.value || "").trim().toLowerCase();
  if(!q){
    renderStudents(currentStudents);
    return;
  }
  const filtered = (currentStudents || []).filter(st => {
    const name = String(st.name || st.fullname || "").toLowerCase();
    const studentNo = String(st.studentNo || "").toLowerCase();
    const citizenId = String(st.citizenId || "").toLowerCase();
    return name.includes(q) || studentNo.includes(q) || citizenId.includes(q);
  });
  renderStudents(filtered);
});

// ======================= ASSIGNMENT SELECT =======================
assignmentSelect.addEventListener("change", () => {
  const code = assignmentSelect.value;
  selectedAssignment = assignments.find(a => a.code === code) || null;
  metaTotal.textContent = "คะแนนเต็ม: " + (selectedAssignment?.total || "-");

  // refresh placeholder
  document.querySelectorAll(".scoreInput").forEach(inp => {
    inp.placeholder = `0-${selectedAssignment?.total ?? 0}`;
  });
});

// ======================= MODAL =======================
function openModal(){
  modalBackdrop.style.display = "flex";
  document.body.style.overflow = "hidden";
}
function closeModal(){
  modalBackdrop.style.display = "none";
  document.body.style.overflow = "";
}

btnManageAssignments.addEventListener("click", async () => {
  setMsg("", true);
  await refreshAssignmentManager();
  openModal();
});
btnCloseModal.addEventListener("click", closeModal);
modalBackdrop.addEventListener("click", (e) => {
  if(e.target === modalBackdrop) closeModal();
});
window.addEventListener("keydown", (e) => {
  if(e.key === "Escape" && modalBackdrop.style.display === "flex") closeModal();
});

function newCode(){
  const nums = assignments
    .map(a => Number(String(a.code||"").replace(/[^\d]/g,"")))
    .filter(n => !isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return "A" + String(next).padStart(2, "0");
}

function addManagerRow(item){
  const code = item?.code || newCode();
  const name = item?.name || "";
  const total = item?.total || "";
  const active = String(item?.active || "TRUE").toUpperCase() === "TRUE";

  const row = document.createElement("div");
  row.className = "rowitem";
  row.innerHTML = `
    <input class="m_code" value="${code}" disabled>
    <input class="m_name" value="${name}" placeholder="ชื่องาน เช่น ใบงาน 1">
    <input class="m_total" type="number" min="1" value="${total}" placeholder="คะแนนเต็ม">
    <select class="m_active">
      <option value="TRUE" ${active?"selected":""}>TRUE</option>
      <option value="FALSE" ${!active?"selected":""}>FALSE</option>
    </select>
    <button class="quickBtn" type="button" style="background:#fee2e2;border:1px solid #fecaca;">
      <span class="quickIcon">🗑️</span>
      <span class="quickText"><b style="color:#991b1b">ลบ</b><small style="color:#991b1b">ลบรายการนี้</small></span>
    </button>
  `;

  // ✅ ปุ่มลบ
  row.querySelector("button").addEventListener("click", () => row.remove());

  assGrid.appendChild(row);
}

async function refreshAssignmentManager(){
  // ✅ FIX: เคลียร์ทุกแถวเก่า (แก้ปัญหา “ขึ้นซ้ำ”)
  assGrid.innerHTML = "";

  const level = levelEl.value;
  const room  = roomEl.value;
  const term  = termEl.value;

  const res = await apiGet({ action:"getAssignments", level, room, term });
  if(!res.ok){
    assignments = [];
    return; // ยังเปิด modal ได้ ให้เพิ่มเอง
  }

  assignments = res.assignments || [];
  assignments.forEach(a => addManagerRow(a));
}

btnAddRow.addEventListener("click", () => addManagerRow(null));

btnSaveAssignments.addEventListener("click", async () => {
  const level = levelEl.value;
  const room  = roomEl.value;
  const term  = termEl.value;

  const rowEls = Array.from(assGrid.querySelectorAll(".rowitem"));
  const rows = rowEls.map(row => ({
    term,
    level,
    room,
    code: row.querySelector(".m_code").value.trim(),
    name: row.querySelector(".m_name").value.trim(),
    total: Number(row.querySelector(".m_total").value || 0),
    active: row.querySelector(".m_active").value
  })).filter(x => x.code);

  if(rows.length === 0){
    alert("ยังไม่มีรายการงาน");
    return;
  }

  for(const r of rows){
    if(!r.name){ alert("กรุณากรอกชื่องานให้ครบ"); return; }
    if(!r.total || r.total <= 0){ alert("คะแนนเต็มต้องมากกว่า 0"); return; }
  }

  btnSaveAssignments.disabled = true;

  try{
    const res = await apiPost("saveAssignments", { term, level, room, rows });
    if(!res.ok) throw new Error(res.error || "saveAssignments failed");

    alert("✅ บันทึกรายการงานสำเร็จ");
    await loadAssignments(); // refresh dropdown
    await refreshAssignmentManager(); // refresh modal list
  }catch(err){
    alert("❌ บันทึกไม่สำเร็จ: " + err.message);
  }finally{
    btnSaveAssignments.disabled = false;
  }
});

// ======================= BOOT =======================
initLevels();
fillRooms();
loadAssignments();

levelEl.addEventListener("change", async () => { fillRooms(); await loadAssignments(); });
roomEl.addEventListener("change", loadAssignments);
termEl.addEventListener("change", loadAssignments);

