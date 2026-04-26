# Catalyst Soul AI

An AI-powered technical career coaching and assessment platform. Catalyst Soul AI evaluates candidates using a RAG-powered chatbot and generates actionable, personalized learning plans based on their resume and target job descriptions.

## Architecture

The project is structured as an npm monorepo with a robust, separated frontend and backend.

### Diagram Description
1. **Frontend (React + Vite + Tailwind CSS)**: 
   - Handles the User Interface, File Uploads, Chat Experience, and Dashboard.
   - Communicates with the backend REST API via Axios/Fetch.
2. **Backend (Node.js + Express + TypeScript)**:
   - Houses the core business logic and API endpoints.
   - **Prisma + PostgreSQL**: Manages relational persistence of Users and Interview Sessions (including Chat History and structured Learning Plans).
   - **LangChain + Google GenAI**: Powers the `gemini-1.5-flash` assessment chatbot and orchestrates the strict JSON formatting for the learning plan.
   - **FAISS Vector Store + Multer**: Ingests PDF resumes via memory storage, extracts text, chunks it, and creates local vector embeddings for lightning-fast, highly contextual RAG retrieval during the chat.

## Local Setup Instructions

### Prerequisites
- Node.js (v18+)
- PostgreSQL (or Docker to run the included `docker-compose.yml`)
- Google GenAI API Key

### Installation

1. **Install Dependencies**
   Run the following in the root directory to install all monorepo dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. **Database Setup**
   - Start the PostgreSQL database (e.g., \`docker compose up -d\`).
   - Create a \`.env\` file in the \`backend\` directory and add:
     \`\`\`env
     DATABASE_URL="postgresql://postgres:password@localhost:5432/catalyst_soul_ai?schema=public"
     PORT=3000
     GOOGLE_API_KEY="your-google-api-key"
     \`\`\`
   - Push the Prisma schema to your database:
     \`\`\`bash
     npm run db:push --workspace=backend
     \`\`\`

3. **Start Development Servers**
   Run the concurrently script from the root directory to start both the Vite frontend and Express backend:
   \`\`\`bash
   npm run dev
   \`\`\`
   - Frontend will be available at \`http://localhost:5173\`
   - Backend will be available at \`http://localhost:3000\`

## Deployment Configurations

### Frontend (Vercel)
Vercel handles Vite React apps out of the box. Since this is a monorepo, you must specify the Root Directory.

1. Import the repository into Vercel.
2. **Root Directory**: Set to \`frontend\`.
3. **Framework Preset**: Vite.
4. **Build Command**: \`npm run build\`
5. **Output Directory**: \`dist\`
6. **Environment Variables**: Add \`VITE_API_URL\` pointing to your deployed backend URL (you will need to update the frontend code to use \`import.meta.env.VITE_API_URL\` instead of the hardcoded \`localhost:3000\`).

### Backend (Render)
Render is ideal for hosting the Express Node.js backend. 

1. Create a new **Web Service** on Render connected to your repository.
2. **Root Directory**: Set to \`backend\`.
3. **Environment**: Node.
4. **Build Command**: 
   \`\`\`bash
   npm install && npm run build
   \`\`\`
5. **Start Command**: 
   \`\`\`bash
   npm start
   \`\`\`
6. **Environment Variables**:
   - \`DATABASE_URL\`: Your production PostgreSQL URL (you can provision a managed Postgres DB directly on Render).
   - \`GOOGLE_API_KEY\`: Your secure Google GenAI key.
   - \`PORT\`: Let Render define this, or explicitly set to \`3000\`.
   - \`NODE_ENV\`: \`production\`
7. **Storage**: Because the FAISS vector store writes to the local \`vectorstore\` directory, you must add a **Disk** to your Render Web Service. Mount it to \`/opt/render/project/src/backend/vectorstore\` to ensure your RAG indexes persist across deployments and server restarts.
