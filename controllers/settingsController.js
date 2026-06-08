import { supabase } from "../supabaseClient.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

// ─────────────────────────────────────────────
// 1. OWNER VERIFICATION (Login for Owners)
// ─────────────────────────────────────────────
export async function verifyOwner(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        // Owner ව Database එකෙන් හොයනවා
        const { data: owner, error } = await supabase
            .from('owners')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !owner) {
            return res.status(401).json({ message: "Invalid Owner Credentials" });
        }

        // Password එක හරිද බලනවා
        const isPasswordValid = await bcrypt.compare(password, owner.password);

        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid Owner Credentials" });
        }

        // Owner ට වෙනම විශේෂ Token එකක් දෙනවා
        const ownerToken = jwt.sign(
            { id: owner.id, email: owner.email, isOwner: true },
            process.env.JWT_SECRET_KEY,
            { expiresIn: "1h" } // මේක පැයකින් Expire වෙනවා (ආරක්ෂාවට)
        );

        return res.status(200).json({ 
            message: "Owner verified successfully", 
            ownerToken,
            isOwner: true 
        });

    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

// ─────────────────────────────────────────────
// 2. GET SYSTEM SETTINGS
// ─────────────────────────────────────────────
export async function getSettings(req, res) {
    try {
        const { data: settings, error } = await supabase
            .from('system_settings')
            .select('*')
            .eq('id', 1)
            .single();

        if (error) throw error;
        return res.status(200).json(settings);

    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

// ─────────────────────────────────────────────
// 3. UPDATE SYSTEM SETTINGS (Only for verified owners)
// ─────────────────────────────────────────────
export async function updateSettings(req, res) {
    try {
        // Owner කෙනෙක්ද කියලා check කරනවා
        if (!req.user || !req.user.isOwner) {
            return res.status(403).json({ message: "Strictly Restricted: Owners Only" });
        }

        const { lateFineAmount, gracePeriodDays, bankName, accountName, accountNumber, branch } = req.body;

        const { error } = await supabase
            .from('system_settings')
            .update({
                late_fine_amount: lateFineAmount,
                grace_period_days: gracePeriodDays,
                bank_name: bankName,
                account_name: accountName,
                account_number: accountNumber,
                branch: branch,
                updated_at: new Date().toISOString()
            })
            .eq('id', 1);

        if (error) throw error;
        return res.status(200).json({ message: "Settings updated successfully" });

    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

// ─────────────────────────────────────────────
// 4. UPDATE OWNER PASSWORD
// ─────────────────────────────────────────────
export async function updateOwnerPassword(req, res) {
    try {
        if (!req.user || !req.user.isOwner) {
            return res.status(403).json({ message: "Strictly Restricted: Owners Only" });
        }

        const { currentPassword, newPassword } = req.body;
        const ownerEmail = req.user.email; // Token එකෙන් email එක ගන්නවා

        // 1. Owner ව හොයාගන්නවා
        const { data: owner, error } = await supabase
            .from('owners')
            .select('*')
            .eq('email', ownerEmail)
            .single();

        if (error || !owner) return res.status(404).json({ message: "Owner not found" });

        // 2. දැනට තියෙන Password එක හරිද කියලා Check කරනවා
        const isPasswordValid = await bcrypt.compare(currentPassword, owner.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: "Current password is incorrect" });
        }

        // 3. අලුත් Password එක Encrypt කරලා Save කරනවා
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        
        const { error: updateError } = await supabase
            .from('owners')
            .update({ password: hashedNewPassword })
            .eq('email', ownerEmail);

        if (updateError) throw updateError;
        return res.status(200).json({ message: "Password updated successfully" });

    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}

// ─────────────────────────────────────────────
// TEMPORARY: CREATE FIRST OWNER
// ─────────────────────────────────────────────
// export async function createFirstOwner(req, res) {
//     try {
//         // Password එක Encrypt (Hash) කරනවා
//         const passwordHash = await bcrypt.hash("Owner@123", 10);
        
//         const { error } = await supabase
//             .from('owners')
//             .insert([
//                 { email: "owner@company.com", password: passwordHash }
//             ]);

//         if (error) throw error;
        
//         return res.status(201).json({ 
//             message: "First owner created successfully! You can login now with owner@company.com and Owner@123" 
//         });

//     } catch (err) {
//         return res.status(500).json({ message: err.message });
//     }
// }