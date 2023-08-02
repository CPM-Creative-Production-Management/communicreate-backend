# cpm-backend

Backend for Client Production Management.

## Installation and Running

1. Install Node.js runtime from https://nodejs.org/en/download
2. Clone this repository using `git clone https://github.com/CPM-Creative-Production-Management/cpm-backend.git`
3. Switch to the root directory of the project, and run the command `npm i` to install all dependencies.
4. You may request the authors for the _.env_ file, which needs to be placed in the root directory for this project to run.
5. Start the project using `npm start`. The development server will be active at localhost:3000

## Production

- This project is hosted at https://cpm-backend.onrender.com. Pushes to the main branch will cause the deployed app to reload according to the latest version. Thus, it is suggested that the app is thoroughly tested in the development server before any commits to main are made.
- This projected is hosted on a free tier Render account. This adds the limitation of backend computing resources being spun down with inactivity. The very first calls to the API will likely be slow.

## Database

This project uses a Postgres database hosted on an AWS Free Tier RDS system. To monitor the database directly:

1. Install pgadmin4 from https://www.pgadmin.org/download/
2. In pgadmin4, register a new server. You may request the authors for database credentials.
