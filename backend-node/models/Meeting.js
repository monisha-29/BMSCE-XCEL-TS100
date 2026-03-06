const mongoose = require('mongoose');

const actionItemSchema = new mongoose.Schema({
    Summary: { type: String, required: true },
    Assignee: { type: String, default: 'Unassigned' },
    Priority: { type: String, enum: ['Highest', 'High', 'Medium', 'Low', 'Lowest'], default: 'Medium' },
    'Due date': { type: String, default: 'N/A' },
    jiraIssueKey: { type: String }
}, { _id: false });

const meetingSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Meeting title is required'],
        trim: true,
        maxlength: [200, 'Title cannot exceed 200 characters']
    },
    meetUrl: {
        type: String,
        trim: true
    },
    transcript: {
        type: String,
        default: ''
    },
    summary: {
        decisions: [{ type: String }],
        action_items: [actionItemSchema]
    },
    status: {
        type: String,
        enum: ['scheduled', 'in-progress', 'completed', 'analyzed'],
        default: 'scheduled'
    },
    jiraIssuesCreated: {
        type: Boolean,
        default: false
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Index for querying meetings by user
meetingSchema.index({ createdBy: 1, createdAt: -1 });

module.exports = mongoose.model('Meeting', meetingSchema);
