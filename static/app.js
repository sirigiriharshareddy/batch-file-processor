/**
 * Batch File Processor — Frontend Logic
 * Communicates with the Flask backend via REST API.
 */

const API = "http://127.0.0.1:5000";

// ── Utilities ──────────────────────────────────────────────────────────────

function ts() {
  return new Date().toLocaleTimeString("en-IN", { hour12: false });
}

function log(msg, type = "info") {
  const console_ = document.getElementById("logConsole");
  const logSection = document.getElementById("logSection");
  logSection.style.display = "block";

  const line = document.createElement("div");
  line.className = `log-line ${type}`;
  line.innerHTML = `<span class="ts">[${ts()}]</span>${escapeHtml(msg)}`;
  console_.appendChild(line);
  console_.scrollTop = console_.scrollHeight;
}

function clearLogs() {
  document.getElementById("logConsole").innerHTML = "";
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function toast(msg, type = "") {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.className = `toast show ${type}`;
  setTimeout(() => { el.className = "toast"; }, 3500);
}

function setProgress(pct, label = "") {
  const section = document.getElementById("progressSection");
  section.style.display = "block";
  document.getElementById("progressBar").style.width = pct + "%";
  document.getElementById("progressPct").textContent = pct + "%";
  if (label) document.getElementById("progressLabel").textContent = label;
}

function animateCount(elId, target, duration = 900) {
  const el = document.getElementById(elId);
  const start = 0;
  const step = 16;
  const steps = Math.ceil(duration / step);
  let current = start;
  let count = 0;

  const timer = setInterval(() => {
    count++;
    current = Math.round(start + (target - start) * (count / steps));
    el.textContent = current.toLocaleString();
    if (count >= steps) {
      el.textContent = target.toLocaleString();
      clearInterval(timer);
    }
  }, step);
}

// ── Server Health Check ────────────────────────────────────────────────────

async function checkHealth() {
  const dot   = document.getElementById("statusDot");
  const label = document.getElementById("statusLabel");
  try {
    const res = await fetch(`${API}/api/health`, { method: "GET" });
    if (res.ok) {
      dot.className = "status-dot online";
      label.textContent = "Server Online";
      log("✅ Connected to Batch Processor server.", "success");
    } else {
      throw new Error("Non-OK status");
    }
  } catch {
    dot.className = "status-dot offline";
    label.textContent = "Server Offline";
    log("⚠ Could not connect to server. Make sure app.py is running on port 5000.", "warn");
  }
}

// ── Detect Files ───────────────────────────────────────────────────────────

async function detectFiles() {
  const btn = document.getElementById("btnDetect");
  const inputDir = document.getElementById("inputDir").value.trim() || "data";

  btn.disabled = true;
  btn.innerHTML = '<span class="btn-icon">⏳</span> Scanning…';
  log(`🔍 Scanning directory: ${inputDir}`, "info");

  try {
    const res  = await fetch(`${API}/api/files`);
    const data = await res.json();

    if (!data.success) {
      log(`❌ ${data.error}`, "error");
      toast("No files found or directory missing.", "error");
      return;
    }

    renderFileList(data.files);
    document.getElementById("fileCount").textContent = `${data.count} file${data.count !== 1 ? "s" : ""}`;
    document.getElementById("fileSection").style.display = "block";
    document.getElementById("btnProcess").disabled = false;

    log(`📋 Found ${data.count} CSV file(s) ready for processing.`, "success");
    toast(`${data.count} file(s) detected!`, "success");

  } catch (err) {
    log(`❌ Network error: ${err.message}`, "error");
    toast("Could not reach server.", "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span class="btn-icon">🔍</span> Detect Files';
  }
}

function renderFileList(files) {
  const list = document.getElementById("fileList");
  list.innerHTML = "";
  files.forEach((f, i) => {
    const item = document.createElement("div");
    item.className = "file-item";
    item.style.animationDelay = `${i * 60}ms`;
    item.innerHTML = `
      <span class="file-item-icon">📄</span>
      <span class="file-item-name">${escapeHtml(f.name)}</span>
      <span class="file-item-size">${f.size_kb} KB</span>
    `;
    list.appendChild(item);
  });
}

// ── Run Processor ──────────────────────────────────────────────────────────

async function runProcessor() {
  const btnProcess = document.getElementById("btnProcess");
  const btnDetect  = document.getElementById("btnDetect");
  const inputDir   = document.getElementById("inputDir").value.trim()  || "data";
  const outputPath = document.getElementById("outputPath").value.trim() || "final_output.csv";

  // Reset previous results
  document.getElementById("statsSection").style.display = "none";
  document.getElementById("outputBanner").textContent = "";

  btnProcess.disabled = true;
  btnDetect.disabled  = true;
  btnProcess.innerHTML = '<span class="btn-icon">⏳</span> Processing…';

  // Progress animation
  setProgress(0, "Starting pipeline…");
  log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", "info");
  log("▶ Batch File Processor started.", "info");

  const progressSteps = [
    [10, "Discovering CSV files…"],
    [30, "Loading and reading files…"],
    [55, "Combining DataFrames…"],
    [75, "Removing duplicates…"],
    [90, "Saving final_output.csv…"],
  ];

  // Animate progress through steps while the API call runs
  let stepIdx = 0;
  const progressTimer = setInterval(() => {
    if (stepIdx < progressSteps.length) {
      const [pct, label] = progressSteps[stepIdx++];
      setProgress(pct, label);
      log(`⟶ ${label}`, "info");
    }
  }, 400);

  try {
    const res  = await fetch(`${API}/api/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input_dir: inputDir, output_path: outputPath }),
    });
    const data = await res.json();

    clearInterval(progressTimer);

    if (!data.success) {
      setProgress(0, "Failed");
      log(`❌ Error: ${data.error}`, "error");
      toast("Processing failed. Check logs.", "error");
      return;
    }

    setProgress(100, "Complete ✅");
    log("✅ Processing complete!", "success");
    renderResults(data.stats, outputPath);
    toast("Processing complete! Output saved.", "success");

  } catch (err) {
    clearInterval(progressTimer);
    setProgress(0, "Network error");
    log(`❌ Network error: ${err.message}`, "error");
    toast("Could not reach server.", "error");
  } finally {
    btnProcess.disabled = false;
    btnDetect.disabled  = false;
    btnProcess.innerHTML = '<span class="btn-icon">▶</span> Run Processor';
  }
}

// ── Render Results ─────────────────────────────────────────────────────────

function renderResults(stats, outputPath) {
  const section = document.getElementById("statsSection");
  section.style.display = "block";

  // Animate stat counters
  animateCount("valFilesProcessed", stats.files_processed);
  animateCount("valRecordsBefore",  stats.records_before);
  animateCount("valRecordsAfter",   stats.records_after);
  animateCount("valDuplicates",     stats.duplicates_removed);

  // Timing badge
  document.getElementById("timingBadge").textContent = `⏱ ${stats.elapsed_seconds}s`;

  // Per-file table
  const tbody = document.getElementById("tableBody");
  tbody.innerHTML = "";
  let rowNum = 1;

  for (const [fname, count] of Object.entries(stats.per_file_rows)) {
    const isOk = count > 0;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${rowNum++}</td>
      <td>${escapeHtml(fname)}</td>
      <td>${count.toLocaleString()}</td>
      <td><span class="${isOk ? "badge-ok" : "badge-skip"}">${isOk ? "✓ OK" : "⚠ Skipped"}</span></td>
    `;
    tbody.appendChild(tr);
  }

  // Output path banner
  const banner = document.getElementById("outputBanner");
  banner.textContent = `💾 Output saved → ${stats.output_path || outputPath}`;

  // Log summary
  log(`━━━ SUMMARY ━━━`, "success");
  log(`📁 Files processed : ${stats.files_processed} / ${stats.files_found}`, "success");
  log(`📊 Records before  : ${stats.records_before}`, "info");
  log(`✨ Records after   : ${stats.records_after}`, "success");
  log(`🗑️  Duplicates removed: ${stats.duplicates_removed}`, "warn");
  log(`⏱  Elapsed         : ${stats.elapsed_seconds}s`, "info");
  log(`💾 Saved to        : ${stats.output_path}`, "success");

  // Scroll to results
  section.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ── Init ───────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  checkHealth();

  // Allow pressing Enter in inputs to trigger detect
  document.getElementById("inputDir").addEventListener("keydown", e => {
    if (e.key === "Enter") detectFiles();
  });
});
