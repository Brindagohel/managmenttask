# TaskFlow – MERN Task Management System

Boss/Admin creates, assigns, edits and deletes tasks on a kanban board with search and filters. Employees update the status of their own tasks.
Optional AI generator (Google Gemini free tier) turns a project description into reviewable tasks.

## Requirements
Node.js 18+ and MongoDB (local install or a free MongoDB Atlas connection string).

## Run the backend
```bash
cd server
npm install
cp .env.example .env      # Windows: copy .env.example .env
npm run dev
```
Edit `.env` first: set `MONGO_URI` and `JWT_SECRET`. An admin account is created on first start from
`ADMIN_EMAIL` / `ADMIN_PASSWORD` (default `boss@example.com` / `admin123`).

## Run the frontend (second terminal)
```bash
cd client
npm install
npm run dev
```
Open http://localhost:5173

## Try it
1. Open the app, click **New employee? Sign up** and create an employee (log out afterwards).
2. Log in as the admin, click **New task**, assign it to the employee.
3. Log in as the employee and change the task status.

## AI generator (optional)
Get a free key at https://aistudio.google.com/apikey and put it in `GEMINI_API_KEY`. Restart the server.
Without a key, the generator page still works: use **Add task manually**.

## API
| Method | Route | Access |
|---|---|---|
| POST | /api/auth/register, /api/auth/login | public |
| GET | /api/auth/me | logged in |
| GET | /api/tasks | admin: all, employee: own |
| POST | /api/tasks, /api/tasks/bulk | admin |
| PUT / DELETE | /api/tasks/:id | admin |
| PATCH | /api/tasks/:id/status | admin or assigned employee |
| GET | /api/users/employees | admin |
| POST | /api/ai/generate | admin |
