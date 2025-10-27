// /api/portfolio.js
//
// GET  -> baca data portofolio dari JSONBin (private)
// PUT  -> update data portofolio ke JSONBin (butuh auth token)
//
// ENV yang dibutuhkan:
//   JSONBIN_BIN_ID        (contoh: "66f123abc123...")
//   JSONBIN_SECRET_KEY    (X-Master-Key dari JSONBin)
//   ADMIN_TOKEN           (harus sama dengan login.js)

module.exports = async (req, res) => {
    // CORS
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

    // ===== READ (GET) =====
    if (req.method === "GET") {
        try {
            const r = await fetch(`${BASE_URL}/latest`, {
                method: "GET",
                headers: {
                    "X-Master-Key": MASTER_KEY,
                },
            });

            const json = await r.json();
            // JSONBin balikin {record:{...}, metadata:{...}}
            const record = json.record || json;

            return res.status(200).json(record);
        } catch (err) {
            console.error("GET portfolio error:", err);
            return res.status(500).json({
                success: false,
                message: "Gagal mengambil data",
            });
        }
    }

    // ===== UPDATE (PUT) =====
    if (req.method === "PUT") {
        // cek token admin
        const authHeader = req.headers.authorization || "";
        const givenToken = authHeader.replace("Bearer ", "").trim();

        if (givenToken !== process.env.ADMIN_TOKEN) {
            return res
                .status(401)
                .json({ success: false, message: "Unauthorized" });
        }

        try {
            const { bitcoin, saham, rupiah, dolar } = req.body || {};

            // format data yang mau disimpan ke JSONBin
            const newRecord = {
                portfolio: [
                    { label: "Bitcoin", value_idr: Number(bitcoin || 0) },
                    { label: "Saham", value_idr: Number(saham || 0) },
                    { label: "Rupiah", value_idr: Number(rupiah || 0) },
                    { label: "Dolar", value_idr: Number(dolar || 0) },
                ],
                lastUpdate: new Date().toISOString(),
            };

            const putRes = await fetch(`${BASE_URL}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "X-Master-Key": MASTER_KEY,
                    "X-Bin-Versioning": "false", // supaya ga numpuk versi
                },
                body: JSON.stringify(newRecord),
            });

            const updatedJson = await putRes.json();
            const updatedRecord = updatedJson.record || updatedJson;

            return res.status(200).json(updatedRecord);
        } catch (err) {
            console.error("PUT portfolio error:", err);
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
