import { supabase } from "../supabaseClient.js";

// ─────────────────────────────────────────────
// GIVE ROOMS TO STUDENTS (Admin only)
// ─────────────────────────────────────────────
export async function createLease(req, res) {
    try {
        if (!req.user || !req.user.isAdmin) return res.status(403).json({ message: "Admins only." });

        const { userId, roomId, joinedDate, keyMoney } = req.body;

        // 1. මේ ළමයාට දැනටමත් Active කාමරයක් තියෙනවද බලනවා
        const { data: existingLease } = await supabase
            .from('leases')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'active');

        if (existingLease && existingLease.length > 0) {
            return res.status(400).json({ message: "User already has an active room. End that lease first." });
        }

        // 2. අලුත් Lease එක හදනවා
        const { error } = await supabase
            .from('leases')
            .insert([{
                user_id: userId,
                room_id: roomId,
                joined_date: joinedDate,
                key_money: keyMoney || 0,
                status: 'active'
            }]);

        if (error) throw error;
        return res.status(201).json({ message: "Room assigned to student successfully" });

    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

// ─────────────────────────────────────────────
// FIND ROOMS HISTORY (Admin /user can only see their own history)
// ─────────────────────────────────────────────
export async function getUserLeaseHistory(req, res) {
    try {
        const userId = req.params.userId || req.user.id;

        // Supabase Join Query: කාමරේ විස්තරත් එක්කම ගන්නවා
        const { data: leases, error } = await supabase
            .from('leases')
            .select(`
                *,
                rooms (room_number, room_type, floor, wing)
            `)
            .eq('user_id', userId)
            .order('joined_date', { ascending: false });

        if (error) throw error;
        return res.status(200).json(leases);

    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

// ─────────────────────────────────────────────
// RECORDING A STUDENT LEAVEING THE ROOM (Admin only)
// ─────────────────────────────────────────────
export async function endLease(req, res) {
    try {
        if (!req.user || !req.user.isAdmin) return res.status(403).json({ message: "Admins only." });

        const { leaseId } = req.params;
        const leftDate = new Date().toISOString().split('T')[0]; // අද දවස ගන්නවා

        const { error } = await supabase
            .from('leases')
            .update({ status: 'completed', left_date: leftDate })
            .eq('id', leaseId);

        if (error) throw error;
        return res.status(200).json({ message: "Lease ended successfully. History saved." });

    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

// ─────────────────────────────────────────────
// GET ACTIVE LEASE FOR A USER
// ─────────────────────────────────────────────
export async function getActiveLease(req, res) {
    try {
        const userId = req.params.userId;

        if (!req.user || (!req.user.isAdmin && req.user.id !== parseInt(userId))) {
            return res.status(403).json({ message: "Access denied" });
        }

        const { data: lease, error } = await supabase
            .from('leases')
            .select(`
                *,
                rooms (id, room_number, room_type, floor, monthly_rent)
            `)
            .eq('user_id', userId)
            .eq('status', 'active')
            .maybeSingle();  // single() වෙනුවට maybeSingle() — lease නැත්නම් error throw නොකරයි

        if (error) throw error;

        return res.status(200).json({ lease: lease || null });

    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}




// leaseController.js
export async function getMyRoomDetails(req, res) {
    try {
        const userId = req.user.id;

        // 1. User ගේ active lease + room details
        const { data: lease, error } = await supabase
            .from('leases')
            .select(`
                *,
                rooms (*)
            `)
            .eq('user_id', userId)
            .eq('status', 'active')
            .maybeSingle();

        if (error) throw error;
        if (!lease) return res.status(404).json({ message: "No active room found" });

        // 2. Same room ල ඉන්න roommates (user ම exclude)
        const { data: roommates, error: rmError } = await supabase
            .from('leases')
            .select(`
                id,
                joined_date,
                users (id, first_name, last_name, university, phone_number, image)
            `)
            .eq('room_id', lease.room_id)
            .eq('status', 'active')
            .neq('user_id', userId);

        if (rmError) throw rmError;

        return res.status(200).json({
            lease,
            room: lease.rooms,
            roommates: roommates || []
        });

    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}