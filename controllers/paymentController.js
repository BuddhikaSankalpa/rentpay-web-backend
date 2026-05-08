import { supabase } from "../index.js";

// ─────────────────────────────────────────────
// ENTER MONTHLY BILL INTO THE SYSTEM   (Admin only)
// ─────────────────────────────────────────────
export async function createPaymentBill(req, res) {
    try {
        if (!req.user || !req.user.isAdmin) return res.status(403).json({ message: "Admins only." });

        const { userId, roomId, amount, dueDate, month } = req.body;

        const { error } = await supabase
            .from('payments')
            .insert([{
                user_id: userId,
                room_id: roomId,
                amount: amount,
                due_date: dueDate,
                month: month,
                status: 'pending' // මුලින්ම සල්ලි ගෙවලා නැති නිසා pending
            }]);

        if (error) throw error;
        return res.status(201).json({ message: "Payment bill generated successfully" });

    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

// ─────────────────────────────────────────────
// UPLOAD PAYMENT SLIP (user)
// ─────────────────────────────────────────────
export async function submitPayment(req, res) {
    try {
        const { paymentId } = req.params;
        const { paymentMethod, referenceNumber, receiptUrl } = req.body;

        const { error } = await supabase
            .from('payments')
            .update({
                payment_method: paymentMethod,
                reference_number: referenceNumber,
                receipt_url: receiptUrl,
                paid_date: new Date().toISOString().split('T')[0],
                status: 'pending_verification' // Admin බලලා approve කරනකන්
            })
            .eq('id', paymentId)
            .eq('user_id', req.user.id); // වෙන කෙනෙක්ගේ එකක් update කරන එක නවත්තන්න

        if (error) throw error;
        return res.status(200).json({ message: "Payment submitted. Waiting for admin verification." });

    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

// ─────────────────────────────────────────────
// APPROVE PAYMENTS (Admin only)
// ─────────────────────────────────────────────
export async function approvePayment(req, res) {
    try {
        if (!req.user || !req.user.isAdmin) return res.status(403).json({ message: "Admins only." });

        const { paymentId } = req.params;
        // Body එකෙන් paymentMethod එක ගන්නවා. මුකුත් ආවේ නැත්තන් default එකක් දානවා.
        const { paymentMethod } = req.body; 

        // Update කරන්න ඕන data ටික ලෑස්ති කරගන්නවා
        const updateData = { 
            status: 'paid',
            paid_date: new Date().toISOString().split('T')[0] // ගෙවපු දවස අද විදිහට දානවා
        };

        // paymentMethod එකක් ආවොත් (උදා: Cash) ඒකත් update එකට දානවා
        if (paymentMethod) {
            updateData.payment_method = paymentMethod;
        }

        const { error } = await supabase
            .from('payments')
            .update(updateData)
            .eq('id', paymentId);

        if (error) throw error;
        return res.status(200).json({ message: "Payment approved successfully" });

    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

// ─────────────────────────────────────────────
// STUDENT FIND THEY OWN PAYMENNT (user)
// ─────────────────────────────────────────────
export async function getMyPayments(req, res) {
    try {
        const { data: payments, error } = await supabase
            .from('payments')
            .select('*, rooms(*)')
            .eq('user_id', req.user.id)
            .order('due_date', { ascending: false });

        if (error) throw error;
        return res.status(200).json(payments);

    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

// ─────────────────────────────────────────────
// GET ALL PAYMENTS (Admin Only) - To view all student payments
// ─────────────────────────────────────────────
export async function getAllPayments(req, res) {
    try {
        if (!req.user || !req.user.isAdmin) {
            return res.status(403).json({ message: "Access denied. Admins only." });
        }

        // Step 1: Payments + room details ගන්නවා
        const { data: payments, error } = await supabase
            .from('payments')
            .select(`
                *,
                users (first_name, last_name, email, phone_number),
                rooms (room_number, monthly_rent, capacity)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Step 2: හැම payment එකකටම ඒ room එකේ active occupants count ගන්නවා
        const paymentsWithOccupants = await Promise.all(
            payments.map(async (payment) => {
                if (!payment.room_id) {
                    return { ...payment, occupant_count: 0 };
                }

                const { count, error: countError } = await supabase
                    .from('leases')
                    .select('*', { count: 'exact', head: true })
                    .eq('room_id', payment.room_id)
                    .eq('status', 'active');

                return {
                    ...payment,
                    occupant_count: countError ? 0 : (count || 0)
                };
            })
        );

        return res.status(200).json({ payments: paymentsWithOccupants });

    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}