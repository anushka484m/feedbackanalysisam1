import jsPDF from 'jspdf';
import PptxGenJS from 'pptxgenjs';
import type { FeedbackEntry, AnalysisResult } from '@/types/feedback';

// ── PDF Export ──
export async function exportPDF(
  entries: FeedbackEntry[],
  analysis: AnalysisResult
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = margin;

  // Colors
  const cyan = [0, 190, 180] as const;
  const dark = [18, 22, 30] as const;
  const white = [230, 235, 245] as const;
  const gray = [120, 130, 150] as const;
  const green = [34, 197, 94] as const;
  const red = [239, 68, 68] as const;

  // ─ Cover Page ─
  doc.setFillColor(...dark);
  doc.rect(0, 0, pageW, pageH, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(32);
  doc.setTextColor(...cyan);
  doc.text('Customer Feedback Report', pageW / 2, pageH / 2 - 20, { align: 'center' });
  doc.setFontSize(14);
  doc.setTextColor(...gray);
  doc.text('AI-Powered Sentiment Analysis & Business Insights', pageW / 2, pageH / 2 + 5, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageW / 2, pageH / 2 + 20, { align: 'center' });
  const completed = entries.filter(e => e.status === 'completed' && !e.isDuplicate);
  doc.text(`${completed.length} entries analyzed`, pageW / 2, pageH / 2 + 30, { align: 'center' });

  // ─ Page 2: Sentiment Summary ─
  doc.addPage();
  doc.setFillColor(...dark);
  doc.rect(0, 0, pageW, pageH, 'F');
  y = margin;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...cyan);
  doc.text('Sentiment Distribution', margin, y + 8);
  y += 20;

  analysis.sentimentDistribution.forEach((item) => {
    const total = analysis.sentimentDistribution.reduce((s, i) => s + i.value, 0);
    const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
    const barWidth = total > 0 ? (item.value / total) * (pageW - margin * 2 - 80) : 0;

    doc.setFontSize(11);
    doc.setTextColor(...white);
    doc.text(`${item.name}`, margin, y + 5);

    if (item.name === 'Positive') doc.setFillColor(...green);
    else if (item.name === 'Negative') doc.setFillColor(...red);
    else doc.setFillColor(...gray);

    doc.roundedRect(margin + 60, y - 2, barWidth, 8, 2, 2, 'F');
    doc.setTextColor(...gray);
    doc.text(`${item.value} (${pct}%)`, margin + 65 + barWidth, y + 5);
    y += 15;
  });

  // Topic Frequency
  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...cyan);
  doc.text('Topics by Frequency', margin, y + 8);
  y += 20;

  const maxCount = Math.max(...analysis.topicFrequency.map(t => t.count), 1);
  analysis.topicFrequency.forEach((item) => {
    const barWidth = (item.count / maxCount) * (pageW - margin * 2 - 100);
    doc.setFontSize(10);
    doc.setTextColor(...white);
    doc.text(item.topic, margin, y + 5);
    doc.setFillColor(...cyan);
    doc.roundedRect(margin + 80, y - 2, barWidth, 7, 2, 2, 'F');
    doc.setTextColor(...gray);
    doc.text(`${item.count}`, margin + 85 + barWidth, y + 5);
    y += 12;
  });

  // ─ Page 3: Top Complaints & Praises ─
  doc.addPage();
  doc.setFillColor(...dark);
  doc.rect(0, 0, pageW, pageH, 'F');
  y = margin;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...red);
  doc.text('Top 5 Complaints', margin, y + 8);
  y += 16;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...white);
  analysis.topComplaints.slice(0, 5).forEach((c, i) => {
    doc.text(`${i + 1}. ${c}`, margin + 5, y + 5);
    y += 8;
  });

  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...green);
  doc.text('Top 5 Praises', margin, y + 8);
  y += 16;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...white);
  analysis.topPraises.slice(0, 5).forEach((p, i) => {
    doc.text(`${i + 1}. ${p}`, margin + 5, y + 5);
    y += 8;
  });

  // ─ Page 4: Actionable Insights ─
  doc.addPage();
  doc.setFillColor(...dark);
  doc.rect(0, 0, pageW, pageH, 'F');
  y = margin;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...cyan);
  doc.text('Actionable Insights & Recommendations', margin, y + 8);
  y += 20;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  analysis.actionableInsights.forEach((insight, i) => {
    doc.setTextColor(...cyan);
    doc.text(`${i + 1}.`, margin, y + 5);
    doc.setTextColor(...white);
    const lines = doc.splitTextToSize(insight, pageW - margin * 2 - 15);
    doc.text(lines, margin + 10, y + 5);
    y += lines.length * 6 + 6;
  });

  // ─ Page 5: Critical Alerts ─
  if (analysis.criticalAlerts.length > 0) {
    doc.addPage();
    doc.setFillColor(...dark);
    doc.rect(0, 0, pageW, pageH, 'F');
    y = margin;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...red);
    doc.text(`Critical Alerts (${analysis.criticalAlerts.length} entries with score < -0.7)`, margin, y + 8);
    y += 18;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    analysis.criticalAlerts.slice(0, 15).forEach((alert) => {
      if (y > pageH - 20) { doc.addPage(); doc.setFillColor(...dark); doc.rect(0, 0, pageW, pageH, 'F'); y = margin; }
      doc.setTextColor(...red);
      doc.text(`[${alert.sentimentScore?.toFixed(2)}]`, margin, y + 5);
      doc.setTextColor(...gray);
      doc.text(`${alert.topic || 'General'} | ${alert.source}`, margin + 20, y + 5);
      doc.setTextColor(...white);
      const lines = doc.splitTextToSize(alert.translatedText, pageW - margin * 2 - 70);
      doc.text(lines, margin + 70, y + 5);
      y += Math.max(lines.length * 5, 8) + 4;
    });
  }

  doc.save('feedback_analysis_report.pdf');
}

