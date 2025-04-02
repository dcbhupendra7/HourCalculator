// Global array to store records
let records = [];

document.addEventListener("DOMContentLoaded", function () {
  // Populate hour dropdowns (1-12)
  populateDropdown("checkInHour", 1, 12);
  populateDropdown("checkOutHour", 1, 12);

  // Populate minute dropdowns (0-60 inclusive)
  populateDropdown("checkInMinute", 0, 60, true);
  populateDropdown("checkOutMinute", 0, 60, true);

  // Handle form submission
  document
    .getElementById("timeEntryForm")
    .addEventListener("submit", function (e) {
      e.preventDefault();
      addRecord();
    });

  // Export button event
  document.getElementById("exportBtn").addEventListener("click", exportToPDF);

  // Reset button event
  document.getElementById("resetBtn").addEventListener("click", resetData);
});

// Populate dropdown with numbers; if pad is true, pad the number (e.g., "0" becomes "00")
function populateDropdown(id, start, end, pad = false) {
  const select = document.getElementById(id);
  for (let i = start; i <= end; i++) {
    let value = i.toString();
    if (pad && value.length < 2) value = "0" + value;
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  }
}

// Parse date and time values into a Date object
function parseTime(dateStr, hourStr, minuteStr, meridiem) {
  let hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);
  if (meridiem === "PM" && hour < 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day, hour, minute, 0);
}

// Format total minutes as "H:MM"
function formatDuration(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  return `${hours}:${minutes < 10 ? "0" + minutes : minutes}`;
}

// Add a new record from the form
function addRecord() {
  const employeeName = document.getElementById("employeeName").value.trim();
  const checkInDateStr = document.getElementById("checkInDate").value;
  const checkInHour = document.getElementById("checkInHour").value;
  const checkInMinute = document.getElementById("checkInMinute").value;
  const checkInMeridiem = document.getElementById("checkInMeridiem").value;
  const checkOutDateStr = document.getElementById("checkOutDate").value;
  const checkOutHour = document.getElementById("checkOutHour").value;
  const checkOutMinute = document.getElementById("checkOutMinute").value;
  const checkOutMeridiem = document.getElementById("checkOutMeridiem").value;
  const errorDiv = document.getElementById("formError");
  errorDiv.textContent = "";

  // Basic validation
  if (
    !employeeName ||
    !checkInDateStr ||
    !checkOutDateStr ||
    !checkInHour ||
    !checkInMinute ||
    !checkOutHour ||
    !checkOutMinute
  ) {
    errorDiv.textContent = "Please fill in all required fields.";
    return;
  }

  const checkInTime = parseTime(
    checkInDateStr,
    checkInHour,
    checkInMinute,
    checkInMeridiem
  );
  const checkOutTime = parseTime(
    checkOutDateStr,
    checkOutHour,
    checkOutMinute,
    checkOutMeridiem
  );

  if (!checkInTime || !checkOutTime) {
    errorDiv.textContent = "Error parsing time. Please check your entries.";
    return;
  }

  if (checkOutTime <= checkInTime) {
    errorDiv.textContent = "Check-out time must be after check-in time.";
    return;
  }

  // Calculate duration in minutes
  const diffMinutes = (checkOutTime - checkInTime) / (1000 * 60);
  const formattedDuration = formatDuration(diffMinutes);

  // Create record object
  const record = {
    employeeName,
    checkInDate: checkInDateStr,
    checkInTime: `${checkInHour}:${checkInMinute} ${checkInMeridiem}`,
    checkOutDate: checkOutDateStr,
    checkOutTime: `${checkOutHour}:${checkOutMinute} ${checkOutMeridiem}`,
    minutesWorked: diffMinutes,
    formattedDuration,
  };

  records.push(record);
  updateRecordsTable();
  updateWeeklySummary();
  updateBiweeklySummary();
  document.getElementById("timeEntryForm").reset();
}

