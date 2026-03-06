const Meeting = require('../models/Meeting');
const axios = require('axios');

const FLASK_API_URL = process.env.FLASK_API_URL || 'http://localhost:5002';

// Fake user ID for simplified auth
const FAKE_USER_ID = '000000000000000000000001';

// @desc    Create a new meeting
// @route   POST /api/meetings
// @access  Private
const createMeeting = async (req, res) => {
    try {
        const { title, meetUrl, transcript } = req.body;
        const userId = req.user?._id || FAKE_USER_ID;

        const meeting = await Meeting.create({
            title,
            meetUrl,
            transcript: transcript || '',
            status: transcript ? 'completed' : 'scheduled',
            createdBy: userId
        });

        res.status(201).json({
            success: true,
            message: 'Meeting created successfully',
            meeting
        });
    } catch (error) {
        console.error('Create meeting error:', error);
        res.status(500).json({ message: 'Error creating meeting', error: error.message });
    }
};

// @desc    Get all meetings for current user
// @route   GET /api/meetings
// @access  Private
const getMeetings = async (req, res) => {
    try {
        const userId = req.user?._id || FAKE_USER_ID;
        const meetings = await Meeting.find({ createdBy: userId })
            .sort({ createdAt: -1 })
            .select('-transcript');

        res.json({
            success: true,
            count: meetings.length,
            meetings
        });
    } catch (error) {
        console.error('Get meetings error:', error);
        res.status(500).json({ message: 'Error fetching meetings', error: error.message });
    }
};

// @desc    Get single meeting by ID
// @route   GET /api/meetings/:id
// @access  Private
const getMeetingById = async (req, res) => {
    try {
        const meeting = await Meeting.findById(req.params.id);

        if (!meeting) {
            return res.status(404).json({ message: 'Meeting not found' });
        }

        res.json({ success: true, meeting });
    } catch (error) {
        console.error('Get meeting error:', error);
        res.status(500).json({ message: 'Error fetching meeting', error: error.message });
    }
};

// @desc    Update a meeting
// @route   PUT /api/meetings/:id
// @access  Private
const updateMeeting = async (req, res) => {
    try {
        const meeting = await Meeting.findById(req.params.id);

        if (!meeting) {
            return res.status(404).json({ message: 'Meeting not found' });
        }

        const { title, meetUrl, status } = req.body;
        if (title) meeting.title = title;
        if (meetUrl) meeting.meetUrl = meetUrl;
        if (status) meeting.status = status;

        const updatedMeeting = await meeting.save();
        res.json({ success: true, meeting: updatedMeeting });
    } catch (error) {
        console.error('Update meeting error:', error);
        res.status(500).json({ message: 'Error updating meeting', error: error.message });
    }
};

// @desc    Delete a meeting
// @route   DELETE /api/meetings/:id
// @access  Private
const deleteMeeting = async (req, res) => {
    try {
        const meeting = await Meeting.findByIdAndDelete(req.params.id);

        if (!meeting) {
            return res.status(404).json({ message: 'Meeting not found' });
        }

        res.json({ success: true, message: 'Meeting deleted successfully' });
    } catch (error) {
        console.error('Delete meeting error:', error);
        res.status(500).json({ message: 'Error deleting meeting', error: error.message });
    }
};

// @desc    Add/update transcript for a meeting
// @route   POST /api/meetings/:id/transcript
// @access  Private
const addTranscript = async (req, res) => {
    try {
        const meeting = await Meeting.findById(req.params.id);

        if (!meeting) {
            return res.status(404).json({ message: 'Meeting not found' });
        }

        const { transcript } = req.body;
        if (!transcript) {
            return res.status(400).json({ message: 'Transcript text is required' });
        }

        meeting.transcript = transcript;
        meeting.status = 'completed';
        const updatedMeeting = await meeting.save();

        res.json({
            success: true,
            message: 'Transcript added successfully',
            meeting: updatedMeeting
        });
    } catch (error) {
        console.error('Add transcript error:', error);
        res.status(500).json({ message: 'Error adding transcript', error: error.message });
    }
};

// @desc    Analyze meeting transcript with AI + create Jira tickets
// @route   POST /api/meetings/:id/analyze
// @access  Private
const analyzeMeeting = async (req, res) => {
    try {
        const meeting = await Meeting.findById(req.params.id);

        if (!meeting) {
            return res.status(404).json({ message: 'Meeting not found' });
        }

        if (!meeting.transcript) {
            return res.status(400).json({ message: 'No transcript to analyze. Add a transcript first.' });
        }

        // Get Jira config from request body (sent by frontend from localStorage)
        const { jiraConfig } = req.body;

        // Call Flask AI summarizer with Jira creds
        const requestBody = {
            transcript: meeting.transcript,
            jiraConfig: jiraConfig || null
        };

        const flaskResponse = await axios.post(
            `${FLASK_API_URL}/analyze-transcript`,
            JSON.stringify(requestBody),
            {
                headers: { 'Content-Type': 'application/json' },
                timeout: 180000 // 3 min timeout for AI processing
            }
        );

        const structuredData = flaskResponse.data;

        // Update meeting with AI results
        meeting.summary = {
            decisions: structuredData.decisions || [],
            action_items: structuredData.action_items || []
        };
        meeting.status = 'analyzed';
        meeting.jiraIssuesCreated = !!(jiraConfig && structuredData.action_items?.length);

        const updatedMeeting = await meeting.save();

        res.json({
            success: true,
            message: jiraConfig
                ? 'Meeting analyzed and Jira tickets created'
                : 'Meeting analyzed (no Jira config — configure in Settings)',
            meeting: updatedMeeting
        });
    } catch (error) {
        console.error('Analyze meeting error:', error);

        if (error.code === 'ECONNREFUSED') {
            return res.status(503).json({
                message: 'AI service unavailable. Make sure Flask backend is running on port 5002.'
            });
        }

        res.status(500).json({ message: 'Error analyzing meeting', error: error.message });
    }
};

module.exports = {
    createMeeting,
    getMeetings,
    getMeetingById,
    updateMeeting,
    deleteMeeting,
    addTranscript,
    analyzeMeeting
};
