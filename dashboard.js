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

// ✅ หา record ล่าสุดจาก list (ยังใช้กับกลางภาค/ปลายภาค)
function getLatest(list){
  if (!Array.isArray(list) || list.length === 0) return null;
  return list[list.length - 1];
}

/**
 * ✅ รวมคะแนนงานทั้งหมด (ASSIGNMENT)
 * - รองรับเพิ่มงานไม่จำกัด
 * - ถ้า "ชื่องาน exam ซ้ำ" => ใช้คะแนนล่าสุดของงานนั้น (กันรวมซ้ำ)
 * คืนค่า: { sumScore, sumTotal, items }
 */
function summarizeAssignments(list){
  if (!Array.isArray(list) || list.length === 0) {
    return { sumScore: 0, sumTotal: 0, items: [] };
  }

  // ใช้ Map เก็บงานล่าสุดตามชื่อ exam
  const map = new Map();

  for (const x of list) {
    const examName = String(x.exam || x.name || "").trim() || "งานที่ไม่ระบุชื่อ";
    map.set(examName, x); // ถ้าซ้ำ จะถูกทับด้วย record ล่าสุด
  }

  const items = [];
  let sumScore = 0;
  let sumTotal = 0;

  for (const [examName, x] of map.entries()) {
    const sc = num(x.score);
    const tt = num(x.total);
    sumScore += sc;
    sumTotal += tt;

    items.push({
      exam: examName,
      score: sc,
      total: tt
    });
  }

  // เรียงชื่อให้ดูเป็นระเบียบ
  items.sort((a,b) => a.exam.localeCompare(b.exam, "th"));

  return { sumScore, sumTotal, items };
}

// ✅ MAIN LOAD SCORE
async function loadScoreSummary(student){
  // default
  if (keepScore) keepScore.textContent = "กำลังโหลด...";
  midScore.textContent = "กำลังโหลด...";
  finalScore.textContent = "กำลังโหลด...";
  totalScore.textContent = "กำลังโหลด...";

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

    // ✅ สรุปคะแนนเก็บทั้งหมด (รวมทุกงาน)
    const keepSum = summarizeAssignments(keeps);

    const midLatest = getLatest(mids);
    const finalLatest = getLatest(finals);

    // ✅ แสดงคะแนนเก็บ (รวม)
    if (keepScore){
      keepScore.textContent = (keepSum.sumTotal > 0)
        ? `${keepSum.sumScore} / ${keepSum.sumTotal}`
        : "ยังไม่มีคะแนน";
    }

    // ✅ แสดงคะแนนกลางภาค (ล่าสุด)
    midScore.textContent = midLatest
      ? `${midLatest.score} / ${midLatest.total}`
      : "ยังไม่มีคะแนน";

    // ✅ แสดงคะแนนปลายภาค (ล่าสุด)
    finalScore.textContent = finalLatest
      ? `${finalLatest.score} / ${finalLatest.total}`
      : "ยังไม่มีคะแนน";

    const keepVal  = keepSum.sumScore;
    const midVal   = midLatest ? num(midLatest.score) : 0;
    const finalVal = finalLatest ? num(finalLatest.score) : 0;

    // ✅ รวมคะแนน (คะแนนเก็บรวม + กลางภาค + ปลายภาค)
    totalScore.textContent = `${keepVal + midVal + finalVal} คะแนน`;

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
