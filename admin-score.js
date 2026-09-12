/***************************************
 * Admin Score - Optimized
 * ใช้ API / Action เดิม
 * รองรับสายสามัญ + สายวิชาชีพ
 * มี Cache ลดการดึงข้อมูลซ้ำ
 ***************************************/


/* =====================================
   API เดิม
===================================== */

const API_URL =
  "https://script.google.com/macros/s/AKfycbw7fx6dBKoc9d87XNqOCb4R1HRKgfY79dzVvUAnWfs46noLnyeGBxMvJRTO3Qr23kMFQA/exec";
  /* =====================================
   ELEMENTS
===================================== */

const educationTypeEl =
  document.getElementById("educationType");

const levelEl =
  document.getElementById("level");

const roomEl =
  document.getElementById("room");

const termEl =
  document.getElementById("term");

const assignmentSelect =
  document.getElementById("assignmentSelect");


const btnManageAssignments =
  document.getElementById(
    "btnManageAssignments"
  );

const btnLoad =
  document.getElementById("btnLoad");

const btnSave =
  document.getElementById("btnSave");

const btnRefreshData =
  document.getElementById(
    "btnRefreshData"
  );


const msg =
  document.getElementById("msg");

const tbody =
  document.getElementById("tbody");


const metaTotal =
  document.getElementById(
    "metaTotal"
  );

const metaDone =
  document.getElementById(
    "metaDone"
  );

const metaStudents =
  document.getElementById(
    "metaStudents"
  );

const dataStatus =
  document.getElementById(
    "dataStatus"
  );


/* MODAL */

const modalBackdrop =
  document.getElementById(
    "modalBackdrop"
  );

const btnCloseModal =
  document.getElementById(
    "btnCloseModal"
  );

const btnAddRow =
  document.getElementById(
    "btnAddRow"
  );

const btnSaveAssignments =
  document.getElementById(
    "btnSaveAssignments"
  );

const btnReloadManager =
  document.getElementById(
    "btnReloadManager"
  );

const assGrid =
  document.getElementById(
    "assGrid"
  );


const managerLevel =
  document.getElementById(
    "managerLevel"
  );

const managerRoom =
  document.getElementById(
    "managerRoom"
  );

const managerTerm =
  document.getElementById(
    "managerTerm"
  );


const searchEl =
  document.getElementById(
    "search"
  );


/* =====================================
   LEVELS
===================================== */

const LEVELS = {

  GENERAL: [

    ["K1","อนุบาล 1"],
    ["K2","อนุบาล 2"],
    ["K3","อนุบาล 3"],

    ["P1","ประถมศึกษาปีที่ 1"],
    ["P2","ประถมศึกษาปีที่ 2"],
    ["P3","ประถมศึกษาปีที่ 3"],
    ["P4","ประถมศึกษาปีที่ 4"],
    ["P5","ประถมศึกษาปีที่ 5"],
    ["P6","ประถมศึกษาปีที่ 6"],

    ["M1","มัธยมศึกษาปีที่ 1"],
    ["M2","มัธยมศึกษาปีที่ 2"],
    ["M3","มัธยมศึกษาปีที่ 3"],
    ["M4","มัธยมศึกษาปีที่ 4"],
    ["M5","มัธยมศึกษาปีที่ 5"],
    ["M6","มัธยมศึกษาปีที่ 6"]

  ],


  VOCATIONAL: [

    ["VOC1","ปวช. ปีที่ 1"],
    ["VOC2","ปวช. ปีที่ 2"],
    ["VOC3","ปวช. ปีที่ 3"],

    ["HVC1","ปวส. ปีที่ 1"],
    ["HVC2","ปวส. ปีที่ 2"]

  ]

};


/* =====================================
   CACHE
===================================== */

const ASSIGNMENT_CACHE_MS =
  2 * 60 * 1000;

const STUDENT_CACHE_MS =
  60 * 1000;


const assignmentCache =
  new Map();

const studentCache =
  new Map();

