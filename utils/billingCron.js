import cron from 'node-cron';
import { supabase } from '../supabaseClient.js'; 

export const startBillingCron = () => {
    console.log("⏳ Billing Cron Jobs initialized...");

    // හැම මාසෙම 1 වෙනිදා පාන්දර 12:00 ට මේක වැඩ කරනවා ('0 0 1 * *')
    // (ඔයාට මේක Test කරන්න ඕනේ නම් '* * * * *' කියලා දුන්නොත් හැම විනාඩියකට සැරයක්ම වැඩ කරනවා)
    cron.schedule('0 0 1 * *', async () => {////////////////////////////////////////////////////////////////////////////////////
        console.log('🔄 Running automated monthly billing generation...');
        try {
            const { data: activeLeases, error: leaseError } = await supabase
                .from('leases')
                .select(`user_id, room_id, rooms (monthly_rent)`)
                .eq('status', 'active');

            if (leaseError) throw leaseError;
            if (!activeLeases || activeLeases.length === 0) return;

            const currentDate = new Date();
            const monthText = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
            const year = currentDate.getFullYear();
            const monthNumber = String(currentDate.getMonth() + 1).padStart(2, '0');
            
            // Due Date එක මාසේ 10 වෙනිදා ලෙස සැකසීම
            const formattedDueDate = `${year}-${monthNumber}-07`;////////////////////////////////////////////////////////////////

            const newBills = activeLeases.map(lease => ({
                user_id: lease.user_id,
                room_id: lease.room_id,
                amount: lease.rooms.monthly_rent,
                fine_amount: 0,
                due_date: formattedDueDate,
                month: monthText,
                status: 'pending' 
            }));

            const { error: insertError } = await supabase.from('payments').insert(newBills);
            if (insertError) throw insertError;

            console.log(`✅ Successfully generated ${newBills.length} bills for ${monthText}!`);
        } catch (error) {
            console.error('❌ Error generating monthly bills:', error.message);
        }
    });

    // 2. Fine එකතු කිරීම (හැම මාසෙම 16 වෙනිදා පාන්දර 12:00) - Grace Period ඉවර වුණාම
    // '* * * * *' කියලා දුන්නොත් හැම විනාඩියකට සැරයක්ම වැඩ කරනවා
    cron.schedule('0 0 16 * *', async () => {///////////////////////////////////////////////////////////////////////////////////
        console.log('⚠️ Running automated late fine application...');
        try {
            const currentDate = new Date();
            const monthText = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

            // මේ මාසේ pending හෝ overdue තියෙන බිල්වලට විතරක් fine එක 500 කරනවා, status එක overdue කරනවා
            const { error: updateError } = await supabase
                .from('payments')
                .update({ fine_amount: 500, status: 'overdue' })
                .eq('month', monthText)
                .in('status', ['pending', 'unpaid', 'overdue']);

            if (updateError) throw updateError;
            console.log(`✅ Successfully applied late fines for ${monthText}!`);
        } catch (error) {
            console.error('❌ Error applying fines:', error.message);
        }
    });
};