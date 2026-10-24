import api from '../api.js';

let notificationsList = [];
let unreadCount = 0;

export async function renderNotificationsView(container) {
  container.innerHTML = `
    <div class="p-8 text-center">
      <i class="fa-solid fa-spinner fa-spin text-2xl text-indigo"></i>
    </div>
  `;

  await loadAndRender(container);
}

async function loadAndRender(container) {
  try {
    const data = await api.getNotifications();
    notificationsList = data.notifications || [];
    unreadCount = data.unreadCount || 0;
    renderContent(container);
  } catch (err) {
    console.error('Failed to load notifications:', err);
    container.innerHTML = `
      <div class="card p-6 text-center text-danger">
        <p>Failed to load notifications: ${err.message}</p>
      </div>
    `;
  }
}

function renderContent(container) {
  container.innerHTML = `
    <div style="max-width: 840px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px;">
      <div class="card">
        <div class="card-title-row">
          <div>
            <h3 class="card-main-title">
              <i class="fa-regular fa-bell text-indigo mr-2"></i> Department Announcements & Deadlines
            </h3>
            <p class="card-subtitle">Official notifications delivered from the Head of Department</p>
          </div>
          ${unreadCount > 0 ? `
            <button id="btn-page-mark-all-read" class="btn btn-sm btn-subtle">
              <i class="fa-solid fa-check-double mr-1"></i> Mark All as Read (${unreadCount})
            </button>
          ` : ''}
        </div>

        ${notificationsList.length === 0 ? `
          <div style="padding: 40px; text-align: center; color: var(--text-muted);">
            No announcements available for your account.
          </div>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 14px;">
            ${notificationsList.map(n => `
              <div
                style="border: ${n.is_read ? '1px solid var(--border-light)' : '1px solid var(--border-indigo)'}; border-radius: 14px; padding: 18px 20px; background-color: ${n.is_read ? '#fff' : '#EEF2FF'}; box-shadow: ${n.is_read ? 'none' : 'var(--shadow-sm)'}; transition: all 0.2s;"
              >
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    ${!n.is_read ? `
                      <span style="width: 8px; height: 8px; border-radius: 50%; background-color: var(--color-primary);"></span>
                    ` : ''}
                    <span class="badge badge-indigo text-xs" style="text-transform: capitalize;">
                      Audience: ${escapeHtml(n.audience)}
                    </span>
                    <span style="font-size: 12px; color: var(--text-secondary);">
                      Posted by <strong>${escapeHtml(n.posted_by_name)}</strong>
                    </span>
                  </div>

                  <span style="font-size: 11px; color: var(--text-muted);">
                    ${new Date(n.created_at).toLocaleString()}
                  </span>
                </div>

                <h4 style="font-size: 16px; font-weight: 800; margin: 0 0 6px 0; color: var(--text-primary);">
                  ${escapeHtml(n.title)}
                </h4>

                <p style="font-size: 13px; color: var(--text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                  ${escapeHtml(n.body)}
                </p>

                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
                  ${n.deadline ? `
                    <div
                      style="display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; color: var(--color-amber); background-color: var(--color-warning-light); padding: 4px 10px; border-radius: 6px;"
                    >
                      <i class="fa-regular fa-clock"></i>
                      <span>Submission Deadline: ${new Date(n.deadline).toLocaleString()}</span>
                    </div>
                  ` : '<div></div>'}

                  ${!n.is_read ? `
                    <button
                      class="btn-mark-item-read"
                      data-id="${n.id}"
                      style="font-size: 12px; font-weight: 700; color: var(--color-primary); background: none; border: none; cursor: pointer;"
                    >
                      <i class="fa-solid fa-check mr-1"></i> Mark as read
                    </button>
                  ` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    </div>
  `;

  // Attach mark all read handler
  const btnAll = container.querySelector('#btn-page-mark-all-read');
  if (btnAll) {
    btnAll.addEventListener('click', async () => {
      try {
        await api.markAllNotificationsRead();
        notificationsList = notificationsList.map(n => ({ ...n, is_read: 1 }));
        unreadCount = 0;
        renderContent(container);
        // Refresh topbar unread count
        window.dispatchEvent(new CustomEvent('notifications-updated'));
      } catch (err) {
        console.error('Failed to mark all read:', err);
      }
    });
  }

  // Attach mark individual item read
  container.querySelectorAll('.btn-mark-item-read').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = Number(btn.getAttribute('data-id'));
      try {
        await api.markNotificationRead(id);
        const item = notificationsList.find(n => n.id === id);
        if (item) item.is_read = 1;
        unreadCount = Math.max(0, unreadCount - 1);
        renderContent(container);
        window.dispatchEvent(new CustomEvent('notifications-updated'));
      } catch (err) {
        console.error('Failed to mark notification read:', err);
      }
    });
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
