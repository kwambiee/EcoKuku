import nodemailer from 'nodemailer';

// Admin emails that receive all notifications
const ADMIN_EMAILS = (
  process.env.ADMIN_NOTIFICATION_EMAILS ||
  'joy.kwamboka@kwambokapoultry.co.ke,chris@kwambokapoultry.co.ke'
).split(',').map((e) => e.trim());

function getTransporter() {
  const host = process.env.EMAIL_SMTP_HOST || 'smtp.zoho.com';
  const port = parseInt(process.env.EMAIL_SMTP_PORT || '465');
  const user = process.env.EMAIL_SMTP_USER;
  const pass = process.env.EMAIL_SMTP_PASS;

  if (!user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendStaffRequestNotification(request: {
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  message?: string | null;
}) {
  const transporter = getTransporter();
  if (!transporter) {
    console.log('[EMAIL SKIPPED] SMTP not configured — add EMAIL_SMTP_USER and EMAIL_SMTP_PASS to .env.local');
    return { sent: false };
  }

  const roleLabel = request.role === 'DRIVER' ? 'Delivery / Rider' : 'Farm Staff';
  const approveUrl = `https://admin.kwambokapoultry.co.ke/settings`;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px">
      <div style="background:#14532d;padding:20px 24px;border-radius:8px 8px 0 0">
        <h1 style="color:#fff;margin:0;font-size:18px">New Access Request</h1>
        <p style="color:#86efac;margin:4px 0 0;font-size:13px">Kwamboka Poultry Farm Admin</p>
      </div>
      <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;background:#fff">
        <p style="color:#374151;margin:0 0 16px">Someone has requested access to the farm management system:</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:8px 12px;background:#f9fafb;font-weight:600;width:120px;border:1px solid #e5e7eb">Name</td>
              <td style="padding:8px 12px;border:1px solid #e5e7eb">${request.name}</td></tr>
          <tr><td style="padding:8px 12px;background:#f9fafb;font-weight:600;border:1px solid #e5e7eb">Email</td>
              <td style="padding:8px 12px;border:1px solid #e5e7eb">${request.email}</td></tr>
          <tr><td style="padding:8px 12px;background:#f9fafb;font-weight:600;border:1px solid #e5e7eb">Phone</td>
              <td style="padding:8px 12px;border:1px solid #e5e7eb">${request.phone || '—'}</td></tr>
          <tr><td style="padding:8px 12px;background:#f9fafb;font-weight:600;border:1px solid #e5e7eb">Role</td>
              <td style="padding:8px 12px;border:1px solid #e5e7eb">${roleLabel}</td></tr>
          ${request.message ? `<tr><td style="padding:8px 12px;background:#f9fafb;font-weight:600;border:1px solid #e5e7eb">Message</td>
              <td style="padding:8px 12px;border:1px solid #e5e7eb">${request.message}</td></tr>` : ''}
        </table>
        <div style="margin-top:24px">
          <a href="${approveUrl}" style="background:#14532d;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px">
            Review in Settings →
          </a>
        </div>
        <p style="color:#9ca3af;font-size:12px;margin-top:20px">
          Go to Settings → Staff Requests to approve or reject this request.
        </p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"Kwamboka Admin" <${process.env.EMAIL_SMTP_USER}>`,
      to: ADMIN_EMAILS.join(', '),
      subject: `Access Request: ${request.name} (${roleLabel})`,
      html,
    });
    return { sent: true };
  } catch (err) {
    console.error('[EMAIL ERROR]', err);
    return { sent: false, error: String(err) };
  }
}

export async function sendApprovalEmail(to: string, name: string, role: string, tempPassword: string) {
  const transporter = getTransporter();
  if (!transporter) return { sent: false };

  const roleLabel = role === 'DRIVER' ? 'Delivery / Rider' : 'Farm Staff';
  const loginUrl = `https://admin.kwambokapoultry.co.ke/login`;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px">
      <div style="background:#14532d;padding:20px 24px;border-radius:8px 8px 0 0">
        <h1 style="color:#fff;margin:0;font-size:18px">Welcome to Kwamboka Poultry Farm</h1>
        <p style="color:#86efac;margin:4px 0 0;font-size:13px">Your access request has been approved</p>
      </div>
      <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;background:#fff">
        <p style="color:#374151">Hi <strong>${name}</strong>,</p>
        <p style="color:#374151">Your request to join the farm management system as <strong>${roleLabel}</strong> has been approved. Here are your login details:</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0">
          <tr><td style="padding:10px 12px;background:#f9fafb;font-weight:600;width:140px;border:1px solid #e5e7eb">Login URL</td>
              <td style="padding:10px 12px;border:1px solid #e5e7eb"><a href="${loginUrl}">${loginUrl}</a></td></tr>
          <tr><td style="padding:10px 12px;background:#f9fafb;font-weight:600;border:1px solid #e5e7eb">Email</td>
              <td style="padding:10px 12px;border:1px solid #e5e7eb">${to}</td></tr>
          <tr><td style="padding:10px 12px;background:#f9fafb;font-weight:600;border:1px solid #e5e7eb">Temp Password</td>
              <td style="padding:10px 12px;border:1px solid #e5e7eb;font-family:monospace;font-size:16px;letter-spacing:2px">${tempPassword}</td></tr>
        </table>
        <p style="color:#dc2626;font-size:13px;font-weight:600">⚠ Please change your password after your first login.</p>
        <div style="margin-top:20px">
          <a href="${loginUrl}" style="background:#14532d;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px">
            Log In Now →
          </a>
        </div>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"Kwamboka Poultry Farm" <${process.env.EMAIL_SMTP_USER}>`,
      to,
      subject: 'Your farm system access has been approved',
      html,
    });
    return { sent: true };
  } catch (err) {
    console.error('[APPROVAL EMAIL ERROR]', err);
    return { sent: false };
  }
}
