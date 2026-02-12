# **App Name**: V-Cash System

## Core Features:

- Team QR Code Generation: Generate static QR codes for each team containing the TEAM_ID and EVENT_ID, facilitating easy identification for transactions.
- Admin QR Scanner: Enable admins to scan team QR codes to initiate credit, debit, or loan transactions. Record transaction details and reasons.
- Team-to-Team Payment Requests: Allow teams to request payments from other teams for rent or settlements, which admins can approve or reject.
- Banking & Ledger Engine: Create immutable ledger records for every transaction, including transaction ID, timestamp, team IDs, admin ID, type, amount, reason, and balance after transaction, ensuring a single source of truth.
- Credit Score Engine: Automatically adjust team credit scores based on rewards, penalties, and loan activities. Super Admins have override capability using a tool to manage edge cases.
- Loan System: Implement a minimal loan system allowing admins to issue loans with a maximum amount, track repayment status, and manage loan issuance via QR codes. Limit one active loan per team.
- In-App Notification System: Implement a notification system to alert teams of transactions, payment requests, and other relevant updates using in-app notifications. Supports polling or web sockets.

## Style Guidelines:

- Primary color: A vibrant blue (#29ABE2), reflecting trust and reliability.
- Background color: Light blue (#E5F5FB), providing a clean and calming backdrop.
- Accent color: A complementary teal (#239993), used for key actions and highlights, guiding user attention.
- Body and headline font: 'Inter' (sans-serif) provides a clean, modern and neutral feel, suitable for both headlines and body text.
- Use clean and simple icons representing financial actions, such as transactions, loans, and payments, providing visual cues.
- A clean, well-structured layout focusing on readability, intuitive navigation, and easy access to key functionalities for each user role.
- Subtle transitions and animations for user interactions, enhancing the app's responsiveness and user experience.