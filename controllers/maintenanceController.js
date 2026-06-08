import { supabase } from "../supabaseClient.js";

// ─────────────────────────────────────────────
// POST /maintenance  →  User creates a new ticket
// ─────────────────────────────────────────────
export async function createTicket(req, res) {
    try {
        const userId = req.user.id;
        const { category, subject, description } = req.body;

        if (!category || !subject || !description) {
            return res.status(400).json({ message: "All fields are required." });
        }

        const { data, error } = await supabase
            .from('maintenance')
            .insert([{
                user_id: userId,
                category,
                subject: subject.trim(),
                description: description.trim(),
                status: 'pending'
            }])
            .select()
            .single();

        if (error) throw error;
        return res.status(201).json(data);

    } catch (err) {
        console.error('createTicket error:', err);
        return res.status(500).json({ message: err.message });
    }
}

// ─────────────────────────────────────────────
// GET /maintenance/my  →  Logged-in user's tickets
// ─────────────────────────────────────────────
export async function getMyTickets(req, res) {
    try {
        const userId = req.user.id;

        const { data, error } = await supabase
            .from('maintenance')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return res.status(200).json(data || []);

    } catch (err) {
        console.error('getMyTickets error:', err);
        return res.status(500).json({ message: err.message });
    }
}

// ─────────────────────────────────────────────
// GET /maintenance  →  Admin: all tickets with student + room info
// ─────────────────────────────────────────────
export async function getAllTickets(req, res) {
    try {
        if (!req.user || !req.user.isAdmin) {
            return res.status(403).json({ message: "Admins only." });
        }

        const { data, error } = await supabase
            .from('maintenance')
            .select(`
                *,
                users (id, first_name, last_name, phone_number)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Each ticket walata current room number ekak join karanawa active lease eken
        // (eka separate query ekak — tickets thiyena user IDs okkomata witharai)
        const userIds = [...new Set((data || []).map(t => t.user_id))];

        let userRoomMap = {};
        if (userIds.length > 0) {
            const { data: leases } = await supabase
                .from('leases')
                .select('user_id, rooms (room_number)')
                .in('user_id', userIds)
                .eq('status', 'active');

            (leases || []).forEach(l => {
                userRoomMap[l.user_id] = l.rooms?.room_number || '—';
            });
        }

        const enriched = (data || []).map(t => ({
            ...t,
            roomNumber: userRoomMap[t.user_id] || '—'
        }));

        return res.status(200).json(enriched);

    } catch (err) {
        console.error('getAllTickets error:', err);
        return res.status(500).json({ message: err.message });
    }
}

// ─────────────────────────────────────────────
// PATCH /maintenance/:id/status  →  Update status
// Body: { status }
// Permissions enforced based on role + transition
// ─────────────────────────────────────────────
export async function updateTicketStatus(req, res) {
    try {
        const { id } = req.params;
        const { status: newStatus } = req.body;

        const validStatuses = ['pending', 'in_progress', 'done', 'closed'];
        if (!validStatuses.includes(newStatus)) {
            return res.status(400).json({ message: "Invalid status." });
        }

        // Ticket eka load karanawa, permission check karanna
        const { data: ticket, error: fetchErr } = await supabase
            .from('maintenance')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchErr || !ticket) {
            return res.status(404).json({ message: "Ticket not found." });
        }

        const isAdmin = req.user.isAdmin;
        const isOwner = ticket.user_id === req.user.id;
        const currentStatus = ticket.status;

        // ─── Transition rules ───
        // Admin: pending → in_progress (Start Working)
        // User:  in_progress → done (Mark as Done)
        // Admin: done → closed (Close ticket)
        let allowed = false;

        if (isAdmin && currentStatus === 'pending' && newStatus === 'in_progress') allowed = true;
        if (isOwner && currentStatus === 'in_progress' && newStatus === 'done') allowed = true;
        if (isAdmin && currentStatus === 'done' && newStatus === 'closed') allowed = true;

        // Admin emergency override — pending ekenma kelinma close karanna ona unath
        if (isAdmin && newStatus === 'closed' && currentStatus !== 'closed') allowed = true;

        if (!allowed) {
            return res.status(403).json({
                message: `Cannot transition from "${currentStatus}" to "${newStatus}".`
            });
        }

        // ─── Timestamp set kerma ───
        const updates = { status: newStatus };
        if (newStatus === 'in_progress') updates.started_at = new Date().toISOString();
        if (newStatus === 'done') updates.done_at = new Date().toISOString();
        if (newStatus === 'closed') updates.closed_at = new Date().toISOString();

        const { data, error } = await supabase
            .from('maintenance')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return res.status(200).json(data);

    } catch (err) {
        console.error('updateTicketStatus error:', err);
        return res.status(500).json({ message: err.message });
    }
}