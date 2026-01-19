// ✅ ใส่ URL WebApp ของ Apps Script ของคุณ
const API_URL = "https://script.google.com/macros/s/AKfycby_Rd8q2Xdj1kSJOVvgho1Fcqa9OtAYMhQzcU8IHww1puOc0KZ_CMSas_-swjLZsDK20Q/exec";

const levelEl = document.getElementById("level");
const roomEl  = document.getElementById("room");
const examEl  = document.getElementById("exam");
const totalEl = document.getElementById("total");

const btnLoad = document.getElementById("btnLoad");
const btnSave = document.getElementById("btnSave");
const msg     = document.getElementById("msg");
const tbody   = document.getElementById("tbody");

let currentStudents = [];

function setMsg(text, type = "") {
  msg.className = "msg " + type;
  msg.textContent = text;
}

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}

function maskCitizenId(id) {
  if (!id) return "-";
  const s = String(id);
  if (s.length < 13) return s;
  return s.substring(0, 3) + "********" + s.substring(11);
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function renderTable(students) {
  if (!students || students.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="padding:14px;color:#64748b;font-weight:1000;">
          ไม่พบรายชื่อในห้องนี้
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = students.map((s, idx) => {
    const no = s.no ?? "";
    const name = s.name ?? "";
    const studentNo = s.studentNo ?? "";
    const citizenId = s.citizenId ?? "";

    return `
      <tr style="
        background:rgba(255,255,255,.88);
        box-shadow:0 10px 20px rgba(2,6,23,.06);
        border:1px solid rgba(226,232,240,1);
      ">
        <td style="padding:12px 10px;border-radius:16px 0 0 16px;font-weight:1000;">${escapeHTML(no)}</td>
        <td style="padding:12px 10px;font-weight:1000;">${escapeHTML(name)}</td>
        <td style="padding:12px 10px;font-weight:1000;">${escapeHTML(studentNo)}</td>
        <td style="padding:12px 10px;color:#64748b;font-weight:1000;">${escapeHTML(maskCitizenId(citizenId))}</td>
        <td style="padding:10px;border-radius:0 16px 16px 0;">
          <input
            class="scoreInput"
            data-idx="${idx}"
            type="number"
            min="0"
            style="
              width:100%;
              padding:10px 12px;
              border-radius:14px;
              border:1px solid rgba(226,232,240,1);
              outline:none;
              font-weight:1000;
            "
            placeholder="คะแนน"
            value=""
          />
        </td>
      </tr>
    `;
  }).join("");
}

async function loadRoomStudents() {
  const level = levelEl.value;
  const room = roomEl.value;

  setMsg("⏳ กำลังโหลดรายชื่อ...", "");

  try {
    const url = `${API_URL}?action=getRoomStudents&level=${encodeURIComponent(level)}&room=${encodeURIComponent(room)}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.ok) {
      setMsg("❌ โหลดรายชื่อไม่สำเร็จ: " + (data.error || ""), "err");
      return;
    }

    currentStudents = data.students || [];
    renderTable(currentStudents);
    setMsg(`✅ โหลดรายชื่อสำเร็จ ${currentStudents.length} คน`, "ok");
  } catch (err) {
    console.error(err);
    setMsg("❌ เชื่อมต่อระบบไม่ได้ (เช็ค API_URL / Deploy WebApp)", "err");
  }
}

function buildPayloadForSave() {
  const level = levelEl.value;
  const room = roomEl.value;

  // ✅ ไม่ต้องตั้งกลางภาค/ปลายภาค/เทอมแล้ว
  const term = "1";               // fix ไว้กันระบบเก่า (ไม่กระทบ)
  const type = "ASSIGNMENT";      // ✅ คะแนนเก็บ
  const exam = (examEl.value || "").trim();
  const total = num(totalEl.value);

  const inputs = Array.from(document.querySelectorAll(".scoreInput"));

  const rows = inputs.map(inp => {
    const idx = Number(inp.dataset.idx);
    const st = currentStudents[idx] || {};
    const score = num(inp.value);

    return {
      citizenId: String(st.citizenId || "").trim(),
      studentNo: String(st.studentNo || "").trim(),
      score
    };
  });

  return { level, room, term, type, exam, total, rows };
}

async function saveRoomScores() {
  if (!currentStudents || currentStudents.length === 0) {
    setMsg("❌ ยังไม่มีรายชื่อ กรุณากดโหลดรายชื่อก่อน", "err");
    return;
  }

  const payload = buildPayloadForSave();

  if (!payload.exam) {
    setMsg("❌ กรุณาใส่ชื่อคะแนนเก็บ", "err");
    return;
  }
  if (!payload.total || payload.total <= 0) {
    setMsg("❌ คะแนนเต็มไม่ถูกต้อง", "err");
    return;
  }

  setMsg("⏳ กำลังบันทึกคะแนนเก็บ...", "");

  try {
    const url = `${API_URL}?action=saveRoomScores`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!data.ok) {
      setMsg("❌ บันทึกไม่สำเร็จ: " + (data.error || ""), "err");
      return;
    }

    setMsg(`✅ บันทึกคะแนนเก็บสำเร็จ (${data.saved} รายการ)`, "ok");
  } catch (err) {
    console.error(err);
    setMsg("❌ เชื่อมต่อระบบไม่ได้ (เช็ค API_URL / Deploy WebApp)", "err");
  }
}

btnLoad.addEventListener("click", loadRoomStudents);
btnSave.addEventListener("click", saveRoomScores);

// init
renderTable([]);

