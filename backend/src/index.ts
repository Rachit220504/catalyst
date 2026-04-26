import 'dotenv/config';
import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import cors from 'cors';
import multer from 'multer';
import { RagService } from './services/ragService';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { SystemMessage, HumanMessage, AIMessage } from '@langchain/core/messages';

const prisma = new PrismaClient();
const app = express();
const port = process.env.PORT || 3001;

app.use(cors({ origin: '*' }));
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Create User Endpoint (example)
app.post('/users', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.create({
      data: { email }
    });
    res.json(user);
  } catch (error: any) {
    console.error('[POST /users] Error:', error?.message, error?.code, error?.meta);
    res.status(500).json({ error: 'Error creating user', details: error?.message });
  }
});

// Create Session Endpoint (example)
app.post('/sessions', async (req: Request, res: Response) => {
  try {
    const { userId, jobDescription, resumeText, chatHistory, learningPlan } = req.body;
    const session = await prisma.session.create({
      data: {
        userId,
        jobDescription,
        resumeText,
        chatHistory,
        learningPlan
      }
    });
    res.json(session);
  } catch (error: any) {
    console.error('[POST /sessions] Error:', error?.message, error?.code, error?.meta);
    res.status(500).json({ error: 'Error creating session', details: error?.message });
  }
});

// Upload Resume Endpoint
app.post('/upload-resume', upload.single('resume'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.body;

    if (!req.file) {
      res.status(400).json({ error: 'No resume file uploaded' });
      return;
    }

    if (!sessionId) {
      res.status(400).json({ error: 'sessionId is required' });
      return;
    }

    // Extract text from PDF
    const text = await RagService.extractTextFromPDF(req.file.buffer);

    // Build and save Vector Store
    await RagService.buildVectorStore(text, sessionId);

    // Optionally update session in DB
    await prisma.session.update({
      where: { id: sessionId },
      data: { resumeText: text }
    });

    res.json({ success: true, message: 'Resume processed and indexed successfully' });
  } catch (error: any) {
    console.error('Error uploading resume:', error);
    res.status(500).json({ error: 'Error processing resume', details: error.message });
  }
});

// Query Resume Endpoint
app.post('/query-resume', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId, query } = req.body;

    if (!sessionId || !query) {
      res.status(400).json({ error: 'sessionId and query are required' });
      return;
    }

    const chunks = await RagService.retrieveRelevantChunks(query, sessionId, 3);
    res.json({ chunks });
  } catch (error: any) {
    console.error('Error querying resume:', error);
    res.status(500).json({ error: 'Error retrieving chunks', details: error.message });
  }
});

// Chat Assessor Endpoint
app.post('/api/chat', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId, userMessage, jobDescription } = req.body;

    if (!sessionId || !userMessage || !jobDescription) {
      res.status(400).json({ error: 'sessionId, userMessage, and jobDescription are required' });
      return;
    }

    // 1. Fetch Session from DB
    const session = await prisma.session.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // 2. Retrieve relevant resume context based on the current user message
    // (Could also use jobDescription for retrieval context, but userMessage works for dynamic conversations)
    const contextChunks = await RagService.retrieveRelevantChunks(userMessage + " " + jobDescription, sessionId, 3);
    const resumeContext = contextChunks.join('\n\n');

    // 3. Initialize Gemini
    const llm = new ChatGoogleGenerativeAI({
      model: 'gemini-2.5-flash', // <-- Update this string
      // apiKey is automatically picked up from process.env.GOOGLE_API_KEY
    });

    // 4. Construct System Prompt
    const systemPrompt = `You are an expert technical assessor interviewing a candidate for a job. 
Your goal is to assess their skills based on the provided Job Description and their Resume Context.

Job Description: ${jobDescription}
Resume Context: ${resumeContext}

Rules:
1. You must assess exactly 3 specific skills derived from the Job Description.
2. Ask exactly ONE targeted question at a time. Wait for the candidate's response before proceeding to the next question.
3. Use the Resume Context to tailor your questions to their specific experience.
4. Keep track of how many skills you have assessed based on the conversation history.
5. CRITICAL: Once the candidate has answered the question for the 3rd and final skill, you must output exactly the string "[EVALUATION_COMPLETE]" and nothing else. Do not ask any further questions.`;

    const messages: (SystemMessage | HumanMessage | AIMessage)[] = [new SystemMessage(systemPrompt)];

    // 5. Append chat history
    let chatHistory = Array.isArray(session.chatHistory) ? session.chatHistory : [];

    for (const msg of chatHistory) {
      if (msg && typeof msg === 'object' && 'role' in msg && 'content' in msg) {
        if (msg.role === 'user') {
          messages.push(new HumanMessage({ content: msg.content as string }));
        } else if (msg.role === 'ai') {
          messages.push(new AIMessage({ content: msg.content as string }));
        }
      }
    }

    // 6. Append new user message
    messages.push(new HumanMessage(userMessage));

    // 7. Invoke Gemini
    const response = await llm.invoke(messages);
    const aiMessageContent = response.content.toString();

    // 8. Update chat history and save to DB
    chatHistory.push({ role: 'user', content: userMessage });
    chatHistory.push({ role: 'ai', content: aiMessageContent });

    await prisma.session.update({
      where: { id: sessionId },
      data: { chatHistory }
    });

    res.json({ response: aiMessageContent });
  } catch (error: any) {
    console.error('Error in chat endpoint:', error);
    res.status(500).json({ error: 'Error during chat generation', details: error.message });
  }
});

