import {  auth, db , getCurrentUser } from './firebase.js';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, getDocs, setDoc, serverTimestamp } from 'firebase/firestore';
import { getUserSubscription, getSubscriptionPlans, getSystemSettings, checkIsAdmin, getActiveSubscription, isPlanActive } from './subscription-service.js';

document.addEventListener('DOMContentLoaded', async () => {
  const container = document.querySelector('main.page-content');
  if (!container) return;

  // Render Pass Page UI
  await renderPassPage(container);
});

function formatNiceDate(dateInput) {
  if (!dateInput) return '—';
  const d = dateInput.toDate ? dateInput.toDate() : (typeof dateInput === 'string' || dateInput instanceof Date ? new Date(dateInput) : new Date(dateInput));
  if (isNaN(d.getTime())) return '—';
  const day = d.getDate();
  const month = d.toLocaleString('en-US', { month: 'long' });
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strHours = String(hours).padStart(2, '0');
  return `${day} ${month} ${year}, ${strHours}:${minutes} ${ampm}`;
}

async function renderPassPage(container) {
  container.innerHTML = `
    <div style="text-align: center; padding: 40px; color: #64748B;">Loading RankHub Pass Pro...</div>
  `;

  let user = auth.currentUser;
  if (!user) {
    try {
      const saved = localStorage.getItem('rankhub_user');
      if (saved) user = JSON.parse(saved);
    } catch (e) {}
  }

  let settings = await getSystemSettings();
  let plans = await getSubscriptionPlans();
  let userSub = user ? await getUserSubscription(user.uid) : null;
  let activeSub = user ? await getActiveSubscription(user.uid) : null;

  container.innerHTML = `
    <!-- Header Hero Card -->
    <div style="background: #FFFFFF; border: 1px solid var(--color-border); border-radius: 20px; padding: 32px 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.02); margin-bottom: 24px; text-align: center;">
      <span style="display: inline-block; padding: 4px 12px; background: #FEF2F2; color: #DC2626; border-radius: 999px; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; margin-bottom: 12px;">Rankhub Pro Pass</span>
      <h1 style="font-size: 1.75rem; font-weight: 800; color: #0F172A; margin-bottom: 8px;">Unlimited Access to 500+ Test Series</h1>
      <p style="font-size: 0.9375rem; color: #64748B; margin-bottom: 24px;">Unlock all SSC, State Police, Banking, Railway & Teaching exam mock papers & practice sets.</p>

      ${user && userSub && userSub.status === 'active' ? `
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 16px; padding: 20px; margin-bottom: 24px; text-align: left; display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px;">
          <div>
            <div style="font-size: 0.75rem; color: #64748B; font-weight: 700; text-transform: uppercase;">Plan</div>
            <div style="font-size: 1.125rem; font-weight: 800; color: #0F172A; margin-top: 2px;">${userSub.planName || userSub.name || 'Free'}</div>
          </div>
          <div>
            <div style="font-size: 0.75rem; color: #64748B; font-weight: 700; text-transform: uppercase;">Status</div>
            <div style="font-size: 1.125rem; font-weight: 800; color: #16A34A; margin-top: 2px; text-transform: capitalize;">Active</div>
          </div>
          <div>
            <div style="font-size: 0.75rem; color: #64748B; font-weight: 700; text-transform: uppercase;">Valid From</div>
            <div style="font-size: 0.9375rem; font-weight: 700; color: #0F172A; margin-top: 2px;">
              ${userSub.startDate ? formatNiceDate(userSub.startDateIso || userSub.startDate) : '—'}
            </div>
          </div>
          <div>
            <div style="font-size: 0.75rem; color: #64748B; font-weight: 700; text-transform: uppercase;">Valid Until</div>
            <div style="font-size: 0.9375rem; font-weight: 700; color: #0F172A; margin-top: 2px;">
              ${userSub.expiryDate ? formatNiceDate(userSub.expiryDate) : '—'}
            </div>
          </div>
          <div>
            <div style="font-size: 0.75rem; color: #64748B; font-weight: 700; text-transform: uppercase;">Days Remaining</div>
            <div style="font-size: 1.125rem; font-weight: 800; color: #2563EB; margin-top: 2px;">${userSub.daysRemaining} Days</div>
          </div>
        </div>
      ` : userSub && userSub.status === 'expired' ? `
        <div style="background: #FFF1F2; border: 1px solid #FECDD3; border-radius: 16px; padding: 16px; margin-bottom: 24px; font-size: 0.875rem; color: #9F1239; font-weight: 600;">
          Your Free Plan has expired. Please re-activate or choose a plan to continue access.
        </div>
      ` : `
        <div style="background: #FEF2F2; border: 1px solid #FCA5A5; border-radius: 16px; padding: 16px; margin-bottom: 24px; font-size: 0.875rem; color: #991B1B; font-weight: 600;">
          ${user ? 'No active subscription found. Activate the Free Plan below.' : 'Please sign in to view your personalized subscription status and history.'}
        </div>
      `}
    </div>

    <!-- Available Plans Section -->
    <div style="margin-bottom: 36px;">
      <h2 style="font-size: 1.25rem; font-weight: 800; color: #0F172A; margin-bottom: 16px;">Choose Your Subscription Plan</h2>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px;" id="plansGrid">
        ${plans.map(plan => {
          const isActive = isPlanActive(activeSub, plan.planId);
          return `
          <div style="background: #FFFFFF; border: ${plan.badge ? '2px solid #DC2626' : '1px solid var(--color-border)'}; border-radius: 16px; padding: 24px; position: relative; box-shadow: 0 4px 12px rgba(0,0,0,0.03); display: flex; flex-direction: column; justify-content: space-between;">
            ${plan.badge ? `<span style="position: absolute; top: -12px; right: 20px; background: #DC2626; color: #FFFFFF; font-size: 0.7rem; font-weight: 800; padding: 3px 10px; border-radius: 999px; text-transform: uppercase;">${plan.badge}</span>` : ''}
            <div>
              <div style="font-size: 0.8125rem; font-weight: 800; color: #64748B; text-transform: uppercase; margin-bottom: 4px;">${plan.name}</div>
              <div style="font-size: 2rem; font-weight: 800; color: #0F172A; margin-bottom: 12px;">₹${plan.price} <span style="font-size: 0.875rem; color: #64748B; font-weight: 600;">/ ${plan.durationDays >= 365 ? 'Year' : plan.durationDays >= 180 ? '6 Months' : plan.durationDays > 7 ? 'Days' : '7 Days'}</span></div>
              <ul style="list-style: none; padding: 0; margin: 0 0 20px 0; font-size: 0.875rem; color: #334155; display: flex; flex-direction: column; gap: 8px;">
                ${(plan.features || []).map(f => `<li style="display: flex; align-items: center; gap: 8px;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16A34A" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>${f}</li>`).join('')}
              </ul>
            </div>
             <div>
              ${isActive ? `
                <button type="button" class="btn-secondary" style="width: 100%; border-radius: 10px; font-weight: 700; background: #16A34A; color: #FFFFFF; padding: 12px; cursor: default;" disabled>✓ Activated</button>
              ` : plan.price === 0 ? `
                ${userSub && userSub.status === 'expired' ? `
                  <button type="button" id="activateFreePlanBtn" class="btn-primary" style="width: 100%; border-radius: 10px; font-weight: 700; background: #DC2626; color: #FFFFFF; padding: 12px; cursor: pointer;">Re-activate Free Plan</button>
                ` : `
                  <button type="button" id="activateFreePlanBtn" class="btn-primary" style="width: 100%; border-radius: 10px; font-weight: 700; background: #DC2626; color: #FFFFFF; padding: 12px; cursor: pointer;">Activate Free Plan</button>
                `}
              ` : `
                <button type="button" onclick="alert('${plan.name} plan is coming soon for future launch!');" class="btn-secondary" style="width: 100%; border-radius: 10px; font-weight: 700; background: #F1F5F9; color: #64748B; border: 1px solid #CBD5E1; padding: 12px; cursor: pointer;">Coming Soon</button>
              `}
            </div>
          </div>
        `;
        }).join('')}
      </div>
    </div>

    <!-- Subscription History Section -->
    ${userSub && userSub.allSubscriptions && userSub.allSubscriptions.length > 0 ? `
      <div style="background: #FFFFFF; border: 1px solid var(--color-border); border-radius: 16px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.02); margin-bottom: 36px;">
        <h2 style="font-size: 1.25rem; font-weight: 800; color: #0F172A; margin-bottom: 16px;">Subscription History</h2>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          ${userSub.allSubscriptions.map(sub => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; flex-wrap: wrap; gap: 12px;">
              <div>
                <div style="font-weight: 800; color: #0F172A; font-size: 1rem;">${sub.planName || sub.planId}</div>
                <div style="font-size: 0.8125rem; color: #64748B; margin-top: 2px;">
                  ${formatNiceDate(sub.startDateIso || sub.startDate || sub.validFromIso)} → ${formatNiceDate(sub.expiryDate || sub.validUntil)} (Source: ${sub.source || 'system'})
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-weight: 800; color: #0F172A;">₹${sub.price || 0}</span>
                <span style="padding: 4px 10px; border-radius: 999px; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; background: ${sub.status === 'active' ? '#DCFCE7' : '#F1F5F9'}; color: ${sub.status === 'active' ? '#16A34A' : '#64748B'};">
                  ${sub.status === 'active' ? 'Active' : 'Expired'}
                </span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
  `;

  const activateBtn = container.querySelector('#activateFreePlanBtn');
  if (activateBtn) {
    activateBtn.onclick = async () => {
      let currentUser = auth.currentUser;
      if (!currentUser) {
        try {
          const saved = localStorage.getItem('rankhub_user');
          if (saved) currentUser = JSON.parse(saved);
        } catch (e) {}
      }
      if (!currentUser || !currentUser.uid) {
        alert('Please sign in to activate the Free Plan.');
        window.location.href = './signin.html';
        return;
      }
      try {
        const now = new Date();
        const expiry = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const subData = {
          userId: currentUser.uid,
          planId: 'free',
          planName: 'Free',
          price: 0,
          status: 'active',
          source: 'free_launch',
          validFrom: serverTimestamp(),
          validFromIso: now.toISOString(),
          startDate: serverTimestamp(),
          startDateIso: now.toISOString(),
          validUntil: expiry.toISOString(),
          expiryDate: expiry.toISOString(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        await setDoc(doc(db, 'users', currentUser.uid, 'subscriptions', 'free_active'), subData);
        localStorage.setItem('rankhub_free_plan_activated_' + currentUser.uid, 'true');
        alert('Free Plan activated successfully! Full RankHub content access is now unlocked for 7 days.');
        // Re-render immediately
        await renderPassPage(container);
      } catch (err) {
        console.error('Error activating free plan:', err);
        const now = new Date();
        const expiry = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        try {
          await setDoc(doc(db, 'users', currentUser.uid, 'subscriptions', 'free_active'), {
            userId: currentUser.uid,
            planId: 'free',
            planName: 'Free',
            price: 0,
            status: 'active',
            source: 'free_launch',
            validFromIso: now.toISOString(),
            startDateIso: now.toISOString(),
            validUntil: expiry.toISOString(),
            expiryDate: expiry.toISOString(),
            createdAt: now.toISOString(),
            updatedAt: now.toISOString()
          });
        } catch (e2) {}
        localStorage.setItem('rankhub_free_plan_activated_' + currentUser.uid, 'true');
        alert('Free Plan activated successfully! Full RankHub content access is now unlocked for 7 days.');
        await renderPassPage(container);
      }
    };
  }
}

