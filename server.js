const express = require('express');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const responsesFilePath = path.join(__dirname, 'responses.json');

function buildMailHtml(payload) {
  return `
    <h2>New date response</h2>
    <p><strong>Name:</strong> ${payload.name}</p>
    <p><strong>Answer:</strong> ${payload.answer}</p>
    <p><strong>Date:</strong> ${payload.date}</p>
    <p><strong>Time:</strong> ${payload.time}</p>
    <p><strong>Dream vibe:</strong> ${payload.vibe}</p>
  `;
}

function hasResendConfig() {
  return process.env.RESEND_API_KEY && process.env.FROM_EMAIL && process.env.TO_EMAIL;
}

async function sendDateMailViaResend(payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.FROM_EMAIL,
        to: [process.env.TO_EMAIL],
        subject: `New date response from ${payload.name}`,
        html: buildMailHtml(payload),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Resend API failed: ${response.status} ${errorText}`);
    }
  } finally {
    clearTimeout(timeout);
  }
}

function buildTransportOptions(overrides = {}) {
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpSecure =
    process.env.SMTP_SECURE === 'true' ||
    (process.env.SMTP_SECURE !== 'false' && smtpPort === 465);

  return {
    host: process.env.SMTP_HOST,
    port: smtpPort,
    secure: smtpSecure,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    ...overrides,
  };
}

async function sendDateMail(payload) {
  const primaryTransport = nodemailer.createTransport(buildTransportOptions());

  const mail = {
    from: process.env.SMTP_USER,
    to: process.env.TO_EMAIL,
    subject: `New date response from ${payload.name}`,
    html: buildMailHtml(payload),
  };

  try {
    await primaryTransport.sendMail(mail);
    return;
  } catch (error) {
    const shouldRetryWith465 =
      (error.code === 'ETIMEDOUT' || error.command === 'CONN') &&
      Number(process.env.SMTP_PORT || 587) !== 465;

    if (!shouldRetryWith465) {
      throw error;
    }

    const fallbackTransport = nodemailer.createTransport(
      buildTransportOptions({
        port: 465,
        secure: true,
      })
    );

    await fallbackTransport.sendMail(mail);
  }
}

function ensureResponseStore() {
  if (!fs.existsSync(responsesFilePath)) {
    fs.writeFileSync(responsesFilePath, '[]', 'utf8');
  }
}

function saveResponseLocally(payload) {
  ensureResponseStore();

  let records = [];
  try {
    const raw = fs.readFileSync(responsesFilePath, 'utf8');
    records = raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.warn('Could not read response file; resetting it.');
    records = [];
  }

  records.push({
    ...payload,
    createdAt: new Date().toISOString(),
  });

  fs.writeFileSync(responsesFilePath, JSON.stringify(records, null, 2), 'utf8');
  return records;
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

app.get('/api/responses', (req, res) => {
  ensureResponseStore();
  const raw = fs.readFileSync(responsesFilePath, 'utf8');
  res.json(JSON.parse(raw));
});

app.post('/api/submit-date', async (req, res) => {
  try {
    const { name, answer, date, time, vibe } = req.body;

    if (!name || !answer) {
      return res.status(400).json({ success: false, message: 'Missing required data.' });
    }

    const payload = {
      name,
      answer,
      date: date || 'Not chosen yet',
      time: time || 'Not chosen yet',
      vibe: vibe || 'No vibe chosen yet',
    };

    const hasSmtpConfig =
      process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.TO_EMAIL;

    const mailProvider = (process.env.MAIL_PROVIDER || 'smtp').toLowerCase();
    const canUseResend = hasResendConfig();

    if (mailProvider === 'resend' && canUseResend) {
      try {
        await sendDateMailViaResend(payload);

        saveResponseLocally({ ...payload, emailSent: true, provider: 'resend' });

        return res.json({
          success: true,
          message: 'Your response has been sent successfully via Resend.',
          emailSent: true,
        });
      } catch (mailError) {
        console.error('Resend send failed, storing locally instead:', mailError);
      }
    } else if (mailProvider === 'resend' && !canUseResend) {
      console.warn('Resend is selected but required environment variables are missing.');
    }

    if (hasSmtpConfig) {
      try {
        await sendDateMail(payload);

        saveResponseLocally({ ...payload, emailSent: true, provider: 'smtp' });

        return res.json({
          success: true,
          message: 'Your response has been sent successfully.',
          emailSent: true,
        });
      } catch (mailError) {
        console.error('Email send failed, storing locally instead:', mailError);
      }
    } else {
      console.warn('SMTP settings missing; saving response locally instead.');
    }

    saveResponseLocally({ ...payload, emailSent: false, provider: 'local-fallback' });

    return res.json({
      success: true,
      message: 'Your response was saved locally because email delivery is not configured yet.',
      emailSent: false,
    });
  } catch (error) {
    console.error('Request handling failed:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while processing the response.',
    });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

ensureResponseStore();

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