const scoreDrafts =
  new Map();


const SESSION_PREFIX =
  "SAS_ADMIN_SCORE_CACHE_";


let currentStudents = [];

let assignments = [];

let selectedAssignment =
  null;


let assignmentRequestId =
  0;

let studentRequestId =
  0;

let changeTimer =
  null;


/* =====================================
   MESSAGE
===================================== */

function setMsg(
  text,
  ok = true
){

  msg.textContent =
    text || "";

  msg.style.color =
    ok
      ? "#16a34a"
      : "#dc2626";

}


function setStatus(text){

  dataStatus.textContent =
    text || "พร้อมใช้งาน";

}


/* =====================================
   SAFE TEXT
===================================== */

function escapeHtml(value){

  return String(
    value ?? ""
  )
  .replace(/&/g,"&amp;")
  .replace(/</g,"&lt;")
  .replace(/>/g,"&gt;")
  .replace(/"/g,"&quot;")
  .replace(/'/g,"&#039;");

}


/* =====================================
   SESSION CACHE
===================================== */

function sessionKey(
  type,
  key
){

  return (
    SESSION_PREFIX +
    type +
    "_" +
    key
  );

}


function saveSessionCache(
  type,
  key,
  data
){

  try{

    sessionStorage.setItem(
      sessionKey(type,key),

      JSON.stringify({
        time:Date.now(),
        data
      })
    );

  }
  catch(_){}

}


function readSessionCache(
  type,
  key,
  maxAge
){

  try{

    const raw =
      sessionStorage.getItem(
        sessionKey(type,key)
      );


    if(!raw)
      return null;


    const item =
      JSON.parse(raw);


    if(
      !item ||
      Date.now() - item.time >
      maxAge
    ){

      sessionStorage.removeItem(
        sessionKey(type,key)
      );

      return null;

    }


    return item.data;

  }
  catch(_){

    return null;

  }

}


/* =====================================
   MEMORY CACHE
===================================== */

function getCache(
  map,
  type,
  key,
  maxAge
){

  const item =
    map.get(key);


  if(item){

    if(
      Date.now() - item.time
      <=
      maxAge
    ){

      return item.data;

    }


    map.delete(key);

  }


  const sessionData =
    readSessionCache(
      type,
      key,
      maxAge
    );


  if(sessionData){

    map.set(
      key,
      {
        time:Date.now(),
        data:sessionData
      }
    );

    return sessionData;

  }


  return null;

}


function setCache(
  map,
  type,
  key,
  data
){

  map.set(
    key,
    {
      time:Date.now(),
      data
    }
  );


  saveSessionCache(
    type,
    key,
    data
  );

}


/* =====================================
   CACHE KEYS
===================================== */

function assignmentKey(){

  return (
    levelEl.value +
    "|" +
    roomEl.value +
    "|" +
    termEl.value
  );

}


function studentKey(){

  return (
    levelEl.value +
    "|" +
    roomEl.value
  );

}


function selectedAssignmentKey(){

  if(!selectedAssignment){

    return "NO_ASSIGNMENT";

  }


  return String(
    selectedAssignment.code ||
    selectedAssignment.name ||
    "NO_ASSIGNMENT"
  );

}


function draftKey(st){

  return (
    selectedAssignmentKey() +
    "|" +
    (st.citizenId || "") +
    "|" +
    (st.studentNo || "")
  );

}


/* =====================================
   API
===================================== */

async function apiGet(params){

  try{

    const url =
      API_URL +
      "?" +
      new URLSearchParams(
        params
      ).toString();


    const response =
      await fetch(
        url,
        {
          cache:"no-store"
        }
      );


    return await response.json();

  }
  catch(err){

    return {

      ok:false,

      error:
        "Failed to fetch (GET) - " +
        err.message

    };

  }

}


async function apiPost(
  action,
  body
){

  try{

    const url =
      API_URL +
      "?action=" +
      encodeURIComponent(
        action
      );


    const response =
      await fetch(
        url,
        {
          method:"POST",

          headers:{
            "Content-Type":
              "text/plain;charset=utf-8"
          },

          body:
            JSON.stringify(body)
        }
      );


    return await response.json();

  }
  catch(err){

    return {

      ok:false,

      error:
        "Failed to fetch (POST) - " +
        err.message

    };

  }

}


/* =====================================
   LEVEL
===================================== */

function renderLevels(){

  const type =
    educationTypeEl.value ||
    "GENERAL";


  const list =
    LEVELS[type] ||
    LEVELS.GENERAL;


  levelEl.innerHTML =
    list.map(
      ([value,label]) => `

        <option value="${value}">
          ${label} (${value})
        </option>

      `
    ).join("");

}


/* =====================================
   ROOMS
===================================== */

function fillRooms(){

  roomEl.innerHTML =
    Array.from(
      {length:20},
      (_,i) => {

        const room =
          i + 1;

        return `

          <option value="${room}">
            ห้อง ${room}
          </option>

        `;

      }
    ).join("");

}


/* =====================================
   STUDENT AREA RESET
===================================== */

function resetStudentArea(
  text =
    "เลือกระดับชั้นและกด “โหลดรายชื่อ”"
){

  currentStudents = [];

  searchEl.value = "";


  metaStudents.textContent =
    "นักเรียน: -";

  metaDone.textContent =
    "กรอกแล้ว: 0 คน";


  tbody.innerHTML = `

    <tr>

      <td
        colspan="5"
        class="empty-row"
      >
        ${text}
      </td>

    </tr>

  `;

}


/* =====================================
   ASSIGNMENTS
===================================== */

function applyAssignments(
  list,
  keepCode = ""
){

  assignments =
    Array.isArray(list)
      ? list
      : [];


  const active =
    assignments.filter(
      a =>
        String(
          a.active ||
          "TRUE"
        ).toUpperCase()
        ===
        "TRUE"
    );


  if(active.length === 0){

    assignmentSelect.innerHTML =
      `
        <option value="">
          (ยังไม่มีงานที่เปิดใช้)
        </option>
      `;


    selectedAssignment =
      null;


    metaTotal.textContent =
      "คะแนนเต็ม: -";


    btnSave.disabled =
      true;


    return;

  }


  assignmentSelect.innerHTML =
    active.map(
      a => `

        <option value="${escapeHtml(a.code)}">

          ${escapeHtml(a.name)}
          (เต็ม ${escapeHtml(a.total)})

        </option>

      `
    ).join("");


  let selected =
    active.find(
      a =>
        String(a.code || "")
        ===
        String(keepCode || "")
    );


  if(!selected){

    selected =
      active[0];

  }


  assignmentSelect.value =
    String(
      selected.code || ""
    );


  selectedAssignment =
    selected;


  metaTotal.textContent =
    "คะแนนเต็ม: " +
    (
      selected.total ||
      "-"
    );


  btnSave.disabled =
    false;

}


async function loadAssignments(
  {
    force = false
  } = {}
){

  const key =
    assignmentKey();


  const previousCode =
    selectedAssignment?.code ||
    "";


  if(!force){

    const cached =
      getCache(
        assignmentCache,
        "ASSIGNMENTS",
        key,
        ASSIGNMENT_CACHE_MS
      );


    if(cached){

      applyAssignments(
        cached,
        previousCode
      );


      setStatus(
        "ใช้ข้อมูลแคช"
      );


      return cached;

    }

  }


  const requestId =
    ++assignmentRequestId;


  assignmentSelect.disabled =
    true;


  assignmentSelect.innerHTML =
    `
      <option value="">
        กำลังโหลดงาน...
      </option>
    `;


  btnSave.disabled =
    true;


  setStatus(
    "กำลังโหลดงาน..."
  );


  const res =
    await apiGet({

      action:"getAssignments",

      level:levelEl.value,

      room:roomEl.value,

      term:termEl.value

    });


  if(
    requestId !==
    assignmentRequestId
  ){

    return [];

  }


  assignmentSelect.disabled =
    false;


  if(!res.ok){

    applyAssignments(
      [],
      ""
    );


    setStatus(
      "โหลดงานไม่สำเร็จ"
    );


    return [];

  }


  const list =
    res.assignments ||
    [];


  setCache(
    assignmentCache,
    "ASSIGNMENTS",
    key,
    list
  );


  applyAssignments(
    list,
    previousCode
  );


  setStatus(
    "ข้อมูลล่าสุด"
  );


  return list;

}


/* =====================================
   CITIZEN MASK
===================================== */

function maskCitizen(id){

  const s =
    String(
      id ||
      ""
    );


  if(s.length < 13){

    return s;

  }


  return (
    s.slice(0,3) +
    "********" +
    s.slice(-2)
  );

}


/* =====================================
   FILTER STUDENTS
===================================== */

function getFilteredStudents(){

  const q =
    String(
      searchEl.value ||
      ""
    )
    .trim()
    .toLowerCase();


  if(!q){

    return currentStudents;

  }


  return currentStudents.filter(
    st => {

      const name =
        String(
          st.name ||
          st.fullname ||
          ""
        )
        .toLowerCase();


      const studentNo =
        String(
          st.studentNo ||
          ""
        )
        .toLowerCase();


      const citizenId =
        String(
          st.citizenId ||
          ""
        )
        .toLowerCase();


      return (
        name.includes(q) ||
        studentNo.includes(q) ||
        citizenId.includes(q)
      );

    }
  );

}


/* =====================================
   RENDER STUDENTS
===================================== */

function renderStudents(list){

  tbody.innerHTML = "";


  if(
    !Array.isArray(list) ||
    list.length === 0
  ){

    tbody.innerHTML = `

      <tr>

        <td
          colspan="5"
          class="empty-row"
        >
          ไม่พบข้อมูลนักเรียน
        </td>

      </tr>

    `;


    updateMetaDone();

    return;

  }


  list.forEach(
    (st,idx) => {

      const tr =
        document.createElement(
          "tr"
        );


      const no =
        st.no ??
        (idx + 1);


      const name =
        st.name ??
        st.fullname ??
        "-";


      const studentNo =
        st.studentNo ??
        "-";


      const citizenId =
        st.citizenId ??
        "-";


      const savedDraft =
        scoreDrafts.get(
          draftKey(st)
        );


      tr.innerHTML = `

        <td>
          ${escapeHtml(no)}
        </td>

        <td>
          ${escapeHtml(name)}
        </td>

        <td>
          ${escapeHtml(studentNo)}
        </td>

        <td>
          ${escapeHtml(maskCitizen(citizenId))}
        </td>

        <td style="text-align:center;">

          <input

            class="scoreInput"

            type="number"

            min="0"

            step="1"

            data-citizen="${escapeHtml(citizenId)}"

            data-studentno="${escapeHtml(studentNo)}"

            value="${savedDraft ?? ""}"

            placeholder="0-${selectedAssignment?.total ?? 0}"

          >

        </td>

      `;


      tbody.appendChild(tr);

    }
  );


  updateMetaDone();

}


function renderCurrentStudents(){

  renderStudents(
    getFilteredStudents()
  );

}


/* =====================================
   META
===================================== */

function updateMetaDone(){

  if(!selectedAssignment){

    metaDone.textContent =
      "กรอกแล้ว: 0 คน";

    return;

  }


  let filled = 0;


  currentStudents.forEach(
    st => {

      const value =
        scoreDrafts.get(
          draftKey(st)
        );


      if(
        value !== undefined &&
        String(value).trim() !== ""
      ){

        filled++;

      }

    }
  );


  metaDone.textContent =
    `กรอกแล้ว: ${filled} คน`;

}


/* =====================================
   LOAD STUDENTS
===================================== */

async function loadStudents(
  {
    force = false
  } = {}
){

  const key =
    studentKey();


  if(!force){

    const cached =
      getCache(
        studentCache,
        "STUDENTS",
        key,
        STUDENT_CACHE_MS
      );


    if(cached){

      currentStudents =
        cached;


      metaStudents.textContent =
        `นักเรียน: ${currentStudents.length} คน`;


      renderCurrentStudents();


      setMsg(
        `✅ ใช้รายชื่อที่โหลดไว้ (${currentStudents.length} คน)`,
        true
      );


      setStatus(
        "ใช้ข้อมูลแคช"
      );


      return;

    }

  }


  const requestId =
    ++studentRequestId;


  btnLoad.disabled =
    true;


  setMsg(
    "⏳ กำลังโหลดรายชื่อนักเรียน...",
    true
  );


  setStatus(
    "กำลังโหลดรายชื่อ..."
  );


  tbody.innerHTML = `

    <tr>

      <td
        colspan="5"
        class="empty-row"
      >
        กำลังโหลดรายชื่อ...
      </td>

    </tr>

  `;


  const res =
    await apiGet({

      action:"getRoomStudents",

      level:levelEl.value,

      room:roomEl.value

    });


  if(
    requestId !==
    studentRequestId
  ){

    return;

  }


  btnLoad.disabled =
    false;


  if(!res.ok){

    setMsg(
      "❌ โหลดรายชื่อไม่สำเร็จ: " +
      (res.error || ""),
      false
    );


    setStatus(
      "โหลดรายชื่อไม่สำเร็จ"
    );


    resetStudentArea(
      "โหลดข้อมูลไม่สำเร็จ"
    );


    return;

  }


  currentStudents =
    res.students ||
    [];


  setCache(
    studentCache,
    "STUDENTS",
    key,
    currentStudents
  );


  metaStudents.textContent =
    `นักเรียน: ${currentStudents.length} คน`;


  renderCurrentStudents();


  setMsg(
    `✅ โหลดรายชื่อสำเร็จ ${currentStudents.length} คน`,
    true
  );


  setStatus(
    "ข้อมูลล่าสุด"
  );

}


/* =====================================
   SCORE ROWS
===================================== */

function collectRowsForSave(){

  if(!selectedAssignment){

    return [];

  }


  const total =
    Number(
      selectedAssignment.total ||
      0
    );


  const rows = [];


  currentStudents.forEach(
    st => {

      const citizenId =
        String(
          st.citizenId ||
          ""
        ).trim();


      const studentNo =
        String(
          st.studentNo ||
          ""
        ).trim();


      const raw =
        scoreDrafts.get(
          draftKey(st)
        );


      if(
        !citizenId ||
        !studentNo
      ){

        return;

      }


      if(
        raw === undefined ||
        String(raw).trim() === ""
      ){

        return;

      }


      let score =
        Number(raw);


      if(isNaN(score))
        score = 0;


      if(score < 0)
        score = 0;


      if(score > total)
        score = total;


      rows.push({

        citizenId,
        studentNo,
        score

      });

    }
  );


  return rows;

}


/* =====================================
   SAVE SCORES
===================================== */

async function saveScores(){

  const level =
    levelEl.value;

  const room =
    roomEl.value;

  const term =
    termEl.value;


  if(!selectedAssignment){

    setMsg(
      "❌ กรุณาเลือกงานก่อน",
      false
    );

    return;

  }


  const rows =
    collectRowsForSave();


  if(rows.length === 0){

    setMsg(
      "ยังไม่มีคะแนนที่กรอก",
      false
    );

    return;

  }


  btnSave.disabled =
    true;


  setMsg(
    "⏳ กำลังบันทึกคะแนน...",
    true
  );


  setStatus(
    "กำลังบันทึก..."
  );


  try{

    const res =
      await apiPost(
        "saveRoomScores",
        {

          level,
          room,
          term,

          type:"ASSIGNMENT",

          exam:
            selectedAssignment.name,

          total:
            Number(
              selectedAssignment.total ||
              0
            ),

          rows

        }
      );


    if(!res.ok){

      throw new Error(
        res.error ||
        "saveRoomScores failed"
      );

    }


    rows.forEach(
      row => {

        const st =
          currentStudents.find(
            s =>

              String(
                s.citizenId ||
                ""
              )
              ===
              String(row.citizenId)

              &&

              String(
                s.studentNo ||
                ""
              )
              ===
              String(row.studentNo)

          );


        if(st){

          scoreDrafts.delete(
            draftKey(st)
          );

        }

      }
    );


    renderCurrentStudents();


    setMsg(
      `✅ บันทึกสำเร็จ (${res.saved ?? rows.length} รายการ)`,
      true
    );


    setStatus(
      "บันทึกแล้ว"
    );

  }
  catch(err){

    setMsg(
      "❌ บันทึกไม่สำเร็จ: " +
      err.message,
      false
    );


    setStatus(
      "บันทึกไม่สำเร็จ"
    );

  }
  finally{

    btnSave.disabled =
      !selectedAssignment;

  }

}


/* =====================================
   FILTER CHANGE
===================================== */

function scheduleFilterReload(){

  clearTimeout(
    changeTimer
  );


  selectedAssignment =
    null;


  btnSave.disabled =
    true;


  metaTotal.textContent =
    "คะแนนเต็ม: -";


  resetStudentArea(
    "ตัวกรองเปลี่ยนแล้ว กด “โหลดรายชื่อ” เพื่อแสดงนักเรียน"
  );


  changeTimer =
    setTimeout(
      () => {

        loadAssignments({
          force:false
        });

      },
      140
    );

}


/* =====================================
   MODAL
===================================== */

function openModal(){

  managerLevel.textContent =
    "ระดับ: " +
    (
      levelEl.options[
        levelEl.selectedIndex
      ]?.text ||
      levelEl.value
    );


  managerRoom.textContent =
    "ห้อง: " +
    roomEl.value;


  managerTerm.textContent =
    "ภาคเรียน: " +
    termEl.value;


  renderAssignmentManager(
    assignments
  );


  modalBackdrop.style.display =
    "flex";


  document.body.style.overflow =
    "hidden";

}


function closeModal(){

  modalBackdrop.style.display =
    "none";


  document.body.style.overflow =
    "";

}


/* =====================================
   NEW ASSIGNMENT CODE
===================================== */

function existingCodes(){

  const codes =
    new Set(
      assignments.map(
        a =>
          String(
            a.code ||
            ""
          )
      )
    );


  assGrid
    .querySelectorAll(
      ".m_code"
    )
    .forEach(
      el =>
        codes.add(
          String(
            el.value ||
            ""
          )
        )
    );


  return codes;

}


function newCode(){

  const codes =
    existingCodes();


  let number =
    1;


  while(
    codes.has(
      "A" +
      String(number).padStart(
        2,
        "0"
      )
    )
  ){

    number++;

  }


  return (
    "A" +
    String(number).padStart(
      2,
      "0"
    )
  );

}


/* =====================================
   ADD ASSIGNMENT ROW
===================================== */

function addManagerRow(item){

  const code =
    item?.code ||
    newCode();


  const name =
    item?.name ||
    "";


  const total =
    item?.total ||
    "";


  const active =
    String(
      item?.active ||
      "TRUE"
    ).toUpperCase()
    ===
    "TRUE";


  const row =
    document.createElement(
      "div"
    );


  row.className =
    "rowitem";


  row.innerHTML = `

    <input
      class="m_code"
      value="${escapeHtml(code)}"
      disabled
    >

    <input
      class="m_name"
      value="${escapeHtml(name)}"
      placeholder="ชื่องาน เช่น ใบงาน 1"
    >

    <input
      class="m_total"
      type="number"
      min="1"
      value="${escapeHtml(total)}"
      placeholder="คะแนนเต็ม"
    >

    <select class="m_active">

      <option
        value="TRUE"
        ${active ? "selected" : ""}
      >
        เปิดใช้
      </option>

      <option
        value="FALSE"
        ${!active ? "selected" : ""}
      >
        ปิดใช้
      </option>

    </select>

    <button
      class="delete-ass-btn"
      type="button"
    >
      ลบ
    </button>

  `;


  row
    .querySelector(
      ".delete-ass-btn"
    )
    .addEventListener(
      "click",
      () => row.remove()
    );


  assGrid.appendChild(
    row
  );

}


/* =====================================
   RENDER ASSIGNMENTS
===================================== */

function renderAssignmentManager(list){

  assGrid.innerHTML =
    "";


  (
    Array.isArray(list)
      ? list
      : []
  )
  .forEach(
    addManagerRow
  );


  if(
    !assGrid.children.length
  ){

    addManagerRow(
      null
    );

  }

}


/* =====================================
   FORCE RELOAD ASSIGNMENTS
===================================== */

async function reloadManagerFromServer(){

  btnReloadManager.disabled =
    true;


  btnReloadManager.textContent =
    "⏳ กำลังดึง...";


  try{

    const list =
      await loadAssignments({
        force:true
      });


    renderAssignmentManager(
      list
    );

  }
  finally{

    btnReloadManager.disabled =
      false;


    btnReloadManager.textContent =
      "↻ ดึงจากเซิร์ฟเวอร์";

  }

}


/* =====================================
   SAVE ASSIGNMENTS
===================================== */

async function saveAssignments(){

  const level =
    levelEl.value;

  const room =
    roomEl.value;

  const term =
    termEl.value;


  const rowEls =
    Array.from(
      assGrid.querySelectorAll(
        ".rowitem"
      )
    );


  const rows =
    rowEls
      .map(
        row => ({

          term,
          level,
          room,

          code:
            row
              .querySelector(
                ".m_code"
              )
              .value
              .trim(),

          name:
            row
              .querySelector(
                ".m_name"
              )
              .value
              .trim(),

          total:
            Number(
              row
                .querySelector(
                  ".m_total"
                )
                .value ||
              0
            ),

          active:
            row
              .querySelector(
                ".m_active"
              )
              .value

        })
      )
      .filter(
        x => x.code
      );


  if(rows.length === 0){

    alert(
      "ยังไม่มีรายการงาน"
    );

    return;

  }


  for(const row of rows){

    if(!row.name){

      alert(
        "กรุณากรอกชื่องานให้ครบ"
      );

      return;

    }


    if(
      !row.total ||
      row.total <= 0
    ){

      alert(
        "คะแนนเต็มต้องมากกว่า 0"
      );

      return;

    }

  }


  btnSaveAssignments.disabled =
    true;


  btnSaveAssignments.textContent =
    "⏳ กำลังบันทึก...";


  try{

    const res =
      await apiPost(
        "saveAssignments",
        {

          term,
          level,
          room,
          rows

        }
      );


    if(!res.ok){

      throw new Error(
        res.error ||
        "saveAssignments failed"
      );

    }


    assignments =
      rows.map(
        row => ({

          code:row.code,

          name:row.name,

          total:row.total,

          active:row.active

        })
      );


    setCache(
      assignmentCache,
      "ASSIGNMENTS",
      assignmentKey(),
      assignments
    );


    applyAssignments(
      assignments,
      selectedAssignment?.code ||
      ""
    );


    renderAssignmentManager(
      assignments
    );


    alert(
      "✅ บันทึกรายการงานสำเร็จ"
    );


    setStatus(
      "บันทึกรายการงานแล้ว"
    );

  }
  catch(err){

    alert(
      "❌ บันทึกไม่สำเร็จ: " +
      err.message
    );

  }
  finally{

    btnSaveAssignments.disabled =
      false;


    btnSaveAssignments.textContent =
      "💾 บันทึกรายการงาน";

  }

}


/* =====================================
   SCORE INPUT
===================================== */

document.addEventListener(
  "input",
  e => {

    if(
      e.target &&
      e.target.classList.contains(
        "scoreInput"
      )
    ){

      const citizenId =
        String(
          e.target.dataset.citizen ||
          ""
        );


      const studentNo =
        String(
          e.target.dataset.studentno ||
          ""
        );


      const st =
        currentStudents.find(
          s =>

            String(
              s.citizenId ||
              ""
            ) === citizenId

            &&

            String(
              s.studentNo ||
              ""
            ) === studentNo

        );


      if(st){

        scoreDrafts.set(
          draftKey(st),
          String(
            e.target.value ||
            ""
          )
        );


        updateMetaDone();

      }

    }

  }
);


/* =====================================
   SEARCH
===================================== */

searchEl.addEventListener(
  "input",
  renderCurrentStudents
);


/* =====================================
   ASSIGNMENT CHANGE
===================================== */

assignmentSelect.addEventListener(
  "change",
  () => {

    const code =
      assignmentSelect.value;


    selectedAssignment =
      assignments.find(
        a =>
          String(
            a.code ||
            ""
          )
          ===
          String(code)
      )
      ||
      null;


    metaTotal.textContent =
      "คะแนนเต็ม: " +
      (
        selectedAssignment?.total ||
        "-"
      );


    btnSave.disabled =
      !selectedAssignment;


    renderCurrentStudents();

  }
);


/* =====================================
   FILTER EVENTS
===================================== */

educationTypeEl.addEventListener(
  "change",
  () => {

    renderLevels();

    scheduleFilterReload();

  }
);


levelEl.addEventListener(
  "change",
  scheduleFilterReload
);


roomEl.addEventListener(
  "change",
  scheduleFilterReload
);


termEl.addEventListener(
  "change",
  scheduleFilterReload
);


/* =====================================
   BUTTON EVENTS
===================================== */

btnLoad.addEventListener(
  "click",
  () => {

    loadStudents({
      force:false
    });

  }
);


btnSave.addEventListener(
  "click",
  saveScores
);


/* =====================================
   REFRESH ALL
===================================== */

btnRefreshData.addEventListener(
  "click",
  async () => {

    assignmentCache.delete(
      assignmentKey()
    );


    studentCache.delete(
      studentKey()
    );


    sessionStorage.removeItem(
      sessionKey(
        "ASSIGNMENTS",
        assignmentKey()
      )
    );


    sessionStorage.removeItem(
      sessionKey(
        "STUDENTS",
        studentKey()
      )
    );


    btnRefreshData.disabled =
      true;


    btnRefreshData.textContent =
      "⏳ กำลังรีเฟรช...";


    try{

      await Promise.all([

        loadAssignments({
          force:true
        }),

        loadStudents({
          force:true
        })

      ]);

    }
    finally{

      btnRefreshData.disabled =
        false;


      btnRefreshData.textContent =
        "↻ รีเฟรชข้อมูล";

    }

  }
);


/* =====================================
   MODAL EVENTS
===================================== */

btnManageAssignments.addEventListener(
  "click",
  openModal
);


btnCloseModal.addEventListener(
  "click",
  closeModal
);


btnAddRow.addEventListener(
  "click",
  () => {

    addManagerRow(
      null
    );

  }
);


btnReloadManager.addEventListener(
  "click",
  reloadManagerFromServer
);


btnSaveAssignments.addEventListener(
  "click",
  saveAssignments
);


modalBackdrop.addEventListener(
  "click",
  e => {

    if(
      e.target ===
      modalBackdrop
    ){

      closeModal();

    }

  }
);


window.addEventListener(
  "keydown",
  e => {

    if(
      e.key === "Escape" &&
      modalBackdrop.style.display
      ===
      "flex"
    ){

      closeModal();

    }

  }
);


/* =====================================
   START
===================================== */

renderLevels();

fillRooms();

btnSave.disabled =
  true;

resetStudentArea();

loadAssignments({
  force:false
});