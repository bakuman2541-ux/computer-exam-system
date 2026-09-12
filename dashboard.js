/* =========================================
   STUDENT DASHBOARD
   FULL OVERWRITE
========================================= */

const API_URL =
  "https://script.google.com/macros/s/AKfycbw7fx6dBKoc9d87XNqOCb4R1HRKgfY79dzVvUAnWfs46noLnyeGBxMvJRTO3Qr23kMFQA/exec";

/* =========================================
   ELEMENTS
========================================= */

const studentInfo =
  document.getElementById(
    "studentInfo"
  );

const logoutBtn =
  document.getElementById(
    "logoutBtn"
  );

const p_name =
  document.getElementById(
    "p_name"
  );

const p_class =
  document.getElementById(
    "p_class"
  );

const p_studentNo =
  document.getElementById(
    "p_studentNo"
  );

const p_citizenId =
  document.getElementById(
    "p_citizenId"
  );

const keepScore =
  document.getElementById(
    "keepScore"
  );

const midScore =
  document.getElementById(
    "midScore"
  );

const finalScore =
  document.getElementById(
    "finalScore"
  );

const totalScore =
  document.getElementById(
    "totalScore"
  );

const scoreUpdated =
  document.getElementById(
    "scoreUpdated"
  );

const btnMidExam =
  document.getElementById(
    "btnMidExam"
  );

const btnFinalExam =
  document.getElementById(
    "btnFinalExam"
  );


/* =========================================
   HELPERS
========================================= */

function num(value){

  const n =
    Number(value);

  return Number.isFinite(n)
    ? n
    : 0;

}


function boolValue(value){

  return (

    value === true

    ||

    String(value)
      .trim()
      .toUpperCase()
      ===
      "TRUE"

  );

}


function maskCitizenId(id){

  if(!id){
    return "-";
  }

  const text =
    String(id);

  if(
    text.length < 13
  ){
    return text;
  }

  return (
    text.substring(0,3)
    +
    "********"
    +
    text.substring(11)
  );

}


function formatTime(){

  try{

    return new Date()
      .toLocaleTimeString(
        "th-TH",
        {
          hour:"2-digit",
          minute:"2-digit"
        }
      );

  }
  catch(_){

    return "-";

  }

}


/* =========================================
   FETCH WITH TIMEOUT
========================================= */

async function fetchJSON(
  url,
  timeout = 20000
){

  const controller =
    new AbortController();


  const timer =
    setTimeout(
      () => {

        controller.abort();

      },
      timeout
    );


  try{

    const response =
      await fetch(
        url,
        {

          method:"GET",

          cache:"no-store",

          signal:
            controller.signal

        }
      );


    if(
      !response.ok
    ){

      throw new Error(
        "HTTP " +
        response.status
      );

    }


    return await response.json();

  }

  finally{

    clearTimeout(
      timer
    );

  }

}


/* =========================================
   STUDENT
========================================= */

function showStudent(student){

  const levelText =
    student.level
      ?
      student.level
      :
      "-";


  const roomText =
    student.room !== undefined
    &&
    student.room !== null
      ?
      student.room
      :
      "-";


  const noText =
    student.no !== undefined
    &&
    student.no !== null
      ?
      student.no
      :
      "-";


  const nameText =
    student.name
    ||
    "-";


  studentInfo.textContent =
    `สวัสดี ${nameText} • ${levelText}/${roomText} • เลขที่ ${noText}`;


  p_name.textContent =
    nameText;


  p_class.textContent =
    `ระดับ: ${levelText} • ห้อง ${roomText} • เลขที่ ${noText}`;


  p_studentNo.textContent =
    student.studentNo
    ||
    "-";


  p_citizenId.textContent =
    maskCitizenId(
      student.citizenId
    );

}


/* =========================================
   EXAM BUTTON
========================================= */

function lockExamButton(
  button,
  text
){

  if(!button){
    return;
  }


  button.dataset.locked =
    "1";


  button.setAttribute(
    "aria-disabled",
    "true"
  );


  if(
    button.getAttribute(
      "href"
    )
  ){

    button.dataset.href =
      button.getAttribute(
        "href"
      );

  }


  button.removeAttribute(
    "href"
  );


  button.style.pointerEvents =
    "none";


  button.style.opacity =
    ".48";


  button.style.filter =
    "grayscale(45%)";


  button.style.cursor =
    "not-allowed";


  const small =
    button.querySelector(
      ".examBtnText small"
    );


  if(small){

    small.textContent =
      text
      ||
      "ยังไม่สามารถเข้าสอบได้";

  }

}


