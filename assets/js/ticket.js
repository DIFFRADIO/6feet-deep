/* 6FEET Deep tickets: QR (qrcode-generator) + PDF (jsPDF). Needs qrcode.js loaded first; jsPDF is lazy-loaded. */
(function () {
  const BASE = (document.currentScript && document.currentScript.src.replace(/js\/ticket\.js.*$/, "")) || "../assets/";

  function qrMatrix(text) {
    const q = qrcode(0, "M"); q.addData(text); q.make();
    const n = q.getModuleCount(), m = [];
    for (let r = 0; r < n; r++) { m.push([]); for (let c = 0; c < n; c++) m[r].push(q.isDark(r, c)); }
    return m;
  }
  function qrSvg(text) {
    const m = qrMatrix(text), n = m.length, pad = 4, s = n + pad * 2;
    let d = "";
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (m[r][c]) d += `M${c + pad},${r + pad}h1v1h-1z`;
    return `<svg viewBox="0 0 ${s} ${s}" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" role="img" aria-label="Ticket QR code"><rect width="${s}" height="${s}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
  }
  // jsPDF's align:center ignores charSpace, so centre spaced text ourselves
  function ctext(doc, s, cx, y, cs){ doc.setCharSpace(cs||0); const w = doc.getTextWidth(s) + (cs||0)*(s.length-1); doc.text(s, cx - w/2, y); doc.setCharSpace(0); }
  function fmtCode(c) { return c.replace(/(.{4})(.{3})(.{3})/, "$1 $2 $3"); }

  let jspdfP = null;
  function loadJsPDF() {
    if (window.jspdf) return Promise.resolve(window.jspdf);
    if (!jspdfP) jspdfP = new Promise((res, rej) => {
      const s = document.createElement("script"); s.src = BASE + "js/jspdf.umd.min.js";
      s.onload = () => res(window.jspdf); s.onerror = () => rej(new Error("jsPDF failed to load"));
      document.head.appendChild(s);
    });
    return jspdfP;
  }
  async function logoData() {
    const b = await (await fetch(BASE + "logo.png")).blob();
    return await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(b); });
  }

  /* info: {num, artist, dateLine, attendee, code, file} */
  async function ticketPdf(info) {
    const { jsPDF } = await loadJsPDF();
    const W = 90, H = 172, doc = new jsPDF({ unit: "mm", format: [W, H] });
    const cx = W / 2, orange = [234, 90, 12], red = [227, 22, 27], grey = [170, 170, 170];
    doc.setFillColor(0, 0, 0); doc.rect(0, 0, W, H, "F");
    try { doc.addImage(await logoData(), "PNG", cx - 8, 8, 16, 16.8); } catch (e) { console.error("[6FEET Deep] logo", e); }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5); doc.setTextColor(255, 255, 255);
    ctext(doc, "DIFF Radio presents", cx, 30, 0.5);
    doc.setFontSize(30); doc.setTextColor(...red); doc.text("6FEET", cx, 42, { align: "center" });
    doc.setTextColor(255, 255, 255); doc.text("DEEP", cx, 53, { align: "center" });
    doc.setFillColor(...orange); doc.rect(cx - 16, 56, 32, 0.9, "F");
    doc.setFontSize(16); doc.text(`${info.num} · ${info.artist.toUpperCase()}`, cx, 65, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...grey);
    ctext(doc, info.dateLine.toUpperCase(), cx, 71, 0.4);
    ctext(doc, "6FEET UNDER \u00B7 94 ST MARY'S ST, CARDIFF", cx, 75.5, 0.4);
    // QR on white card
    const box = 52, bx = cx - box / 2, by = 81;
    doc.setFillColor(255, 255, 255); doc.roundedRect(bx, by, box, box, 3, 3, "F");
    const m = qrMatrix("6FD:" + info.code), n = m.length, inner = box - 8, cell = inner / n;
    doc.setFillColor(0, 0, 0);
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (m[r][c]) doc.rect(bx + 4 + c * cell, by + 4 + r * cell, cell + 0.02, cell + 0.02, "F");
    doc.setFont("courier", "bold"); doc.setFontSize(10); doc.setTextColor(255, 255, 255);
    doc.text(fmtCode(info.code), cx, by + box + 6, { align: "center" });
    doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(...orange);
    ctext(doc, "ADMIT ONE", cx, by + box + 14, 1);
    doc.setFontSize(14); doc.setTextColor(255, 255, 255);
    doc.text(doc.splitTextToSize(info.attendee, W - 14)[0], cx, by + box + 21, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(6.5); doc.setTextColor(...grey);
    doc.text("Free entry · Invite only · 18+ · Bring photo ID", cx, H - 13, { align: "center" });
    doc.text("Non-transferable · Every set is filmed · @diff_radio", cx, H - 9, { align: "center" });
    const name = info.file || "6feet-deep-ticket.pdf";
    // Phones: open the share sheet so people can Save to Files / Photos / send it on. Desktop: normal download.
    try{
      const file = new File([doc.output("blob")], name, { type: "application/pdf" });
      if (navigator.canShare && navigator.canShare({ files: [file] }) && /iPhone|iPad|Android/i.test(navigator.userAgent)) {
        await navigator.share({ files: [file], title: "6FEET Deep ticket" });
        return;
      }
    }catch(e){ if (e && e.name === "AbortError") return; console.error("[6FEET Deep] share failed, downloading", e); }
    doc.save(name);
  }

  window.SixFD = { qrSvg, ticketPdf, fmtCode };
})();
