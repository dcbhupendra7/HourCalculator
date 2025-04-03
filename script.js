// Global array to store records
let records = [];

document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM fully loaded, populating dropdowns...");

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

// Populate dropdown with numbers; if pad is true, pad with zero
function populateDropdown(id, start, end, pad = false) {
  console.log(`Populating dropdown for ID: ${id}, from ${start} to ${end}`);
  const select = document.getElementById(id);
  if (!select) {
    console.error(`Element with ID ${id} not found!`);
    return;
  }
  for (let i = start; i <= end; i++) {
    let value = i.toString();
    if (pad && value.length < 2) value = "0" + value;
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  }
  console.log(`Dropdown ${id} populated successfully.`);
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
    errorDiv.style.color = "#dc3545";
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
    errorDiv.style.color = "#dc3545";
    errorDiv.textContent = "Error parsing time. Please check your entries.";
    return;
  }

  if (checkOutTime <= checkInTime) {
    errorDiv.style.color = "#dc3545";
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
  updateTotalSummary();

  // Success feedback
  errorDiv.style.color = "#28a745";
  errorDiv.textContent = "Record added successfully!";
  setTimeout(() => (errorDiv.textContent = ""), 2000);

  document.getElementById("timeEntryForm").reset();
}

// Update the records table
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
  updateTotalSummary();
}

// Update total hours summary per employee as a table
function updateTotalSummary() {
  const totalData = {};
  records.forEach((rec) => {
    if (!totalData[rec.employeeName]) {
      totalData[rec.employeeName] = 0;
    }
    totalData[rec.employeeName] += rec.minutesWorked;
  });

  const tbody = document.querySelector("#totalSummaryTable tbody");
  tbody.innerHTML = ""; // Clear existing rows

  for (const emp in totalData) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${emp}</td>
      <td>${formatDuration(totalData[emp])}</td>
    `;
    tbody.appendChild(tr);
  }
}

// Export report as PDF
function exportToPDF() {
  const exportBtn = document.getElementById("exportBtn");
  exportBtn.textContent = "Exporting...";
  exportBtn.disabled = true;

  setTimeout(() => {
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
      startY: 55,
      theme: "striped",
      headStyles: { fillColor: [0, 123, 255] },
    });

    // Total Hours Summary: Sum all minutes per employee
    const totalData = {};
    records.forEach((rec) => {
      if (!totalData[rec.employeeName]) totalData[rec.employeeName] = 0;
      totalData[rec.employeeName] += rec.minutesWorked;
    });
    const summaryRows = [];
    for (const emp in totalData) {
      summaryRows.push([emp, formatDuration(totalData[emp])]);
    }

    let yPos = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(16);
    doc.text("Total Hours ", 14, yPos);
    yPos += 6;
    doc.autoTable({
      head: [["Employee", "Total Hours"]],
      body: summaryRows,
      startY: yPos,
      theme: "striped",
      headStyles: { fillColor: [0, 123, 255] },
    });

    doc.save("employee_hours.pdf");
  };

  img.onerror = function () {
    alert(
      "Error loading logo.png. Please ensure the file is in the same directory and accessible."
    );
  };
}

// // Reset all data
// function resetData() {
//   if (
//     confirm(
//       "Are you sure you want to reset all data? This action cannot be undone."
//     )
//   ) {
//     records = [];
//     updateRecordsTable();
//     updateTotalSummary();
//     document.getElementById("timeEntryForm").reset();
//   }
// }

// New resetData function that shows the custom modal
function resetData() {
  document.getElementById("confirmModal").style.display = "block";
}

// Event listeners for modal buttons
document.getElementById("confirmYes").addEventListener("click", function () {
  // User confirmed reset; clear data
  records = [];
  updateRecordsTable();
  updateTotalSummary();
  document.getElementById("timeEntryForm").reset();
  // Hide the modal
  document.getElementById("confirmModal").style.display = "none";
});

document.getElementById("confirmNo").addEventListener("click", function () {
  // User canceled; just hide the modal
  document.getElementById("confirmModal").style.display = "none";
});
