import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
    status: { type: String, enum: ['Pending', 'In Progress', 'In Review', 'Completed'], default: 'Pending' },
    deadline: { type: Date, required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    completedAt: { type: Date, default: null },
    // repeating tasks: when one is approved, the next one is created automatically
    repeat: { type: String, enum: ['none', 'daily', 'weekly', 'monthly'], default: 'none' },
    spawned: { type: Boolean, default: false },
    // last reminder email sent, e.g. "2026-10-25:tomorrow" (prevents duplicate emails)
    remindedOn: { type: String, default: '' },
    // checklist inside a task
    subtasks: [{ title: { type: String, required: true, trim: true }, done: { type: Boolean, default: false } }],
    // discussion on the task
    comments: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      name: String,
      text: { type: String, required: true, trim: true },
      createdAt: { type: Date, default: Date.now },
    }],
    // automatic history: who did what and when
    activity: [{ text: String, by: String, at: { type: Date, default: Date.now } }],
  },
  { timestamps: true }
);

export default mongoose.model('Task', taskSchema);