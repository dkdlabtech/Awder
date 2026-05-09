# Security Specification for Sira-Djou

## 1. Data Invariants
- A booking must always have a `guestId` matching the creator.
- A wallet can only be created by the user with a 0 balance and 0 escrow.
- Transactions are immutable once created (except status by system).
- Listings can only be managed by their creators (hosts).
- Notifications are private to the recipient.

## 2. The "Dirty Dozen" Payloads (Deny Cases)
1. **Identity Spoofing**: Creating a booking with `guestId` set to another user.
2. **Balance Injection**: Creating a wallet with a non-zero initial balance.
3. **Price Manipulation**: Updating a booking's `totalPrice` after it's been created.
4. **Role Escalation**: Updating user profile to set `isVerified: true` manually.
5. **PII Leak**: Unauthorized user reading another user's wallet.
6. **Ghost Transaction**: Creating a transaction for a booking the user does not own.
7. **Negative Payment**: Creating a transaction with a negative amount.
8. **Resource Poisoning**: Using a 1MB string for a listing title.
9. **Status Hijacking**: A guest accepting their own check-in (should be host or system logic verified).
10. **Orphaned Booking**: Creating a booking for a non-existent listing.
11. **Impersonation**: Updating someone else's listing.
12. **Notification Spam**: Sending a notification to a userId that doesn't match the sender's target logic (if we had strict sender logic).

## 3. Test Runner (Draft Rules)
The rules will be implemented in `firestore.rules`.
