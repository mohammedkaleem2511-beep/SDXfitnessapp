const fetch = require('node-fetch'); // Vercel environments support 'node-fetch'

/**
 * Vercel Serverless Function to securely proxy the request to the Gemini API.
 * The GEMINI_API_KEY is read from Vercel's environment variables.
 */
module.exports = async (req, res) => {
    // 1. Get the API Key from the securely stored Vercel Environment Variable
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
        return res.status(500).json({ error: 'Server configuration error: GEMINI_API_KEY is not set.' });
    }

    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    try {
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Missing prompt text in request body.' });
        }

        // 2. Define the Gemini API payload
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
        
        const systemPrompt = "You are a professional fitness planner. Based on the user's goal, provide a structured, detailed, 7-day workout and diet plan. Format the response neatly using markdown.";
        
        const payload = {
            contents: [{ parts: [{ text: prompt }] }],
            systemInstruction: {
                parts: [{ text: systemPrompt }]
            },
        };

        // 3. Call the Google Gemini API securely from the server
        const apiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await apiResponse.json();

        if (apiResponse.ok && result.candidates && result.candidates.length > 0) {
            const generatedText = result.candidates[0].content?.parts[0]?.text || "No text was generated.";
            
            // 4. Send ONLY the generated text back to the client
            res.status(200).json({ text: generatedText });
        } else {
            console.error("Gemini API Error:", result);
            res.status(500).json({ error: 'Failed to generate content from external API.', details: result });
        }

    } catch (error) {
        console.error('Proxy function execution error:', error);
        res.status(500).json({ error: `Internal server error: ${error.message}` });
    }
};