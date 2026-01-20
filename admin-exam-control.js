/***************************************
 * Admin Exam Control - admin-exam-control.js
 * ✅ วางทับทั้งไฟล์ได้
 * ✅ ปลดล็อกสอบกลางภาค/ปลายภาค รายคน/ทั้งห้อง
 ***************************************/

// ✅ ใส่ URL WebApp ของ Apps Script ของคุณ (ตัวล่าสุด)
const API_URL =
  "https://script.google.com/macros/s/AKfycbxgfWdWaZ-1aE6BYOZ8207eLyUtWga4coQoJOk1wB_DHUL6I-db98k1Yyzqo29uWRT18g/exec";

const levelEl = document.getElementById("level");
const roomEl = document.getElementById("room");
const examEl = document.getElementById("exam");

const btnLoad = document.getElementById("btnLoad");
const btnUnlockRoom = document.getElementById("btnUnlockRoom");

const tbody = document.getElementById("tbody");
const msg = document.getElementById("msg");

let currentStudents = [];

function setMsg(text, type = "") {
  msg.className = "msg " + type;
  msg.textContent = text || "";
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function apiGet(params) {
  const url = new URL(API_URL);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { method: "GET" });
  return await res.json();
}

async function apiPost(action, body) {
  const url = new URL(API_URL);
  url.searchParams.set("action", action);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" }, // Apps Script ชอบแบบนี้
    body: JSON.stringify(body),
  });
  return await res.json();
}

/** -----------------------------
 * โหลดรายชื่อนักเรียนในห้อง
 * ------------------------------ */
