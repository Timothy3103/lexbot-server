require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const GROQ_API_KEY = process.env.GROQ_API_KEY;

app.post('/webhook/chat', async (req, res) => {
  try {
    const { message, language, topic, icon, history = [] } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({ error: true, message: 'Message is required' });
    }

    const langInstruction = language === 'PID'
      ? 'Respond in Nigerian Pidgin English. Use everyday Pidgin that ordinary Nigerians understand.'
      : 'Respond in clear, simple English that non-lawyers can understand.';

    const systemPrompt = `You are LexBot, an AI legal assistant specialising in Nigerian law.
${topic ? `The user is asking about: ${icon} ${topic}. Focus your responses on this area of Nigerian law.` : ''}

IMPORTANT RULES:
1. Only reference actual Nigerian laws and statutes
2. Always mention the specific law name when relevant
3. Break down legal concepts in plain language
4. Always end with: "Note: This is legal information, not legal advice. Please consult a qualified Nigerian lawyer for your specific situation."
5. ${langInstruction}
6. Keep responses focused and practical
7. If you don't know something, say so clearly

NIGERIAN LAWS YOU KNOW:
- Constitution of the Federal Republic of Nigeria 1999
- Labour Act Cap L1 LFN 2004
- Land Use Act
- Administration of Criminal Justice Act (ACJA) 2015
- Companies and Allied Matters Act (CAMA) 2020
- Rent Control and Recovery of Residential Premises Act
- Child Rights Act 2003
- Violence Against Persons Prohibition Act (VAPP) 2015
- Consumer Protection Council Act
- National Health Act 2014`;



    const groqResponse = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [
            { role: 'system', content: systemPrompt },
            ...history,
             { role: 'user', content: message.trim() }
        ],
        max_tokens: 1024,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const reply = groqResponse.data.choices[0].message.content;

    const disclaimer = language === 'PID'
      ? 'Note: Na information I dey give you, not legal advice. Make you consult lawyer for serious matter.'
      : 'Note: This is legal information, not legal advice. Please consult a qualified Nigerian lawyer for your specific situation.';

    return res.status(200).json({
      reply,
      disclaimer,
      language: language || 'EN',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    return res.status(500).json({
      error: true,
      message: 'Something went wrong. Please try again.'
    });
  }
});

// Keep-alive ping to prevent Render free tier sleep
setInterval(() => {
  fetch('https://lexbot-server.onrender.com/')
    .then(() => console.log('Keep-alive ping sent'))
    .catch(() => console.log('Keep-alive ping failed'));
}, 14 * 60 * 1000);

app.get('/', (req, res) => {
  res.json({ status: 'LexBot server is running' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`LexBot server running on port ${PORT}`);
});

app.post('/webhook/document', async (req, res) => {
  try {
    const { type, fields, formData, language } = req.body;

    if (!type || !formData) {
      return res.status(400).json({ error: true, message: 'Document type and form data are required' });
    }

    const langInstruction = language === 'PID'
      ? 'Write the document in formal English (legal documents must be in English) but add a plain English summary at the end in Nigerian Pidgin.'
      : 'Write the document in formal English.';

    const systemPrompt = `You are LexBot, a Nigerian legal document generator. Generate professional, legally-structured Nigerian documents.

IMPORTANT RULES:
1. Generate complete, properly formatted legal documents
2. Use Nigerian legal conventions and formatting
3. Reference relevant Nigerian laws where appropriate
4. Include all standard clauses for the document type
5. Use the provided details to fill in the document
6. ${langInstruction}
7. End with: "NOTE: This document is for guidance only. Have it reviewed by a qualified Nigerian lawyer before use."

Format the document with clear sections, proper headings, and professional language.`;

    const userPrompt = `Generate a ${type} with these details:
${Object.entries(formData).map(([key, value]) => `- ${key}: ${value}`).join('\n')}

Generate a complete, professional Nigerian legal document.`;

    const groqResponse = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 2048,
        temperature: 0.3
      },
      {
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const document = groqResponse.data.choices[0].message.content;

    return res.status(200).json({
      document,
      type,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Document error:', error.response?.data || error.message);
    return res.status(500).json({
      error: true,
      message: 'Failed to generate document. Please try again.'
    });
  }
});