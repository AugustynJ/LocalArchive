## Project of web app for digital archive. 

### Components:
- frontend - React.js
- backend - flask python
- DB - postgresql
- Redis - manage JWT 

### TODO:
**Frontend:**  
✅ Communicate with API  
⌛ CSS  
⌛ Light and Dark mode  
⌛ RWD Responsive Web Design

**Backend:**  
✅ Connect to pgsql and redis  
✅ Account API endpoints  
✅ Photos API endpoints  
✅ Admin API endpoints  
⌛ Password reset email - configure SMTP

**Postgres:**  
✅ Storage of user's data - including password hashes with salt  
✅ Storage metadata of photos

**Redis:**
✅ Storage whitelist of JWT access and refresh tokens  
✅ Storage password reset's valid tokens


### API structure:
- API 
    - v1
        - login POST
        - register POST
        - user
            - info GET
            - logout POST
            - delete DELETE
            - password_change POST
            - {id}/block GET
            - admin
                - audit GET
                - list_users GET
                - list_photos
        - photos GET / POST
            - {nr} GET / PATCH / DELETE
            - categories GET
            - my_photos GET
        - token
            - refresh GET
        - forgot_password POST
            - {token} GET/PUT
