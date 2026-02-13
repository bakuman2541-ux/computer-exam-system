const API_URL =
"https://script.google.com/macros/s/AKfycbzaQBAcwYpbGOoFuZZGfuAfNtmUBAGpb6CrG7lGRBWwdl3w7KB-eAXA9KKbkD39Q9luog/exec";


document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("level").addEventListener("change", fillRooms);
  fillRooms();
});

/* =================== ห้อง =================== */
function fillRooms() {
  const roomSelect = document.getElementById("room");
  roomSelect.innerHTML = "";
  for (let i = 1; i <= 10; i++) {
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = "ห้อง " + i;
    roomSelect.appendChild(opt);
  }
}

/* =================== โหลดคะแนน =================== */
function loadRoomScore() {
  const level = document.getElementById("level").value;
  const room  = document.getElementById("room").value;
  const term  = document.getElementById("term").value;

  const result = document.getElementById("result");
  result.innerHTML = "⏳ กำลังโหลดข้อมูล...";

  if (!level || !room || !term) {
    result.innerHTML = `<p style="color:red">❌ กรุณาเลือกระดับ / ห้อง / เทอม</p>`;
    return;
  }

  fetch(`${API_URL}?action=viewRoomGrade&level=${level}&room=${room}&term=${term}`)
    .then(r => r.json())
    .then(res => {
      if (!res.ok) {
        result.innerHTML =
          `<p style="color:red">❌ ${res.error || "โหลดข้อมูลไม่สำเร็จ"}</p>`;
        return;
      }
      renderTable(res.students || []);
    })
    .catch(err => {
      console.error(err);
      result.innerHTML = `<p style="color:red">❌ ไม่สามารถเชื่อมต่อ API</p>`;
    });
}

/* =================== ตารางคะแนน =================== */
function renderTable(students) {

  if (!students.length) {
    document.getElementById("result").innerHTML =
      `<p style="color:red">❌ ไม่พบข้อมูลคะแนน</p>`;
    return;
  }

  const workSet = new Set();
  students.forEach(s => (s.works || []).forEach(w => workSet.add(w.name)));
  const workNames = Array.from(workSet);

  const avg = {
    works: Object.fromEntries(workNames.map(w => [w, 0])),
    mid: 0,
    fin: 0,
    total: 0
  };

  let html = `
  <table class="table" style="width:100%; border-collapse:collapse">
    <thead>
      <tr>
        <th rowspan="2">เลขที่</th>
        <th rowspan="2">ชื่อ</th>
        <th colspan="${workNames.length + 2}">คะแนน</th>
        <th rowspan="2">รวม</th>
        <th rowspan="2">เกรด</th>
      </tr>
      <tr>
        ${workNames.map(w => `<th>${w}</th>`).join("")}
        <th>กลางภาค</th>
        <th>ปลายภาค</th>
      </tr>
    </thead>
    <tbody>
  `;

  students.forEach(s => {
    const isR = Number(s.grade) === 0;
    const workMap = {};
    (s.works || []).forEach(w => workMap[w.name] = Number(w.score || 0));
    const workScores = workNames.map(w => workMap[w] || 0);

    avg.mid   += Number(s.mid || 0);
    avg.fin   += Number(s.fin || 0);
    avg.total += Number(s.total || 0);
    workNames.forEach((w,i)=> avg.works[w] += workScores[i]);

    html += `
      <tr style="${isR ? 'background:#ffecec' : ''}">
        <td align="center">${s.no}</td>
        <td>${s.name}</td>
        ${workScores.map(v=>`<td align="center">${v}</td>`).join("")}
        <td align="center">${s.mid || 0}</td>
        <td align="center">${s.fin || 0}</td>
        <td align="center"><b>${s.total}</b></td>
        <td align="center"><b>${isR ? "ร" : s.grade}</b></td>
      </tr>
    `;
  });

  const n = students.length;
  html += `
    <tr style="font-weight:bold;background:#f8f9fa">
      <td colspan="2" align="center">ค่าเฉลี่ย</td>
      ${workNames.map(w =>
        `<td align="center">${(avg.works[w]/n).toFixed(2)}</td>`
      ).join("")}
      <td align="center">${(avg.mid/n).toFixed(2)}</td>
      <td align="center">${(avg.fin/n).toFixed(2)}</td>
      <td align="center">${(avg.total/n).toFixed(2)}</td>
      <td></td>
    </tr>
  </tbody></table>`;

  document.getElementById("result").innerHTML = html;
}

/* =================== ปพ.5 =================== */
function exportPP5() {
  const level = document.getElementById("level").value;
  const room  = document.getElementById("room").value;
  const term  = document.getElementById("term").value;

  if (!level || !room || !term) {
    alert("กรุณาเลือกระดับ / ห้อง / เทอม");
    return;
  }

  window.open(
    `${API_URL}?action=exportPP5&level=${level}&room=${room}&term=${term}`,
    "_blank"
  );
}
