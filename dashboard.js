// ✅ ใส่ URL WebApp ของ Apps Script ตรงนี้ (ต้องตรงกับ script.js/check.js/admin.js)
const API_URL = "https://script.google.com/macros/s/AKfycbxgfWdWaZ-1aE6BYOZ8207eLyUtWga4coQoJOk1wB_DHUL6I-db98k1Yyzqo29uWRT18g/exec";

const studentInfo = document.getElementById("studentInfo");
const logoutBtn = document.getElementById("logoutBtn");

const p_name = document.getElementById("p_name");
const p_class = document.getElementById("p_class");
const p_studentNo = document.getElementById("p_studentNo");
const p_citizenId = document.getElementById("p_citizenId");

// ✅ ช่องคะแนน (ในหน้า dashboard)
const keepScore = document.getElementById("keepScore");   // คะแนนเก็บ
const midScore  = document.getElementById("midScore");    // กลางภาค
const finalScore = document.getElementById("finalScore"); // ปลายภาค
const totalScore = document.getElementById("totalScore"); // รวมคะแนนสอบ

// ✅ ปุ่มทำข้อสอบ (ใช้ล็อกปุ่ม ถ้าทำข้อสอบแล้ว)
const btnMidExam   = document.getElementById("btnMidExam");
const btnFinalExam = document.getElementById("btnFinalExam");

function lockExamButton(btn, reasonText){
  if (!btn) return;
  btn.dataset.locked = "1";
  btn.setAttribute("aria-disabled", "true");
  btn.style.pointerEvents = "none";
  btn.style.opacity = "0.55";
  btn.style.filter = "grayscale(35%)";
  btn.style.cursor = "not-allowed";

  // ปรับข้อความในปุ่ม
  const small = btn.querySelector(".quickText small");
  if (small) small.textContent = reasonText || "ไม่สามารถทำได้";

  // ทำให้ href ไม่ทำงาน
  btn.dataset.href = btn.getAttribute("href") || "";
  btn.removeAttribute("href");
}

function unlockExamButton(btn){
  if (!btn) return;
  btn.dataset.locked = "0";
  btn.removeAttribute("aria-disabled");
  btn.style.pointerEvents = "";
  btn.style.opacity = "";
  btn.style.filter = "";
  btn.style.cursor = "";

  // คืน href
  if (!btn.getAttribute("href") && btn.dataset.href){
    btn.setAttribute("href", btn.dataset.href);
  }
}

function maskCitizenId(id){
  if (!id) return "-";
  const s = String(id);
  if (s.length < 13) return s;
  return s.substring(0,3) + "********" + s.substring(11);
}

