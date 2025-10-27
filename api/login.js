// /api/login.js
//
// Cek username & password admin dari ENV Vercel.
// Jika benar, balikan token rahasia (ADMIN_TOKEN).
//
// ENV yang dibutuhkan:
//   ADMIN_USER
//   ADMIN_PASS
//   ADMIN_TOKEN

module.exports = async (req, res) => {
    // basic CORS (aman dipakai walau same-origin)
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

    if (req.method !== "POST") {
        return res
            .status(405)
            .json({ success: false, message: "Method not allowed" });
    }

    try {
        const { username, password } = req.body || {};

        if (
            username === process.env.ADMIN_USER &&
            password === process.env.ADMIN_PASS
        ) {
            return res.status(200).json({
                success: true,
                token: process.env.ADMIN_TOKEN,
            });
        }

        return res
            .status(401)
            .json({ success: false, message: "Unauthorized" });
    } catch (err) {
        console.error("login error:", err);
        return res
            .status(500)
            .json({ success: false, message: "Server error" });
    }
};
