require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const csvParser = require('csv-parser');
const connectDB = require('./config/db');
const Student = require('./models/Student');
const studentRoutes = require('./routes/studentRoutes');
const multer = require('multer');
const { exec } = require('child_process');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Global variable to hold DB connection status
global.dbConnected = false;

// Paths
const MASTER_CSV_PATH = path.join(__dirname, '..', 'output', 'master_performance.csv');
const PREDS_JSON_PATH = path.join(__dirname, '..', 'output', 'predictions.json');

// Helper to parse CSV helper in server initialization
const parseCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      return resolve([]);
    }
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (err) => reject(err));
  });
};

// Sync CSV Data into MongoDB
const syncCSVToDB = async () => {
  try {
    console.log('[Sync] Starting CSV to MongoDB Synchronization...');
    if (!fs.existsSync(MASTER_CSV_PATH)) {
      console.warn(`[Sync] Master CSV not found at ${MASTER_CSV_PATH}. Synchronization skipped.`);
      return;
    }

    const masterData = await parseCSV(MASTER_CSV_PATH);
    if (masterData.length === 0) {
      console.warn('[Sync] Master CSV is empty. Sync skipped.');
      return;
    }

    // Load predictions if available
    let predictions = {};
    if (fs.existsSync(PREDS_JSON_PATH)) {
      try {
        predictions = JSON.parse(fs.readFileSync(PREDS_JSON_PATH, 'utf8'));
      } catch (err) {
        console.error('[Sync] Error parsing predictions JSON:', err.message);
      }
    }

    // Clear old student records
    await Student.deleteMany({});
    console.log('[Sync] Cleared existing Student records in MongoDB.');

    // Prepare student documents
    const studentDocs = [];

    masterData.forEach((row) => {
      const email = String(row.Email).trim().lower();
      const quizScores = new Map();
      const quizPercentages = new Map();
      const moduleScores = new Map();
      const modulePercentages = new Map();
      const modulePercentiles = new Map();

      // Parse dynamic keys
      Object.keys(row).forEach((key) => {
        if (key.startsWith('day')) {
          const val = parseFloat(row[key]) || 0;
          if (key.endsWith('_pct')) {
            quizPercentages.set(key, val);
          } else {
            quizScores.set(key, val);
          }
        } else if (key.startsWith('Module')) {
          const val = parseFloat(row[key]) || 0;
          if (key.endsWith('_score')) {
            moduleScores.set(key.replace('_score', ''), val);
          } else if (key.endsWith('_pct')) {
            modulePercentages.set(key.replace('_pct', ''), val);
          } else if (key.endsWith('_percentile')) {
            modulePercentiles.set(key.replace('_percentile', ''), val);
          }
        }
      });

      // Get predictions
      const predScore = predictions[email] ? predictions[email].predictedScore : null;
      const predGrade = predictions[email] ? predictions[email].predictedGrade : null;

      studentDocs.push({
        name: row.Name,
        email: email,
        cumulativeScore: parseFloat(row.Cumulative_Score) || 0,
        cumulativeMax: parseFloat(row.Cumulative_Max) || 0,
        cumulativePct: parseFloat(row.Cumulative_Pct) || 0,
        finalPercentile: parseFloat(row.Final_Percentile) || 0,
        rank: parseInt(row.Rank, 10) || 0,
        grade: row.Grade,
        quizScores,
        quizPercentages,
        moduleScores,
        modulePercentages,
        modulePercentiles,
        predictedScore: predScore,
        predictedGrade: predGrade
      });
    });

    await Student.insertMany(studentDocs);
    console.log(`[Sync] Successfully synced ${studentDocs.length} students from CSV to MongoDB.`);
  } catch (error) {
    console.error(`[Sync] Error syncing CSV data: ${error.message}`);
  }
};

