import { supabase } from "../supabaseClient.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

// ─────────────────────────────────────────────
// CREATE USER
// ─────────────────────────────────────────────
export async function createUser(req, res) {
    try {
        const {
            email, password, firstName, lastName,
            phoneNumber, nicNumber, permanentAddress,
            university, faculty, studentId, guardianName, guardianPhone
        } = req.body;

        // Required fields validation
        if (!email || !password || !firstName || !lastName) {
            return res.status(400).json({ message: "First name, last name, email and password are required" });
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: "Invalid email format" });
        }

        // Password strength validation
        if (password.length < 8) {
            return res.status(400).json({ message: "Password must be at least 8 characters long" });
        }

        // Check if user already exists
        const { data: existingUsers, error: searchError } = await supabase
            .from('users')
            .select('email')
            .eq('email', email);

        if (searchError) throw searchError;

        if (existingUsers && existingUsers.length > 0) {
            return res.status(409).json({ message: "User already exists" });
        }

        // Hash password asynchronously (never use hashSync — it blocks the event loop)
        const passwordHash = await bcrypt.hash(password, 10);

        const { error: insertError } = await supabase
            .from('users')
            .insert([
                {
                    email,
                    first_name: firstName,
                    last_name: lastName,
                    password: passwordHash,
                    phone_number: phoneNumber || null,
                    nic_number: nicNumber || null,
                    permanent_address: permanentAddress || null,
                    university: university || null,
                    faculty: faculty || null,
                    student_id: studentId || null,
                    guardian_name: guardianName || null,
                    guardian_phone: guardianPhone || null
                }
            ]);

        if (insertError) throw insertError;

        return res.status(201).json({ message: "User created successfully" });

    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

// ─────────────────────────────────────────────
// LOGIN USER
// ─────────────────────────────────────────────
export async function loginUser(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !user) {
            // Use a generic message to avoid user enumeration attacks
            return res.status(401).json({ message: "Invalid email or password" });
        }

        // Check if blocked BEFORE password verification
        if (user.is_blocked) {
            return res.status(403).json({ message: "Your account has been blocked. Please contact support." });
        }

        // Async password comparison
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        // Keep JWT payload minimal — only include what's needed for authorization
        // Do NOT store sensitive or mutable fields (like isBlocked) in the token
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                isAdmin: user.is_admin
            },
            process.env.JWT_SECRET_KEY,
            { expiresIn: "7d" }
        );

        // Return safe user profile data separately (not from the token)
        return res.status(200).json({
            message: "Login successful",
            token,
            user: {
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                phoneNumber: user.phone_number,
                nicNumber: user.nic_number,
                university: user.university,
                faculty: user.faculty,
                studentId: user.student_id,
                isAdmin: user.is_admin,
                isEmailVerified: user.is_email_verified,
                image: user.image
            }
        });

    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

