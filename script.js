/* =====================================================
   STUDENT LOGIN
   FULL OVERWRITE VERSION
===================================================== */

const API_URL =
  "https://script.google.com/macros/s/AKfycbw7fx6dBKoc9d87XNqOCb4R1HRKgfY79dzVvUAnWfs46noLnyeGBxMvJRTO3Qr23kMFQA/exec";

/* =====================================================
   ELEMENTS
===================================================== */

const loginForm =
  document.getElementById("loginForm");

const citizenId =
  document.getElementById("citizenId");

const studentNo =
  document.getElementById("studentNo");

const msg =
  document.getElementById("msg");

const loginButton =
  loginForm.querySelector('button[type="submit"]');

const loginButtonText =
  loginButton.querySelector("span");


/* =====================================================
   NUMBER ONLY
===================================================== */

function numberOnly(el) {

  el.addEventListener("input", () => {

    el.value =
      el.value.replace(/\D/g, "");

  });

}

numberOnly(citizenId);
numberOnly(studentNo);


/* =====================================================
   MESSAGE
===================================================== */

function setMsg(text, type = "") {

  msg.className =
    "msg " + type;

  msg.textContent =
    text;

}


/* =====================================================
   LOADING
===================================================== */

function setLoading(status) {

  loginButton.disabled =
    status;

  loginButtonText.textContent =
    status
      ? "กำลังตรวจสอบ..."
      : "เข้าสู่ระบบ";

}


/* =====================================================
   FETCH API
===================================================== */

async function fetchAPI(url) {

  const controller =
    new AbortController();

  const timeout =
    setTimeout(() => {

      controller.abort();

    }, 20000);


  try {

    const response =
      await fetch(
        url,
        {
          method: "GET",
          cache: "no-store",
          redirect: "follow",
          credentials: "omit",
          signal: controller.signal
        }
      );


    const text =
      await response.text();


    if (!response.ok) {

      throw new Error(
        "HTTP_" + response.status
      );

    }


    /*
      ป้องกันกรณี Apps Script
      ส่งหน้า Login Google / HTML กลับมา
    */

    if (
      text.trim().startsWith("<!DOCTYPE") ||
      text.trim().startsWith("<html") ||
      text.includes("<title>Sign in")
    ) {

      throw new Error(
        "APPS_SCRIPT_PERMISSION"
      );

    }


    try {

      return JSON.parse(text);

    }
    catch (error) {

      console.error(
        "API RESPONSE:",
        text
      );

      throw new Error(
        "INVALID_JSON"
      );

    }

  }
  finally {

    clearTimeout(timeout);

  }

}


/* =====================================================
   LOGIN
===================================================== */

loginForm.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();


    const id =
      citizenId.value.trim();

    const no =
      studentNo.value.trim();


    /* -------------------------------------
       VALIDATE CITIZEN ID
    ------------------------------------- */

    if (!/^\d{13}$/.test(id)) {

      setMsg(
        "❌ กรุณากรอกเลขบัตรประชาชนให้ครบ 13 หลัก",
        "err"
      );

      citizenId.focus();

      return;

    }


    /* -------------------------------------
       VALIDATE STUDENT NUMBER
    ------------------------------------- */

    if (!/^\d{4}$/.test(no)) {

      setMsg(
        "❌ กรุณากรอกเลขนักเรียนให้ครบ 4 หลัก",
        "err"
      );

      studentNo.focus();

      return;

    }


    setLoading(true);

    setMsg(
      "⏳ กำลังตรวจสอบข้อมูล..."
    );


    try {

      const url =
        API_URL
        +
        "?action=login"
        +
        "&citizenId="
        +
        encodeURIComponent(id)
        +
        "&studentNo="
        +
        encodeURIComponent(no)
        +
        "&_="
        +
        Date.now();


      console.log(
        "LOGIN API:",
        url
      );


      const data =
        await fetchAPI(url);


      console.log(
        "LOGIN RESPONSE:",
        data
      );


      /* -------------------------------------
         LOGIN FAILED
      ------------------------------------- */

      if (!data || data.ok !== true) {

        if (
          data &&
          data.error === "INACTIVE"
        ) {

          setMsg(
            "❌ บัญชีนักเรียนถูกปิดใช้งาน กรุณาติดต่อครูผู้สอน",
            "err"
          );

        }

        else {

          setMsg(
            "❌ ไม่พบนักเรียน หรือเลขบัตรประชาชน/เลขนักเรียนไม่ถูกต้อง",
            "err"
          );

        }


        setLoading(false);

        return;

      }


      /* -------------------------------------
         CHECK STUDENT DATA
      ------------------------------------- */

      if (!data.student) {

        throw new Error(
          "NO_STUDENT_DATA"
        );

      }


      /* -------------------------------------
         LOGIN SUCCESS
      ------------------------------------- */

      localStorage.removeItem(
        "student"
      );


      localStorage.setItem(
        "student",
        JSON.stringify(
          data.student
        )
      );


      sessionStorage.setItem(
        "STUDENT_LOGGED_IN",
        "1"
      );


      setMsg(
        "✅ เข้าสู่ระบบสำเร็จ กำลังไปหน้าหลัก...",
        "ok"
      );


      setTimeout(
        () => {

          window.location.href =
            "dashboard.html";

        },
        350
      );

    }

    catch (error) {

      console.error(
        "LOGIN ERROR:",
        error
      );


      if (
        error.name === "AbortError"
      ) {

        setMsg(
          "❌ ระบบตอบสนองช้าเกินไป กรุณาลองใหม่อีกครั้ง",
          "err"
        );

      }

      else if (
        error.message ===
        "APPS_SCRIPT_PERMISSION"
      ) {

        setMsg(
          "❌ Apps Script ยังไม่ได้เปิดสิทธิ์ใช้งานสาธารณะ",
          "err"
        );

      }

      else if (
        error.message ===
        "INVALID_JSON"
      ) {

        setMsg(
          "❌ Apps Script ส่งข้อมูลกลับมาไม่ถูกต้อง กรุณาตรวจสอบ Deployment",
          "err"
        );

      }

      else {

        setMsg(
          "❌ เชื่อมต่อระบบไม่ได้ กรุณาตรวจสอบ Apps Script แล้วลองใหม่",
          "err"
        );

      }


      setLoading(false);

    }

  }
);


/* =====================================================
   ENTER
===================================================== */

studentNo.addEventListener(
  "keydown",
  event => {

    if (
      event.key === "Enter"
    ) {

      event.preventDefault();

      loginForm.requestSubmit();

    }

  }
);