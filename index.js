require('dotenv').config();
const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis');
const token = process.env.TELEGRAM_BOT_TOKEN;
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const cors = require('cors');
const https = require('https');
const http = require('http');

const idChannel = process.env.IDCHANNEL;

// API 
const express = require('express');
const app = express();
app.use(cors({
    origin: process.env.URLSITE,
    methods: 'GET,POST',
    allowedHeaders: 'Content-Type',
    credentials: true
}));

const privateKey = fs.readFileSync('/etc/ssl/private/server.key', 'utf8');
const certificate = fs.readFileSync('/etc/ssl/certs/server.crt', 'utf8');
const credentials = { key: privateKey, cert: certificate };

// Créer le serveur HTTPS
https.createServer(credentials, app).listen(3001, () => {
    console.log('Server is running');
});


const PORT = process.env.PORT || 3001;
const axios = require('axios');
const bot = new TelegramBot(token, { polling: true });

const languages = {
    en: JSON.parse(fs.readFileSync('lang/en.json', 'utf8')),
    ru: JSON.parse(fs.readFileSync('lang/ru.json', 'utf8'))
};

const isValidName = (name) => /^[a-zA-ZÀ-ÖØ-öø-ÿ' -]+$/.test(name);
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidPhone = (phone) => /^(?:\+?(?:[1-9]\d{0,2})\s?)?(\(?\d{1,4}\)?[\s\-]?)?(\d{1,4}[\s\-]?\d{1,4}[\s\-]?\d{1,9})$/.test(phone);
const isValidReferral = (code) => /^[a-zA-Z0-9]+$/.test(code);

let userData = {};
let messageQueue = {};
let completedRequests = {}; // Liste pour suivre les demandes déjà complétées

const isProcessing = {}; // Gère le verrou par chatId

const enqueueMessage = async (chatId, text) => {
    if (!messageQueue[chatId]) messageQueue[chatId] = [];
    messageQueue[chatId].push(text);

    if (!isProcessing[chatId]) {
        await processQueue(chatId);
    }
};

const processQueue = async (chatId) => {
    if (isProcessing[chatId]) return; // Empêche l'exécution concurrente
    isProcessing[chatId] = true;

    try {
        while (messageQueue[chatId] && messageQueue[chatId].length > 0) {
            const message = messageQueue[chatId].shift();
            await bot.sendMessage(chatId, message, { parse_mode: "HTML" });
        }
    } finally {
        isProcessing[chatId] = false; // Libère le verrou après exécution
    }
};

// Démarrage du bot
console.log('🚀 Bot démarré et en écoute...');

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;

    // Vérifier si l'utilisateur a déjà complété une demande
    if (completedRequests[chatId]) {
        return bot.sendMessage(chatId, "⏳ Your request is being processed - Ваш запрос обрабатывается. 🎉 We will inform you as soon as your account is active.");
    }

    console.log(`✅ Nouveau chat démarré avec ${msg.chat.username}`);
    userData[chatId] = { step: 'language' };

    bot.sendMessage(chatId, "👋 Welcome! Please choose your language/ Пожалуйста, выберите ваш язык:", {
        reply_markup: {
            inline_keyboard: [
                [{ text: '🇬🇧 English', callback_data: 'en' }, { text: '🇷🇺 Русский', callback_data: 'ru' }]
            ]
        }
    });
});

// Choix de la langue
bot.on('callback_query', (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const langCode = callbackQuery.data;

    if (languages[langCode]) {
        userData[chatId].lang = langCode;
        const lang = languages[langCode];

        enqueueMessage(chatId, lang.thankYouLanguage);
        setTimeout(() => {
            const userId = callbackQuery.message.chat.id;
            const creationDate = new Date().toLocaleString();
            const accountDetails = `Your account has been created.\n<b>Account ID</b>: ${userId}\n<b>Creation date</b>: ${creationDate}`;
            enqueueMessage(chatId, accountDetails);
        }, 200);
        setTimeout(() => {
            enqueueMessage(chatId, lang.askReferralCode);
            userData[chatId].step = 'referral';
        }, 200);
    } else {
        enqueueMessage(chatId, "❌ Please choose a valid language / Пожалуйста, выберите язык");
    }
});

