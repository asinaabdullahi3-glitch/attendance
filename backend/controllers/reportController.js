const { pool } = require("../config/db");
const { Parser } = require("json2csv");
const PDFDocument = require("pdfkit");
const { buildAttendanceQuery, formatRecord } = require("../utils/reportHelpers");

async function exportCSV(req, res) {
  try {
    const isSuperAdmin = req.user.role === "super_admin";
    const departmentId = req.user.department_id;
    const filters = req.query;

    const { query, params } = buildAttendanceQuery(filters, departmentId, isSuperAdmin);
    const [records] = await pool.query(query, params);

    if (records.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No records found for the selected filters."
      });
    }

    const formatted = records.map(formatRecord);
    const parser = new Parser({ fields: Object.keys(formatted[0]) });
    const csv = parser.parse(formatted);

    const filename = `attendance_report_${Date.now()}.csv`;
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(csv);

  } catch (err) {
    console.error("CSV export error:", err);
    return res.status(500).json({ success: false, message: "Server error generating CSV report." });
  }
}

async function exportPDF(req, res) {
  try {
    const isSuperAdmin = req.user.role === "super_admin";
    const departmentId = req.user.department_id;
    const filters = req.query;

    const { query, params } = buildAttendanceQuery(filters, departmentId, isSuperAdmin);
    const [records] = await pool.query(query, params);

    if (records.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No records found for the selected filters."
      });
    }

    const doc = new PDFDocument({ margin: 40, size: "A4", layout: "landscape" });
    const filename = `attendance_report_${Date.now()}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    doc.pipe(res);

    doc.fontSize(18).font("Helvetica-Bold")
      .text("Swahilipot Hub Attendance Report", { align: "center" });
    doc.fontSize(10).font("Helvetica")
      .text(`Generated: ${new Date().toLocaleString()}`, { align: "center" });

    doc.moveDown(0.5);
    const filterParts = [];
    if (filters.start_date) filterParts.push(`From: ${filters.start_date}`);
    if (filters.end_date) filterParts.push(`To: ${filters.end_date}`);
    if (filters.role) filterParts.push(`Role: ${filters.role}`);
    if (filters.status) filterParts.push(`Status: ${filters.status}`);
    if (filterParts.length > 0) {
      doc.fontSize(9).text(`Filters: ${filterParts.join(" | ")}`, { align: "center" });
    }

    doc.moveDown(1);

    const columns = [
      { label: "Name", key: "Full Name", width: 100 },
      { label: "Department", key: "Department", width: 90 },
      { label: "Role", key: "Role", width: 65 },
      { label: "Date", key: "Attendance Date", width: 70 },
      { label: "Check-In", key: "Check-In Time", width: 110 },
      { label: "Check-Out", key: "Check-Out Time", width: 110 },
      { label: "Hours", key: "Total Hours", width: 55 },
      { label: "Status", key: "Status", width: 70 }
    ];

    let x = doc.page.margins.left;
    const headerY = doc.y;
    doc.font("Helvetica-Bold").fontSize(9);
    columns.forEach(col => {
      doc.text(col.label, x, headerY, { width: col.width, ellipsis: true });
      x += col.width;
    });

    doc.moveDown(0.3);
    doc.moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y)
      .stroke();
    doc.moveDown(0.3);

    doc.font("Helvetica").fontSize(8);
    records.forEach((record, index) => {
      const formatted = formatRecord(record);
      const rowY = doc.y;

      if (index % 2 === 0) {
        doc.rect(
          doc.page.margins.left,
          rowY - 2,
          doc.page.width - doc.page.margins.left - doc.page.margins.right,
          14
        ).fill("#f5f5f5").fillColor("black");
      }

      x = doc.page.margins.left;
      columns.forEach(col => {
        doc.text(String(formatted[col.key] || "N/A"), x, rowY, {
          width: col.width,
          ellipsis: true
        });
        x += col.width;
      });

      doc.moveDown(0.5);

      if (doc.y > doc.page.height - 80) {
        doc.addPage();
      }
    });

    doc.moveDown(1);
    doc.fontSize(8).fillColor("#666666")
      .text(`Total Records: ${records.length}`, { align: "right" });

    doc.end();

  } catch (err) {
    console.error("PDF export error:", err);
    return res.status(500).json({ success: false, message: "Server error generating PDF report." });
  }
}

module.exports = { exportCSV, exportPDF };
