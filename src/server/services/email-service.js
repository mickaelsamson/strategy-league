const net = require('net');
const tls = require('tls');

function getEmailConfig(){
  const smtpHost = process.env.SMTP_HOST || '';
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || smtpPort === 465;

  return {
    from: process.env.MAIL_FROM || process.env.SMTP_FROM || process.env.SMTP_USER || '',
    smtpHost,
    smtpPort,
    secure,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    resendApiKey: process.env.RESEND_API_KEY || ''
  };
}

function encodeHeader(value){
  return String(value || '').replace(/[\r\n]+/g, ' ').trim();
}

function escapeHtml(value){
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function extractEmail(value){
  const text = String(value || '').trim();
  const bracketMatch = text.match(/<([^>]+)>/);
  return (bracketMatch ? bracketMatch[1] : text).trim();
}

function createMimeMessage({ from, to, subject, text, html }){
  const boundary = `strategy-league-${Date.now().toString(36)}`;
  const safeText = String(text || '').replace(/\r?\n/g, '\r\n');
  const safeHtml = String(html || '').replace(/\r?\n/g, '\r\n');

  return [
    `From: ${encodeHeader(from)}`,
    `To: ${encodeHeader(to)}`,
    `Subject: ${encodeHeader(subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    safeText,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    safeHtml,
    '',
    `--${boundary}--`,
    ''
  ].join('\r\n');
}

function createSocket(config){
  return new Promise((resolve, reject) => {
    const socket = config.secure
      ? tls.connect({ host: config.smtpHost, port: config.smtpPort, servername: config.smtpHost })
      : net.connect({ host: config.smtpHost, port: config.smtpPort });

    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error('SMTP connection timed out'));
    }, 10000);

    socket.once(config.secure ? 'secureConnect' : 'connect', () => {
      clearTimeout(timer);
      resolve(socket);
    });
    socket.once('error', reject);
  });
}

function createSmtpSession(socket){
  let buffer = '';
  const readers = [];

  function readBufferedResponse(){
    const match = buffer.match(/(?:^|\r?\n)(\d{3}) [^\r\n]*(?:\r?\n)/);
    if(!match) return null;
    const end = match.index + match[0].length;
    const message = buffer.slice(0, end);
    buffer = buffer.slice(end);
    return { code: Number(match[1]), message };
  }

  function flush(){
    while(readers.length){
      const response = readBufferedResponse();
      if(!response) return;
      readers.shift().resolve(response);
    }
  }

  socket.on('data', chunk => {
    buffer += chunk.toString('utf8');
    flush();
  });

  socket.on('error', err => {
    while(readers.length){
      readers.shift().reject(err);
    }
  });

  function readResponse(){
    const response = readBufferedResponse();
    if(response) return Promise.resolve(response);
    return new Promise((resolve, reject) => readers.push({ resolve, reject }));
  }

  async function command(line, expectedCodes){
    socket.write(`${line}\r\n`);
    const response = await readResponse();
    if(!expectedCodes.includes(response.code)){
      throw new Error(`SMTP command failed (${response.code}): ${response.message.trim()}`);
    }
    return response;
  }

  return { command, readResponse, socket };
}

async function authenticate(session, config){
  if(!config.user || !config.pass) return;

  const plain = Buffer.from(`\0${config.user}\0${config.pass}`).toString('base64');
  try{
    await session.command(`AUTH PLAIN ${plain}`, [235]);
    return;
  }catch(_err){
    await session.command('AUTH LOGIN', [334]);
    await session.command(Buffer.from(config.user).toString('base64'), [334]);
    await session.command(Buffer.from(config.pass).toString('base64'), [235]);
  }
}

async function sendViaSmtp(config, mail){
  const fromAddress = extractEmail(config.from);
  const toAddress = extractEmail(mail.to);
  let socket = await createSocket(config);
  let session = createSmtpSession(socket);

  await session.readResponse();
  await session.command(`EHLO ${config.smtpHost}`, [250]);

  if(!config.secure){
    await session.command('STARTTLS', [220]);
    socket = tls.connect({ socket, servername: config.smtpHost });
    await new Promise((resolve, reject) => {
      socket.once('secureConnect', resolve);
      socket.once('error', reject);
    });
    session = createSmtpSession(socket);
    await session.command(`EHLO ${config.smtpHost}`, [250]);
  }

  await authenticate(session, config);
  await session.command(`MAIL FROM:<${fromAddress}>`, [250]);
  await session.command(`RCPT TO:<${toAddress}>`, [250, 251]);
  await session.command('DATA', [354]);

  const body = createMimeMessage({ ...mail, from: config.from });
  session.socket.write(`${body.replace(/^\./gm, '..')}\r\n.\r\n`);
  const response = await session.readResponse();
  if(response.code !== 250){
    throw new Error(`SMTP DATA failed (${response.code}): ${response.message.trim()}`);
  }

  await session.command('QUIT', [221]).catch(() => null);
  session.socket.end();
}

async function sendViaResend(config, mail){
  if(!globalThis.fetch){
    throw new Error('fetch is required for RESEND_API_KEY email delivery');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.resendApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: config.from,
      to: [extractEmail(mail.to)],
      subject: mail.subject,
      text: mail.text,
      html: mail.html
    })
  });

  if(!response.ok){
    const body = await response.text();
    throw new Error(`Resend email failed (${response.status}): ${body}`);
  }
}

async function sendMail(mail){
  const config = getEmailConfig();

  if(!config.from){
    console.warn('[email] MAIL_FROM or SMTP_FROM is not configured.');
    return { sent: false, reason: 'missing_from' };
  }

  try{
    if(config.resendApiKey){
      await sendViaResend(config, mail);
      return { sent: true, provider: 'resend' };
    }

    if(config.smtpHost){
      await sendViaSmtp(config, mail);
      return { sent: true, provider: 'smtp' };
    }

    console.warn('[email] SMTP_HOST or RESEND_API_KEY is not configured.');
    return { sent: false, reason: 'not_configured' };
  }catch(err){
    console.error('[email] Failed to send email:', err);
    return { sent: false, reason: 'send_failed' };
  }
}

async function sendPasswordResetEmail({ to, username, resetUrl }){
  const safeUsername = escapeHtml(username || 'player');
  const safeResetUrl = escapeHtml(resetUrl);

  return sendMail({
    to,
    subject: 'Reset your Strategy League password',
    text: [
      `Hello ${username || 'player'},`,
      '',
      'Use this link to reset your Strategy League password:',
      resetUrl,
      '',
      'This link expires in 1 hour. If you did not ask for this reset, you can ignore this email.'
    ].join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.55;color:#172033">
        <h2 style="margin:0 0 12px;color:#101827">Strategy League password reset</h2>
        <p>Hello ${safeUsername},</p>
        <p>Use the button below to choose a new password. This link expires in 1 hour.</p>
        <p><a href="${safeResetUrl}" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#c47a27;color:#fff;text-decoration:none;font-weight:700">Reset password</a></p>
        <p style="font-size:13px;color:#667085">If the button does not work, paste this link into your browser:<br>${safeResetUrl}</p>
      </div>
    `
  });
}

module.exports = {
  sendMail,
  sendPasswordResetEmail
};
