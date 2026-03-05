# Deployment Instructions

This guide explains how to deploy the application on a server.

## Prerequisites

- **Node.js**: Version 18 or higher.
- **npm**: Comes with Node.js.
- **Git**: To clone the repository (optional if you copy files manually).

## Installation Steps

1.  **Copy Files**: Transfer the project files to your server. You can zip the folder (excluding `node_modules` and `dist`) or use Git.

2.  **Install Dependencies**:
    Open a terminal in the project directory and run:
    ```bash
    npm install
    ```
    *Note: This will install all necessary packages, including `better-sqlite3` which may compile native bindings.*

3.  **Build the Frontend**:
    Compile the React application for production:
    ```bash
    npm run build
    ```
    This creates a `dist` folder containing the static files.

4.  **Configure Environment**:
    Create a `.env` file in the root directory (you can copy `.env.example`):
    ```bash
    cp .env.example .env
    ```
    Edit `.env` and set the environment to production:
    ```env
    NODE_ENV=production
    ```

5.  **Start the Server**:
    Run the application:
    ```bash
    npm start
    ```
    The server will start on port **3000**.

## Persistent Data

The application uses a SQLite database. By default, it is stored at `./data/game.db` in the project root.

### Isolating Production Data
To prevent "contamination" between development and production data, you can specify a custom path for the database file using an environment variable in your `.env` file:

```env
DATABASE_PATH="/var/lib/my-app/prod-game.db"
```

This allows you to store the production database in a separate, persistent volume or a protected directory on your server. Ensure the directory containing the database file is writable by the application process.

## Troubleshooting

-   **Port 3000 in use**: If port 3000 is occupied, you may need to modify `server.ts` to use a different port or set a `PORT` environment variable (if supported by the code).
-   **SQLite errors**: If you move the `node_modules` folder between different operating systems (e.g., Windows to Linux), `better-sqlite3` will fail. Always run `npm install` or `npm rebuild` on the target machine.
