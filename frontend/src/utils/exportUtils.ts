// src/utils/exportUtils.ts
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, ImageRun, TextRun } from "docx";
import * as htmlToImage from 'html-to-image';
import toast from "react-hot-toast";

export const generateExcelReport = (data: any, range: string) => {
  try {
    const wb = XLSX.utils.book_new();
    if (data.finance) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.finance), "Financial Trends");
    if (data.topUsers) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.topUsers), "Top Users");
    if (data.categories?.items) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.categories.items), "Category Analysis");
    if (data.status) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.status), "Status Distribution");
    if (data.volume) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.volume), "Volume Data");

    XLSX.writeFile(wb, `Admin_Analytics_Tables_${range}.xlsx`);
    toast.success("Excel report downloaded");
  } catch (error) {
    toast.error("Failed to generate Excel");
    console.error(error);
  }
};

export const generateWordReport = async (range: string, kpiElementId: string, chartsElementId: string) => {
  const kpiElement = document.getElementById(kpiElementId);
  const chartElement = document.getElementById(chartsElementId);

  if (!kpiElement || !chartElement) {
    toast.error("Could not find dashboard elements to capture");
    return;
  }
 
  const toastId = toast.loading("Formatting Word report...");

  try {
    const kpiImg = await htmlToImage.toPng(kpiElement, { backgroundColor: '#ffffff' });
    const chartImg = await htmlToImage.toPng(chartElement, { backgroundColor: '#f8fafc' });

    const doc = new Document({
      sections: [{
        properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } },
        children: [
          new Paragraph({
            alignment: "center",
            children: [new TextRun({ text: "ADMIN ANALYTICS REPORT", bold: true, size: 36, color: "334155" })],
          }),
          new Paragraph({
            alignment: "center",
            spacing: { after: 400 },
            children: [new TextRun({ text: `Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, color: "64748b" })],
          }),
          new Paragraph({
            children: [new TextRun({ text: "Key Performance Indicators", bold: true, size: 24, underline: {} })],
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new ImageRun({
                data: await fetch(kpiImg).then(r => r.arrayBuffer()),
                transformation: { width: 600, height: 80 },
                type: "png",
              }),
            ],
            spacing: { after: 400 }
          }),
          new Paragraph({
            children: [new TextRun({ text: "Visual Data Analysis", bold: true, size: 24, underline: {} })],
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new ImageRun({
                data: await fetch(chartImg).then(r => r.arrayBuffer()),
                transformation: { width: 600, height: 650 },
                type: "png",
              }),
            ],
          }),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Dashboard_Report_${range}.docx`);
    toast.success("Professional report generated", { id: toastId });
  } catch (err) {
    console.error(err);
    toast.error("Format error", { id: toastId });
  }
};