// Update the records table with a Delete button for each record
function updateRecordsTable() {
  const tbody = document.querySelector("#recordsTable tbody");
  tbody.innerHTML = "";

  records.forEach((rec, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${rec.employeeName}</td>
      <td>${rec.checkInDate} ${rec.checkInTime}</td>
      <td>${rec.checkOutDate} ${rec.checkOutTime}</td>
      <td>${rec.formattedDuration}</td>
      <td><button class="btn btn-danger" onclick="deleteRecord(${index})">Delete</button></td>
    `;
    tbody.appendChild(tr);
  });
}

// Delete a record by index
function deleteRecord(index) {
  records.splice(index, 1);
  updateRecordsTable();
  updateWeeklySummary();
  updateBiweeklySummary();
}

// Helper: Get the Monday of the week for a given date string (for grouping)
function getMonday(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split("T")[0];
}

// Update weekly summary per employee (grouped by the Monday of each week)
function updateWeeklySummary() {
  const weeklyData = {};
  records.forEach((rec) => {
    const weekStart = getMonday(rec.checkInDate);
    if (!weeklyData[rec.employeeName]) {
      weeklyData[rec.employeeName] = {};
    }
    if (!weeklyData[rec.employeeName][weekStart]) {
      weeklyData[rec.employeeName][weekStart] = 0;
    }
    weeklyData[rec.employeeName][weekStart] += rec.minutesWorked;
  });

  let html = "";
  for (const emp in weeklyData) {
    html += `<strong>${emp}</strong><ul>`;
    for (const week in weeklyData[emp]) {
      html += `<li>Week of ${week}: ${formatDuration(
        weeklyData[emp][week]
      )}</li>`;
    }
    html += `</ul>`;
  }
  document.getElementById("weeklySummary").innerHTML = html;
}

// Update biweekly summary per employee (grouping consecutive weeks)
function updateBiweeklySummary() {
  const weeklyData = {};
  records.forEach((rec) => {
    const weekStart = getMonday(rec.checkInDate);
    if (!weeklyData[rec.employeeName]) {
      weeklyData[rec.employeeName] = {};
    }
    if (!weeklyData[rec.employeeName][weekStart]) {
      weeklyData[rec.employeeName][weekStart] = 0;
    }
    weeklyData[rec.employeeName][weekStart] += rec.minutesWorked;
  });

  let html = "";
  for (const emp in weeklyData) {
    html += `<strong>${emp}</strong><ul>`;
    const weeks = Object.keys(weeklyData[emp]).sort();
    for (let i = 0; i < weeks.length; i += 2) {
      const week1 = weeks[i];
      const week2 = weeks[i + 1];
      const total =
        weeklyData[emp][week1] + (week2 ? weeklyData[emp][week2] : 0);
      const period = week2 ? `${week1} & ${week2}` : week1;
      html += `<li>Biweekly (${period}): ${formatDuration(total)}</li>`;
    }
    html += `</ul>`;
  }
  document.getElementById("biweeklySummary").innerHTML = html;
}

// Export report as PDF with two tables:
// 1. A Daily Report table listing Employee, Check-In (date & time), Check-Out (date & time), Daily Hours.
// 2. A Total Hours Summary table showing Employee and Total Hours (aggregated from all records).
function exportToPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Title
  doc.setFontSize(18);
  doc.text("Employee Hours Report", 14, 20);
  doc.setFontSize(12);

  // Daily Report Table: one row per record
  const dailyRows = records.map((rec) => [
    rec.employeeName,
    `${rec.checkInDate} ${rec.checkInTime}`,
    `${rec.checkOutDate} ${rec.checkOutTime}`,
    rec.formattedDuration,
  ]);
  doc.text("Daily Report", 14, 30);
  doc.autoTable({
    head: [["Employee", "Check-In", "Check-Out", "Daily Hours"]],
    body: dailyRows,
    startY: 35,
    theme: "striped",
    headStyles: { fillColor: [0, 123, 255] },
  });

  // Total Hours Summary: Sum all minutes per employee across all records
  const totalHours = {};
  records.forEach((rec) => {
    if (!totalHours[rec.employeeName]) totalHours[rec.employeeName] = 0;
    totalHours[rec.employeeName] += rec.minutesWorked;
  });
  const summaryRows = [];
  for (const emp in totalHours) {
    summaryRows.push([emp, formatDuration(totalHours[emp])]);
  }

  let yPos = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(16);
  doc.text("Total Hours per Employee", 14, yPos);
  yPos += 6;
  doc.autoTable({
    head: [["Employee", "Total Hours"]],
    body: summaryRows,
    startY: yPos,
    theme: "striped",
    headStyles: { fillColor: [0, 123, 255] },
  });

  doc.save("employee_hours.pdf");
}

// Reset all data, clear table, summaries, and form
function resetData() {
  if (
    confirm(
      "Are you sure you want to reset all data? This action cannot be undone."
    )
  ) {
    records = [];
    updateRecordsTable();
    document.getElementById("weeklySummary").innerHTML = "";
    document.getElementById("biweeklySummary").innerHTML = "";
    document.getElementById("timeEntryForm").reset();
  }
}
