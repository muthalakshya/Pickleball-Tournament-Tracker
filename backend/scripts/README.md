# Admin Setup Scripts

## Create Admin User

To create an admin user, run:

```bash
npm run create-admin
```

This will create an admin with:
- Email: `admin@gmail.com`
- Password: `123456`

### Custom Credentials

To create an admin with custom credentials:

```bash
node scripts/createAdmin.js your-email@example.com your-password
```

### Example

```bash
# Create default admin
npm run create-admin

# Create custom admin
node scripts/createAdmin.js admin@tournament.com MySecurePassword123
```

## Notes

- The script will check if an admin with the same email already exists
- Passwords are automatically hashed using bcrypt
- Make sure MongoDB is running before executing the script
- Change the default password after first login for security