function num(v){
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function showStudent(student){
  const levelText = student.level ? student.level : (student.grade ? `ม.${student.grade}` : "-");
  const roomText = (student.room !== undefined && student.room !== null) ? student.room : "-";
  const noText = (student.no !== undefined && student.no !== null) ? student.no : "-";
  const nameText = student.name || "-";

  studentInfo.textContent = `สวัสดี ${nameText} • ${levelText}/${roomText} • เลขที่ ${noText}`;

  p_name.textContent = nameText;
  p_class.textContent = `ชั้น: ${levelText}/${roomText} • เลขที่: ${noText}`;
  p_studentNo.textContent = student.studentNo || "-";
  p_citizenId.textContent = maskCitizenId(student.citizenId || "-");
}

// ✅ หา record ล่าสุดจาก list
function getLatest(list){
  if (!Array.isArray(list) || list.length === 0) return null;
  return list[list.length - 1];
}

// ✅ รวมคะแนนจากหลายรายการ
function sumScores(list){
  if (!Array.isArray(list) || list.length === 0) return { score: 0, total: 0 };

  // รวมคะแนน และรวม "เต็ม" แบบไม่ซ้ำงาน
  // (กันกรณีมีการบันทึกซ้ำงานเดิมหลายครั้ง ให้ยึดรายการล่าสุดของงานนั้น)
  const latestByExam = {};
  list.forEach(x => {
    const exam = String(x.exam || "").trim();
    if (!exam) return;
    latestByExam[exam] = x; // ทับไปเรื่อยๆ = ล่าสุด
  });

  const exams = Object.values(latestByExam);
  const scoreSum = exams.reduce((s, x) => s + num(x.score), 0);
  const totalSum = exams.reduce((s, x) => s + num(x.total), 0);

  return { score: scoreSum, total: totalSum };
}

// ✅ MAIN LOAD SCORE
async function loadScoreSummary(student){
  // default
  if (keepScore) keepScore.textContent = "กำลังโหลด...";
  midScore.textContent = "กำลังโหลด...";
  finalScore.textContent = "กำลังโหลด...";
  totalScore.textContent = "กำลังโหลด...";

  // default ปุ่ม
  unlockExamButton(btnMidExam);
  unlockExamButton(btnFinalExam);

  try{
    // ✅ เรียกคะแนนด้วยเลขบัตร (หลัก) หากไม่มีใช้ studentNo
    const q = student.citizenId || student.studentNo;
    const url = `${API_URL}?action=check&q=${encodeURIComponent(q)}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.ok){
      if (keepScore) keepScore.textContent = "โหลดไม่สำเร็จ";
      midScore.textContent = "โหลดไม่สำเร็จ";
      finalScore.textContent = "โหลดไม่สำเร็จ";
      totalScore.textContent = "โหลดไม่สำเร็จ";
      return;
    }

    const scores = data.scores || [];

    // ✅ แยกประเภทคะแนนจาก Scores sheet
    const keeps  = scores.filter(x => String(x.type || "").toUpperCase() === "ASSIGNMENT");
    const mids   = scores.filter(x => String(x.type || "").toUpperCase() === "MIDTERM");
    const finals = scores.filter(x => String(x.type || "").toUpperCase() === "FINAL");

    // ✅ คะแนนเก็บ = รวมทุกใบงาน (A01,A02,...)
    const keepSum = sumScores(keeps);

    // ✅ กลางภาค/ปลายภาค = ใช้รายการล่าสุด
    const midLatest = getLatest(mids);
    const finalLatest = getLatest(finals);

    // ✅ แสดงคะแนนเก็บ
    if (keepScore){
      keepScore.textContent = keeps.length
        ? `${keepSum.score} / ${keepSum.total}`
        : "ยังไม่มีคะแนน";
    }

    // ✅ แสดงคะแนนกลางภาค
    midScore.textContent = midLatest
      ? `${midLatest.score} / ${midLatest.total}`
      : "ยังไม่มีคะแนน";

    // ✅ แสดงคะแนนปลายภาค
    finalScore.textContent = finalLatest
      ? `${finalLatest.score} / ${finalLatest.total}`
      : "ยังไม่มีคะแนน";

    const keepVal  = keepSum.score;
    const midVal   = midLatest ? num(midLatest.score) : 0;
    const finalVal = finalLatest ? num(finalLatest.score) : 0;

    // ✅ รวมคะแนน (คะแนนเก็บ + กลางภาค + ปลายภาค)
    totalScore.textContent = `${keepVal + midVal + finalVal} คะแนน`;

    // ✅ ป้องกันการทำข้อสอบซ้ำจากหน้า dashboard
    // ถ้ามีคะแนนล่าสุดแล้ว = ถือว่าเคยทำแล้ว → ปิดปุ่ม
    if (midLatest && num(midLatest.total) > 0) {
      lockExamButton(btnMidExam, "ทำข้อสอบแล้ว");
    } else {
      unlockExamButton(btnMidExam);
    }

    if (finalLatest && num(finalLatest.total) > 0) {
      lockExamButton(btnFinalExam, "ทำข้อสอบแล้ว");
    } else {
      unlockExamButton(btnFinalExam);
    }

  }catch(err){
    console.error(err);
    if (keepScore) keepScore.textContent = "เชื่อมต่อไม่ได้";
    midScore.textContent = "เชื่อมต่อไม่ได้";
    finalScore.textContent = "เชื่อมต่อไม่ได้";
    totalScore.textContent = "เชื่อมต่อไม่ได้";
  }
}

// MAIN
const student = JSON.parse(localStorage.getItem("student") || "null");
if (!student) {
  window.location.href = "index.html";
} else {
  localStorage.setItem("student", JSON.stringify(student));
  showStudent(student);
  loadScoreSummary(student);
}

logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("student");
  window.location.href = "index.html";
});
