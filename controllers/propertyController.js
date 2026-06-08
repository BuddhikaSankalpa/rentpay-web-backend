import { supabase } from "../supabaseClient.js";

// ─────────────────────────────────────────────
// ADD ROOMS (Admin only)
// ─────────────────────────────────────────────
export async function createRoom(req, res) {
    try {
        if (!req.user || !req.user.isAdmin) {
            return res.status(403).json({ message: "Access denied. Admins only." });
        }

        const { roomNumber, roomType, capacity, facilities, floor, wing, monthlyRent, image } = req.body;

        const { error } = await supabase
            .from('rooms')
            .insert([{
                room_number: roomNumber,
                room_type: roomType,
                capacity: capacity,
                facilities: facilities,
                floor: floor,
                wing: wing,
                monthly_rent: monthlyRent,
                image: image || '/default-room.jpg'
            }]);

        if (error) throw error;
        return res.status(201).json({ message: "Room created successfully" });

    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

// ─────────────────────────────────────────────
// GET ALL ROOMS DETAILS (with active occupants count)
// ─────────────────────────────────────────────
export async function getAllRooms(req, res) {
    try {
        // Step 1: Rooms ඔක්කොම ගන්නවා
        const { data: rooms, error } = await supabase
            .from('rooms')
            .select('*')
            .order('room_number', { ascending: true });

        if (error) throw error;

        // Step 2: හැම room එකකටම active occupants count එකක් ගන්නවා
        const roomsWithOccupants = await Promise.all(
            rooms.map(async (room) => {
                const { count, error: countError } = await supabase
                    .from('leases')
                    .select('*', { count: 'exact', head: true })
                    .eq('room_id', room.id)
                    .eq('status', 'active');

                const occupantCount = countError ? 0 : (count || 0);
                const totalPayment = occupantCount * Number(room.monthly_rent || 0);

                return {
                    ...room,
                    occupant_count: occupantCount,
                    total_payment: totalPayment
                };
            })
        );

        return res.status(200).json(roomsWithOccupants);

    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

// ─────────────────────────────────────────────
// DELETE ROOMS (Admin only)
// ─────────────────────────────────────────────
export async function deleteRoom(req, res) {
    try {
        if (!req.user || !req.user.isAdmin) {
            return res.status(403).json({ message: "Access denied." });
        }

        const { id } = req.params;
        const { error } = await supabase.from('rooms').delete().eq('id', id);

        if (error) throw error;
        return res.status(200).json({ message: "Room deleted successfully" });

    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

// ─────────────────────────────────────────────
// UPDATE ROOMS (Admin only)
// ─────────────────────────────────────────────
export async function updateRoom(req, res) {
    try {
        if (!req.user || !req.user.isAdmin) {
            return res.status(403).json({ message: "Access denied." });
        }

        const { id } = req.params;
        // 👇 මෙතනට 'image' අලුතින් එකතු කළා
        const { roomNumber, roomType, capacity, facilities, floor, wing, monthlyRent, isAvailable, image } = req.body;

        const { error } = await supabase
            .from('rooms')
            .update({
                room_number: roomNumber,
                room_type: roomType,
                capacity: capacity,
                facilities: facilities,
                floor: floor,
                wing: wing,
                monthly_rent: monthlyRent,
                is_available: isAvailable,
                // 👇 Edit කරද්දිත් Image එක Save වෙන්න මේක දැම්මා
                image: image || '/default-room.jpg' 
            })
            .eq('id', id);

        if (error) throw error;
        return res.status(200).json({ message: "Room updated successfully" });

    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}