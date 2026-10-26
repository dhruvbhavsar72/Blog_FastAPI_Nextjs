# Fieldnotes frontend

Responsive Next.js blog frontend for the FastAPI backend in `../backend`.

## Start locally

1. Create `frontend/.env.local` from `.env.example` and set
   `NEXT_PUBLIC_API_BASE_URL` to the backend origin. The local example uses
   `http://localhost:8000`.
2. Start the backend from `backend` with its configured Python environment:

   ```powershell
   .\venv\Scripts\python.exe -m uvicorn main:app --reload
   ```

3. Start this frontend from `frontend`:

   ```powershell
   npm run dev
   ```

The frontend runs at `http://localhost:3000`; FastAPI's Swagger UI is available
at `http://localhost:8000/docs`.

## Data fetching

Server data is managed with TanStack Query v5. The app-level query client
deduplicates concurrent requests and caches results for 30 seconds. Post,
category, tag, comment, and like data is invalidated or updated in the cache
after the corresponding create, update, delete, and like actions.
Transient success and API-action errors use the installed `react-hot-toast`
library. Form validation and page-level data-loading errors remain inline so
they stay visible beside the relevant fields or content.
The installed Motion library provides subtle hero and card entrance/hover
transitions, with its reduced-motion setting enabled for users who request it.

## API and authentication

The frontend uses the FastAPI contracts in `backend/main.py` and the route
modules. Authentication cookies are HTTP-only and are sent using credentialed
requests; access tokens and passwords are not stored in browser storage. The
client attempts the backend refresh-cookie endpoint after an expired access
cookie. `GET /users/me` treats missing or expired credentials as an anonymous
session, and refreshes the access cookie when a valid refresh cookie exists, so
public pages do not receive an unauthorized response during session checks.

The backend must allow the frontend origin with credentials. `backend/main.py`
allows `http://localhost:3000` and `http://127.0.0.1:3000` by default; set the
backend `CORS_ORIGINS` environment variable to a comma-separated list of exact
frontend origins for other deployments (for example,
`https://blog.example.com`). Keep `allow_credentials=True`, and do not use a
wildcard origin with cookie-based authentication. Keep frontend and backend on
the same site in development where possible. For cross-site production
deployments, the backend cookies must also use HTTPS with `SameSite=None;
Secure`; configure this on the backend, not in frontend environment variables.

## Implemented API routes

- `GET /posts/all_posts`, `GET /posts/{post_id}`, and
  `GET /posts/posts_by_user`
- `POST /posts/create_post`, `PUT /posts/edit_post/{post_id}`, and
  `DELETE /posts/delete_post/{post_id}`
- `POST /users/register`, `POST /users/login`, `POST /users/logout`,
  `GET /users/me`, and `GET /users/refresh`
- `POST /users/otp_generate` and `POST /users/otp_verify` for email or phone
  one-time-code login
- `GET /users/auth/{google|github}/login` and
  `GET /users/auth/{google|github}/callback` for configured OAuth providers
- `POST /users/send-password-reset-email` and `POST /users/reset-password`
- `PUT /users/update_profile`
- `GET /categories/all_categories`, `POST /categories/create_category`,
  `GET /tags/all_tags`, and `POST /tags/create_tag`
- `GET /comments/post/{post_id}`, `POST /comments/post/{post_id}`, and
  `DELETE /comments/{comment_id}`
- `GET`, `POST`, and `DELETE /likes/posts/{post_id}`

Search, category filtering, sorting, and pagination on the journal are performed
in the browser because the posts list endpoint does not accept those query
parameters. Its full list response is loaded before filtering. The post schema
does not include excerpts or author details, so the UI derives an excerpt and
reading time from the story text and uses the signed-in user's name only when
the story belongs to that user. Profile editing is limited to phone, bio, and
profile image, matching the backend endpoint. The backend does not expose a reliable way to clear all post categories/tags
in an update; the editor leaves existing associations intact when a selection
is empty. Comment editing is available in the API but not exposed in the UI.
Google/GitHub sign-in requires the corresponding OAuth client IDs, client
secrets, and callback URLs to be configured on the backend.
Email OTP delivery uses the backend email configuration. Phone OTP currently
prints the code to the backend console; no SMS provider is configured in the
backend.

The backend constructs password reset links under `/forgot-password?token=…`;
that page handles both requesting and completing a reset.

## Checks

```powershell
npx tsc --noEmit
npm run build
```

The project currently does not define a lint or test script.
