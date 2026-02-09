import sgMail from '@sendgrid/mail';
import type { SendGridConfig, EmailTemplateData, SendResult } from './types';

let isInitialized = false;
let fromEmail = '';
let fromName = 'ClimbTracker';

/**
 * Initialize SendGrid with API key
 */
export function initSendGrid(config: SendGridConfig): void {
  sgMail.setApiKey(config.apiKey);
  fromEmail = config.fromEmail;
  fromName = config.fromName || 'ClimbTracker';
  isInitialized = true;
  console.log('[notifications] SendGrid initialized');
}

/**
 * Check if SendGrid is initialized
 */
export function isSendGridReady(): boolean {
  return isInitialized;
}

/**
 * Send a notification email
 */
export async function sendEmail(
  to: string,
  data: EmailTemplateData
): Promise<SendResult> {
  if (!isInitialized) {
    return { success: false, error: 'SendGrid not initialized' };
  }

  const html = generateEmailHtml(data);

  try {
    const [response] = await sgMail.send({
      to,
      from: {
        email: fromEmail,
        name: fromName,
      },
      subject: data.title,
      html,
      text: generateEmailText(data),
    });

    return {
      success: true,
      messageId: response.headers['x-message-id'] as string,
    };
  } catch (error) {
    console.error('[notifications] SendGrid error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Generate HTML email content
 */
function generateEmailHtml(data: EmailTemplateData): string {
  const actionButton = data.actionUrl && data.actionText
    ? `
      <tr>
        <td style="padding: 24px 0;">
          <a href="${data.actionUrl}"
             style="display: inline-block; padding: 12px 24px; background-color: #F472B6; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
            ${data.actionText}
          </a>
        </td>
      </tr>
    `
    : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FDFCF0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #FDFCF0;">
    <tr>
      <td style="padding: 24px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; text-align: center; border-bottom: 1px solid #E5E5E5;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #1C1917;">
                ClimbTracker
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #71717A;">
                Salut ${data.userName},
              </p>
              <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #1C1917;">
                ${data.title}
              </h2>
              <p style="margin: 0; font-size: 16px; color: #3F3F46; line-height: 1.6;">
                ${data.body}
              </p>
            </td>
          </tr>

          <!-- Action Button -->
          ${actionButton}

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #F9F9F6; border-radius: 0 0 16px 16px; border-top: 1px solid #E5E5E5;">
              <p style="margin: 0; font-size: 12px; color: #71717A; text-align: center;">
                Tu peux modifier tes preferences de notification dans les parametres de ton compte.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Generate plain text email content
 */
function generateEmailText(data: EmailTemplateData): string {
  let text = `Salut ${data.userName},\n\n`;
  text += `${data.title}\n\n`;
  text += `${data.body}\n\n`;

  if (data.actionUrl && data.actionText) {
    text += `${data.actionText}: ${data.actionUrl}\n\n`;
  }

  text += `---\nClimbTracker\n`;
  text += `Tu peux modifier tes preferences de notification dans les parametres de ton compte.`;

  return text;
}
