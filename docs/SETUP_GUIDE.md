# StockWatch Setup & Integration Guide

This guide provides step-by-step instructions for connecting your Google Sheet and configuring your messaging gateway (**Termii** or **Africa's Talking**) with StockWatch.

---

## 1. Google Sheets Setup

StockWatch reads inventory counts and updates reorder thresholds directly from your existing Google Sheet.

### Step 1.1: Format Your Google Sheet Columns
Ensure your Google Sheet header row (Row 1) contains the following columns. StockWatch matches column names flexibly:

| Column Name | Required? | Purpose | Example Value |
|---|---|---|---|
| **Product Name** | Yes | Name of the product | `A4 Copier Paper (500 Sheets)` |
| **SKU/Product ID** | Yes | Unique identifier for deduplication | `SKU-1001` |
| **Category** | Optional | Item department or group | `Office Supplies` |
| **Current Quantity** | Yes | Current stock count | `4` |
| **Reorder Threshold** | Optional | Alert level (uses default if blank) | `15` |
| **Unit** | Optional | Unit of measure | `reams`, `boxes`, `units` |
| **Supplier Name** | Optional | Vendor to reorder from | `PaperDirect Ltd` |
| **Supplier Contact** | Optional | Phone/email for quick reordering | `+2348031112233` |

> 💡 **Tip:** Click **Sample Sheet** in the top right of the StockWatch dashboard to download a pre-formatted CSV template.

---

### Step 1.2: Enable Google Sheets API & Get Credentials

#### Option A: Google Service Account (Recommended for Production)
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project named **StockWatch**.
3. In the sidebar, navigate to **APIs & Services > Library**, search for **Google Sheets API**, and click **Enable**.
4. Navigate to **APIs & Services > Credentials**, click **Create Credentials**, and select **Service Account**.
5. Give it a name (e.g., `stockwatch-bot`) and click **Create and Continue**.
6. Once created, click on the Service Account email address to open its details.
7. Click the **Keys** tab > **Add Key** > **Create new key** > Select **JSON** > Click **Create**.
8. Save the downloaded JSON file as `google-credentials.json` inside your StockWatch root project folder:
   ```
   /Users/henryfriendselectronicx/Desktop/StockWatch App/google-credentials.json
   ```
9. **Crucial Step:** Copy the Service Account email address (e.g., `stockwatch-bot@your-project.iam.gserviceaccount.com`). Open your Google Sheet, click **Share**, paste the email address, select **Editor**, and click **Share**.

#### Option B: Demo / Testing Mode (No Credentials Needed)
- If `USE_MOCK_SHEETS=true` in your `.env` file, StockWatch will run in Demo Mode using simulated retail inventory data without calling Google APIs.

---

## 2. Messaging Gateway Setup

StockWatch supports **Termii** and **Africa's Talking** (optimized for Nigerian & African mobile networks), as well as a **Mock Gateway** for zero-cost testing.

### Option 1: Termii Integration (SMS & WhatsApp)
1. Register an account at [Termii.com](https://termii.com).
2. Go to your Dashboard and copy your **API Key**.
3. Under **Sender IDs**, request a Sender ID (e.g., `StockWatch` or use the default `N-Alert`).
4. Update your `.env` file:
   ```env
   MESSAGING_PROVIDER=TERMII
   TERMII_API_KEY=your_actual_termii_api_key
   TERMII_SENDER_ID=StockWatch
   TERMII_CHANNEL=generic # Use 'whatsapp' if WhatsApp channel is enabled on Termii
   ```

---

### Option 2: Africa's Talking Integration (SMS)
1. Register an account at [AfricasTalking.com](https://africastalking.com).
2. Go to your Dashboard and copy your **API Key** and **Username** (use `sandbox` for testing).
3. Update your `.env` file:
   ```env
   MESSAGING_PROVIDER=AFRICAS_TALKING
   AFRICASTALKING_API_KEY=your_actual_africastalking_api_key
   AFRICASTALKING_USERNAME=sandbox
   AFRICASTALKING_SENDER_ID=StockWatch
   ```

---

### Option 3: Mock Gateway (Testing Mode)
- Set `MESSAGING_PROVIDER=MOCK` in `.env`.
- All low stock alerts will be logged directly to the server terminal and dashboard logs without sending live SMS/WhatsApp messages.

---

## 3. Environment Variables Reference (`.env`)

Copy `.env.example` to `.env` and configure your parameters:

```bash
cp .env.example .env
```

Key settings in `.env`:

```env
PORT=3000
CHECK_INTERVAL_MINUTES=60       # How often to check stock levels (e.g., every 60 mins)
DEFAULT_REORDER_THRESHOLD=10    # Fallback threshold if column missing
COOLDOWN_HOURS=24               # Prevent duplicate alerts within X hours for same low item
RECIPIENT_PHONE_NUMBERS=+2348012345678,+2348098765432 # Phone numbers to receive alerts

SPREADSHEET_ID=1BxiMVs0XRA5nFMdKbBUIyBEpdp3MIAc8 # Extracted from Google Sheet URL
SHEET_NAME=Sheet1
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./google-credentials.json
USE_MOCK_SHEETS=false

MESSAGING_PROVIDER=TERMII
TERMII_API_KEY=your_termii_key_here
```

---

## 4. Launching StockWatch

### Run Locally
```bash
# Start background monitor & web dashboard
npm start

# Or development mode with auto-reload:
npm run dev
```

### Access Dashboard
Open your browser and navigate to:
```
http://localhost:3000
```
- View live stock status.
- Trigger manual inventory checks anytime with **Check Stock Now**.
- Edit reorder thresholds directly from the UI (changes sync straight to Google Sheet).
- Send test SMS notifications with **Send Test SMS**.