// ── PPTX Export ──
export async function exportPPTX(
  entries: FeedbackEntry[],
  analysis: AnalysisResult
) {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';

  const bgColor = '121620';
  const cyanHex = '00BEB4';
  const whiteHex = 'E6EBF5';
  const grayHex = '788296';
  const greenHex = '22C55E';
  const redHex = 'EF4444';

  const completed = entries.filter(e => e.status === 'completed' && !e.isDuplicate);

  // ─ Slide 1: Title ─
  const slide1 = pptx.addSlide();
  slide1.background = { color: bgColor };
  slide1.addText('Customer Feedback Report', {
    x: 1, y: 2, w: 11.33, h: 1.5,
    fontSize: 36, bold: true, color: cyanHex, align: 'center',
  });
  slide1.addText('AI-Powered Sentiment Analysis & Business Insights', {
    x: 1, y: 3.5, w: 11.33, h: 0.8,
    fontSize: 16, color: grayHex, align: 'center',
  });
  slide1.addText(`${completed.length} entries analyzed · ${new Date().toLocaleDateString()}`, {
    x: 1, y: 4.5, w: 11.33, h: 0.5,
    fontSize: 12, color: grayHex, align: 'center',
  });

  // ─ Slide 2: Sentiment ─
  const slide2 = pptx.addSlide();
  slide2.background = { color: bgColor };
  slide2.addText('Sentiment Distribution', {
    x: 0.5, y: 0.3, w: 12, h: 0.6,
    fontSize: 24, bold: true, color: cyanHex,
  });

  const total = analysis.sentimentDistribution.reduce((s, i) => s + i.value, 0);
  const chartData = analysis.sentimentDistribution.map(d => ({
    name: d.name,
    labels: [d.name],
    values: [total > 0 ? (d.value / total) * 100 : 0],
  }));

  if (total > 0) {
    slide2.addChart(pptx.ChartType.pie, chartData, {
      x: 0.5, y: 1.2, w: 5, h: 5,
      showPercent: true,
      showTitle: false,
      chartColors: [greenHex, grayHex, redHex],
      dataLabelColor: whiteHex,
      dataLabelFontSize: 12,
    });
  }

  // Stats text
  analysis.sentimentDistribution.forEach((item, i) => {
    slide2.addText(`${item.name}: ${item.value} (${total > 0 ? ((item.value / total) * 100).toFixed(1) : 0}%)`, {
      x: 6, y: 1.5 + i * 0.6, w: 6, h: 0.5,
      fontSize: 14, color: item.name === 'Positive' ? greenHex : item.name === 'Negative' ? redHex : grayHex,
    });
  });

  // ─ Slide 3: Topics ─
  const slide3 = pptx.addSlide();
  slide3.background = { color: bgColor };
  slide3.addText('Topics by Frequency', {
    x: 0.5, y: 0.3, w: 12, h: 0.6,
    fontSize: 24, bold: true, color: cyanHex,
  });

  if (analysis.topicFrequency.length > 0) {
    const topicData = [{
      name: 'Topics',
      labels: analysis.topicFrequency.map(t => t.topic),
      values: analysis.topicFrequency.map(t => t.count),
    }];
    slide3.addChart(pptx.ChartType.bar, topicData, {
      x: 0.5, y: 1.2, w: 12, h: 5.5,
      chartColors: [cyanHex],
      catAxisLabelColor: whiteHex,
      valAxisLabelColor: grayHex,
      catAxisLabelFontSize: 10,
      showValue: true,
      dataLabelColor: whiteHex,
      dataLabelFontSize: 10,
    });
  }

  // ─ Slide 4: Top Complaints & Praises ─
  const slide4 = pptx.addSlide();
  slide4.background = { color: bgColor };
  slide4.addText('Top Complaints', {
    x: 0.5, y: 0.3, w: 6, h: 0.6,
    fontSize: 20, bold: true, color: redHex,
  });
  analysis.topComplaints.slice(0, 5).forEach((c, i) => {
    slide4.addText(`${i + 1}. ${c}`, {
      x: 0.5, y: 1.0 + i * 0.6, w: 6, h: 0.5,
      fontSize: 11, color: whiteHex,
    });
  });

  slide4.addText('Top Praises', {
    x: 6.8, y: 0.3, w: 6, h: 0.6,
    fontSize: 20, bold: true, color: greenHex,
  });
  analysis.topPraises.slice(0, 5).forEach((p, i) => {
    slide4.addText(`${i + 1}. ${p}`, {
      x: 6.8, y: 1.0 + i * 0.6, w: 6, h: 0.5,
      fontSize: 11, color: whiteHex,
    });
  });

  // ─ Slide 5: Actionable Insights ─
  const slide5 = pptx.addSlide();
  slide5.background = { color: bgColor };
  slide5.addText('Actionable Insights & Recommendations', {
    x: 0.5, y: 0.3, w: 12, h: 0.6,
    fontSize: 24, bold: true, color: cyanHex,
  });
  analysis.actionableInsights.forEach((insight, i) => {
    slide5.addText(`${i + 1}. ${insight}`, {
      x: 0.7, y: 1.2 + i * 0.75, w: 11.6, h: 0.7,
      fontSize: 12, color: whiteHex,
      valign: 'top',
    });
  });

  // ─ Slide 6: Critical Alerts ─
  if (analysis.criticalAlerts.length > 0) {
    const slide6 = pptx.addSlide();
    slide6.background = { color: bgColor };
    slide6.addText(`⚠ Critical Alerts (${analysis.criticalAlerts.length})`, {
      x: 0.5, y: 0.3, w: 12, h: 0.6,
      fontSize: 22, bold: true, color: redHex,
    });

    const rows: PptxGenJS.TableRow[] = [
      [
        { text: 'Score', options: { bold: true, color: whiteHex, fill: { color: '1E2430' }, fontSize: 9 } },
        { text: 'Topic', options: { bold: true, color: whiteHex, fill: { color: '1E2430' }, fontSize: 9 } },
        { text: 'Source', options: { bold: true, color: whiteHex, fill: { color: '1E2430' }, fontSize: 9 } },
        { text: 'Feedback', options: { bold: true, color: whiteHex, fill: { color: '1E2430' }, fontSize: 9 } },
      ],
    ];

    analysis.criticalAlerts.slice(0, 8).forEach(alert => {
      rows.push([
        { text: alert.sentimentScore?.toFixed(2) || '', options: { color: redHex, fontSize: 8 } },
        { text: alert.topic || 'General', options: { color: grayHex, fontSize: 8 } },
        { text: alert.source, options: { color: grayHex, fontSize: 8 } },
        { text: alert.translatedText.slice(0, 120), options: { color: whiteHex, fontSize: 8 } },
      ]);
    });

    slide6.addTable(rows, {
      x: 0.5, y: 1.2, w: 12,
      border: { type: 'solid', pt: 0.5, color: '2A3040' },
      colW: [1, 2, 1.5, 7.5],
      rowH: 0.4,
      fill: { color: bgColor },
    });
  }

  await pptx.writeFile({ fileName: 'feedback_analysis_report.pptx' });
}
