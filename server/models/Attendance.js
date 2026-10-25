import mongoose from 'mongoose';

// One document per employee per day. A day can have several punch-in/out sessions.
const attendanceSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true }, // "YYYY-MM-DD" in the employee's local time
    sessions: [{ start: { type: Date, required: true }, end: { type: Date, default: null } }],
  },
  { timestamps: true }
);
attendanceSchema.index({ user: 1, date: 1 }, { unique: true });

export default mongoose.model('Attendance', attendanceSchema);