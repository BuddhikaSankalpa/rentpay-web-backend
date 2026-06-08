import { supabase } from "../supabaseClient.js";

// ─────────────────────────────────────────────
// GET /notices  →  Active (non-expired) notices for everyone
// ─────────────────────────────────────────────
export async function getNotices(req, res) {
    try {
        const { data, error } = await supabase
            .from('notices')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Expired ewa filter karanawa JS eken (PostgREST .or() ek timestamps walata kämathi nä)
        const now = new Date();
        const active = (data || []).filter(n =>
            !n.expires_at || new Date(n.expires_at) > now
        );

        return res.status(200).json(active);

    } catch (err) {
        console.error('getNotices error:', err);
        return res.status(500).json({ message: err.message });
    }
}

// ─────────────────────────────────────────────
// POST /notices  →  Create new notice (Admin only)
// Body: { title, message, type, expiresInDays }
// ─────────────────────────────────────────────
export async function createNotice(req, res) {
    try {
        if (!req.user || !req.user.isAdmin) {
            return res.status(403).json({ message: "Admins only." });
        }

        const { title, message, type, expiresInDays } = req.body;

        if (!title || !message) {
            return res.status(400).json({ message: "Title and message are required." });
        }

        // expiresInDays thiyenawa nam expires_at calculate karanawa
        let expires_at = null;
        if (expiresInDays && Number(expiresInDays) > 0) {
            const expiry = new Date();
            expiry.setDate(expiry.getDate() + Number(expiresInDays));
            expires_at = expiry.toISOString();
        }

        const { data, error } = await supabase
            .from('notices')
            .insert([{
                title,
                message,
                type: type || 'info',
                created_by: req.user.id,
                expires_at
            }])
            .select()
            .single();

        if (error) throw error;
        return res.status(201).json(data);

    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

// ─────────────────────────────────────────────
// DELETE /notices/:id  →  Admin only
// ─────────────────────────────────────────────
export async function deleteNotice(req, res) {
    try {
        if (!req.user || !req.user.isAdmin) {
            return res.status(403).json({ message: "Admins only." });
        }

        const { id } = req.params;

        const { error } = await supabase
            .from('notices')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return res.status(200).json({ message: "Notice deleted successfully." });

    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}