// Generate Learning Plan Endpoint
app.post('/api/generate-plan', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      res.status(400).json({ error: 'sessionId is required' });
      return;
    }

    // 1. Fetch Session from DB
    const session = await prisma.session.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // 2. Initialize Gemini
    const llm = new ChatGoogleGenerativeAI({
      model: 'gemini-2.5-flash', // <-- Update this string
      // apiKey is automatically picked up from process.env.GOOGLE_API_KEY
    });

    // 3. Construct Prompt
    const prompt = `You are an expert technical career coach. Your task is to analyze the user's resume, the job description, and the transcript of an AI technical assessment interview to identify skill gaps and provide a learning plan.

You must output a STRICT JSON object with a single key "learningPlan" containing an array of objects.
Each object must exactly have these fields:
- "skillGap" (string): The missing or weak skill identified.
- "recommendation" (string): Actionable advice to improve.
- "estimatedHours" (integer): Estimated time to learn.
- "curatedResource" (string): A precise, direct, and valid URL (starting with https://) to a specific course, official documentation, or tutorial to learn this skill. Do not hallucinate fake links; use well-known, highly reliable URLs.

Output ONLY valid raw JSON. Do not include markdown code blocks like \`\`\`json.

Resume Text: ${session.resumeText}
Job Description: ${session.jobDescription}
Chat History: ${JSON.stringify(session.chatHistory)}`;

    // 4. Invoke Gemini
    const response = await llm.invoke([new HumanMessage(prompt)]);
    let responseText = response.content.toString().trim();

    // Clean up potential markdown formatting if the model still outputs it
    if (responseText.startsWith('\`\`\`json')) {
      responseText = responseText.replace(/^\`\`\`json/, '');
    }
    if (responseText.startsWith('\`\`\`')) {
      responseText = responseText.replace(/^\`\`\`/, '');
    }
    if (responseText.endsWith('\`\`\`')) {
      responseText = responseText.replace(/\`\`\`$/, '');
    }

    responseText = responseText.trim();

    // 5. Parse JSON
    let parsedPlan;
    try {
      parsedPlan = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse Gemini output as JSON:', responseText);
      res.status(500).json({ error: 'Failed to generate a valid JSON learning plan' });
      return;
    }

    // 6. Save to Session model
    await prisma.session.update({
      where: { id: sessionId },
      data: { learningPlan: parsedPlan.learningPlan }
    });

    res.json(parsedPlan);
  } catch (error: any) {
    console.error('Error generating plan:', error);
    res.status(500).json({ error: 'Error generating learning plan', details: error.message });
  }
});

app.listen(Number(port), '0.0.0.0', () => {
  console.log(`Server is running on http://localhost:${port}`);
});