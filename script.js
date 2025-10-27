// ===== FORMAT & UTIL =====

// Format angka jadi "Rp 1.234.567"
function rupiah(num) {
    const n = Number(num) || 0;
    return (
        "Rp " +
        n.toLocaleString("id-ID", {
            maximumFractionDigits: 0,
        })
    );
}

// Format input angka menjadi "1.234.567"
function formatWithDots(raw) {
    if (typeof raw !== "string") raw = String(raw ?? "");
    const digitsOnly = raw.replace(/[^\d]/g, "");
    if (!digitsOnly) return "";
    return digitsOnly.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Ubah "1.234.567" -> 1234567 (number)
function parseToNumber(raw) {
    if (typeof raw !== "string") raw = String(raw ?? "");
    const digitsOnly = raw.replace(/[^\d]/g, "");
    return Number(digitsOnly || 0);
}

// ===== GLOBAL STATE =====
let token = localStorage.getItem("token") || null;
let portfolioData = []; // [{label:"Bitcoin", value_idr:12345}, ...]
let chartInstance = null;

document.addEventListener("DOMContentLoaded", () => {
    syncAuthUI();
    loadPortfolio();
    setupEventListeners();
});

// ================= AUTH UI =================
function syncAuthUI() {
    const loginBtn = document.getElementById("loginBtn");
    const logoutBtn = document.getElementById("logoutBtn");
    const adminPanel = document.getElementById("adminPanel");
    const loginStatusTag = document.getElementById("loginStatusTag");

    if (token) {
        loginBtn.classList.add("hidden");
        logoutBtn.classList.remove("hidden");
        adminPanel.classList.remove("hidden");

        loginStatusTag.textContent = "Admin";
        loginStatusTag.classList.add("tag-green-soft");
    } else {
        loginBtn.classList.remove("hidden");
        logoutBtn.classList.add("hidden");
        adminPanel.classList.add("hidden");

        loginStatusTag.textContent = "Guest";
        loginStatusTag.classList.remove("tag-green-soft");
    }
}

// ================= EVENT LISTENERS =================
function setupEventListeners() {
    // buka modal login
    document.getElementById("loginBtn").addEventListener("click", () => {
        document.getElementById("loginModal").classList.remove("hidden");
    });

    // tutup modal login
    document.getElementById("closeLogin").addEventListener("click", () => {
        closeLoginModal();
    });

    // logout
    document.getElementById("logoutBtn").addEventListener("click", () => {
        localStorage.removeItem("token");
        token = null;
        syncAuthUI();
    });

    // submit login
    document
        .getElementById("loginForm")
        .addEventListener("submit", async (e) => {
            e.preventDefault();

            const username = document
                .getElementById("username")
                .value.trim();
            const password = document
                .getElementById("password")
                .value.trim();

            setLoginStatus("Memproses...");

            try {
                const res = await fetch("/api/login", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ username, password }),
                });

                const data = await res.json();

                if (data.success) {
                    token = data.token;
                    localStorage.setItem("token", token);

                    setLoginStatus("Berhasil login ✅");
                    closeLoginModal();
                    syncAuthUI();
                    renderEditorRows(); // tampilkan editor aset
                } else {
                    setLoginStatus("Gagal login ❌");
                }
            } catch (err) {
                console.error(err);
                setLoginStatus("Error koneksi");
            }
        });

    // submit update portofolio (simpan perubahan)
    document
        .getElementById("updateForm")
        .addEventListener("submit", async (e) => {
            e.preventDefault();
            setSaveStatus("Menyimpan...");

            // ambil semua baris aset dari editor
            const rows = document.querySelectorAll(
                "#assetEditorWrapper .asset-row"
            );

            const assetsPayload = [];
            rows.forEach((row) => {
                const nameInput = row.querySelector(".asset-name-input");
                const valueInput = row.querySelector(".asset-value-input");

                const nama = nameInput.value.trim();
                const nilai = parseToNumber(valueInput.value);

                if (nama !== "") {
                    assetsPayload.push({
                        label: nama,
                        value_idr: nilai,
                    });
                }
            });

            try {
                const res = await fetch("/api/portfolio", {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: "Bearer " + token,
                    },
                    body: JSON.stringify({ assets: assetsPayload }),
                });

                const data = await res.json();

                if (res.ok) {
                    setSaveStatus("Tersimpan ✅");

                    portfolioData = data.portfolio || [];
                    renderAll(data);
                    renderEditorRows();
                } else {
                    setSaveStatus(
                        "Gagal simpan ❌ " + (data.message || "")
                    );
                }
            } catch (err) {
                console.error(err);
                setSaveStatus("Error koneksi");
            }
        });

    // tombol tambah aset baru
    document
        .getElementById("addAssetBtn")
        .addEventListener("click", () => {
            portfolioData.push({
                label: "",
                value_idr: 0,
            });
            renderEditorRows();
        });
}