// Gestion du remplissage des infos utilisateur
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text.trim();

    if (!userData[chatId]) return;
    const lang = languages[userData[chatId].lang];

    if (userData[chatId].step === 'referral') {
        if (isValidReferral(text)) {
            userData[chatId].referralCode = text;
            enqueueMessage(chatId, lang.askFirstName);
            userData[chatId].step = 'firstName';
        } else {
            enqueueMessage(chatId, lang.invalidReferralCode);
        }
    } else if (userData[chatId].step === 'firstName') {
        if (isValidName(text)) {
            userData[chatId].firstName = text;
            enqueueMessage(chatId, lang.askLastName);
            userData[chatId].step = 'lastName';
        } else {
            enqueueMessage(chatId, lang.invalidName);
        }
    } else if (userData[chatId].step === 'lastName') {
        if (isValidName(text)) {
            userData[chatId].lastName = text;
            enqueueMessage(chatId, lang.askEmail);
            userData[chatId].step = 'email';
        } else {
            enqueueMessage(chatId, lang.invalidLastName);
        }
    } else if (userData[chatId].step === 'email') {
        if (isValidEmail(text)) {
            userData[chatId].email = text;
            enqueueMessage(chatId, lang.askPhone);
            userData[chatId].step = 'phone';
        } else {
            enqueueMessage(chatId, lang.invalidEmail);
        }
    } else if (userData[chatId].step === 'phone') {
        if (isValidPhone(text)) {
            userData[chatId].phone = text;
            enqueueMessage(chatId, `${lang.thankYou}\n\n✨ ${lang.firstName} : ${userData[chatId].firstName}\n✨ ${lang.lastName} : ${userData[chatId].lastName}\n📧 ${lang.email} : ${userData[chatId].email}\n📱 ${lang.phone} : ${userData[chatId].phone}\n🔗 ${lang.referralCode} : ${userData[chatId].referralCode}`);
            enqueueMessage(chatId, lang.goodbye);
            console.log(`📲 Infos collectées pour ${msg.chat.username} :`, userData[chatId]);

            // Enregistrer les données dans Google Sheets


            const leadData = {
                chatId,
                username: msg.chat.username,
                firstName: userData[chatId].firstName,
                lastName: userData[chatId].lastName,
                email: userData[chatId].email,
                phone: userData[chatId].phone,
                referralCode: userData[chatId].referralCode,
                firstNameChat: msg.chat.first_name,
                lastNameChat: msg.chat.last_name,
                language: msg.chat.language_code
            };
            const result = await addLead(leadData);

            if (result.success) {
                console.log("✅ Lead enregistré avec succès !");
            } else {
                console.error("❌ Erreur lors de l'enregistrement du lead :", result.message);
            }

            completedRequests[chatId] = true; // Marquer la demande comme complétée
            userData[chatId] = { step: 'language' };
        } else {
            enqueueMessage(chatId, lang.invalidPhone);
        }
    }
});

bot.on('polling_error', (error) => console.error(`❌ Erreur de polling : ${error.message}`));

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_CREDENTIALS_PATH,
    scopes: SCOPES
});
const sheets = google.sheets({ version: 'v4', auth });

async function addLead(leadData) {
    try {
        const currentDate = new Date().toLocaleString();

        if (!leadData.chatId || !leadData.firstName || !leadData.lastName || !leadData.email || !leadData.phone) {
            throw new Error("Données incomplètes.");
        }

        console.log("📩 Nouveau lead reçu :", leadData);

        const values = [[
            leadData.chatId,
            leadData.username || '',
            currentDate,
            leadData.firstName,
            leadData.lastName,
            leadData.email,
            leadData.phone,
            leadData.referralCode || '',
            leadData.firstNameChat || '',
            leadData.lastNameChat || '',
            leadData.language || ''
        ]];

        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'A1',
            valueInputOption: 'RAW',
            resource: { values },
        });

        console.log('✅ Données enregistrées dans Google Sheets');

        const recapMessage = `
        🎉 Nouveau lead déposé 🎉
    
        📅 Date: ${currentDate}
        🆔 Chat ID: ${leadData.chatId}
        👤 Prénom: ${leadData.firstName}
        👤 Nom: ${leadData.lastName}
        📧 Email: ${leadData.email}
        📱 Téléphone: ${leadData.phone}
        🔗 Code de parrainage: ${leadData.referralCode}
    
        📝 L'utilisateur a complété sa demande avec succès!`
            ;
        await bot.sendMessage(idChannel, recapMessage);
        console.log('✅ Récapitulatif envoyé à l\'administrateur.');


        return { success: true, message: "Lead ajouté avec succès !" };
    } catch (error) {
        console.error("❌ Erreur lors de l'ajout du lead :", error);
        return { success: false, message: "Erreur serveur." };
    }
}

app.get('/api/getUser/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const range = 'Leads';

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: range,
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            return res.status(404).json({ success: false, message: "Aucune donnée trouvée." });
        }

        // Recherche de l'utilisateur dans les lignes
        const userFound = rows.find(row => String(row[0]) === String(userId));
        // Il faudra ici rajouter un check sur une deuxième colonne pour voir s'il a une carte ou non

        if (userFound) {
            return res.json({ success: true, user: userFound });
        } else {
            return res.status(404).json({ success: false, message: "Utilisateur non trouvé." });
        }
    } catch (error) {
        console.error("Erreur lors de la récupération de l'utilisateur :", error);
        res.status(500).json({ success: false, message: "Erreur serveur." });
    }
});
