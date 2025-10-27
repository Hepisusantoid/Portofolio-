// ===== UTIL =====
const rupiah = (num) => {
    if (typeof num !== "number") num = Number(num) || 0;
    return (
        "Rp " +
        num.toLocaleString("id-ID", {
            maximumFractionDigits: 0,
        })
    );
};

let token = localStorage.getItem("token") || null;
let portfolioData = [];
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
                    prefillAdminForm();
                } else {
                    setLoginStatus("Gagal login ❌");
                }
            } catch (err) {
                console.error(err);
                setLoginStatus("Error koneksi");
            }
        });

    // submit update portofolio
    document
        .getElementById("updateForm")
        .addEventListener("submit", async (e) => {
            e.preventDefault();
            setSaveStatus("Menyimpan...");

            const bodyPayload = {
                bitcoin: Number(document.getElementById("btcInput").value),
                saham: Number(document.getElementById("stockInput").value),
                rupiah: Number(document.getElementById("idrInput").value),
                dolar: Number(document.getElementById("usdInput").value),
            };

            try {
                const res = await fetch("/api/portfolio", {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: "Bearer " + token,
                    },
                    body: JSON.stringify(bodyPayload),
                });

                const data = await res.json();

                if (res.ok) {
                    setSaveStatus("Tersimpan ✅");
                    portfolioData = data.portfolio;
                    renderAll(data);
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
        prefillAdminForm();
    } catch (err) {
        console.error("Gagal load data /api/portfolio", err);
    }
}

// ================= RENDER =================
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

    // Tabel
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

    // Chart
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
                    ],
                    borderColor: [
                        "rgba(0,255,135,1)",
                        "rgba(0,140,255,1)",
                        "rgba(255,255,255,0.5)",
                        "rgba(255,200,0,1)",
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

// ================= ADMIN PREFILL =================
function prefillAdminForm() {
    if (!token || !portfolioData.length) return;

    const findVal = (labelName) => {
        const found = portfolioData.find(
            (a) => a.label.toLowerCase() === labelName
        );
        return found ? found.value_idr : 0;
    };

    document.getElementById("btcInput").value = findVal("bitcoin");
    document.getElementById("stockInput").value = findVal("saham");
    document.getElementById("idrInput").value = findVal("rupiah");
    document.getElementById("usdInput").value = findVal("dolar");
}