// ================= HELPERS UI =================
function closeLoginModal() {
    document.getElementById("loginModal").classList.add("hidden");
    document.getElementById("loginForm").reset();
    setLoginStatus("");
}

function setLoginStatus(msg) {
    document.getElementById("loginStatus").textContent = msg;
}

function setSaveStatus(msg) {
    document.getElementById("saveStatus").textContent = msg;
}

// ================= LOAD DATA (GET) =================
async function loadPortfolio() {
    try {
        const res = await fetch("/api/portfolio");
        const data = await res.json();

        portfolioData = data.portfolio || [];
        renderAll(data);
        renderEditorRows();
    } catch (err) {
        console.error("Gagal load data /api/portfolio", err);
    }
}

// ================= RENDER PUBLIC VIEW =================
function renderAll(rawData) {
    const total = portfolioData.reduce(
        (sum, a) => sum + Number(a.value_idr || 0),
        0
    );

    // Total Aset
    document.getElementById("totalAset").textContent = rupiah(total);

    // Last Update
    if (rawData.lastUpdate) {
        const t = new Date(rawData.lastUpdate).toLocaleString("id-ID", {
            dateStyle: "short",
            timeStyle: "short",
        });
        document.getElementById("lastUpdate").textContent = t;
    }

    // Tabel detail aset
    const tbody = document.getElementById("assetTableBody");
    tbody.innerHTML = "";

    const labels = [];
    const pcts = [];

    portfolioData.forEach((asset) => {
        const val = Number(asset.value_idr || 0);
        const pct = total > 0 ? (val / total) * 100 : 0;

        labels.push(asset.label);
        pcts.push(Number(pct.toFixed(2)));

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td class="asset-name">${asset.label}</td>
            <td>${rupiah(val)}</td>
            <td>${pct.toFixed(2)}%</td>
        `;
        tbody.appendChild(tr);
    });

    // Chart donat
    renderChart(labels, pcts);
}

// ================= CHART =================
function renderChart(labels, dataArr) {
    const ctx = document
        .getElementById("portfolioChart")
        .getContext("2d");

    if (chartInstance) {
        chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels,
            datasets: [
                {
                    data: dataArr,
                    backgroundColor: [
                        "rgba(0,255,135,0.6)",
                        "rgba(0,140,255,0.6)",
                        "rgba(255,255,255,0.25)",
                        "rgba(255,200,0,0.6)",
                        "rgba(255,0,180,0.5)",
                        "rgba(160,0,255,0.5)"
                    ],
                    borderColor: [
                        "rgba(0,255,135,1)",
                        "rgba(0,140,255,1)",
                        "rgba(255,255,255,0.5)",
                        "rgba(255,200,0,1)",
                        "rgba(255,0,180,0.8)",
                        "rgba(160,0,255,0.8)"
                    ],
                    borderWidth: 2,
                    cutout: "60%",
                },
            ],
        },
        options: {
            plugins: {
                legend: {
                    position: "bottom",
                    labels: {
                        color: "#e5e7eb",
                        font: {
                            size: 12,
                            family: "Inter",
                        },
                    },
                },
            },
        },
    });
}

// ================= ADMIN EDITOR RENDER =================
function renderEditorRows() {
    if (!token) return; // kalau belum login, jangan render editor

    const wrapper = document.getElementById("assetEditorWrapper");
    if (!wrapper) return;

    wrapper.innerHTML = "";

    portfolioData.forEach((asset, idx) => {
        const row = document.createElement("div");
        row.className = "asset-row";

        row.innerHTML = `
            <div class="col-label">
                <div class="row-label-title">Nama Aset</div>
                <input
                    type="text"
                    class="inp-name asset-name-input"
                    value="${asset.label || ""}"
                />
            </div>

            <div class="col-value">
                <div class="row-label-title">Nilai (Rp)</div>
                <input
                    type="text"
                    class="inp-value asset-value-input"
                    value="${formatWithDots(asset.value_idr || 0)}"
                />
            </div>

            <button
                type="button"
                class="remove-btn"
                data-index="${idx}"
                title="Hapus aset"
            >
                <i class="bx bx-trash"></i>
            </button>
        `;

        wrapper.appendChild(row);
    });

    attachRowEvents();
}

// tambahkan listener utk hapus row & formatting angka ribuan
function attachRowEvents() {
    // tombol hapus
    document.querySelectorAll(".remove-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const idx = Number(btn.getAttribute("data-index"));
            portfolioData.splice(idx, 1);
            renderEditorRows();
        });
    });

    // auto-format angka ribuan (1.000.000)
    document.querySelectorAll(".asset-value-input").forEach((inp) => {
        inp.addEventListener("input", (e) => {
            e.target.value = formatWithDots(e.target.value);
        });
    });
}
