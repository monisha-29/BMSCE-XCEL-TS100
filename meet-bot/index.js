/**
 * Curia AI — Google Meet Bot
 * 
 * Joins a Google Meet as a guest, enables captions,
 * scrapes caption text, and sends the transcript to the backend.
 * 
 * Usage:
 *   node index.js <meet-url> [meeting-id]
 *
 * Examples:
 *   node index.js https://meet.google.com/abc-defg-hij
 *   node index.js https://meet.google.com/abc-defg-hij 664f1a2b3c4d5e6f7a8b9c0d
 */

require('dotenv').config();
const puppeteer = require('puppeteer');
const axios = require('axios');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';
const BOT_NAME = process.env.BOT_NAME || 'Curia AI Note-taker';

// Duration to stay in meeting (ms). Default: 60 minutes
const MAX_DURATION = parseInt(process.env.MAX_DURATION || '3600000');

async function joinMeeting(meetUrl) {
    console.log(`🤖 Curia AI Bot starting...`);
    console.log(`📍 Meet URL: ${meetUrl}`);
    console.log(`👤 Bot name: ${BOT_NAME}`);

    const browser = await puppeteer.launch({
        headless: false, // Set to true for production
        args: [
            '--use-fake-ui-for-media-stream',  // Auto-allow mic/camera
            '--use-fake-device-for-media-stream', // Use fake devices
            '--disable-web-security',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-features=TranslateUI',
            '--window-size=1280,720',
        ]
    });

    const page = await browser.newPage();

    // Grant permissions
    const context = browser.defaultBrowserContext();
    await context.overridePermissions('https://meet.google.com', [
        'microphone', 'camera', 'notifications'
    ]);

    try {
        // 1. Navigate to the Meet URL
        console.log('📡 Navigating to meeting...');
        await page.goto(meetUrl, { waitUntil: 'networkidle2', timeout: 30000 });

        // 2. Wait for the "Your name" input field (guest join)
        console.log('⏳ Waiting for guest join form...');
        await page.waitForSelector('input[placeholder="Your name"]', { timeout: 15000 });

        // 3. Enter bot name
        await page.click('input[placeholder="Your name"]', { clickCount: 3 });
        await page.type('input[placeholder="Your name"]', BOT_NAME);
        console.log(`✏️  Entered name: ${BOT_NAME}`);

        // 4. Turn off microphone and camera before joining
        // These are toggle buttons — click to disable
        try {
            // Mic button
            const micButton = await page.$('[data-is-muted="false"][aria-label*="microphone" i]');
            if (micButton) await micButton.click();

            // Camera button  
            const camButton = await page.$('[data-is-muted="false"][aria-label*="camera" i]');
            if (camButton) await camButton.click();
        } catch (e) {
            console.log('⚠️  Could not toggle mic/cam (may already be off)');
        }

        // 5. Click "Ask to join" or "Join now"
        console.log('🚪 Clicking join button...');
        const joinButton = await page.waitForSelector(
            'button[jsname="Qx7uuf"], [data-idom-class*="join"]',
            { timeout: 10000 }
        );
        if (joinButton) await joinButton.click();

        // 6. Wait to be admitted (host may need to approve)
        console.log('⏳ Waiting to be admitted to the meeting...');
        await page.waitForFunction(() => {
            // Check if we're in the meeting (caption button or participants visible)
            return document.querySelector('[aria-label*="captions" i]') ||
                   document.querySelector('[aria-label*="Turn on captions" i]');
        }, { timeout: 120000 }); // Wait up to 2 minutes

        console.log('✅ Joined the meeting!');

        // 7. Enable captions
        console.log('📝 Enabling captions...');
        const captionBtn = await page.$('[aria-label*="captions" i]');
        if (captionBtn) {
            await captionBtn.click();
            console.log('✅ Captions enabled');
        }

        // 8. Start scraping captions
        console.log('🎙️  Scraping captions...');
        const transcript = await scrapeCaptions(page);

        return transcript;

    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    } finally {
        await browser.close();
    }
}

async function scrapeCaptions(page) {
    // Use a MutationObserver to capture captions in real-time
    const captionData = await page.evaluate((maxDuration) => {
        return new Promise((resolve) => {
            const lines = [];
            let lastText = '';
            let timeoutId;

            // Set max duration
            const durationTimeout = setTimeout(() => {
                resolve(lines.join('\n'));
            }, maxDuration);

            // Watch for caption changes
            const observer = new MutationObserver(() => {
                // Google Meet renders captions in specific containers
                const captionElements = document.querySelectorAll(
                    '[class*="caption"], [class*="subtitle"], [jsname*="caption"]'
                );

                captionElements.forEach(el => {
                    const text = el.textContent?.trim();
                    if (text && text !== lastText && text.length > 0) {
                        lastText = text;
                        lines.push(text);
                    }
                });
            });

            // Observe the body for any DOM changes (captions are dynamically injected)
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                characterData: true
            });

            // Also check if user hangs up (meeting ends)
            const checkEnded = setInterval(() => {
                const endedIndicator = document.querySelector('[data-call-ended]') ||
                    document.querySelector('[jsname="r4nke"]'); // "Return to home screen"
                if (endedIndicator) {
                    clearInterval(checkEnded);
                    clearTimeout(durationTimeout);
                    observer.disconnect();
                    resolve(lines.join('\n'));
                }
            }, 2000);
        });
    }, MAX_DURATION);

    return captionData;
}

async function sendTranscript(meetingId, transcript) {
    if (!meetingId) {
        console.log('📋 No meeting ID provided. Transcript saved locally only.');
        console.log('--- TRANSCRIPT ---');
        console.log(transcript);
        return;
    }

    try {
        console.log(`📤 Sending transcript to backend for meeting ${meetingId}...`);
        await axios.post(`${BACKEND_URL}/api/meetings/${meetingId}/transcript`, {
            transcript
        });
        console.log('✅ Transcript saved to backend');
    } catch (error) {
        console.error('❌ Failed to send transcript:', error.message);
        // Save locally as fallback
        const fs = require('fs');
        const filename = `transcript_${Date.now()}.txt`;
        fs.writeFileSync(filename, transcript);
        console.log(`💾 Transcript saved locally as ${filename}`);
    }
}

// Main
(async () => {
    const meetUrl = process.argv[2];
    const meetingId = process.argv[3];

    if (!meetUrl) {
        console.log('Usage: node index.js <meet-url> [meeting-id]');
        console.log('Example: node index.js https://meet.google.com/abc-defg-hij');
        process.exit(1);
    }

    if (!meetUrl.includes('meet.google.com')) {
        console.error('❌ Invalid Google Meet URL');
        process.exit(1);
    }

    try {
        const transcript = await joinMeeting(meetUrl);
        console.log(`\n📄 Captured ${transcript.split('\n').length} lines of transcript`);
        await sendTranscript(meetingId, transcript);
    } catch (error) {
        console.error('Bot failed:', error.message);
        process.exit(1);
    }
})();
