# Bot Telegram - Gestion des Leads avec Google Sheets 📊🤖

Ce bot Telegram permet de gérer des leads en les enregistrant dans une Google Sheet via un compte de service Google. Il envoie également des notifications vers un canal Telegram privé.

---

## 📌 Prérequis 

Avant d’installer et d’exécuter le bot, assure-toi d’avoir :

1. Un **VPS** ou une machine avec **Node.js** et **npm** installés.
2. Un **bot Telegram** et son **token API**.
3. Une **Google Sheets** configurée avec un **compte de service**.
4. Un **canal privé Telegram** pour recevoir les notifications.

---

## 🚀 Installation

### 1️⃣ Cloner le projet

```sh
git clone https://github.com/MathieuDuboy/BotTelegram.git
```

### 2️⃣ Installer les dépendances

```sh
npm install
```

### 3️⃣ Configurer les variables d’environnement

Crée un fichier `.env` à la racine du projet et ajoute ces variables :

```env
BOT_TOKEN=ton_token_telegram
GOOGLE_SHEET_ID=1Xqq1ep9yEiYWJAXQBysq5Dj0p8FOuHLE632lbhDOnx0
GOOGLE_SERVICE_ACCOUNT_EMAIL=ton-compte@ton-projet.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_KEY=./credentials.json
TELEGRAM_CHANNEL_ID=-100xxxxxxxxx
```

---

## 🔑 Création et configuration du bot Telegram

1. Va sur [@BotFather](https://t.me/BotFather) sur Telegram.
2. Tape `/newbot` et suis les instructions.
3. Note bien le **token** du bot et mets-le dans le `.env`.

---

## 📊 Configuration de Google Sheets

### 1️⃣ Créer une Google Sheets

1. Va sur [Google Sheets](https://docs.google.com/spreadsheets).
2. Crée une nouvelle feuille et copie **l’ID** de la feuille dans l’URL :

   ```
   https://docs.google.com/spreadsheets/d/TON_GOOGLE_SHEET_ID/edit
   ```

3. Remplace `TON_GOOGLE_SHEET_ID` dans le `.env`.

---

### 2️⃣ Créer un compte de service Google

1. Va sur la [Google Cloud Console](https://console.cloud.google.com/).
2. Active **Google Sheets API**.
3. Crée un **compte de service** dans **IAM & Admin > Comptes de service**.
4. Génère une **clé JSON** et télécharge-la dans le projet sous `credentials.json`.
5. Dans la Google Sheet, partage l’accès **en modification** au **compte de service** :

   ```
   ton-compte@ton-projet.iam.gserviceaccount.com
   ```

---

## 📡 Autoriser **https://novabotcard.com** dans Google Sheets

Si l’API est appelée depuis un site web, il faut **whitelister** le domaine :

1. Dans la [Google Cloud Console](https://console.cloud.google.com/).
2. Aller dans **API & Services > Identifiants**.
3. Sélectionner le projet, puis **Clés API**.
4. Modifier les restrictions et ajouter **https://novabotcard.com**.

---

## 📢 Configuration du canal Telegram

1. Crée un **canal privé** sur Telegram.
2. Ajoute le bot au canal en tant qu’**administrateur**.
3. Récupère l’ID du canal avec **@username_to_id_bot**.
4. Mets l’ID dans le `.env` sous `TELEGRAM_CHANNEL_ID`.

---

## ▶️ Lancer le bot

```sh
node index.js
```

---

## ✅ Fonctionnalités du bot

- Enregistre des leads dans **Google Sheets**.
- Envoie des **notifications Telegram** sur un canal privé.

---

## 🛠 Déploiement en tant que service (PM2)

Pour s’assurer que le bot tourne en permanence, utilise **PM2** :

```sh
npm install -g pm2
pm2 start index.js --name bot-telegram
pm2 save
pm2 startup
```

ou alors pour le lancer rapidement :
```sh
node index.js
```
---
