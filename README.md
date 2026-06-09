<div align="center">

<img src="public/vault-icon.svg" alt="Vault Logo" width="80" height="80" />

# Vault

### Your Personal Encrypted Space. Offline. Private. Unbreakable.

<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/dc0b8961-c0e7-4ead-8ee3-4d37cc2c9c2c" />
<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/759ecc4f-0709-41e9-8978-1d94a184917e" />
<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/7fef6168-0427-4521-a1c7-db942fdb04ab" />
<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/6db8090d-c324-4bfa-ad69-85b576b8ce45" />
<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/13617cea-9305-48c5-827c-a0174a7e3110" />
<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/29b6a9df-409e-45da-a99e-56fcce731ddf" />


> **Vault is a 100% offline, client-side personal space application that encrypts everything you store, including notes, code, photos, files, passwords, cards, and diary entries, directly inside your browser using military-grade cryptography. No servers. No accounts. No trace.**

</div>

<br>

## Preview

> Settings — On-Device Cryptographic Architecture

![Vault Settings Screenshot] 
<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/ffd1997a-5da6-4a55-8d68-7c534b37a728" />
| Light Monochrome | Dark Cosmic | System Preferences |
|---|---|---|
| Always Light | Always Dark | OS Auto Match |

<br>

## What is Vault?

Vault is a **personal encrypted workspace** built entirely inside the browser. Everything you create or upload is encrypted on your device before it is saved. Your master key never leaves your machine, never touches a network, and never reaches any server.

Think of it as your own **private digital safe** for your thoughts, your code, your memories, and your most sensitive information.

Whether you are a developer storing API keys, a writer keeping a private diary, or anyone who values true digital privacy, Vault is built for you.

<br>

## Features

### Notes

Create and manage private notes with full rich text support. Write and syntax-highlight code snippets directly inside your notes. Every note is fully encrypted at rest using AES-256-GCM, and you can search across all of them instantly with local full-text search.

### Gallery

Store photos and images securely inside your vault. All images are encrypted before being saved to local storage. Browse your gallery in a clean grid or list view. All major image formats are supported.

### Files

Upload and store any type of file, including documents, archives, spreadsheets, and more. Files are encrypted chunk by chunk before storage. You can download decrypted files at any time directly to your device. There are no file size limits beyond your own device storage capacity.

### Passwords

Save and manage passwords for any service or account. Generate strong passwords using the built-in password generator. All credentials are AES-256-GCM encrypted and never stored in plain text. A quick-copy feature includes clipboard auto-clear for additional security.

### Cards

Store credit card, debit card, and bank account details privately. Card numbers and CVV codes are fully encrypted at rest. The card viewer displays all details in a masked format by default.

### Diary

Write private diary entries with date and mood tracking. All entries are end-to-end encrypted and stored locally on your device. You can search and filter entries by date or keyword at any time.

<br>

## Security Architecture

Vault is built on a **zero-trust, zero-server, zero-knowledge** model. Below is a complete breakdown of how it works.

### On-Device Cryptographic Architecture

| Component | Technology |
|---|---|
| Encryption Protocol | AES-256-GCM (Hardware Accelerated) |
| Key Derivation | PBKDF2 SHA-256 (310,000 rounds) |
| DB Storage Engine | Dexie / IndexedDB Local Sandbox |
| Network Uptime | 100% Offline. No servers, no trace. |
| Crypto API | Native Web Crypto API (browser built-in) |

### How Encryption Works

**Step 1. Master Password to Key Derivation**
Your master password is passed through PBKDF2 with SHA-256 and 310,000 rounds to derive a cryptographic key. This process makes brute-force attacks computationally infeasible even with modern hardware.

**Step 2. Key to AES-256-GCM Encryption**
All data, including notes, files, passwords, and images, is encrypted using AES-256-GCM with a unique Initialization Vector per entry. AES-256-GCM is hardware-accelerated on all modern CPUs.