function unlockExamButton(
  button
){

  if(!button){
    return;
  }


  button.dataset.locked =
    "0";


  button.removeAttribute(
    "aria-disabled"
  );


  button.style.pointerEvents =
    "";


  button.style.opacity =
    "";


  button.style.filter =
    "";


  button.style.cursor =
    "";


  if(
    !button.getAttribute(
      "href"
    )
    &&
    button.dataset.href
  ){

    button.setAttribute(
      "href",
      button.dataset.href
    );

  }


  const small =
    button.querySelector(
      ".examBtnText small"
    );


  if(small){

    small.textContent =
      "พร้อมเข้าสอบ";

  }

}


/* =========================================
   LATEST SCORE
========================================= */

function getLatestScore(
  list,
  type
){

  const filtered =
    list
      .filter(
        item =>
          String(
            item.type ||
            ""
          )
          .toUpperCase()
          ===
          type
      );


  if(
    !filtered.length
  ){

    return null;

  }


  filtered.sort(
    (a,b) => {

      const da =
        new Date(
          a.date ||
          0
        ).getTime();


      const db =
        new Date(
          b.date ||
          0
        ).getTime();


      return db - da;

    }
  );


  return filtered[0];

}


/* =========================================
   ASSIGNMENT TOTAL
========================================= */

function sumAssignmentScores(
  list
){

  if(
    !Array.isArray(list)
    ||
    !list.length
  ){

    return {

      score:0,

      total:0

    };

  }


  const latestByExam =
    {};


  list.forEach(
    item => {

      const exam =
        String(
          item.exam ||
          ""
        )
        .trim();


      if(!exam){
        return;
      }


      const old =
        latestByExam[
          exam
        ];


      if(!old){

        latestByExam[
          exam
        ] =
        item;

        return;

      }


      const oldTime =
        new Date(
          old.date ||
          0
        ).getTime();


      const newTime =
        new Date(
          item.date ||
          0
        ).getTime();


      if(
        newTime >= oldTime
      ){

        latestByExam[
          exam
        ] =
        item;

      }

    }
  );


  const latest =
    Object.values(
      latestByExam
    );


  return {

    score:
      latest.reduce(
        (
          sum,
          item
        ) =>
          sum
          +
          num(
            item.score
          ),
        0
      ),

    total:
      latest.reduce(
        (
          sum,
          item
        ) =>
          sum
          +
          num(
            item.total
          ),
        0
      )

  };

}


/* =========================================
   LOAD DASHBOARD
========================================= */