// ─────────────────────────────────────────────
// DELETE USER  (Admin only)
// ─────────────────────────────────────────────
export async function deleteUser(req, res) {
    try {
        if (!req.user || !req.user.isAdmin) {
            return res.status(403).json({ message: "Access denied. Only admins can delete users." });
        }

        const emailToDelete = req.params.email;

        // Prevent admin from deleting their own account
        if (req.user.email === emailToDelete) {
            return res.status(400).json({ message: "You cannot delete your own account" });
        }

        const { data: user, error: searchError } = await supabase
            .from('users')
            .select('email')
            .eq('email', emailToDelete)
            .single();

        if (searchError || !user) {
            return res.status(404).json({ message: "User not found" });
        }

        const { error: deleteError } = await supabase
            .from('users')
            .delete()
            .eq('email', emailToDelete);

        if (deleteError) throw deleteError;

        return res.status(200).json({ message: `User with email ${emailToDelete} deleted successfully` });

    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

// ─────────────────────────────────────────────
// UPDATE USER  (Admin or the user themselves)
// ─────────────────────────────────────────────
export async function updateUser(req, res) {
    try {
        const emailToUpdate = req.params.email;

        const { data: user, error: searchError } = await supabase
            .from('users')
            .select('*')
            .eq('email', emailToUpdate)
            .single();

        if (searchError || !user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Only admin or the account owner can update
        if (!req.user || (!req.user.isAdmin && req.user.email !== user.email)) {
            return res.status(403).json({ message: "You are not allowed to update this user" });
        }

        // Protect immutable / privilege fields — check both camelCase and snake_case for safety
        const forbiddenFields = ['email', 'isAdmin', 'is_admin', 'isBlocked', 'is_blocked', 'isEmailVerified', 'is_email_verified'];
        for (const field of forbiddenFields) {
            if (req.body[field] != null) {
                return res.status(400).json({ message: `'${field}' cannot be updated directly` });
            }
        }

        const updateData = {};

        if (req.body.firstName != null) updateData.first_name = req.body.firstName;
        if (req.body.lastName != null) updateData.last_name = req.body.lastName;
        if (req.body.phoneNumber != null) updateData.phone_number = req.body.phoneNumber;
        if (req.body.nicNumber != null) updateData.nic_number = req.body.nicNumber;
        if (req.body.permanentAddress != null) updateData.permanent_address = req.body.permanentAddress;
        if (req.body.university != null) updateData.university = req.body.university;
        if (req.body.faculty != null) updateData.faculty = req.body.faculty;
        if (req.body.studentId != null) updateData.student_id = req.body.studentId;
        if (req.body.guardianName != null) updateData.guardian_name = req.body.guardianName;
        if (req.body.guardianPhone != null) updateData.guardian_phone = req.body.guardianPhone;
        if (req.body.image != null) updateData.image = req.body.image;

        if (req.body.password != null) {
            if (req.body.password.length < 8) {
                return res.status(400).json({ message: "Password must be at least 8 characters long" });
            }
            updateData.password = await bcrypt.hash(req.body.password, 10);
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ message: "No valid fields provided to update" });
        }

        const { error: updateError } = await supabase
            .from('users')
            .update(updateData)
            .eq('email', emailToUpdate);

        if (updateError) throw updateError;

        return res.status(200).json({ message: "User updated successfully" });

    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

// ─────────────────────────────────────────────
// BLOCK / UNBLOCK USER  (Admin only)
// ─────────────────────────────────────────────
export async function toggleBlockUser(req, res) {
    try {
        if (!req.user || !req.user.isAdmin) {
            return res.status(403).json({ message: "Access denied. Only admins can block/unblock users." });
        }

        const emailToToggle = req.params.email;

        // Prevent admin from blocking themselves
        if (req.user.email === emailToToggle) {
            return res.status(400).json({ message: "You cannot block your own account" });
        }

        const { data: user, error: searchError } = await supabase
            .from('users')
            .select('email, is_blocked')
            .eq('email', emailToToggle)
            .single();

        if (searchError || !user) {
            return res.status(404).json({ message: "User not found" });
        }

        const newBlockedStatus = !user.is_blocked;

        const { error: updateError } = await supabase
            .from('users')
            .update({ is_blocked: newBlockedStatus })
            .eq('email', emailToToggle);

        if (updateError) throw updateError;

        return res.status(200).json({
            message: `User ${newBlockedStatus ? "blocked" : "unblocked"} successfully`,
            isBlocked: newBlockedStatus
        });

    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

// ─────────────────────────────────────────────
// GET USER PROFILE  (Admin or the user themselves)
// ─────────────────────────────────────────────
export async function getUser(req, res) {
    try {
        const emailToFetch = req.params.email;

        if (!req.user || (!req.user.isAdmin && req.user.email !== emailToFetch)) {
            return res.status(403).json({ message: "Access denied" });
        }

        const { data: user, error } = await supabase
            .from('users')
            .select('email, first_name, last_name, phone_number, nic_number, permanent_address, university, faculty, student_id, guardian_name, guardian_phone, is_admin, is_blocked, is_email_verified, image, created_at')
            .eq('email', emailToFetch)
            .single();

        if (error || !user) {
            return res.status(404).json({ message: "User not found" });
        }

        return res.status(200).json({ user });

    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

// ─────────────────────────────────────────────
// GET ALL USER PROFILES  (Admin only)
// ─────────────────────────────────────────────
export async function getAllUsers(req, res) {
    try {
        if (!req.user || !req.user.isAdmin) {
            return res.status(403).json({ message: "Access denied" });
        }
 
        const { data: users, error } = await supabase
            .from('users')
            // 👇 මෙතන මුලටම 'id, ' කියලා එකතු කරන්න.
            .select('id, email, first_name, last_name, phone_number, nic_number, permanent_address, university, faculty, student_id, guardian_name, guardian_phone, is_admin, is_blocked, is_email_verified, image, created_at')
            .order('created_at', { ascending: false });
 
        if (error) throw error;
 
        return res.status(200).json({ users });
 
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}