**Step 3. Encrypted Data to IndexedDB via Dexie**
Only ciphertext is ever written to your browser's IndexedDB. No plain text ever touches disk. Dexie provides a clean and reliable abstraction layer over the raw IndexedDB API.

**Step 4. No Network Means No Leak**
Vault operates at 100% offline. There are no API calls, no telemetry, no analytics, and no cloud sync. Your data physically cannot leave your device.

**Step 5. Lock Equals Memory Wipe**
When you lock your vault, all derived CryptoKeys are immediately wiped from active React memory. The lock gate screen is triggered instantly, and no decrypted data remains in RAM.

### Immediate Lockout Controls

Vault includes an **Immediate Lockout** feature that revokes all memory access instantly, wipes all derived CryptoKeys from active React state, triggers the lock gate screen, and can be activated with a single click at any time from the Settings page.

<br>

## Appearance

Vault supports three visual themes. Theme preferences are saved locally in encrypted cache.

| Theme | Description |
|---|---|
| **Light Monochrome** | Clean, minimal always-light interface |
| **Dark Cosmic** | Deep dark always-dark interface |
| **System Preferences** | Automatically matches your OS light or dark setting |

<br>

## Tech Stack

| Technology | Purpose |
|---|---|
| React 18 | UI framework and component architecture |
| Vite 5 | Build tool and development server |
| Web Crypto API | Native browser cryptography engine |
| Dexie.js | IndexedDB wrapper for local encrypted storage |
| AES-256-GCM | Symmetric encryption for all stored data |
| PBKDF2 SHA-256 | Password-based key derivation function |
| IndexedDB | Local browser database sandbox |

<br>

## Getting Started

### Prerequisites

Node.js 18 or higher and npm or yarn are required.

### Installation

```bash
# Clone the repository
git clone https://github.com/umarfarooq25to30-coder/Vault.git

# Navigate to the project directory
cd Vault

# Install dependencies
npm install

# Start the development server
npm run dev
```

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```
<br>

## Security Considerations

**Never share your master password.** Vault has no password recovery mechanism by design. If you forget your master password, your data cannot be recovered under any circumstances.

**Back up your IndexedDB data** regularly using the Backup and Restore feature found in the Security section of Settings.

**Do not use Vault on shared or public computers**, as browser storage persists after the session ends and may be accessible to other users.

**Keep your browser updated** to ensure that the Web Crypto API implementation remains current and fully secure.

This application stores all data locally in your browser's IndexedDB. Clearing your browser data or site data will permanently delete your entire vault and all of its contents.

<br>

## Important Disclaimer

Vault is a personal project built for **private, personal use only**.

This project is **not for sale** and may not be resold, repackaged, or distributed commercially in any form. Contributions and improvements are welcome from the community. The author makes no guarantees about the fitness of this software for any specific security use case. Use at your own risk and always maintain offline backups of any critical data.

<br>

## Roadmap

- [ ] Biometric unlock support via WebAuthn
- [ ] Vault export and encrypted backup to file
- [ ] Multiple vault profiles
- [ ] Browser extension for password autofill
- [ ] Mobile PWA support
- [ ] Secure note sharing via encrypted link
- [ ] Two-factor authentication on vault unlock

<br>

## Contributing

This project is open to improvements. If you have ideas, bug fixes, or security enhancements, follow the steps below.

1. Fork the repository
2. Create a new branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m "Add your feature"`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Open a Pull Request

Please do not submit pull requests that attempt to add server-side sync, cloud storage, or any form of network communication. Vault is and will always remain 100% offline by design.

<br>

## License

**Personal Use Only. All Rights Reserved.**

This project is publicly visible for portfolio, learning, and contribution purposes only. You may not sell, commercially distribute, or repackage this software or any substantial portion of it without explicit written permission from the author.

Copyright 2025 umarfarooq25to30-coder. All rights reserved.

<br>

<div align="center">
Built with React and a commitment to privacy, because your data belongs to you.
</div>
