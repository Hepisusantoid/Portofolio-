// /api/portfolio.js
//
// GET  -> baca data portofolio dari JSONBin (private)
// PUT  -> update data portofolio ke JSONBin (butuh auth token)
//
// ENV yang dibutuhkan di Vercel:
//   JSONBIN_BIN_ID
//   JSONBIN_SECRET_KEY
//   ADMIN_TOKEN

module.exports = async (req, res) => {
    // CORS basic
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization"
    );
    res.setHeader(
        "Access-Control-Allow-Methods",
        "GET,POST,PUT,OPTIONS"
    );

    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    const BIN_ID = process.env.JSONBIN_BIN_ID;
    const MASTER_KEY = process.env.JSONBIN_SECRET_KEY;
    const BASE_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

    if (!BIN_ID || !MASTER_KEY) {
        return res.status(500).json({
            success: false,
            message: "Server ENV JSONBin belum di-setup",
        });
    }

    // ====== GET: ambil data portofolio ======
    if (req.method === "GET") {
        try {
            const r = await fetch(`${BASE_URL}/latest`, {
                method: "GET",
                headers: {
                    "X-Master-Key": MASTER_KEY,
                },
            });

            const json = await r.json();
            // response JSONBin biasanya {record:{...}, metadata:{...}}
            const record = json.record || json;

            return res.status(200).json(record);
        } catch (err) {
            console.error("GET /api/portfolio error:", err);
            return res.status(500).json({
                success: false,
                message: "Gagal mengambil data",
            });
        }
    }

    // ====== PUT: update data portofolio ======
    if (req.method === "PUT") {
        // cek token admin dari header Authorization
        const authHeader = req.headers.authorization || "";
        const givenToken = authHeader.replace("Bearer ", "").trim();

        if (givenToken !== process.env.ADMIN_TOKEN) {
            return res
                .status(401)
                .json({ success: false, message: "Unauthorized" });
        }

        try {
            const { assets } = req.body || {};

            // normalisasi data dari frontend
            const cleanAssets = Array.isArray(assets)
                ? assets.map((a) => ({
                      label: String(a.label || "").trim(),
                      value_idr: Number(a.value_idr || 0),
                  }))
                : [];

            const newRecord = {
                portfolio: cleanAssets,
                lastUpdate: new Date().toISOString(),
            };

            // simpan ke JSONBin (overwrite)
            const putRes = await fetch(`${BASE_URL}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "X-Master-Key": MASTER_KEY,
                    "X-Bin-Versioning": "false"
                },
                body: JSON.stringify(newRecord),
            });

            const updatedJson = await putRes.json();
            const updatedRecord = updatedJson.record || updatedJson;

            return res.status(200).json(updatedRecord);
        } catch (err) {
            console.error("PUT /api/portfolio error:", err);
            return res.status(500).json({
                success: false,
                message: "Gagal update data",
            });
        }
    }

    // method lain
    return res
        .status(405)
        .json({ success: false, message: "Method not allowed" });
};
