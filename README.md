# RentManager 

[![Download Android APK v1.0.1](https://img.shields.io/badge/📱_DOWNLOAD_ANDROID_APK-v1.0.1_(LATEST)-2563eb?style=for-the-badge&logo=android&logoColor=white)](https://github.com/RonakSengal02/RentalTenant-Management-App/raw/RentalTenant-Management-Mobile-App/RentManager-v1.0.1.apk)
[![Download Android APK v1.0.0](https://img.shields.io/badge/📱_PREVIOUS_VERSION-v1.0.0-059669?style=for-the-badge&logo=android&logoColor=white)](https://github.com/RonakSengal02/RentalTenant-Management-App/raw/RentalTenant-Management-Mobile-App/RentManager.apk)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

> ### 📲 **[Click Here to Download Latest Android App: RentManager-v1.0.1.apk (v1.0.1)](https://github.com/RonakSengal02/RentalTenant-Management-App/raw/RentalTenant-Management-Mobile-App/RentManager-v1.0.1.apk)**
> ⚡ **Direct Download**: Tap the link above on your phone or PC to immediately download the Android APK.
> - **v1.0.1 New Features**: Dark Mode / Light Mode / Mobile System Default, Strict 10-Digit Mobile Validation, Returning Tenant Stay History, Rent Ledger & Partial Payments, 4-Digit Security PIN Lock, Room Vacancy Management, Interactive Calendar, Activity Log.
> - **Preserved v1.0.0 Version**: [Download RentManager.apk (v1.0.0)](https://github.com/RonakSengal02/RentalTenant-Management-App/raw/RentalTenant-Management-Mobile-App/RentManager.apk)
> - **100% Local Phone Storage** (IndexedDB persistent disk storage)
> - **100% Offline Capable** (Works without internet)
> - **Bilingual Support** (English + ગુજરાતી)
> - **Clean PDF Receipts & Statements**

---

## 🌟 Key Features

1. **Tenant Registration**:
   - Tenant Name, Mobile Number, Room/House Number, Move-in Date, Monthly Rent, Security Deposit, Rent Due Day (1st to 31st of every month), Permanent Address, and Photo.
   - Active vs. Inactive / Vacated status.

2. **Tenant Directory & Search**:
   - Clean list/card format with real-time search by Name, Mobile Number, or Room Number.
   - Status Filter Tabs: `All`, `Paid (✓)`, `Pending (⏱)`, `Overdue (!)`, and `Inactive`.
   - Direct Phone Call, WhatsApp, and Record Rent action shortcuts on each card.

3. **Monthly Rent Payment & Receipts**:
   - Record rent with Cash, UPI (GPay/PhonePe/Paytm), Bank Transfer, or Cheque/Other with reference notes.
   - Instant transition to **PAID** status with celebratory confetti.
   - Official Digital Rent Receipt with **Share on WhatsApp**, **Print**, and **Direct PDF Download**.

4. **Automated Recurring Reminders & Alerts**:
   - Automatically calculates next month's due date based on joining/due date (e.g. 10th of every month).
   - "🔔 Rent Reminder" on due date.
   - "⚠️ Rent Pending" if rent is unpaid after due date.
   - "📢 Upcoming Rent" alert 3 days before due date.
   - Pre-formatted one-click WhatsApp reminder messages.

5. **Executive Dashboard**:
   - Total Tenants, Total Monthly Expected Rent, Rent Collected This Month, Rent Pending, and Paid vs. Overdue counters.
   - Urgent Attention alert strip for tenants due today or overdue.

6. **Direct PDF Downloads on Phone**:
   - **Full Rental Statement & Report (PDF)** in Settings.
   - **Individual Rent Receipt (PDF)** in Receipt modal.
   - **Tenant Statement (PDF)** in Tenant profile.

7. **Bilingual English & Gujarati Support**:
   - Seamless one-tap toggle between **English** and **ગુજરાતી**.

8. **100% Offline & Local Data Persistence**:
   - Data is stored securely on the phone's internal storage via **IndexedDB** with **Persistent Storage Lock**.
   - Data remains 100% saved even when you close the app or restart your phone.
   - Includes JSON Backup/Restore and CSV/Excel export.

---

## 🚀 How to Run on Any Laptop / Computer

1. **Clone the repository**:
   ```bash
   git clone <your-github-repo-url>
   cd "RentalTenant Management Mobile App"
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the app**:
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:3000` (or `http://<your-ip>:3000` on your mobile phone on the same Wi-Fi).

---

## 📱 How to Download the Android APK from GitHub

This repository contains an automated GitHub Actions workflow (`.github/workflows/build-apk.yml`) that builds an Android APK automatically:

1. Push your code to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of Rental Tenant Management App"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```
2. Open your repository on [GitHub](https://github.com).
3. Click on the **Actions** tab at the top.
4. Click on the latest workflow run: **"Build Android APK"**.
5. Under **Artifacts** at the bottom of the page, click **`RentManager-App-APK`** to download `app-debug.apk`.
6. Transfer or open the `.apk` on any Android phone and tap **Install**!
