const loginForm = document.getElementById("loginForm");
const citizenId = document.getElementById("citizenId");
const studentNo = document.getElementById("studentNo");
const msg = document.getElementById("msg");

// ✅ ใส่ URL WebApp ของ Google Apps Script ตรงนี้
const API_URL = "https://script.google.com/macros/s/AKfycbxpoC26Gm3Ieyokk7gp_ik3NcjIBnh2Sr28UcyVw8z-feIsLHQpbYNCls5MV3vNqlgGbQ/exec";

// บังคับให้พิมพ์ได้เฉพาะตัวเลข
function onlyNumber(el){
  el.addEventListener("input", () => {
    el.value = el.value.replace(/\D/g, "");
  });
}
onlyNumber(citizenId);
onlyNumber(studentNo);

// ตรวจสอบ format
function isCitizenIdValid(id){ return /^\d{13}$/.test(id); }
function isStudentNoValid(no){ return /^\d{4}$/.test(no); }

function setMsg(text, type=""){
  msg.className = "msg " + type;
  msg.textContent = text;
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = citizenId.value.trim();
  const no = studentNo.value.trim();

  if (!isCitizenIdValid(id)) return setMsg("❌ เลขบัตรต้องเป็น 13 หลักเท่านั้น", "err");
  if (!isStudentNoValid(no)) return setMsg("❌ เลขนักเรียนต้องเป็น 4 หลักเท่านั้น", "err");

  setMsg("⏳ กำลังตรวจสอบข้อมูล...", "");

  try {
    // ✅ เรียก API ไปเช็คใน Google Sheet
    const url = `${API_URL}?action=login&citizenId=${encodeURIComponent(id)}&studentNo=${encodeURIComponent(no)}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.ok) {
      setMsg("❌ ไม่พบนักเรียนหรือข้อมูลไม่ถูกต้อง", "err");
      return;
    }

    // ✅ เก็บข้อมูลนักเรียนไว้ใช้ต่อ
    localStorage.setItem("student", JSON.stringify(data.student));
    setMsg("✅ เข้าสู่ระบบสำเร็จ กำลังไปหน้าหลัก...", "ok");

    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 700);

  } catch (err) {
    console.error(err);
    setMsg("❌ เชื่อมต่อระบบไม่ได้ กรุณาลองใหม่", "err");
  }
});
