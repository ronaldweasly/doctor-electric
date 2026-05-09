# Admin Quick Start Guide

You're now an admin with superpowers. Here's what you can do:

---

## 🔐 Your Admin Panel (Users Page)

Click **Users** in the sidebar to access admin features.

### Section 1: Manage Users
- **View** all active users
- **Add** new team members (set their role)
- **Edit** existing users (deactivate old employees)
- **Roles available:**
  - Admin (you) - full control
  - Sales Team - sell things
  - Engineer - technical work
  - Accountant - money stuff

### Section 2: Backup Management
- **Status:** Auto-backups run every hour 🟢
- **Manual backup:** Click "Create Backup Now" whenever you want
- **Download:** Export as JSON (safest) or CSV (read in Excel)
- **Delete:** Clean up old backups (keeps last 10)

**💡 Pro tip:** Export a backup every Monday as backup of your backup

### Section 3: Activity Audit Trail  
- **See everything:** Every change made, by whom, when
- **Filter:** Find specific user/sheet/action
- **Export:** CSV for accountant / JSON for archive
- **Cleanup:** Delete logs older than 90 days (keeps storage small)

---

## 🛡️ What's Protected Now

### Can't Be Deleted/Changed Accidentally:
- ❌ Client creation date (stops accidental date rewrites)
- ❌ User emails/roles (admins only)
- ❌ Payment amounts (accountants only) 
- ❌ Workflow status timestamps (automatic)

### Can't Upload Dangerous Files:
- ❌ .exe, .zip, .bat, .sh (blocked)
- ❌ Files > 50MB (too big)
- ❌ Filenames with path chars like `../` (injection blocked)

### Who Can See What:
**Engineers** can't see: User list, Reports, Payment details
**Sales Team** can't see: User list, Reports, Payment details, Installation tech stuff
**Accountants** can't see: User management, Backups, Some client fields

---

## 📋 Daily Admin Checklist

### Daily (2 min)
- [ ] Eyeball activity logs for weird activity
- [ ] Check someone isn't locked out

### Weekly (10 min)
- [ ] Create manual backup
- [ ] Export backup as JSON to safe location
- [ ] Export activity logs
- [ ] Deactivate any users who left team

### Monthly (30 min)
- [ ] Test restore from old backup (just check it works)
- [ ] Archive activity logs to permanent storage
- [ ] Review protection violations (in browser console)

---

## 🚨 Emergency Procedures

### If Data Gets Corrupted
1. Go to Backups section
2. Note the timestamp of last good backup
3. Contact developer with timestamp
4. Data can be restored from that point

### If Someone Left Team
1. Go to Users page
2. Click Edit on their name
3. Change "Status" to "Inactive"
4. They can't login anymore (stays in history for audit)

### If Upload Folder Gets Messy
1. Uploads auto-organize: `/uploads/2025/05/06/surveyType_clientID/filename.pdf`
2. If you need to clean: Sort by date, delete old stuff
3. All uploads tracked - you can see what was uploaded when

### If You Suspect Unauthorized Access
1. Go to Activity Audit Trail
2. Filter by User → Look for their name
3. Filter by Status → Look for "failed" logins
4. Export logs as proof
5. Change their password or deactivate

---

## 🔍 How to Use Activity Logs

### Example: "Who changed this client's status?"
1. Activity Audit Trail section
2. Filter by:
   - Sheet: Clients
   - Action: UPDATE
   - TimeRange: Last 7 days (if you know when)
3. Find the row showing Jane changed Client_123 status
4. Timestamp shows exactly when

### Example: "Are our uploads organized?"
1. Activity Audit Trail
2. Filter by Action: DOWNLOAD, EXPORT
3. See all files accessed and who used them

### Example: "Did someone fail to login?"
1. Activity Audit Trail
2. Filter by Status: Failed
3. See all failed operations (bad logins, unauthorized edits, etc)

---

## 🎯 Permission Levels Explained

Your team's access by role:

| Feature | Admin | Sales | Engineer | Accountant |
|---------|-------|-------|----------|------------|
| Dashboard | ✓ | ✓ | ✓ | ✓ |
| View Clients | ✓ | ✓ | ✓ | ✓ |
| Create Clients | ✓ | ✓ | ✗ | ✗ |
| Create Surveys | ✓ | ✗ | ✓ | ✗ |
| Edit Quotations | ✓ | ✓ | ✓ | ✗ |
| Approve Quotations | ✓ | ✗ | ✗ | ✓ |
| View Payments | ✓ | ✗ | ✗ | ✓ |
| Edit Payments | ✓ | ✗ | ✗ | ✓ |
| View Reports | ✓ | ✗ | ✗ | ✓ |
| Manage Users | ✓ | ✗ | ✗ | ✗ |
| View Backups | ✓ | ✗ | ✗ | ✗ |
| View Audit Logs | ✓ | ✗ | ✗ | ✗ |

---

## 🔑 Important Principles

1. **You are the only admin** - Only you can:
   - Add/remove users
   - Edit protected fields
   - View audit logs
   - Manage backups

2. **Everything is logged** - Even if someone tries something unauthorized, you'll see:
   - What they tried
   - When they tried it
   - Why it failed

3. **Backups are your safety net** - If anything goes wrong:
   - You can restore to any previous hour
   - All data is recovered
   - Users just lose changes after that hour

4. **Uploads are validated** - Nobody can:
   - Upload viruses
   - Upload huge files
   - Upload with weird names
   - Everything is organized by date/client

---

## 📞 Troubleshooting

### "I see 'Access Denied' error"
- Your user account role is wrong
- Contact admin (you) to fix your role
- Or: Sign out and back in

### "Backup isn't showing"
- Check: Is your browser blocking localStorage?
- Try: Export latest backup to download it
- Note: Auto-backups only keep 10 most recent

### "Can't upload file"
- Check: File is PDF/Image/Excel/CSV only
- Check: File is under 50MB
- Try: Smaller or different file type

### "Activity log shows I did something I didn't"
- Someone logged in with your account
- Change your password immediately
- Export logs and show them to manager

---

## 💾 Recommended Backup Storage

**Option 1: OneDrive (Easy, Recommended)**
- Export backup as JSON
- Save to: OneDrive > DOCTOR ELECTRIC CRM backup folder
- Auto-sync to cloud ✓

**Option 2: USB Drive (Safest)**
- Export backup as JSON
- Copy to: USB drive
- Keep in safe place (your desk)

**Option 3: Email (Quick)**
- Export backup as JSON
- Email to personal/work email
- Cloud backup of email ✓

**Do at least once a week.**

---

## ⚠️ Never Do This

❌ **Share your admin account** - Use your personal email only
❌ **Delete protection rules** - They protect you too
❌ **Ignore failed login attempts** - Check activity logs
❌ **Forget to backup** - Do it weekly, minimum
❌ **Delete whole sheets** - Use deactivate instead (user records)
❌ **Edit protected columns** - System prevents it (for safety)

---

## 🎓 You Now Have

✅ Automatic daily backups (hourly snapshots)
✅ Complete audit trail (who did what when)
✅ Role-based access control (who sees what)
✅ File upload protection (no viruses/chaos)
✅ Sheet protection (prevent accidents)

**Result:** Your small business data is now:
- **Safe** (backups recover everything)
- **Auditable** (see all changes)
- **Secure** (roles + protection)
- **Organized** (validate + structure)

---

**Questions?** Check `SECURITY_IMPROVEMENTS.md` for technical details.
