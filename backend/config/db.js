const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/student_grades', {
      serverSelectionTimeoutMS: 2000 // fail fast if not running
    });
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.error(`[Database] Local MongoDB is not running: ${error.message}`);
    console.log(`[Database] Falling back to Direct CSV File Mode.`);
    return false;
  }
};

module.exports = connectDB;