async function loadRoom() {
  try {
    setMsg("⏳ กำลังโหลดรายชื่อนักเรียน...", "");
    tbody.innerHTML = `<tr><td colspan="5" class="emptyRow">กำลังโหลด...</td></tr>`;

    const level = String(levelEl.value || "").trim();
    const room = String(roomEl.value || "").trim();

    if (!level || !room) {
      setMsg("❌ กรุณาเลือกระดับชั้นและห้อง", "err");
      return;
    }

    const data = await apiGet({
      action: "getRoomStudents",
      level,
      room,
    });

    if (!data.ok) throw new Error(data.error || "Load room failed");

    currentStudents = data.students || [];

    if (!currentStudents.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="emptyRow">ไม่พบรายชื่อนักเรียนในห้องนี้</td></tr>`;
      setMsg("ℹ️ ไม่พบรายชื่อนักเรียน", "");
      return;
    }

    renderTable(currentStudents);

    setMsg(`✅ โหลดรายชื่อสำเร็จ (${currentStudents.length} คน)`, "ok");
  } catch (err) {
    console.error(err);
    setMsg("❌ โหลดรายชื่อไม่สำเร็จ: " + err.message, "err");
    tbody.innerHTML = `<tr><td colspan="5" class="emptyRow">โหลดข้อมูลไม่สำเร็จ</td></tr>`;
  }
}

function renderTable(list) {
  tbody.innerHTML = "";

  list.forEach((st, idx) => {
    const fullName = `${st.prefix || ""}${st.name || ""} ${st.lastname || ""}`.trim();
    const no = st.no ?? idx + 1;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(no)}</td>
      <td>${escapeHtml(fullName || "-")}</td>
      <td>${escapeHtml(st.studentNo || "-")}</td>
      <td class="permCell" id="perm_${idx}">-</td>
      <td>
        <button class="btnSmall" data-i="${idx}">อนุญาตทำใหม่</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // bind click per-row
  tbody.querySelectorAll("button.btnSmall").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const i = Number(btn.dataset.i);
      await unlockStudent(i);
    });
  });

  // โหลดสถานะ ExamAccess ให้แสดง badge
  loadAccessStatus();
}

/** -----------------------------
 * โหลดสถานะสิทธิ์ (ExamAccess)
 * ------------------------------ */
async function loadAccessStatus() {
  try {
    const promises = currentStudents.map((st) =>
      apiGet({
        action: "getExamAccess",
        citizenId: st.citizenId || "",
        studentNo: st.studentNo || "",
      })
    );

    const results = await Promise.all(promises);

    results.forEach((r, i) => {
      const cell = document.getElementById(`perm_${i}`);
      if (!cell) return;

      const access = (r && r.ok && r.access) ? r.access : null;
      if (!access) {
        cell.innerHTML = `<span class="badge gray">ยังไม่กำหนด</span>`;
        return;
      }

      const midUnlocked = String(access.midtermUnlocked || "").toUpperCase() === "TRUE";
      const finalUnlocked = String(access.finalUnlocked || "").toUpperCase() === "TRUE";
      const midAttempted = String(access.midtermAttempted || "").toUpperCase() === "TRUE";
      const finalAttempted = String(access.finalAttempted || "").toUpperCase() === "TRUE";

      const midBadge = midUnlocked
        ? `<span class="badge ok">MID ✅</span>`
        : `<span class="badge bad">MID ⛔</span>`;

      const finalBadge = finalUnlocked
        ? `<span class="badge ok">FINAL ✅</span>`
        : `<span class="badge bad">FINAL ⛔</span>`;

      const att = [];
      if (midAttempted) att.push("MID ทำแล้ว");
      if (finalAttempted) att.push("FINAL ทำแล้ว");

      cell.innerHTML = `
        <div class="permWrap">
          ${midBadge} ${finalBadge}
          ${att.length ? `<div class="attemptTxt">(${att.join(", ")})</div>` : ""}
        </div>
      `;
    });
  } catch (err) {
    console.warn("loadAccessStatus error:", err);
  }
}

/** -----------------------------
 * ปลดล็อกรายคน
 * ------------------------------ */
async function unlockStudent(index) {
  try {
    const st = currentStudents[index];
    if (!st) return;

    const mode = String(examEl.value || "MIDTERM").toUpperCase(); // MIDTERM/FINAL/BOTH

    setMsg("⏳ กำลังปลดล็อก...", "");

    if (mode === "BOTH") {
      // unlock MIDTERM
      let r1 = await apiPost("unlockExam", {
        citizenId: st.citizenId || "",
        studentNo: st.studentNo || "",
        type: "MIDTERM",
      });
      if (!r1.ok) throw new Error(r1.error || "unlock MIDTERM failed");

      // unlock FINAL
      let r2 = await apiPost("unlockExam", {
        citizenId: st.citizenId || "",
        studentNo: st.studentNo || "",
        type: "FINAL",
      });
      if (!r2.ok) throw new Error(r2.error || "unlock FINAL failed");
    } else {
      let r = await apiPost("unlockExam", {
        citizenId: st.citizenId || "",
        studentNo: st.studentNo || "",
        type: mode,
      });
      if (!r.ok) throw new Error(r.error || "unlock failed");
    }

    setMsg("✅ ปลดล็อกสำเร็จ", "ok");
    await loadAccessStatus();
  } catch (err) {
    console.error(err);
    setMsg("❌ ปลดล็อกไม่สำเร็จ: " + err.message, "err");
  }
}

/** -----------------------------
 * ปลดล็อกทั้งห้อง
 * ------------------------------ */
async function unlockRoom() {
  try {
    if (!currentStudents.length) {
      setMsg("❌ กรุณาโหลดรายชื่อห้องก่อน", "err");
      return;
    }

    const mode = String(examEl.value || "MIDTERM").toUpperCase();
    const confirmText =
      mode === "BOTH"
        ? "ยืนยันปลดล็อกทั้งห้อง (กลางภาค + ปลายภาค) ?"
        : `ยืนยันปลดล็อกทั้งห้อง (${mode}) ?`;

    if (!confirm(confirmText)) return;

    setMsg("⏳ กำลังปลดล็อกทั้งห้อง...", "");

    let affected = 0;

    for (const st of currentStudents) {
      if (mode === "BOTH") {
        const r1 = await apiPost("unlockExam", {
          citizenId: st.citizenId || "",
          studentNo: st.studentNo || "",
          type: "MIDTERM",
        });
        const r2 = await apiPost("unlockExam", {
          citizenId: st.citizenId || "",
          studentNo: st.studentNo || "",
          type: "FINAL",
        });
        if (r1.ok) affected++;
        if (r2.ok) affected++;
      } else {
        const r = await apiPost("unlockExam", {
          citizenId: st.citizenId || "",
          studentNo: st.studentNo || "",
          type: mode,
        });
        if (r.ok) affected++;
      }
    }

    setMsg(`✅ ปลดล็อกทั้งห้องสำเร็จ (ส่งคำสั่ง ${affected} ครั้ง)`, "ok");
    await loadAccessStatus();
  } catch (err) {
    console.error(err);
    setMsg("❌ ปลดล็อกทั้งห้องไม่สำเร็จ: " + err.message, "err");
  }
}

/** -----------------------------
 * init
 * ------------------------------ */
btnLoad?.addEventListener("click", loadRoom);
btnUnlockRoom?.addEventListener("click", unlockRoom);

// init placeholder
tbody.innerHTML = `<tr><td colspan="5" class="emptyRow">กรุณากด “โหลดรายชื่อห้องนี้”</td></tr>`;
setMsg("", "");