// Main Server Startup Function
const startServer = async () => {
  // Connect to DB
  const connected = await connectDB();
  global.dbConnected = connected;

  if (connected) {
    // Populate DB from CSV files
    await syncCSVToDB();
  }

  // Setup Routes
  app.post('/api/students/upload-quiz', upload.single('quizFile'), async (req, res) => {
    try {
      const { quizId, isNewQuiz, moduleId, maxMarks } = req.body;
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      if (!quizId) {
        return res.status(400).json({ error: 'quizId is required' });
      }

      const quizzesDir = path.join(__dirname, '..', 'quizzes');
      if (!fs.existsSync(quizzesDir)) {
        fs.mkdirSync(quizzesDir, { recursive: true });
      }

      // Save the file
      const targetFilePath = path.join(quizzesDir, `${quizId}.csv`);
      fs.writeFileSync(targetFilePath, req.file.buffer);
      console.log(`[Upload] File saved to ${targetFilePath}`);

      let logs = [];
      logs.push(`Successfully saved uploaded file to quizzes/${quizId}.csv`);

      // If it's a new quiz, update config.json
      if (isNewQuiz === 'true' && moduleId) {
        const configPath = path.join(__dirname, '..', 'config', 'config.json');
        if (fs.existsSync(configPath)) {
          try {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            
            // 1. Add to module quizzes list
            const targetModule = config.modules.find(m => m.name === moduleId || m.name.startsWith(moduleId));
            if (targetModule) {
              if (!targetModule.quizzes.includes(quizId)) {
                targetModule.quizzes.push(quizId);
                console.log(`[Upload] Added ${quizId} to module ${targetModule.name}`);
                logs.push(`Added ${quizId} to config module: ${targetModule.name}`);
              }
            } else {
              console.warn(`[Upload] Module "${moduleId}" not found in config`);
              logs.push(`Warning: Module "${moduleId}" not found in config. Added quiz file only.`);
            }

            // 2. Set max marks
            const parsedMaxMarks = parseInt(maxMarks, 10) || 10;
            config.quiz_max_marks = config.quiz_max_marks || {};
            config.quiz_max_marks[quizId] = parsedMaxMarks;
            console.log(`[Upload] Set max marks for ${quizId} to ${parsedMaxMarks}`);
            logs.push(`Set quiz max marks to ${parsedMaxMarks}`);

            // Save updated config.json
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
          } catch (configErr) {
            console.error('[Upload] Error updating config.json:', configErr);
            logs.push(`Error updating config.json: ${configErr.message}`);
          }
        } else {
          logs.push(`Warning: config.json not found. Added quiz file only.`);
        }
      }

      // Run Python execution: main.py --run
      const runCmd = 'python main.py --run';
      const cwdPath = path.join(__dirname, '..');

      logs.push(`Executing: ${runCmd}`);
      console.log(`[Upload] Running ${runCmd}...`);
      
      exec(runCmd, { cwd: cwdPath }, (runErr, runStdout, runStderr) => {
        if (runErr) {
          console.error(`[Upload] Error running pipeline: ${runErr.message}`);
          return res.status(500).json({ 
            error: 'Error executing performance processing pipeline', 
            details: runErr.message,
            stderr: runStderr,
            logs: logs.join('\n')
          });
        }

        logs.push(runStdout);
        if (runStderr) logs.push(`Warning details: ${runStderr}`);

        // Run Python execution: main.py --train
        const trainCmd = 'python main.py --train';
        logs.push(`Executing: ${trainCmd}`);
        console.log(`[Upload] Running ${trainCmd}...`);

        exec(trainCmd, { cwd: cwdPath }, async (trainErr, trainStdout, trainStderr) => {
          if (trainErr) {
            console.error(`[Upload] Error retraining models: ${trainErr.message}`);
            return res.status(500).json({ 
              error: 'Error executing ML model training pipeline', 
              details: trainErr.message,
              stderr: trainStderr,
              logs: logs.join('\n')
            });
          }

          logs.push(trainStdout);
          if (trainStderr) logs.push(`Warning details: ${trainStderr}`);

          // Sync CSV data to MongoDB if database is connected
          if (global.dbConnected) {
            logs.push("Synchronizing updated performance metrics with MongoDB database...");
            await syncCSVToDB();
            logs.push("Database sync completed successfully!");
          } else {
            logs.push("Fallback Mode (Direct CSV): Updated rankings are saved to local CSV files.");
          }

          return res.json({
            success: true,
            message: 'Quiz uploaded, pipeline executed, models retrained, and grade cards generated successfully!',
            logs: logs.join('\n')
          });
        });
      });

    } catch (error) {
      console.error('[Upload] Server error during quiz upload:', error);
      return res.status(500).json({ error: 'Server error during quiz upload', details: error.message });
    }
  });

  app.post('/api/students/import-csv-text', async (req, res) => {
    try {
      const { csvText, quizId, isNewQuiz, moduleId, maxMarks } = req.body;
      if (!csvText) {
        return res.status(400).json({ error: 'csvText is required' });
      }
      if (!quizId) {
        return res.status(400).json({ error: 'quizId is required' });
      }

      const quizzesDir = path.join(__dirname, '..', 'quizzes');
      if (!fs.existsSync(quizzesDir)) {
        fs.mkdirSync(quizzesDir, { recursive: true });
      }

      // Save the content
      const targetFilePath = path.join(quizzesDir, `${quizId}.csv`);
      fs.writeFileSync(targetFilePath, csvText.trim(), 'utf8');
      console.log(`[Import Text] File saved to ${targetFilePath}`);

      let logs = [];
      logs.push(`Successfully saved pasted text to quizzes/${quizId}.csv`);

      // If it's a new quiz, update config.json
      if ((isNewQuiz === true || isNewQuiz === 'true') && moduleId) {
        const configPath = path.join(__dirname, '..', 'config', 'config.json');
        if (fs.existsSync(configPath)) {
          try {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            
            // 1. Add to module quizzes list
            const targetModule = config.modules.find(m => m.name === moduleId || m.name.startsWith(moduleId));
            if (targetModule) {
              if (!targetModule.quizzes.includes(quizId)) {
                targetModule.quizzes.push(quizId);
                logs.push(`Added ${quizId} to config module: ${targetModule.name}`);
              }
            } else {
              logs.push(`Warning: Module "${moduleId}" not found in config. Added quiz file only.`);
            }

            // 2. Set max marks
            const parsedMaxMarks = parseInt(maxMarks, 10) || 10;
            config.quiz_max_marks = config.quiz_max_marks || {};
            config.quiz_max_marks[quizId] = parsedMaxMarks;
            logs.push(`Set quiz max marks to ${parsedMaxMarks}`);

            fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
          } catch (configErr) {
            logs.push(`Error updating config.json: ${configErr.message}`);
          }
        }
      }

      // Run Python execution: main.py --run
      const runCmd = 'python main.py --run';
      const cwdPath = path.join(__dirname, '..');
      logs.push(`Executing: ${runCmd}`);

      exec(runCmd, { cwd: cwdPath }, (runErr, runStdout, runStderr) => {
        if (runErr) {
          return res.status(500).json({ 
            error: 'Error executing performance processing pipeline', 
            details: runErr.message,
            stderr: runStderr,
            logs: logs.join('\n')
          });
        }

        logs.push(runStdout);
        if (runStderr) logs.push(`Warning details: ${runStderr}`);

        // Run Python execution: main.py --train
        const trainCmd = 'python main.py --train';
        logs.push(`Executing: ${trainCmd}`);

        exec(trainCmd, { cwd: cwdPath }, async (trainErr, trainStdout, trainStderr) => {
          if (trainErr) {
            return res.status(500).json({ 
              error: 'Error executing ML model training pipeline', 
              details: trainErr.message,
              stderr: trainStderr,
              logs: logs.join('\n')
            });
          }

          logs.push(trainStdout);
          if (trainStderr) logs.push(`Warning details: ${trainStderr}`);

          // Sync CSV data to MongoDB if database is connected
          if (global.dbConnected) {
            logs.push("Synchronizing updated performance metrics with MongoDB database...");
            await syncCSVToDB();
            logs.push("Database sync completed successfully!");
          }

          return res.json({
            success: true,
            message: 'Quiz text imported and pipeline executed successfully!',
            logs: logs.join('\n')
          });
        });
      });

    } catch (error) {
      console.error('[Import Text] Server error:', error);
      return res.status(500).json({ error: 'Server error during CSV text import', details: error.message });
    }
  });

  // Email Config & Dispatch API Routes
  app.get('/api/students/email-settings', (req, res) => {
    try {
      const configPath = path.join(__dirname, '..', 'config', 'config.json');
      let settings = {};
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        settings = config.email_settings || {};
      }
      // .env variables override config.json
      const cleanSettings = {
        smtp_server: process.env.SMTP_SERVER || settings.smtp_server || 'smtp.gmail.com',
        smtp_port: parseInt(process.env.SMTP_PORT || settings.smtp_port || 587),
        sender_email: process.env.SENDER_EMAIL || settings.sender_email || '',
        use_tls: process.env.USE_TLS ? process.env.USE_TLS === 'true' : (settings.use_tls !== false),
        mock_mode: process.env.MOCK_MODE ? process.env.MOCK_MODE === 'true' : (settings.mock_mode !== false),
        hasPassword: !!(process.env.SENDER_PASSWORD || (settings.sender_password && settings.sender_password !== 'YOUR_APP_PASSWORD_HERE'))
      };
      return res.json(cleanSettings);
    } catch (err) {
      return res.status(500).json({ error: 'Error reading email settings', details: err.message });
    }
  });

  app.post('/api/students/email-settings', (req, res) => {
    try {
      const { sender_email, sender_password, mock_mode } = req.body;
      const configPath = path.join(__dirname, '..', 'config', 'config.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        config.email_settings = config.email_settings || {};
        
        if (sender_email) config.email_settings.sender_email = sender_email.trim();
        if (sender_password) config.email_settings.sender_password = sender_password;
        if (mock_mode !== undefined) config.email_settings.mock_mode = mock_mode === true || mock_mode === 'true';

        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
        return res.json({ success: true, message: 'Email settings updated successfully!' });
      }
      return res.status(404).json({ error: 'Config file not found' });
    } catch (err) {
      return res.status(500).json({ error: 'Error saving email settings', details: err.message });
    }
  });

  app.post('/api/students/send-email', (req, res) => {
    try {
      const { type, email } = req.body;
      if (!type) {
        return res.status(400).json({ error: 'type is required (all or individual)' });
      }

      let cmd = 'python main.py';
      if (type === 'all') {
        cmd += ' --email-all';
      } else if (type === 'individual') {
        if (!email) {
          return res.status(400).json({ error: 'email is required for individual dispatch' });
        }
        cmd += ` --email-one ${email.trim().toLowerCase()}`;
      } else {
        return res.status(400).json({ error: 'Invalid dispatch type' });
      }

      const cwdPath = path.join(__dirname, '..');
      console.log(`[Email Dispatch] Running: ${cmd}`);

      exec(cmd, { cwd: cwdPath }, (err, stdout, stderr) => {
        if (err) {
          console.error(`[Email Dispatch] Error executing command: ${err.message}`);
          return res.status(500).json({ 
            error: 'Error executing email pipeline', 
            details: err.message,
            stderr: stderr,
            logs: stdout
          });
        }

        return res.json({
          success: true,
          message: type === 'all' ? 'Emails successfully processed and sent to all students!' : `Email successfully processed and sent to ${email}!`,
          logs: stdout + (stderr ? `\nWarning: ${stderr}` : '')
        });
      });

    } catch (error) {
      console.error('[Email Dispatch] Server error:', error);
      return res.status(500).json({ error: 'Server error during email dispatch', details: error.message });
    }
  });

  app.use('/api/students', studentRoutes);

  app.get('/', (req, res) => {
    res.send({
      message: 'LIET Performance Manager API is Running',
      dbConnected: global.dbConnected
    });
  });

  app.listen(PORT, () => {
    console.log(`[Server] Express Backend running on port ${PORT}`);
    if (global.dbConnected) {
      console.log(`[Server] Connection Status: CONNECTED to MongoDB`);
    } else {
      console.log(`[Server] Connection Status: CSV Fallback Mode (No Database Required)`);
    }
  });
};

startServer();
