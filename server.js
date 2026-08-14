const express = require('express');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const responsesFilePath = path.join(__dirname, 'responses.json');

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

    if (hasSmtpConfig) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          secure: false,
          connectionTimeout: 10000,
          greetingTimeout: 10000,
          socketTimeout: 15000,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        await transporter.sendMail({
          from: process.env.SMTP_USER,
          to: process.env.TO_EMAIL,
          subject: `New date response from ${name}`,
          html: `
            <h2>New date response</h2>
            <p><strong>Name:</strong> ${payload.name}</p>
            <p><strong>Answer:</strong> ${payload.answer}</p>
            <p><strong>Date:</strong> ${payload.date}</p>
            <p><strong>Time:</strong> ${payload.time}</p>
            <p><strong>Dream vibe:</strong> ${payload.vibe}</p>
          `,
        });

        saveResponseLocally({ ...payload, emailSent: true });

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

    saveResponseLocally({ ...payload, emailSent: false });

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
