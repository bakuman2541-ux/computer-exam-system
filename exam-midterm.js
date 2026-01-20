// ❗ ใส่ URL WebApp /exec ของ Apps Script เท่านั้น
const API_URL = "https://script.google.com/macros/s/AKfycbxgfWdWaZ-1aE6BYOZ8207eLyUtWga4coQoJOk1wB_DHUL6I-db98k1Yyzqo29uWRT18g/exec";

const sub = document.getElementById("sub");
const msg = document.getElementById("msg");
const examArea = document.getElementById("examArea");
const btnStart = document.getElementById("btnStart");
const btnSubmit = document.getElementById("btnSubmit");
const studentBox = document.getElementById("studentBox");

let QUESTIONS = [];
let ANSWERS = {};   // qid -> choiceIndex

function setMsg(t, type=""){
  msg.className = "msg " + type;
  msg.textContent = t;
}

function escapeHTML(s){
  return String(s).replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}

function getStudent(){
  try{
    return JSON.parse(localStorage.getItem("student") || "{}");
  }catch(_){
    return {};
  }
}

function assertApiUrl(){
  if(!API_URL || API_URL.includes("drive.google.com")){
    setMsg("❌ API_URL ตั้งค่าผิด! กรุณาใส่ลิงก์ WebApp (/exec) ของ Apps Script", "err");
    btnStart.disabled = true;
    throw new Error("Invalid API_URL");
  }
}

async function apiGet(url){
  const res = await fetch(url);
  return await res.json();
}

async function apiPost(url, payload){
  const res = await fetch(url, {
    method:"POST",
    headers:{ "Content-Type":"text/plain;charset=utf-8" },
    body: JSON.stringify(payload)
  });
  return await res.json();
}

function renderStudent(st){
  if(!st || !st.citizenId){
    studentBox.innerHTML = "❌ ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่";
    return;
  }
  studentBox.innerHTML = `
    <div><b>ชื่อ:</b> ${escapeHTML(st.name || "-")}</div>
    <div><b>ระดับ:</b> ${escapeHTML(st.level || "-")} / <b>ห้อง:</b> ${escapeHTML(st.room || "-")}</div>
    <div><b>เลขนักเรียน:</b> ${escapeHTML(st.studentNo || "-")}</div>
  `;
}

function renderQuestions(){
  const letters = ["ก","ข","ค","ง"];
  examArea.innerHTML = QUESTIONS.map((q, qi) => {
    const choicesHtml = q.choices.map((c, ci) => `
      <label style="
        display:flex;align-items:flex-start;gap:10px;
        padding:10px 12px;border-radius:14px;
        border:1px solid rgba(226,232,240,1);
        background:rgba(255,255,255,.88);
        cursor:pointer;
      ">
        <input type="radio" name="q_${escapeHTML(q.qid)}" value="${ci}" style="margin-top:4px;" />
        <div style="font-weight:1000;">
          <span style="
            display:inline-flex;align-items:center;justify-content:center;
            width:26px;height:26px;border-radius:9px;
            background:rgba(37,99,235,.12);
            border:1px solid rgba(191,219,254,1);
            margin-right:8px;
          ">${letters[ci]}</span>
          ${escapeHTML(c)}
        </div>
      </label>
    `).join("");

    return `
      <div style="
        border-radius:18px;
        border:1px solid rgba(226,232,240,1);
        background:rgba(255,255,255,.85);
        box-shadow:0 10px 20px rgba(2,6,23,.06);
        padding:14px;
      ">
        <div style="font-weight:1000;margin-bottom:10px;">
          ข้อ ${qi+1}. ${escapeHTML(q.question)}
        </div>
        <div style="display:grid;gap:10px;">
          ${choicesHtml}
        </div>
      </div>
    `;
  }).join("");

  QUESTIONS.forEach(q=>{
    const name = `q_${q.qid}`;
    document.querySelectorAll(`input[name="${name}"]`).forEach(r=>{
      r.addEventListener("change", ()=>{
        ANSWERS[q.qid] = Number(r.value);
      });
    });
  });
}

async function loadExam(){
  assertApiUrl();

  sub.textContent = "กำลังตรวจสอบสิทธิ์และโหลดข้อสอบ...";
  const st = getStudent();
  renderStudent(st);

  if(!st || !st.citizenId || !st.studentNo){
    sub.textContent = "โหลดข้อสอบไม่สำเร็จ";
    setMsg("❌ ไม่พบ citizenId/studentNo กรุณาเข้าสู่ระบบใหม่", "err");
    btnStart.disabled = true;
    return;
  }

  const level = String(st.level || "").trim().toUpperCase();
  if(!level){
    sub.textContent = "โหลดข้อสอบไม่สำเร็จ";
    setMsg("❌ ไม่พบ level ของนักเรียน (เช่น M1/P3) กรุณาเข้าสู่ระบบใหม่", "err");
    btnStart.disabled = true;
    return;
  }

  // ✅ โหลดข้อสอบจาก Drive ผ่าน Apps Script (ส่ง citizenId/studentNo ไปด้วย)
  const url =
    `${API_URL}?action=getExamQuestions` +
    `&level=${encodeURIComponent(level)}` +
    `&exam=MIDTERM&shuffle=1` +
    `&citizenId=${encodeURIComponent(st.citizenId)}` +
    `&studentNo=${encodeURIComponent(st.studentNo)}`;

  const data = await apiGet(url);

  if(!data.ok){
    sub.textContent = "โหลดข้อสอบไม่สำเร็จ";
    setMsg("❌ " + (data.error || "โหลดข้อสอบไม่สำเร็จ"), "err");
    btnStart.disabled = true;
    return;
  }

  QUESTIONS = data.questions || [];
  sub.textContent = `โหลดข้อสอบแล้ว ${QUESTIONS.length} ข้อ`;
  setMsg("✅ พร้อมเริ่มทำข้อสอบ", "ok");
}

btnStart.addEventListener("click", ()=>{
  if(QUESTIONS.length === 0){
    setMsg("❌ ไม่มีข้อสอบ", "err");
    return;
  }
  renderQuestions();
  btnStart.style.display = "none";
  btnSubmit.style.display = "inline-block";
  setMsg("✅ เริ่มทำข้อสอบได้เลย", "ok");
});

btnSubmit.addEventListener("click", async ()=>{
  assertApiUrl();

  const missing = QUESTIONS.filter(q => !(q.qid in ANSWERS));
  if(missing.length > 0){
    setMsg(`❌ กรุณาทำให้ครบทุกข้อ (ยังไม่ตอบ ${missing.length} ข้อ)`, "err");
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  const st = getStudent();
  const payload = {
    exam: "MIDTERM",
    term: "2",
    student: st,
    answers: QUESTIONS.map(q => ({
      qid: q.qid,
      choiceIndex: ANSWERS[q.qid]
    }))
  };

  setMsg("⏳ กำลังส่งคำตอบ...", "");
  btnSubmit.disabled = true;

  try{
    const data = await apiPost(`${API_URL}?action=submitExam`, payload);
    if(!data.ok){
      setMsg("❌ ส่งคำตอบไม่สำเร็จ: " + (data.error || ""), "err");
      btnSubmit.disabled = false;
      return;
    }

    setMsg(`✅ ส่งคำตอบสำเร็จ คะแนนที่ได้: ${data.score}/${data.total}`, "ok");
    setTimeout(()=> window.location.href = "dashboard.html", 2000);

  }catch(err){
    console.error(err);
    setMsg("❌ เชื่อมต่อระบบไม่ได้", "err");
    btnSubmit.disabled = false;
  }
});

// init
loadExam();