async function loadDashboard(
  student
){

  keepScore.textContent =
    "กำลังโหลด...";

  midScore.textContent =
    "กำลังโหลด...";

  finalScore.textContent =
    "กำลังโหลด...";

  totalScore.textContent =
    "กำลังโหลด...";


  lockExamButton(
    btnMidExam,
    "กำลังตรวจสอบสิทธิ์..."
  );


  lockExamButton(
    btnFinalExam,
    "กำลังตรวจสอบสิทธิ์..."
  );


  try{

    const q =
      student.citizenId
      ||
      student.studentNo;


    const scoreURL =

      API_URL

      +

      "?action=check&q="

      +

      encodeURIComponent(
        q
      )

      +

      "&_="

      +

      Date.now();


    const accessURL =

      API_URL

      +

      "?action=getExamAccess"

      +

      "&citizenId="

      +

      encodeURIComponent(
        student.citizenId
        ||
        ""
      )

      +

      "&studentNo="

      +

      encodeURIComponent(
        student.studentNo
        ||
        ""
      )

      +

      "&_="

      +

      Date.now();


    /*
      โหลดคะแนน + สิทธิ์สอบ
      พร้อมกัน
      ทำให้หน้าเร็วกว่าเดิม
    */

    const [
      scoreData,
      accessData
    ] =
      await Promise.all([

        fetchJSON(
          scoreURL
        ),

        fetchJSON(
          accessURL
        )

      ]);


    /* =====================================
       SCORE
    ===================================== */

    if(
      scoreData
      &&
      scoreData.ok
    ){

      const scores =
        Array.isArray(
          scoreData.scores
        )
          ?
          scoreData.scores
          :
          [];


      const assignments =
        scores.filter(
          item =>
            String(
              item.type ||
              ""
            )
            .toUpperCase()
            ===
            "ASSIGNMENT"
        );


      const mid =
        getLatestScore(
          scores,
          "MIDTERM"
        );


      const final =
        getLatestScore(
          scores,
          "FINAL"
        );


      const assignmentSum =
        sumAssignmentScores(
          assignments
        );


      keepScore.textContent =
        assignments.length
          ?
          `${assignmentSum.score} / ${assignmentSum.total}`
          :
          "ยังไม่มีคะแนน";


      midScore.textContent =
        mid
          ?
          `${num(mid.score)} / ${num(mid.total)}`
          :
          "ยังไม่มีคะแนน";


      finalScore.textContent =
        final
          ?
          `${num(final.score)} / ${num(final.total)}`
          :
          "ยังไม่มีคะแนน";


      const total =
        assignmentSum.score
        +
        (
          mid
            ?
            num(mid.score)
            :
            0
        )
        +
        (
          final
            ?
            num(final.score)
            :
            0
        );


      totalScore.textContent =
        `${total} คะแนน`;

    }

    else{

      keepScore.textContent =
        "โหลดไม่สำเร็จ";

      midScore.textContent =
        "โหลดไม่สำเร็จ";

      finalScore.textContent =
        "โหลดไม่สำเร็จ";

      totalScore.textContent =
        "โหลดไม่สำเร็จ";

    }


    /* =====================================
       EXAM ACCESS
    ===================================== */

    const access =
      (
        accessData
        &&
        accessData.ok
        &&
        accessData.access
      )
        ?
        accessData.access
        :
        {};


    const midUnlocked =
      boolValue(
        access.midtermUnlocked
      );


    const midAttempted =
      boolValue(
        access.midtermAttempted
      );


    const finalUnlocked =
      boolValue(
        access.finalUnlocked
      );


    const finalAttempted =
      boolValue(
        access.finalAttempted
      );


    if(
      midAttempted
    ){

      lockExamButton(
        btnMidExam,
        "ทำข้อสอบกลางภาคแล้ว"
      );

    }

    else if(
      midUnlocked
    ){

      unlockExamButton(
        btnMidExam
      );

    }

    else{

      lockExamButton(
        btnMidExam,
        "ครูยังไม่เปิดให้สอบ"
      );

    }


    if(
      finalAttempted
    ){

      lockExamButton(
        btnFinalExam,
        "ทำข้อสอบปลายภาคแล้ว"
      );

    }

    else if(
      finalUnlocked
    ){

      unlockExamButton(
        btnFinalExam
      );

    }

    else{

      lockExamButton(
        btnFinalExam,
        "ครูยังไม่เปิดให้สอบ"
      );

    }


    scoreUpdated.textContent =
      formatTime();

  }

  catch(error){

    console.error(
      "DASHBOARD ERROR:",
      error
    );


    keepScore.textContent =
      "เชื่อมต่อไม่ได้";

    midScore.textContent =
      "เชื่อมต่อไม่ได้";

    finalScore.textContent =
      "เชื่อมต่อไม่ได้";

    totalScore.textContent =
      "เชื่อมต่อไม่ได้";


    scoreUpdated.textContent =
      "เชื่อมต่อไม่ได้";


    lockExamButton(
      btnMidExam,
      "เชื่อมต่อระบบไม่ได้"
    );


    lockExamButton(
      btnFinalExam,
      "เชื่อมต่อระบบไม่ได้"
    );

  }

}


/* =========================================
   MAIN
========================================= */

let student =
  null;


try{

  student =
    JSON.parse(
      localStorage.getItem(
        "student"
      )
      ||
      "null"
    );

}
catch(_){

  student =
    null;

}


if(
  !student
  ||
  (
    !student.citizenId
    &&
    !student.studentNo
  )
){

  window.location.replace(
    "index.html"
  );

}

else{

  showStudent(
    student
  );


  loadDashboard(
    student
  );

}


/* =========================================
   LOGOUT
========================================= */

logoutBtn.addEventListener(
  "click",
  () => {

    localStorage.removeItem(
      "student"
    );


    sessionStorage.removeItem(
      "STUDENT_LOGGED_IN"
    );


    window.location.href =
      "index.html";

  }
);